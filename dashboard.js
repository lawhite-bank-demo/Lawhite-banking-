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

// ===== SAFE UI SET =====
function setText(id,value){
if(el(id)) el(id).innerText = value;
}

// ===== RENDER TRANSACTIONS (FIXED) =====
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

const amt = Number(t.amount);

// ❌ REMOVE BAD / EMPTY TRANSACTIONS
if(!t || isNaN(amt) || amt === 0) return;

// ❌ REMOVE FAKE AMAZON ENTRY
if((t.note || "").toLowerCase().includes("amazon") && amt === 0) return;

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

// ===== GLOBAL TRANSFER =====
let pending = null;

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
setText("usdWallet","$" + usdBalance.toLocaleString());
setText("eurWallet","€" + Number(data.balance || 0).toLocaleString());
setText("gbpWallet","£" + Number(data.gbpBalance || 0).toLocaleString());

// ===== CONVERTER =====
setText("convertedEUR","€" + (usdBalance * 0.92).toLocaleString());
setText("convertedGBP","£" + (usdBalance * 0.78).toLocaleString());

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

let label = "⏳ Pending";
if(p.status === "completed") label = "✅ Approved";
if(p.status === "failed") label = "❌ Rejected";

box.innerHTML += `
<div class="tx">
${label}<br>
$${Number(p.amount).toLocaleString()}
</div>
`;

// ===== AUTO CREDIT =====
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
setText("cardNumber",maskCard(data.cardNumber));
setText("cardName",(data.fullName || "USER").toUpperCase());
setText("cardExpiry",data.cardExpiry || "12/28");
setText("cardCVV","***");

// ===== TRANSFER =====
window.openPinModal = ()=>{

const acc = el("accountNumber")?.value.trim();
const routing = el("routingNumber")?.value.trim();
const desc = el("description")?.value.trim();
const amount = parseFloat(el("amount")?.value);

if(!acc || !routing || routing.length !== 9 || isNaN(amount) || amount <= 0){
alert("Enter valid details");
return;
}

if(amount > usdBalance){
alert("Insufficient funds");
return;
}

pending = {acc, routing, desc, amount};

if(el("pinModal")) el("pinModal").classList.remove("hidden");
};

window.closePin = ()=>{
if(el("pinModal")) el("pinModal").classList.add("hidden");
if(el("pinInput")) el("pinInput").value = "";
};

window.confirmPin = async ()=>{

const pin = el("pinInput")?.value;
if(pin !== data.pin) return alert("Wrong PIN");

// deduct
usdBalance -= pending.amount;

tx.unshift({
amount: -pending.amount,
note: "Transfer Sent",
reference: genRef(),
date: new Date().toISOString()
});

await updateDoc(userRef,{ usdBalance, transactions: tx });

// save pending
await addDoc(collection(db,"pendingTransfers"),{
sender: username,
accountNumber: pending.acc,
routingNumber: pending.routing,
description: pending.desc || "Transfer",
amount: pending.amount,
date: new Date().toISOString(),
status: "pending",
processed:false
});

if(el("pinModal")) el("pinModal").classList.add("hidden");

alert("Transfer Submitted");

renderBalance();
renderTransactions(tx);
};

// ===== 💡 BILL PAYMENT =====
window.payBill = async (name,amount)=>{

if(amount > usdBalance) return alert("Insufficient funds");

usdBalance -= amount;

tx.unshift({
amount: -amount,
note: name + " Bill",
reference: genRef(),
date: new Date().toISOString()
});

await updateDoc(userRef,{ usdBalance, transactions: tx });

renderBalance();
renderTransactions(tx);
};

// ===== 🎁 GIFT CARD =====
window.buyGiftCard = async (name,amount)=>{

if(amount > usdBalance) return alert("Insufficient funds");

usdBalance -= amount;

tx.unshift({
amount: -amount,
note: name + " Gift Card",
reference: genRef(),
date: new Date().toISOString()
});

await updateDoc(userRef,{ usdBalance, transactions: tx });

renderBalance();
renderTransactions(tx);
};

// ===== STATEMENT =====
window.downloadStatement = ()=>{
let content = `DECHASE BANK STATEMENT\n\nName: ${data.fullName}\nBalance: $${usdBalance}\n\n`;

tx.forEach(t=>{
content += `${t.note} | ${t.amount} | ${new Date(t.date).toLocaleString()}\n`;
});

const blob = new Blob([content], { type: "text/plain" });
const url = URL.createObjectURL(blob);

const a = document.createElement("a");
a.href = url;
a.download = "statement.txt";
a.click();
};

}

initDashboard();