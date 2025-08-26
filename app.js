/* =========================================================
   ShareSub Manager – app.js
   - Charge db.json du repo (même dossier que app.html)
   - Utilise localStorage pour les changements
   - Export JSON pour commit/push vers GitHub
   ========================================================= */

const LS_KEY = "sharesub_v5_synced";

// ---------- Base vide ----------
const EMPTY_DB = { accounts: [], emails: [] };

// ---------- Helpers DOM & utils ----------
const byId = id => document.getElementById(id);
const fmtEUR = n => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(n||0));
const uid = () => Math.floor(Math.random()*1e9);

// ---------- Stockage ----------
function loadFromLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveToLocal(db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

// Charge db.json (même origine / même dossier que app.html sur GitHub Pages)
async function loadFromGitHub() {
  try {
    const res = await fetch("db.json", { cache: "no-store" });
    if (!res.ok) throw new Error("db.json introuvable");
    const json = await res.json();
    if (!json || typeof json !== "object") throw new Error("db.json invalide");
    if (!Array.isArray(json.accounts)) json.accounts = [];
    if (!Array.isArray(json.emails)) json.emails = [];
    return json;
  } catch (e) {
    console.warn("Fetch db.json a échoué:", e.message);
    return null;
  }
}

// Chargement initial : priorité aux données locales si présentes
async function getInitialDB() {
  const local = loadFromLocal();
  if (local) return local;

  const remote = await loadFromGitHub();
  if (remote) {
    saveToLocal(remote);
    return remote;
  }
  // fallback base vide
  saveToLocal(EMPTY_DB);
  return structuredClone(EMPTY_DB);
}

// ---------- Rendu KPIs ----------
function renderKPIs(db){
  const revenue = db.accounts.reduce((a,acc)=>a+(acc.monthly_revenue||0),0);
  const cost    = db.accounts.reduce((a,acc)=>a+(acc.monthly_cost||0),0);
  byId("kpiRevenue").textContent = fmtEUR(revenue);
  byId("kpiCost").textContent    = fmtEUR(cost);
  byId("kpiMargin").textContent  = fmtEUR(revenue - cost);
  byId("kpiAccounts").textContent = db.accounts.length;
}

// ---------- Rendu Emails ----------
function renderEmails(db){
  byId("emailRows").innerHTML = (db.emails||[]).map(e=>`
    <tr>
      <td class="mono">📧 ${e.address||""}</td>
      <td class="mono">${e.country||"—"}</td>
      <td><input type="checkbox" class="toggle" data-email-id="${e.id}" ${e.enabled?'checked':''}></td>
      <td class="muted">${e.last_check||"—"}</td>
      <td class="right">
        <button class="btn" data-act="edit-email" data-id="${e.id}">✏️</button>
        <button class="btn danger" data-act="del-email" data-id="${e.id}">🗑️</button>
      </td>
    </tr>
  `).join("");

  // toggles
  document.querySelectorAll('input.toggle[data-email-id]').forEach(tg=>{
    tg.addEventListener('change', e=>{
      const db = loadFromLocal(); if(!db) return;
      const id = Number(e.target.getAttribute('data-email-id'));
      const it = db.emails.find(x=>x.id===id);
      if (it) { it.enabled = e.target.checked; saveToLocal(db); }
    });
  });

  // actions
  byId("emailRows").onclick = (ev)=>{
    const btn = ev.target.closest("button[data-act]");
    if(!btn) return;
    const id = Number(btn.dataset.id);
    if(btn.dataset.act==="edit-email") editEmail(id);
    if(btn.dataset.act==="del-email") deleteEmail(id);
  };
}

// ---------- Rendu Comptes / Abos ----------
function memberRows(accountId, subId, members){
  return (members||[]).map(m=>`
    <tr>
      <td>🧑 ${m.pseudo||""}</td>
      <td class="mono">📧 ${m.mail||""}</td>
      <td class="mono right">💶 ${fmtEUR(m.monthly_fee)}</td>
      <td class="right">
        <button class="btn" data-act="edit-mem" data-acc="${accountId}" data-sub="${subId}" data-id="${m.id}">✏️</button>
        <button class="btn danger" data-act="del-mem" data-acc="${accountId}" data-sub="${subId}" data-id="${m.id}">🗑️</button>
      </td>
    </tr>
  `).join("");
}

function subscriptionBlock(acc, sub){
  const membersTotal = (sub.members||[]).reduce((a,m)=>a+(Number(m.monthly_fee)||0),0);
  return `
    <details>
      <summary>
        <span class="tag">📦 ${sub.platform||""} • ${sub.plan||""}</span>
        <span class="pill">📅 ${sub.renew_date ? new Date(sub.renew_date).toLocaleDateString() : "—"}</span>
        <span class="pill">💳 Coût: <b>${fmtEUR(sub.price_you_pay_month||0)}</b></span>
        <span class="pill">👥 ${sub.members?.length||0} abonnés</span>
        <span class="pill">💰 ${fmtEUR(membersTotal)} /mois</span>
        <span style="margin-left:auto" class="muted">#${sub.id}</span>
      </summary>

      <div>
        <div class="meta">
          <div class="box">
            <div class="label">📧 Mail de l’abonnement</div>
            <div class="mono">${sub.email||"—"}</div>
          </div>
          <div class="box">
            <div class="label">🔒 Mot de passe</div>
            <div class="pwd-wrap">
              <input type="password" value="${sub.password||""}" id="pwd_${acc.id}_${sub.id}" style="width:100%">
              <button class="reveal" onclick="toggleFieldPwd('pwd_${acc.id}_${sub.id}',this)">👁️</button>
            </div>
          </div>
          <div class="box">
            <div class="label">💶 Prix (tu payes /mois)</div>
            <div class="mono">${fmtEUR(sub.price_you_pay_month||0)}</div>
          </div>
          <div class="box">
            <div class="label">📝 Commentaire</div>
            <div>${(sub.comment||"").replaceAll("<","&lt;")}</div>
          </div>
        </div>

        <div class="row" style="justify-content:flex-end;gap:6px;margin:6px 0 10px">
          <button class="btn" data-act="add-mem" data-acc="${acc.id}" data-sub="${sub.id}">➕ Ajouter abonné</button>
          <button class="btn" data-act="edit-sub" data-acc="${acc.id}" data-sub="${sub.id}">✏️ Éditer abonnement</button>
          <button class="btn danger" data-act="del-sub" data-acc="${acc.id}" data-sub="${sub.id}">🗑️ Supprimer abonnement</button>
        </div>

        <table>
          <thead><tr><th>Abonné (pseudo)</th><th>Mail</th><th class="right">Prix payé /mois</th><th class="right">Actions</th></tr></thead>
          <tbody>${memberRows(acc.id, sub.id, sub.members)}</tbody>
        </table>
      </div>
    </details>
  `;
}

function accountCard(acc){
  const subs = (acc.subscriptions||[]).map(s=>subscriptionBlock(acc,s)).join("");
  return `
    <details open>
      <summary>
        <span class="tag">🗂️ ${acc.name||""}</span>
        <span class="pill">${acc.country ? "🌍 "+acc.country : "—"}</span>
        <span class="pill">📧 ${acc.account_email||"—"}</span>
        <span class="pill">🏦 ${acc.iban_masked||"—"}</span>
        <span class="pill">💶 Revenu: <b>${fmtEUR(acc.monthly_revenue||0)}</b></span>
        <span class="pill">💳 Coût: <b>${fmtEUR(acc.monthly_cost||0)}</b></span>
        <span class="pill">📈 Marge: <b>${fmtEUR((acc.monthly_revenue||0)-(acc.monthly_cost||0))}</b></span>
        <span style="margin-left:auto" class="muted">#${acc.id}</span>
      </summary>
      <div>
        <div class="row" style="justify-content:flex-end;gap:6px;margin-bottom:8px">
          <button class="btn" data-act="add-sub" data-acc="${acc.id}">➕ Ajouter abonnement</button>
          <button class="btn" data-act="edit-acc" data-acc="${acc.id}">✏️ Éditer compte</button>
          <button class="btn danger" data-act="del-acc" data-acc="${acc.id}">🗑️ Supprimer compte</button>
        </div>
        ${subs || `<p class="muted">Aucun abonnement pour ce compte.</p>`}
      </div>
    </details>
  `;
}

function renderAccounts(db){
  byId("accountsList").innerHTML = db.accounts.map(accountCard).join("");

  // délégation des clics
  byId("accountsList").onclick = (ev)=>{
    const btn = ev.target.closest("button[data-act]");
    if(!btn) return;
    const act = btn.dataset.act;
    const accId = Number(btn.dataset.acc);
    const subId = Number(btn.dataset.sub);
    const memId = Number(btn.dataset.id);

    if(act==="add-sub") addSubscription(accId);
    if(act==="edit-acc") editAccount(accId);
    if(act==="del-acc") deleteAccount(accId);

    if(act==="edit-sub") editSubscription(accId, subId);
    if(act==="del-sub") deleteSubscription(accId, subId);
    if(act==="add-mem") addMember(accId, subId);

    if(act==="edit-mem") editMember(accId, subId, memId);
    if(act==="del-mem") deleteMember(accId, subId, memId);
  };
}

// ---------- CRUD Emails ----------
let editing = { type:null, accountId:null, subId:null, memberId:null, emailId:null };

function addEmail(){
  editing = {type:"email-new"};
  openEmailModal({ address:"", country:"", enabled:false, last_check:"" }, "Nouveau mail");
}
function editEmail(id){
  const db = loadFromLocal(); if(!db) return;
  const e = db.emails.find(x=>x.id===id);
  if(!e) return;
  editing = {type:"email-edit", emailId:id};
  openEmailModal(e, `Éditer ${e.address}`);
}
function deleteEmail(id){
  if(!confirm("Supprimer ce mail ?")) return;
  const db = loadFromLocal(); if(!db) return;
  db.emails = (db.emails||[]).filter(x=>x.id!==id);
  saveToLocal(db); boot();
}
function openEmailModal(data, title){
  byId("emailTitle").textContent = title;
  byId("em_address").value = data.address||"";
  byId("em_country").value = data.country||"";
  byId("em_enabled").value = data.enabled ? "true" : "false";
  byId("em_last").value = data.last_check||"";
  byId("emailModal").showModal();
}
byId("addEmailBtn").addEventListener("click", addEmail);
byId("emailSaveBtn").addEventListener("click", ()=>{
  const db = loadFromLocal(); if(!db) return;
  const payload = {
    address: byId("em_address").value.trim(),
    country: byId("em_country").value.trim(),
    enabled: byId("em_enabled").value==="true",
    last_check: byId("em_last").value.trim()
  };
  if(!Array.isArray(db.emails)) db.emails = [];
  if(editing.type==="email-new"){
    db.emails.push({ id: uid(), ...payload });
  } else {
    const e = db.emails.find(x=>x.id===editing.emailId);
    Object.assign(e, payload);
  }
  saveToLocal(db); byId("emailModal").close(); boot();
});

// ---------- CRUD Comptes / Abonnements / Abonnés ----------
function addAccount(){
  editing = {type:"account-new"};
  byId("accTitle").textContent = "Nouveau compte";
  ["acc_name","acc_country","acc_email","acc_iban","acc_rev","acc_cost"].forEach(id=>byId(id).value="");
  byId("accountModal").showModal();
}
function editAccount(accountId){
  const db = loadFromLocal(); const acc = db?.accounts.find(a=>a.id===accountId);
  if(!acc) return;
  editing = {type:"account-edit", accountId};
  byId("accTitle").textContent = `Éditer ${acc.name}`;
  byId("acc_name").value   = acc.name||"";
  byId("acc_country").value= acc.country||"";
  byId("acc_email").value  = acc.account_email||"";
  byId("acc_iban").value   = acc.iban_masked||"";
  byId("acc_rev").value    = acc.monthly_revenue||0;
  byId("acc_cost").value   = acc.monthly_cost||0;
  byId("accountModal").showModal();
}
byId("addAccountBtn").addEventListener("click", addAccount);
byId("accSaveBtn").addEventListener("click", ()=>{
  const db = loadFromLocal(); if(!db) return;
  const payload = {
    name: byId("acc_name").value.trim(),
    country: byId("acc_country").value.trim(),
    account_email: byId("acc_email").value.trim(),
    iban_masked: byId("acc_iban").value.trim(),
    monthly_revenue: Number(byId("acc_rev").value||0),
    monthly_cost: Number(byId("acc_cost").value||0)
  };
  if(editing.type==="account-new"){
    db.accounts.push({ id: uid(), subscriptions: [], ...payload });
  } else {
    const acc = db.accounts.find(a=>a.id===editing.accountId);
    Object.assign(acc, payload);
  }
  saveToLocal(db); closeModal("accountModal"); boot();
});

function addSubscription(accountId){
  editing = {type:"sub-new", accountId};
  setSubModal();
  byId("subModal").showModal();
}
function editSubscription(accountId, subId){
  editing = {type:"sub-edit", accountId, subId};
  setSubModal();
  byId("subModal").showModal();
}
function setSubModal(){
  const db = loadFromLocal();
  const sub = (editing.type==="sub-edit")
    ? db.accounts.find(a=>a.id===editing.accountId)?.subscriptions.find(s=>s.id===editing.subId)
    : { platform:"", plan:"", email:"", password:"", price_you_pay_month:"", renew_date:"", comment:"" };
  byId("subTitle").textContent = (editing.type==="sub-edit" ? "Éditer abonnement" : "Nouvel abonnement");
  byId("sub_platform").value = sub.platform||"";
  byId("sub_plan").value = sub.plan||"";
  byId("sub_mail").value = sub.email||"";
  byId("sub_pwd").value = sub.password||"";
  byId("sub_price").value = sub.price_you_pay_month||"";
  byId("sub_renew").value = sub.renew_date||"";
  byId("sub_comment").value = sub.comment||"";
}
byId("subSaveBtn").addEventListener("click", ()=>{
  const db = loadFromLocal(); if(!db) return;
  const payload = {
    platform: byId("sub_platform").value.trim(),
    plan: byId("sub_plan").value.trim(),
    email: byId("sub_mail").value.trim(),
    password: byId("sub_pwd").value,
    price_you_pay_month: Number(byId("sub_price").value||0),
    renew_date: byId("sub_renew").value,
    comment: byId("sub_comment").value.trim()
  };
  const acc = db.accounts.find(a=>a.id===editing.accountId);
  if(editing.type==="sub-new"){
    acc.subscriptions.push({ id: uid(), members: [], ...payload });
  } else {
    const sub = acc.subscriptions.find(s=>s.id===editing.subId);
    Object.assign(sub, payload);
  }
  saveToLocal(db); closeModal("subModal"); boot();
});
function deleteSubscription(accountId, subId){
  if(!confirm("Supprimer cet abonnement ?")) return;
  const db = loadFromLocal(); if(!db) return;
  const acc = db.accounts.find(a=>a.id===accountId);
  acc.subscriptions = acc.subscriptions.filter(s=>s.id!==subId);
  saveToLocal(db); boot();
}

function addMember(accountId, subId){
  editing = {type:"mem-new", accountId, subId};
  setMemberModal(); byId("memberModal").showModal();
}
function editMember(accountId, subId, memberId){
  editing = {type:"mem-edit", accountId, subId, memberId};
  setMemberModal(); byId("memberModal").showModal();
}
function setMemberModal(){
  const db = loadFromLocal();
  let mem = { pseudo:"", mail:"", monthly_fee:"" };
  if(editing.type==="mem-edit"){
    const acc = db.accounts.find(a=>a.id===editing.accountId);
    const sub = acc.subscriptions.find(s=>s.id===editing.subId);
    mem = sub.members.find(m=>m.id===editing.memberId) || mem;
  }
  byId("memTitle").textContent = (editing.type==="mem-edit" ? "Éditer abonné" : "Nouvel abonné");
  byId("mem_pseudo").value = mem.pseudo||"";
  byId("mem_mail").value = mem.mail||"";
  byId("mem_fee").value = mem.monthly_fee||"";
}
byId("memSaveBtn").addEventListener("click", ()=>{
  const db = loadFromLocal(); if(!db) return;
  const acc = db.accounts.find(a=>a.id===editing.accountId);
  const sub = acc.subscriptions.find(s=>s.id===editing.subId);
  const payload = {
    pseudo: byId("mem_pseudo").value.trim(),
    mail: byId("mem_mail").value.trim(),
    monthly_fee: Number(byId("mem_fee").value||0)
  };
  if(editing.type==="mem-new"){
    sub.members.push({ id: uid(), ...payload });
  } else {
    const mem = sub.members.find(m=>m.id===editing.memberId);
    Object.assign(mem, payload);
  }
  saveToLocal(db); closeModal("memberModal"); boot();
});
function deleteMember(accountId, subId, memberId){
  if(!confirm("Supprimer cet abonné ?")) return;
  const db = loadFromLocal(); if(!db) return;
  const acc = db.accounts.find(a=>a.id===accountId);
  const sub = acc.subscriptions.find(s=>s.id===subId);
  sub.members = sub.members.filter(m=>m.id!==memberId);
  saveToLocal(db); boot();
}

function deleteAccount(accountId){
  if(!confirm("Supprimer ce compte et tous ses abonnements ?")) return;
  const db = loadFromLocal(); if(!db) return;
  db.accounts = db.accounts.filter(a=>a.id!==accountId);
  saveToLocal(db); boot();
}

// ---------- UI helpers ----------
function toggleFieldPwd(inputId, btn){
  const el = byId(inputId);
  el.type = el.type === "password" ? "text" : "password";
  btn.textContent = (el.type==="password" ? "👁️" : "🙈");
}
function closeDlg(btn){ btn.closest("dialog").close(); }
function closeModal(id){ byId(id).close(); }

// ---------- Import / Export ----------
function exportJSON(){
  const data = localStorage.getItem(LS_KEY) || JSON.stringify(EMPTY_DB);
  const blob = new Blob([data],{type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "db.json";
  document.body.appendChild(a); a.click(); a.remove();
}
function handleImport(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const db = JSON.parse(reader.result);
      if(!Array.isArray(db.accounts)) db.accounts = [];
      if(!Array.isArray(db.emails)) db.emails = [];
      saveToLocal(db); boot();
    }catch(err){ alert("Import JSON invalide: "+err.message); }
  };
  reader.readAsText(file);
}
function resetExample(){
  // Ici on ne met pas d'exemple, on repart de la base vide
  saveToLocal(EMPTY_DB);
  boot();
}

// ---------- Boot ----------
async function renderApp(){
  const db = loadFromLocal() || await getInitialDB();
  renderKPIs(db);
  renderAccounts(db);
  renderEmails(db);
}

async function boot(){
  await renderApp();
  byId("exportBtn").onclick = exportJSON;
  byId("resetBtn").onclick = resetExample;
  byId("importFile").addEventListener("change", e=>{
    const f = e.target.files[0]; if(f) handleImport(f); e.target.value="";
  });

  // boutons globaux (existants dans app.html)
  window.addMember = addMember;
  window.editMember = editMember;
  window.deleteMember = deleteMember;
  window.addSubscription = addSubscription;
  window.editSubscription = editSubscription;
  window.deleteSubscription = deleteSubscription;
  window.editAccount = editAccount;
  window.deleteAccount = deleteAccount;
  window.toggleFieldPwd = toggleFieldPwd;
  window.closeDlg = closeDlg;

  // Email modal listeners (existent dans app.html)
  const addEmailBtn = document.getElementById("addEmailBtn");
  if (addEmailBtn) addEmailBtn.addEventListener("click", addEmail);
  const emailSaveBtn = document.getElementById("emailSaveBtn");
  if (emailSaveBtn) emailSaveBtn.addEventListener("click", ()=>{}); // géré plus haut (attaché déjà)
}

boot();
