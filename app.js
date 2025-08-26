/* ===== Local “DB” (JSON) via localStorage ===== */
const LS_KEY = "sharesub_v4_abos_mails";
const EXAMPLE_DB = {
  accounts: [
    {
      id: 1,
      name: "ShareSub #1",
      country: "FR",
      account_email: "owner1@example.com",
      iban_masked: "FR76••••1234",
      monthly_revenue: 23.00,
      monthly_cost: 17.99,
      subscriptions: [
        {
          id: 101,
          platform: "spotify",
          plan: "Famille",
          email: "spotify.owner@example.com",
          password: "Sp0t!2025",
          price_you_pay_month: 17.99,
          renew_date: "2025-10-14",
          comment: "🎵 Compte principal – ne pas changer le mdp sans prévenir.",
          members: [
            { id: 1,  pseudo: "Chainez S.",  mail: "chainez@example.com",   monthly_fee: 3.50 },
            { id: 2,  pseudo: "Maxime C.",   mail: "maxime@example.com",    monthly_fee: 3.50 },
            { id: 3,  pseudo: "Nicolas L.",  mail: "nicolas@example.com",   monthly_fee: 3.50 },
            { id: 4,  pseudo: "Tiphanie L.", mail: "tiphanie@example.com",  monthly_fee: 3.50 },
            { id: 5,  pseudo: "Morad B.",    mail: "morad@example.com",     monthly_fee: 3.50 }
          ]
        },
        {
          id: 102,
          platform: "youtube",
          plan: "Premium",
          email: "yt.owner@example.com",
          password: "Y0uTube@2025",
          price_you_pay_month: 19.99,
          renew_date: "2025-10-05",
          comment: "📺 Utiliser profil 'Famille' uniquement.",
          members: [
            { id: 6,  pseudo: "Elamine I.",  mail: "elamine@example.com",  monthly_fee: 3.50 },
            { id: 7,  pseudo: "Carlo",       mail: "carlo@example.com",    monthly_fee: 3.50 },
            { id: 8,  pseudo: "Aurélie J.",  mail: "aurelie@example.com",  monthly_fee: 3.50 },
            { id: 9,  pseudo: "Benjamin H.", mail: "benjamin@example.com", monthly_fee: 3.50 },
            { id: 10, pseudo: "Alex L.",     mail: "alex@example.com",     monthly_fee: 3.50 }
          ]
        }
      ]
    },
    {
      id: 2,
      name: "ShareSub #2",
      country: "FR",
      account_email: "owner2@example.com",
      iban_masked: "FR76••••5678",
      monthly_revenue: 7.00,
      monthly_cost: 3.54,
      subscriptions: [
        {
          id: 201,
          platform: "spotify",
          plan: "Individuel",
          email: "spot2@example.com",
          password: "Sp!ndiv25",
          price_you_pay_month: 3.54,
          renew_date: "2025-11-10",
          comment: "🔒 Utilisé pour tests.",
          members: [
            { id: 11, pseudo: "Abd",        mail: "abd@example.com",      monthly_fee: 3.50 },
            { id: 12, pseudo: "Mathilde C.",mail: "mathilde@example.com", monthly_fee: 3.50 }
          ]
        }
      ]
    }
  ],
  emails: [
    { id: 1, address: "support@slicesub.com",   country: "FR", enabled: false, last_check: "2025-08-22 12:10" },
    { id: 2, address: "notif.sharesub@gmail.com", country: "FR", enabled: true,  last_check: "2025-08-22 11:50" }
  ]
};

function loadDB(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw){ localStorage.setItem(LS_KEY, JSON.stringify(EXAMPLE_DB)); return structuredClone(EXAMPLE_DB); }
  try { return JSON.parse(raw); } catch { return structuredClone(EXAMPLE_DB); }
}
function saveDB(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }

/* ===== Utils ===== */
const byId = id => document.getElementById(id);
const fmtEUR = n => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(n||0));
const uid = () => Math.floor(Math.random()*1e9);

/* ===== Render — KPIs & Comptes/Abos ===== */
function renderKPIs(db){
  const revenue = db.accounts.reduce((a,acc)=>a+(acc.monthly_revenue||0),0);
  const cost    = db.accounts.reduce((a,acc)=>a+(acc.monthly_cost||0),0);
  byId("kpiRevenue").textContent = fmtEUR(revenue);
  byId("kpiCost").textContent    = fmtEUR(cost);
  byId("kpiMargin").textContent  = fmtEUR(revenue - cost);
  byId("kpiAccounts").textContent = db.accounts.length;
}

function memberRows(accountId, subId, members){
  return (members||[]).map(m=>`
    <tr>
      <td>🧑 ${m.pseudo||""}</td>
      <td class="mono">📧 ${m.mail||""}</td>
      <td class="mono right">💶 ${fmtEUR(m.monthly_fee)}</td>
      <td class="right">
        <button class="btn" onclick="editMember(${accountId},${subId},${m.id})">✏️</button>
        <button class="btn danger" onclick="deleteMember(${accountId},${subId},${m.id})">🗑️</button>
      </td>
    </tr>
  `).join("");
}

function subscriptionBlock(acc, sub){
  const membersTotal = (sub.members||[]).reduce((a,m)=>a+(Number(m.monthly_fee)||0),0);
  return `
    <details>
      <summary>
        <span class="tag">📦 ${sub.platform} • ${sub.plan}</span>
        <span class="pill">📅 ${new Date(sub.renew_date).toLocaleDateString()}</span>
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
          <button class="btn" onclick="addMember(${acc.id},${sub.id})">➕ Ajouter abonné</button>
          <button class="btn" onclick="editSubscription(${acc.id},${sub.id})">✏️ Éditer abonnement</button>
          <button class="btn danger" onclick="deleteSubscription(${acc.id},${sub.id})">🗑️ Supprimer abonnement</button>
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
        <span class="tag">🗂️ ${acc.name}</span>
        <span class="pill">🇫🇷 ${acc.country}</span>
        <span class="pill">📧 ${acc.account_email}</span>
        <span class="pill">🏦 ${acc.iban_masked}</span>
        <span class="pill">💶 Revenu: <b>${fmtEUR(acc.monthly_revenue||0)}</b></span>
        <span class="pill">💳 Coût: <b>${fmtEUR(acc.monthly_cost||0)}</b></span>
        <span class="pill">📈 Marge: <b>${fmtEUR((acc.monthly_revenue||0)-(acc.monthly_cost||0))}</b></span>
        <span style="margin-left:auto" class="muted">#${acc.id}</span>
      </summary>
      <div>
        <div class="row" style="justify-content:flex-end;gap:6px;margin-bottom:8px">
          <button class="btn" onclick="addSubscription(${acc.id})">➕ Ajouter abonnement</button>
          <button class="btn" onclick="editAccount(${acc.id})">✏️ Éditer compte</button>
          <button class="btn danger" onclick="deleteAccount(${acc.id})">🗑️ Supprimer compte</button>
        </div>
        ${subs || `<p class="muted">Aucun abonnement pour ce compte.</p>`}
      </div>
    </details>
  `;
}

function renderAccounts(db){
  byId("accountsList").innerHTML = db.accounts.map(accountCard).join("");
}

/* ===== Section Mails ===== */
let editing = { type:null, accountId:null, subId:null, memberId:null, emailId:null };

function renderEmails(db){
  byId("emailRows").innerHTML = (db.emails||[]).map(e=>`
    <tr>
      <td class="mono">📧 ${e.address}</td>
      <td class="mono">${e.country||"—"}</td>
      <td>
        <input type="checkbox" class="toggle" data-email-id="${e.id}" ${e.enabled?'checked':''} title="${e.enabled?'activé':'désactivé'}">
      </td>
      <td class="muted">${e.last_check||"—"}</td>
      <td class="right">
        <button class="btn" onclick="editEmail(${e.id})">✏️</button>
        <button class="btn danger" onclick="deleteEmail(${e.id})">🗑️</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll('input.toggle[data-email-id]').forEach(tg=>{
    tg.addEventListener('change', e=>{
      const id = Number(e.target.getAttribute('data-email-id'));
      const on = e.target.checked;
      const db2 = loadDB();
      const item = db2.emails.find(x=>x.id===id);
      if(item){ item.enabled = on; saveDB(db2); }
    });
  });
}

function addEmail(){
  editing = {type:"email-new"};
  byId("emailTitle").textContent = "Nouveau mail";
  byId("em_address").value = "";
  byId("em_country").value = "";
  byId("em_enabled").value = "false";
  byId("em_last").value = "";
  byId("emailModal").showModal();
}
function editEmail(id){
  const db = loadDB();
  const e = db.emails.find(x=>x.id===id);
  if(!e) return;
  editing = {type:"email-edit", emailId:id};
  byId("emailTitle").textContent = `Éditer ${e.address}`;
  byId("em_address").value = e.address||"";
  byId("em_country").value = e.country||"";
  byId("em_enabled").value = e.enabled ? "true" : "false";
  byId("em_last").value = e.last_check||"";
  byId("emailModal").showModal();
}
function deleteEmail(id){
  if(!confirm("Supprimer ce mail ?")) return;
  const db = loadDB();
  db.emails = (db.emails||[]).filter(x=>x.id!==id);
  saveDB(db); boot();
}

byId("addEmailBtn").addEventListener("click", addEmail);
byId("emailSaveBtn").addEventListener("click", ()=>{
  const db = loadDB();
  const payload = {
    address: byId("em_address").value.trim(),
    country: byId("em_country").value.trim(),
    enabled: byId("em_enabled").value === "true",
    last_check: byId("em_last").value.trim()
  };
  if(!Array.isArray(db.emails)) db.emails = [];
  if(editing.type==="email-new"){
    db.emails.push({ id: uid(), ...payload });
  }else if(editing.type==="email-edit"){
    const e = db.emails.find(x=>x.id===editing.emailId);
    Object.assign(e, payload);
  }
  saveDB(db); byId("emailModal").close(); boot();
});

/* ===== CRUD — comptes / abonnements / abonnés ===== */
function addAccount(){
  editing = {type:"account-new"};
  byId("accTitle").textContent = "Nouveau compte";
  ["acc_name","acc_country","acc_email","acc_iban","acc_rev","acc_cost"].forEach(id=>byId(id).value="");
  byId("accountModal").showModal();
}
function editAccount(accountId){
  const db = loadDB(); const acc = db.accounts.find(a=>a.id===accountId);
  if(!acc) return;
  editing = {type:"account-edit", accountId};
  byId("accTitle").textContent = `Éditer ${acc.name}`;
  byId("acc_name").value = acc.name||"";
  byId("acc_country").value = acc.country||"";
  byId("acc_email").value = acc.account_email||"";
  byId("acc_iban").value = acc.iban_masked||"";
  byId("acc_rev").value = acc.monthly_revenue||0;
  byId("acc_cost").value = acc.monthly_cost||0;
  byId("accountModal").showModal();
}
byId("addAccountBtn").addEventListener("click", addAccount);
byId("accSaveBtn").addEventListener("click", ()=>{
  const db = loadDB();
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
  }else if(editing.type==="account-edit"){
    const acc = db.accounts.find(a=>a.id===editing.accountId);
    Object.assign(acc, payload);
  }
  saveDB(db); closeModal("accountModal"); boot();
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
  const db = loadDB();
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
  const db = loadDB();
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
  if(!acc) return;
  if(editing.type==="sub-new"){
    acc.subscriptions.push({ id: uid(), members: [], ...payload });
  }else{
    const sub = acc.subscriptions.find(s=>s.id===editing.subId);
    Object.assign(sub, payload);
  }
  saveDB(db); closeModal("subModal"); boot();
});
function deleteSubscription(accountId, subId){
  if(!confirm("Supprimer cet abonnement ?")) return;
  const db = loadDB();
  const acc = db.accounts.find(a=>a.id===accountId);
  acc.subscriptions = acc.subscriptions.filter(s=>s.id!==subId);
  saveDB(db); boot();
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
  const db = loadDB();
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
  const db = loadDB();
  const acc = db.accounts.find(a=>a.id===editing.accountId);
  const sub = acc.subscriptions.find(s=>s.id===editing.subId);
  const payload = {
    pseudo: byId("mem_pseudo").value.trim(),
    mail: byId("mem_mail").value.trim(),
    monthly_fee: Number(byId("mem_fee").value||0)
  };
  if(editing.type==="mem-new"){
    sub.members.push({ id: uid(), ...payload });
  }else{
    const mem = sub.members.find(m=>m.id===editing.memberId);
    Object.assign(mem, payload);
  }
  saveDB(db); closeModal("memberModal"); boot();
});
function deleteMember(accountId, subId, memberId){
  if(!confirm("Supprimer cet abonné ?")) return;
  const db = loadDB();
  const acc = db.accounts.find(a=>a.id===accountId);
  const sub = acc.subscriptions.find(s=>s.id===subId);
  sub.members = sub.members.filter(m=>m.id!==memberId);
  saveDB(db); boot();
}

function deleteAccount(accountId){
  if(!confirm("Supprimer ce compte et tous ses abonnements ?")) return;
  const db = loadDB();
  db.accounts = db.accounts.filter(a=>a.id!==accountId);
  saveDB(db); boot();
}

/* ===== UI helpers ===== */
function toggleFieldPwd(inputId, btn){
  const el = byId(inputId);
  el.type = el.type === "password" ? "text" : "password";
  btn.textContent = (el.type==="password" ? "👁️" : "🙈");
}
function closeDlg(btn){ btn.closest("dialog").close(); }
function closeModal(id){ byId(id).close(); }

/* ===== Import / Export / Reset ===== */
function exportJSON(){
  const data = localStorage.getItem(LS_KEY) || JSON.stringify(EXAMPLE_DB);
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
      if(!Array.isArray(db.accounts)) throw new Error("Fichier invalide (accounts manquant)");
      if(!Array.isArray(db.emails)) db.emails = []; // tolérant si ancien JSON
      saveDB(db); boot();
    }catch(err){ alert("Import JSON invalide: "+err.message); }
  };
  reader.readAsText(file);
}
function resetExample(){ saveDB(EXAMPLE_DB); boot(); }

/* ===== Boot ===== */
function renderApp(){
  const db = loadDB();
  renderKPIs(db);
  renderAccounts(db);
  renderEmails(db);
}
function boot(){
  renderApp();
  byId("exportBtn").onclick = exportJSON;
  byId("resetBtn").onclick = resetExample;
  byId("importFile").addEventListener("change", e=>{
    const f = e.target.files[0]; if(f) handleImport(f); e.target.value="";
  });
}
boot();

/* expose some functions globally (used in HTML inline handlers) */
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
