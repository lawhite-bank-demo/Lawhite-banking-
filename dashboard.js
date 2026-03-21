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

// ===== INIT =====
async function initDashboard(){

const username = localStorage.getItem("user");
if(!username) return location.replace("index.html");

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);

if(!snap.exists()) return location.replace("index.html");

const data = snap.data();

// ===== SESSION SECURITY =====
if(Number(localStorage.getItem("session")) !== Number(data.session)){
localStorage.clear();
return location.replace("index.html");
}

// ===== USER INFO =====
document.getElementById("welcome").innerText = "Hello, " + data.fullName;
document.getElementById("nameProfile").innerText = data.fullName;
document.getElementById("emailProfile").innerText = data.email;

// ===== ACCOUNT DETAILS =====
document.getElementById("iban").innerText = data.iban || "-";
document.getElementById("swift").innerText = data.swift || "-";
document.getElementById("bankAddress").innerText = data.bankAddress || "DeChase Bank";

// ===== BALANCES =====
let usdBalance = Number(data.usdBalance || 0);
let eurBalance = Number(data.balance || 0);
let gbpBalance = Number(data.gbpBalance || 0);

// ===== BALANCE UI =====
const balEl = document.getElementById("balance");
const toggle = document.getElementById("toggleBalance");

let hidden = false;

function renderBalance(){
balEl.innerText = hidden
? "••••••"
: "$" + usdBalance.toLocaleString();

toggle.innerText = hidden ? "👁 Show" : "👁 Hide";
}

toggle.onclick = ()=>{
hidden = !hidden;
renderBalance();
};

renderBalance();

// ===== MULTI WALLET =====
document.getElementById("eurWallet").innerText = eurBalance.toLocaleString();
document.getElementById("usdWallet").innerText = usdBalance.toLocaleString();
document.getElementById("gbpWallet").innerText = gbpBalance.toLocaleString();

// ===== TRANSACTIONS =====
let tx = getTx(data);
tx.sort((a,b)=> new Date(b.date)-new Date(a.date));

const box = document.getElementById("transactions");
box.innerHTML = "";

tx.forEach(t=>{
const amt = Number(t.amount || 0);
if(isNaN(amt)) return;

const color = amt >= 0 ? "#22c55e" : "#ef4444";

box.innerHTML += `
<div class="tx">
<strong>${t.note || "Transaction"}</strong><br>
<span style="color:${color};font-weight:600;">
${amt>=0?"+":"-"}$${Math.abs(amt).toLocaleString()}
</span>
<div class="small">${new Date(t.date).toLocaleString()}</div>
</div>
`;
});

// ===== PENDING =====
const pendingBox = document.getElementById("pendingTransactions");

const q = query(collection(db,"pendingTransfers"), where("sender","==",username));
const pSnap = await getDocs(q);

pendingBox.innerHTML = "";

if(pSnap.empty){
pendingBox.innerHTML = "<div class='tx'>No pending transfers</div>";
}else{
pSnap.forEach(d=>{
const p = d.data();
pendingBox.innerHTML += `
<div class="tx">
⏳ $${Number(p.amount).toLocaleString()} → ${p.iban}
</div>`;
});
}

// ===== TRANSFER =====
let pending = null;

// OPEN PIN
window.openPinModal = ()=>{
const r = document.getElementById("receiver").value.trim();
const a = parseFloat(document.getElementById("amount").value);

if(!r || isNaN(a) || a <= 0){
alert("Enter valid details");
return;
}

pending = {r,a};
document.getElementById("pinModal").style.display = "flex";
};

// CLOSE PIN
window.closePin = ()=>{
document.getElementById("pinModal").style.display = "none";
document.getElementById("pinInput").value = "";
};

// CONFIRM PIN
window.confirmPin = async ()=>{

const enteredPin = document.getElementById("pinInput").value;

if(!enteredPin) return alert("Enter PIN");
if(enteredPin !== data.pin) return alert("Incorrect PIN");
if(!pending) return alert("No transaction");

// BALANCE CHECK
if(usdBalance < pending.a){
alert("Insufficient funds");
return;
}

// UPDATE BALANCE
usdBalance -= pending.a;

await updateDoc(userRef,{
usdBalance: usdBalance
});

// SAVE TRANSACTION
tx.unshift({
amount: -pending.a,
note: "Transfer",
date: new Date().toISOString()
});

await updateDoc(userRef,{
transactions: tx
});

// SAVE PENDING TRANSFER
await addDoc(collection(db,"pendingTransfers"),{
sender: username,
iban: pending.r,
amount: pending.a,
date: new Date().toISOString()
});

// RESET UI
closePin();

alert("Transfer Successful");
location.reload();
};

// ===== PAY BILL =====
window.payBill = async (name,amount)=>{

if(usdBalance < amount) return alert("Insufficient funds");

usdBalance -= amount;

await updateDoc(userRef,{
usdBalance: usdBalance
});

tx.unshift({
amount:-amount,
note:name+" Bill",
date:new Date().toISOString()
});

await updateDoc(userRef,{transactions:tx});

alert("Bill Paid");
location.reload();
};

// ===== GIFT CARD =====
window.buyGiftCard = async (name,amount)=>{

if(usdBalance < amount) return alert("Insufficient funds");

usdBalance -= amount;

await updateDoc(userRef,{
usdBalance: usdBalance
});

tx.unshift({
amount:-amount,
note:name+" Gift Card",
date:new Date().toISOString()
});

await updateDoc(userRef,{transactions:tx});

alert("Gift Purchased");
location.reload();
};

// ===== LOGOUT =====
window.logout = ()=>{
localStorage.clear();
location.replace("index.html");
};

}

initDashboard();