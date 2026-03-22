// ===== FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore, doc, getDoc, updateDoc,
collection, getDocs, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== HELPERS =====
function getTx(data){
return data.transactions
? (Array.isArray(data.transactions)
? [...data.transactions]
: Object.values(data.transactions))
: [];
}

// ✅ IMPROVED CARD FORMAT
function formatCard(num){
if(!num) return "**** **** **** ****";

const clean = num.replace(/\s/g,"");
return clean.replace(/(.{4})/g,"$1 ").trim();
}

function maskCard(num){
if(!num) return "**** **** **** ****";

const clean = num.replace(/\s/g,"");
const last4 = clean.slice(-4);
return "**** **** **** " + last4;
}

function genRef(){
return "TRX-" + Math.floor(Math.random()*1000000000);
}

// ===== RENDER TRANSACTIONS =====
function renderTransactions(list){

const box = document.getElementById("transactions");
box.innerHTML = "";

if(!list || list.length === 0){
box.innerHTML = "<div class='tx'>No transactions</div>";
return;
}

list.sort((a,b)=> new Date(b.date) - new Date(a.date));

list.forEach(t=>{

const amt = Number(t.amount || 0);
if(isNaN(amt) || amt === 0) return;

const isCredit = amt > 0;
const color = isCredit ? "#22c55e" : "#ef4444";
const sign = isCredit ? "+" : "-";

const note = t.note || "Transaction";
const date = new Date(t.date).toLocaleString();

// ✅ AUTO FIX OLD REFERENCES
let ref = t.reference || genRef();
if(ref.startsWith("ACH")){
ref = "TRX-" + ref.split("-")[1];
}

box.innerHTML += `
<div class="tx">
<div style="display:flex;justify-content:space-between;align-items:center;">
<div>
<strong>${note}</strong><br>
<div style="font-size:11px;color:#9ca3af;">Ref: ${ref}</div>
<div style="font-size:11px;color:#6b7280;">${date}</div>
</div>

<div style="color:${color};font-weight:bold;font-size:16px;">
${sign}$${Math.abs(amt).toLocaleString()}
</div>
</div>
</div>
`;

});
}

// ===== CARD ACTIONS =====
window.flipCard = ()=>{
document.getElementById("cardInner").classList.toggle("flipped");
};

window.revealCVV = async ()=>{
const username = localStorage.getItem("user");
const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);
if(!snap.exists()) return;

const data = snap.data();
const el = document.getElementById("cardCVV");

el.innerText = data.cardCVV || "***";

setTimeout(()=> el.innerText="***",5000);
};

window.toggleCard = async ()=>{
const username = localStorage.getItem("user");
const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);
if(!snap.exists()) return;

const data = snap.data();
const newStatus = !data.cardFrozen;

await updateDoc(userRef,{cardFrozen:newStatus});

alert(newStatus ? "Card Frozen ❄️" : "Card Active ✅");
initDashboard();
};

// ===== INIT =====
async function initDashboard(){

const username = localStorage.getItem("user");
if(!username) return location.replace("index.html");

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);
if(!snap.exists()) return location.replace("index.html");

const data = snap.data();

// ===== SESSION =====
if(Number(localStorage.getItem("session")) !== Number(data.session)){
localStorage.clear();
return location.replace("index.html");
}

// ===== USER =====
document.getElementById("welcome").innerText = "Hello, " + (data.fullName || "User");
document.getElementById("nameProfile").innerText = data.fullName || "-";
document.getElementById("emailProfile").innerText = data.email || "-";

// ===== ACCOUNT =====
document.getElementById("routingNumber").innerText = data.routingNumber || "-";
document.getElementById("swift").innerText = data.swift || "-";
document.getElementById("bankAddress").innerText = data.bankAddress || "-";

// ===== BALANCES =====
let usdBalance = Number(data.usdBalance || 0);
let eurBalance = Number(data.balance || 0);
let gbpBalance = Number(data.gbpBalance || 0);

// ===== BALANCE UI =====
const balEl = document.getElementById("balance");
let hidden = false;

function renderBalance(){
balEl.innerText = hidden ? "••••••" : "$" + usdBalance.toLocaleString();
}

document.getElementById("toggleBalance").onclick = ()=>{
hidden = !hidden;
renderBalance();
};

renderBalance();

// ===== MULTI WALLET =====
document.getElementById("usdWallet").innerText = "$" + usdBalance.toLocaleString();
document.getElementById("eurWallet").innerText = "€" + eurBalance.toLocaleString();
document.getElementById("gbpWallet").innerText = "£" + gbpBalance.toLocaleString();

// ===== CONVERTER =====
document.getElementById("convertedEUR").innerText = "€" + (usdBalance * 0.92).toLocaleString();
document.getElementById("convertedGBP").innerText = "£" + (usdBalance * 0.78).toLocaleString();

// ===== TRANSACTIONS =====
let tx = getTx(data);
renderTransactions(tx);

// ===== PENDING =====
const pendingBox = document.getElementById("pendingTransactions");
const q = query(collection(db,"pendingTransfers"), where("sender","==",username));
const snapPending = await getDocs(q);

pendingBox.innerHTML = "";

if(snapPending.empty){
pendingBox.innerHTML = "<div class='tx'>No pending transfers</div>";
}else{
snapPending.forEach(d=>{
const p = d.data();

let label = "⏳ Pending";
if(p.status === "completed") label = "✅ Approved";
if(p.status === "failed") label = "❌ Rejected";

pendingBox.innerHTML += `
<div class="tx">
${label}<br>
$${Number(p.amount).toLocaleString()} → ${p.accountNumber || "----"}
</div>`;
});
}

// ===== 💳 CARD UI FIX =====
document.getElementById("cardNumber").innerText = maskCard(data.cardNumber);
document.getElementById("cardName").innerText = (data.fullName || "USER").toUpperCase();
document.getElementById("cardExpiry").innerText = data.cardExpiry || "12/28";
document.getElementById("cardCVV").innerText = "***";

const btn = document.getElementById("cardBtn");
if(btn){
btn.innerText = data.cardFrozen ? "Unfreeze Card" : "Freeze Card";
}

// ===== PIN =====
let pending = null;

function showPin(){
const modal = document.getElementById("pinModal");
modal.classList.remove("hidden");
modal.style.display = "flex";
}

function hidePin(){
const modal = document.getElementById("pinModal");
modal.classList.add("hidden");
modal.style.display = "none";
document.getElementById("pinInput").value = "";
}

// ===== TRANSFER =====
window.openPinModal = ()=>{

if(data.cardFrozen){
alert("Card is frozen ❄️");
return;
}

const acc = document.getElementById("accountNumber").value.trim();
const routing = document.getElementById("routingNumber").value.trim();
const desc = document.getElementById("description").value.trim();
const amount = parseFloat(document.getElementById("amount").value);

if(!acc || !routing || routing.length !== 9 || isNaN(amount) || amount <= 0){
alert("Enter valid details");
return;
}

pending = {acc, routing, desc, amount};
showPin();
};

window.closePin = hidePin;

window.confirmPin = async ()=>{

const pin = document.getElementById("pinInput").value;
if(pin !== data.pin) return alert("Wrong PIN");

await addDoc(collection(db,"pendingTransfers"),{
sender: username,
accountNumber: pending.acc,
routingNumber: pending.routing,
description: pending.desc || "Transfer",
amount: pending.amount,
date: new Date().toISOString(),
status: "pending"
});

hidePin();
alert("Transfer Submitted");
initDashboard();
};

// ===== BILL =====
window.payBill = async (name,amount)=>{
if(usdBalance < amount) return alert("Insufficient funds");

usdBalance -= amount;

tx.unshift({
amount:-amount,
note:name + " Bill",
reference: genRef(),
date:new Date().toISOString()
});

await updateDoc(userRef,{usdBalance,transactions:tx});
initDashboard();
};

// ===== GIFT =====
window.buyGiftCard = async (name,amount)=>{
if(usdBalance < amount) return alert("Insufficient funds");

usdBalance -= amount;

tx.unshift({
amount:-amount,
note:name + " Gift Card",
reference: genRef(),
date:new Date().toISOString()
});

await updateDoc(userRef,{usdBalance,transactions:tx});
initDashboard();
};

// ===== LOGOUT =====
window.logout = ()=>{
localStorage.clear();
location.replace("index.html");
};

}

initDashboard();