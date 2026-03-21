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
? (Array.isArray(data.transactions) ? data.transactions : Object.values(data.transactions))
: [];
}

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
document.getElementById("welcome").innerText = "Hello, " + data.fullName;
document.getElementById("nameProfile").innerText = data.fullName;
document.getElementById("emailProfile").innerText = data.email;

// ===== ACCOUNT =====
document.getElementById("iban").innerText = data.iban || "-";
document.getElementById("swift").innerText = data.swift || "-";
document.getElementById("bankAddress").innerText = data.bankAddress || "-";

// ===== BALANCES =====
let usdBalance = Number(data.usdBalance || 0);
let eurBalance = Number(data.balance || 0);
let gbpBalance = Number(data.gbpBalance || 0);

// ===== BALANCE UI =====
const balEl = document.getElementById("balance");
let hidden = false;

document.getElementById("toggleBalance").onclick = ()=>{
hidden = !hidden;
renderBalance();
};

function renderBalance(){
balEl.innerText = hidden ? "••••••" : "$" + usdBalance.toLocaleString();
}

renderBalance();

// ===== MULTI WALLET =====
document.getElementById("usdWallet").innerText = "$"+usdBalance.toLocaleString();
document.getElementById("eurWallet").innerText = "€"+eurBalance.toLocaleString();
document.getElementById("gbpWallet").innerText = "£"+gbpBalance.toLocaleString();

// ===== LIVE CONVERTER (simple auto conversion) =====
const rateEUR = 0.92;
const rateGBP = 0.78;

document.getElementById("convertedEUR").innerText =
"€"+(usdBalance * rateEUR).toLocaleString();

document.getElementById("convertedGBP").innerText =
"£"+(usdBalance * rateGBP).toLocaleString();

// ===== TRANSACTIONS (FIXED) =====
let tx = getTx(data);
const box = document.getElementById("transactions");

box.innerHTML = "";

if(tx.length === 0){
box.innerHTML = "<div class='tx'>No transactions</div>";
}else{
tx.sort((a,b)=> new Date(b.date)-new Date(a.date));

tx.forEach(t=>{
const amt = Number(t.amount || 0);
const color = amt >= 0 ? "#22c55e" : "#ef4444";

box.innerHTML += `
<div class="tx">
<strong>${t.note || "Transaction"}</strong><br>
<span style="color:${color}">
${amt>=0?"+":"-"}$${Math.abs(amt).toLocaleString()}
</span>
<div class="small">${new Date(t.date).toLocaleString()}</div>
</div>
`;
});
}

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
pendingBox.innerHTML += `
<div class="tx">
⏳ $${p.amount} → ${p.iban}
</div>`;
});
}

// ===== TRANSFER (PIN ONLY HERE) =====
let pending = null;

window.openPinModal = ()=>{
const r = document.getElementById("receiver").value.trim();
const a = parseFloat(document.getElementById("amount").value);

if(!r || isNaN(a) || a<=0){
alert("Enter valid details");
return;
}

pending = {r,a};
document.getElementById("pinModal").classList.remove("hidden");
};

window.closePin = ()=>{
document.getElementById("pinModal").classList.add("hidden");
document.getElementById("pinInput").value="";
};

window.confirmPin = async ()=>{
const pin = document.getElementById("pinInput").value;

if(pin !== data.pin) return alert("Wrong PIN");

if(usdBalance < pending.a) return alert("Insufficient funds");

usdBalance -= pending.a;

await updateDoc(userRef,{usdBalance});

tx.unshift({
amount:-pending.a,
note:"Transfer",
date:new Date().toISOString()
});

await updateDoc(userRef,{transactions:tx});

await addDoc(collection(db,"pendingTransfers"),{
sender:username,
iban:pending.r,
amount:pending.a,
date:new Date().toISOString()
});

closePin();
alert("Transfer Successful");
location.reload();
};

// ===== BILL =====
window.payBill = async (name,amount)=>{
usdBalance -= amount;
await updateDoc(userRef,{usdBalance});

tx.unshift({amount:-amount,note:name,date:new Date().toISOString()});
await updateDoc(userRef,{transactions:tx});

location.reload();
};

// ===== GIFT =====
window.buyGiftCard = async (name,amount)=>{
usdBalance -= amount;
await updateDoc(userRef,{usdBalance});

tx.unshift({amount:-amount,note:name,date:new Date().toISOString()});
await updateDoc(userRef,{transactions:tx});

location.reload();
};

// ===== LOGOUT =====
window.logout = ()=>{
localStorage.clear();
location.replace("index.html");
};

}

initDashboard();