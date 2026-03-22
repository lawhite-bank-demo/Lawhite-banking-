// ===== FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore, doc, getDoc, updateDoc,
collection, addDoc, query, where,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp({
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
});

const db = getFirestore(app);

// ===== SAFE GET ELEMENT =====
function el(id){
return document.getElementById(id);
}

// ===== HELPERS =====
function getTx(data){
return data.transactions
? (Array.isArray(data.transactions)
? [...data.transactions]
: Object.values(data.transactions))
: [];
}

function maskCard(num){
if(!num) return "**** **** **** ****";
return "**** **** **** " + num.replace(/\s/g,"").slice(-4);
}

function genRef(){
return "TRX-" + Math.floor(Math.random()*1000000000);
}

// ===== RENDER TRANSACTIONS =====
function renderTransactions(list){
const box = el("transactions");
if(!box) return;

box.innerHTML = "";

if(!list || list.length === 0){
box.innerHTML = "<div class='tx'>No transactions</div>";
return;
}

list.sort((a,b)=> new Date(b.date) - new Date(a.date));

list.forEach(t=>{
const amt = Number(t.amount || 0);
if(isNaN(amt)) return;

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

// ===== SAFE UI SET =====
if(el("welcome")) el("welcome").innerText = "Hello, " + (data.fullName || "User");
if(el("routingDisplay")) el("routingDisplay").innerText = data.routingNumber || "-";
if(el("swift")) el("swift").innerText = data.swift || "-";
if(el("bankAddress")) el("bankAddress").innerText = data.bankAddress || "-";

// ===== BALANCE =====
let hidden = false;

function renderBalance(){
if(!el("balance")) return;
el("balance").innerText = hidden ? "••••••" : "$" + usdBalance.toLocaleString();
}

if(el("toggleBalance")){
el("toggleBalance").onclick = ()=>{
hidden = !hidden;
renderBalance();
};
}

renderBalance();

// ===== WALLET =====
if(el("usdWallet")) el("usdWallet").innerText = "$" + usdBalance.toLocaleString();
if(el("eurWallet")) el("eurWallet").innerText = "€" + Number(data.balance || 0).toLocaleString();
if(el("gbpWallet")) el("gbpWallet").innerText = "£" + Number(data.gbpBalance || 0).toLocaleString();

// ===== CONVERTER =====
if(el("convertedEUR")) el("convertedEUR").innerText = "€" + (usdBalance * 0.92).toLocaleString();
if(el("convertedGBP")) el("convertedGBP").innerText = "£" + (usdBalance * 0.78).toLocaleString();

// ===== TRANSACTIONS =====
renderTransactions(tx);

// ===== REALTIME PENDING =====
const q = query(collection(db,"pendingTransfers"), where("sender","==",username));

onSnapshot(q, async (snapshot)=>{

const box = el("pendingTransactions");
if(!box) return;

box.innerHTML = "";

snapshot.forEach(async d=>{
const p = d.data();

box.innerHTML += `
<div class="tx">
${p.status || "pending"}<br>
$${Number(p.amount).toLocaleString()}
</div>
`;

// AUTO CREDIT
if(p.status === "completed" && !p.processed){

usdBalance += Number(p.amount);

tx.unshift({
amount: Number(p.amount),
note: "Transfer Received",
reference: genRef(),
date: new Date().toISOString()
});

await updateDoc(userRef,{ usdBalance, transactions: tx });

await updateDoc(doc(db,"pendingTransfers",d.id),{
processed:true
});

renderBalance();
renderTransactions(tx);
}

});

});

// ===== CARD =====
if(el("cardNumber")) el("cardNumber").innerText = maskCard(data.cardNumber);
if(el("cardName")) el("cardName").innerText = (data.fullName || "USER").toUpperCase();
if(el("cardExpiry")) el("cardExpiry").innerText = data.cardExpiry || "12/28";
if(el("cardCVV")) el("cardCVV").innerText = "***";

}

initDashboard();