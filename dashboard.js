// ===== FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore, doc, getDoc, updateDoc,
collection, getDocs, addDoc, query,
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

function maskCard(num){
let clean = (num || "").replace(/\s/g,'');
return clean ? "**** **** **** " + clean.slice(-4) : "**** **** **** 1122";
}

// ===== 🔥 AUTO FIX ALL USERS =====
async function fixAllUsers(){

const usersSnap = await getDocs(collection(db,"users"));

usersSnap.forEach(async (u)=>{
let d = u.data();

// fix balances
let usd = d.usdBalance ?? d.balance ?? 0;
let eur = d.balance ?? usd * 0.92;
let gbp = d.gbpBalance ?? usd * 0.78;

// fix missing bank info
let routing = d.routingNumber || "021069021";
let swift = d.swift || "BOFAUS3NXXX";
let address = d.bankAddress || "DeChase Bank, United States";

// update safely
await updateDoc(doc(db,"users",u.id),{
usdBalance: usd,
balance: eur,
gbpBalance: gbp,
routingNumber: routing,
swift: swift,
bankAddress: address
});

});

console.log("✅ All users fixed");
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
const savedPassword = localStorage.getItem("password");

if(!username) return location.replace("index.html");

// 🔥 RUN AUTO FIX (ONLY ADMIN)
if(username === "admin"){
await fixAllUsers();
}

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);
if(!snap.exists()) return location.replace("index.html");

let data = snap.data();

// ===== PASSWORD CHECK =====
if(savedPassword && data.password !== savedPassword){
alert("Session expired. Login again.");
localStorage.clear();
location.replace("index.html");
return;
}

// ===== SAFE BALANCE =====
let usdBalance = Number(data.usdBalance ?? data.balance ?? 0);
let tx = getTx(data);

// ===== SAFE BANK INFO =====
const routing = data.routingNumber || "021069021";
const swift = data.swift || "BOFAUS3NXXX";
const address = data.bankAddress || "DeChase Bank, United States";

// ===== UI =====
setText("welcome","Hello, " + (data.fullName || "User"));
setText("routingDisplay", routing);
setText("swift", swift);
setText("bankAddress", address);

// ===== CARD =====
setText("cardNumber", maskCard(data.cardNumber));
setText("cardName", (data.fullName || "USER").toUpperCase());
setText("cardExpiry", data.cardExpiry || "12/28");
setText("cardCVV", data.cvv || "123");

// ===== CARD FREEZE =====
let frozen = data.cardFrozen || false;

function updateCardBtn(){
if(el("cardBtn")){
el("cardBtn").innerText = frozen ? "Unfreeze Card" : "Freeze Card";
}
}

updateCardBtn();

window.toggleCard = async ()=>{
frozen = !frozen;
await updateDoc(userRef,{ cardFrozen: frozen });
updateCardBtn();
alert(frozen ? "Card Frozen" : "Card Unfrozen");
};

// ===== BALANCE =====
let hidden = false;

function renderBalance(){
setText("balance", hidden ? "••••••" : "$" + usdBalance.toLocaleString());
}

if(el("toggleBalance")){
el("toggleBalance").onclick = ()=>{
hidden = !hidden;
renderBalance();
};
}

renderBalance();

// ===== WALLET =====
let eurBal = Number(data.balance ?? usdBalance * 0.92);
let gbpBal = Number(data.gbpBalance ?? usdBalance * 0.78);

setText("usdWallet","$" + usdBalance.toLocaleString());
setText("eurWallet","€" + eurBal.toLocaleString());
setText("gbpWallet","£" + gbpBal.toLocaleString());

// ===== CONVERTER =====
setText("convertedEUR","€" + (usdBalance * 0.92).toLocaleString());
setText("convertedGBP","£" + (usdBalance * 0.78).toLocaleString());

// ===== TRANSACTIONS =====
renderTransactions(tx);

// ===== REALTIME USER SYNC =====
onSnapshot(userRef, (snap)=>{
if(!snap.exists()) return;

let d = snap.data();

// logout if password changed
if(savedPassword && d.password !== savedPassword){
alert("Password changed. Login again.");
localStorage.clear();
location.replace("index.html");
return;
}

usdBalance = Number(d.usdBalance ?? d.balance ?? 0);
tx = getTx(d);

renderBalance();
renderTransactions(tx);

setText("usdWallet","$" + usdBalance.toLocaleString());
setText("eurWallet","€" + (d.balance ?? usdBalance * 0.92).toLocaleString());
});

// ===== PENDING =====
const q = query(collection(db,"pendingTransfers"));

onSnapshot(q, async (snapshot)=>{

const box = el("pendingTransactions");
if(box) box.innerHTML = "";

snapshot.forEach(async d=>{
const p = d.data();

if(p.sender === username && p.status === "pending"){
box.innerHTML += `
<div class="tx">
⏳ Pending<br>
$${Number(p.amount).toLocaleString()}
</div>`;
}

// AUTO CREDIT
if(p.status === "completed" && !p.processed){

const ref = doc(db,"users",p.sender);
const s = await getDoc(ref);

if(s.exists()){
let dta = s.data();
let bal = Number(dta.usdBalance ?? 0);
let txx = getTx(dta);

bal += Number(p.amount);

txx.unshift({
amount: Number(p.amount),
note: "Transfer Received",
reference: genRef(),
date: new Date().toISOString()
});

await updateDoc(ref,{ usdBalance: bal, transactions: txx });
}

await updateDoc(doc(db,"pendingTransfers",d.id),{ processed:true });
}

});

});

// ===== TRANSFER =====
let pending = null;

window.openPinModal = ()=>{
if(frozen) return alert("Card is frozen");

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

if(frozen) return alert("Card is frozen");

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

}

initDashboard();