// ===== FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore, doc, getDoc, updateDoc,
collection, addDoc, query,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp({
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
});

const db = getFirestore(app);

// ===== HELPERS =====
function el(id){ return document.getElementById(id); }

function getTx(data){
return data.transactions
? (Array.isArray(data.transactions)
? [...data.transactions]
: Object.values(data.transactions))
: [];
}

function genRef(){
return "TRX-" + Math.floor(Math.random()*1000000000);
}

function setText(id,val){
if(el(id)) el(id).innerText = val;
}

// ===== RENDER =====
function renderTransactions(list){
const box = el("transactions");
if(!box) return;

box.innerHTML = "";

list.sort((a,b)=> new Date(b.date) - new Date(a.date));

list.forEach(t=>{
const amt = Number(t.amount || 0);

box.innerHTML += `
<div class="tx">
<strong>${t.note || "Transaction"}</strong><br>
<small>Ref: ${t.reference || genRef()}</small><br>
<small>${new Date(t.date).toLocaleString()}</small><br>
<b style="color:${amt>=0?"#22c55e":"#ef4444"}">
${amt>=0?"+":"-"}$${Math.abs(amt).toLocaleString()}
</b>
</div>`;
});
}

// ===== INIT =====
async function initDashboard(){

const username = localStorage.getItem("user");
if(!username) return location.replace("index.html");

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);
if(!snap.exists()) return location.replace("index.html");

let data = snap.data();
let usdBalance = Number(data.usdBalance || 0);
let tx = getTx(data);

// ===== UI =====
setText("welcome","Hello, " + (data.fullName || "User"));
setText("routingDisplay",data.routingNumber || "-");
setText("swift",data.swift || "-");
setText("bankAddress",data.bankAddress || "-");

let hidden = false;

function renderBalance(){
setText("balance", hidden ? "••••••" : "$" + usdBalance.toLocaleString());
}

el("toggleBalance").onclick = ()=>{
hidden = !hidden;
renderBalance();
};

renderBalance();

// ===== WALLET =====
setText("usdWallet","$" + usdBalance.toLocaleString());
setText("eurWallet","€" + Number(data.balance || 0).toLocaleString());
setText("gbpWallet","£" + Number(data.gbpBalance || 0).toLocaleString());

// ===== CONVERTER =====
setText("convertedEUR","€" + (usdBalance * 0.92).toLocaleString());
setText("convertedGBP","£" + (usdBalance * 0.78).toLocaleString());

// ===== TRANSACTIONS =====
renderTransactions(tx);

// ===== ADMIN PANEL =====
if(username === "admin"){
if(el("adminPanel")) el("adminPanel").classList.remove("hidden");
}

// ===== REALTIME =====
const q = query(collection(db,"pendingTransfers"));

onSnapshot(q, async (snapshot)=>{

const box = el("pendingTransactions");
const adminBox = el("adminTransfers");

if(box) box.innerHTML = "";
if(adminBox) adminBox.innerHTML = "";

snapshot.forEach(async d=>{
const p = d.data();

// ===== USER PENDING =====
if(p.sender === username && p.status === "pending"){
box.innerHTML += `
<div class="tx">
⏳ Pending<br>
$${Number(p.amount).toLocaleString()}
</div>`;
}

// ===== ADMIN VIEW =====
if(username === "admin"){
adminBox.innerHTML += `
<div class="admin-box">
<b>${p.sender}</b><br>
$${Number(p.amount).toLocaleString()}

<div class="admin-actions">
<button class="approve" onclick="approveTx('${d.id}')">Approve</button>
<button class="reject" onclick="rejectTx('${d.id}')">Reject</button>
<button onclick="debitUser('${p.sender}',${p.amount})">Debit</button>
</div>
</div>`;
}

// ===== AUTO CREDIT =====
if(p.status === "completed" && !p.processed){

const ref = doc(db,"users",p.sender);
const s = await getDoc(ref);

if(s.exists()){
let dta = s.data();
let bal = Number(dta.usdBalance || 0);
let txx = getTx(dta);

bal += Number(p.amount);

txx.unshift({
amount: Number(p.amount),
note: "Transfer Received",
reference: genRef(),
date: new Date().toISOString()
});

await updateDoc(ref,{
usdBalance: bal,
transactions: txx
});
}

await updateDoc(doc(db,"pendingTransfers",d.id),{
processed:true
});
}

});

});

// ===== ADMIN ACTIONS =====
window.approveTx = async (id)=>{
await updateDoc(doc(db,"pendingTransfers",id),{
status:"completed",
processed:false
});
alert("Approved");
};

window.rejectTx = async (id)=>{
await updateDoc(doc(db,"pendingTransfers",id),{
status:"failed"
});
alert("Rejected");
};

// ===== ✅ FIXED ADMIN DEBIT =====
window.debitUser = async (user, amount)=>{

const ref = doc(db,"users",user);
const snap = await getDoc(ref);

if(!snap.exists()) return alert("User not found");

let d = snap.data();
let bal = Number(d.usdBalance || 0);
let t = getTx(d);

bal -= Number(amount);

t.unshift({
amount: -Number(amount),
note: "Admin Debit",
reference: genRef(),
date: new Date().toISOString()
});

await updateDoc(ref,{
usdBalance: bal,
transactions: t
});

alert("Debited successfully");
};

// ===== TRANSFER =====
let pending = null;

window.openPinModal = ()=>{
const acc = el("accountNumber").value.trim();
const routing = el("routingNumber").value.trim();
const desc = el("description").value.trim();
const amount = parseFloat(el("amount").value);

if(!acc || routing.length !== 9 || isNaN(amount)){
alert("Invalid input");
return;
}

if(amount > usdBalance){
alert("Insufficient funds");
return;
}

pending = {acc,routing,desc,amount};
el("pinModal").classList.remove("hidden");
};

window.closePin = ()=>{
el("pinModal").classList.add("hidden");
};

window.confirmPin = async ()=>{

const pin = el("pinInput").value;
if(pin !== data.pin) return alert("Wrong PIN");

usdBalance -= pending.amount;

tx.unshift({
amount:-pending.amount,
note:"Transfer Sent",
reference:genRef(),
date:new Date().toISOString()
});

await updateDoc(userRef,{ usdBalance, transactions: tx });

await addDoc(collection(db,"pendingTransfers"),{
sender: username,
amount: pending.amount,
accountNumber: pending.acc,
routingNumber: pending.routing,
description: pending.desc,
date: new Date().toISOString(),
status:"pending",
processed:false
});

el("pinModal").classList.add("hidden");

renderBalance();
renderTransactions(tx);

alert("Transfer Pending Approval");
};

// ===== BILL =====
window.payBill = async (name,amount)=>{
if(amount > usdBalance) return alert("Insufficient");

usdBalance -= amount;

tx.unshift({
amount:-amount,
note:name+" Bill",
reference:genRef(),
date:new Date().toISOString()
});

await updateDoc(userRef,{ usdBalance, transactions: tx });

renderBalance();
renderTransactions(tx);
};

// ===== GIFT =====
window.buyGiftCard = async (name,amount)=>{
if(amount > usdBalance) return alert("Insufficient");

usdBalance -= amount;

tx.unshift({
amount:-amount,
note:name+" Gift Card",
reference:genRef(),
date:new Date().toISOString()
});

await updateDoc(userRef,{ usdBalance, transactions: tx });

renderBalance();
renderTransactions(tx);
};

}

initDashboard();