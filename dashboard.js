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

function maskCard(num){
if(!num) return "**** **** **** ****";
return "**** **** **** " + num.replace(/\s/g,"").slice(-4);
}

function genRef(){
return "TRX-" + Math.floor(Math.random()*1000000000);
}

// ===== RENDER TRANSACTIONS =====
function renderTransactions(list){

const box = document.getElementById("transactions");
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

const color = amt >= 0 ? "#22c55e" : "#ef4444";
const sign = amt >= 0 ? "+" : "-";

let ref = t.reference || genRef();

box.innerHTML += `
<div class="tx">
<div style="display:flex;justify-content:space-between;">
<div>
<strong>${t.note || "Transaction"}</strong><br>
<small style="color:#9ca3af;">Ref: ${ref}</small><br>
<small style="color:#6b7280;">${new Date(t.date).toLocaleString()}</small>
</div>

<div style="color:${color};font-weight:bold;">
${sign}$${Math.abs(amt).toLocaleString()}
</div>
</div>
</div>
`;

});
}

// ===== INIT =====
async function initDashboard(){

const username = localStorage.getItem("user");
if(!username) return location.replace("index.html");

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);
if(!snap.exists()) return location.replace("index.html");

const data = snap.data();

// ===== USER =====
document.getElementById("welcome").innerText =
"Hello, " + (data.fullName || "User");

document.getElementById("nameProfile").innerText =
data.fullName || "-";

document.getElementById("emailProfile").innerText =
data.email || "-";

// ===== ACCOUNT (FIXED) =====
document.getElementById("routingDisplay").innerText =
data.routingNumber || "-";

document.getElementById("swift").innerText =
data.swift || "-";

document.getElementById("bankAddress").innerText =
data.bankAddress || "-";

// ===== BALANCE =====
let usdBalance = Number(data.usdBalance || 0);

const balEl = document.getElementById("balance");
let hidden = false;

function renderBalance(){
balEl.innerText = hidden
? "••••••"
: "$" + usdBalance.toLocaleString();
}

document.getElementById("toggleBalance").onclick = ()=>{
hidden = !hidden;
renderBalance();
};

renderBalance();

// ===== WALLET =====
document.getElementById("usdWallet").innerText =
"$" + usdBalance.toLocaleString();

document.getElementById("eurWallet").innerText =
"€" + Number(data.balance || 0).toLocaleString();

document.getElementById("gbpWallet").innerText =
"£" + Number(data.gbpBalance || 0).toLocaleString();

// ===== CONVERTER =====
document.getElementById("convertedEUR").innerText =
"€" + (usdBalance * 0.92).toLocaleString();

document.getElementById("convertedGBP").innerText =
"£" + (usdBalance * 0.78).toLocaleString();

// ===== TRANSACTIONS =====
renderTransactions(getTx(data));

// ===== PENDING =====
const pendingBox = document.getElementById("pendingTransactions");

const q = query(
collection(db,"pendingTransfers"),
where("sender","==",username)
);

const snapPending = await getDocs(q);

pendingBox.innerHTML = "";

if(snapPending.empty){
pendingBox.innerHTML = "<div class='tx'>No pending transfers</div>";
}else{
snapPending.forEach(d=>{
const p = d.data();

pendingBox.innerHTML += `
<div class="tx">
⏳ Pending<br>
$${Number(p.amount).toLocaleString()}
</div>`;
});
}

// ===== CARD =====
document.getElementById("cardNumber").innerText =
maskCard(data.cardNumber);

document.getElementById("cardName").innerText =
(data.fullName || "USER").toUpperCase();

document.getElementById("cardExpiry").innerText =
data.cardExpiry || "12/28";

document.getElementById("cardCVV").innerText = "***";

}

// ===== START =====
initDashboard();