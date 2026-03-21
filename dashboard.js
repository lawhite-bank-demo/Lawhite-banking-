// ===== FIREBASE IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore,
doc,
getDoc,
updateDoc,
collection,
getDocs,
addDoc,
query,
where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===== CONFIG =====
const firebaseConfig = {
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== HELPERS =====
function getSafeTransactions(data){
return data.transactions
? (Array.isArray(data.transactions)
? [...data.transactions]
: Object.values(data.transactions))
: [];
}

function calculateBalance(transactions){
let total = 0;
transactions.forEach(tx=>{
total += Number(tx.amount) || 0;
});
return total;
}

function formatDate(date){
return new Date(date).toLocaleString();
}

function showSuccess(msg){
const banner = document.getElementById("successBanner");
if(!banner) return;
banner.innerText = "✅ " + msg;
banner.style.display = "block";
setTimeout(()=>banner.style.display="none",2000);
}

// ===== INIT =====
async function initDashboard(){

const username = localStorage.getItem("user");
if(!username) return location.replace("index.html");

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);

if(!snap.exists()){
alert("User not found");
return location.replace("index.html");
}

const data = snap.data();

// ===== SESSION FIX =====
if(!data.session){
await updateDoc(userRef,{session:1});
}

if(Number(localStorage.getItem("session")) !== Number(data.session)){
localStorage.clear();
return location.replace("index.html");
}

// ===== USER INFO =====
document.getElementById("welcome").innerText = "Hello, " + data.fullName;
document.getElementById("nameProfile").innerText = data.fullName;
document.getElementById("emailProfile").innerText = data.email;

// ✅ FIXED ACCOUNT DETAILS
document.getElementById("iban").innerText = data.iban || "-";
document.getElementById("swift").innerText = data.swift || "-";
document.getElementById("bankAddress").innerText = data.address || "Berlin, Germany";

// ===== CARD =====
document.getElementById("cardNumber").innerText = data.cardNumber || "****";
document.getElementById("cardName").innerText = data.cardName || "-";

// ===== TRANSACTIONS =====
let txArray = getSafeTransactions(data);

// ===== BALANCE =====
let baseBalance = Number(data.baseBalance || 0);
let balanceValue = baseBalance + calculateBalance(txArray);

const currencySymbol = data.currency === "USD" ? "$" : "€";

// ===== BALANCE TOGGLE =====
const balanceEl = document.getElementById("balance");
const toggleEl = document.getElementById("toggleBalance");

let hidden = false;

function renderBalance(){
balanceEl.innerText = hidden
? "••••••"
: currencySymbol + balanceValue.toLocaleString();
toggleEl.innerText = hidden ? "👁 Show" : "👁 Hide";
}

toggleEl.onclick = ()=>{
hidden = !hidden;
renderBalance();
};

renderBalance();

// ===== TRANSACTION UI =====
const box = document.getElementById("transactions");
box.innerHTML = "";

txArray.sort((a,b)=>new Date(b.date)-new Date(a.date));

txArray.forEach(tx=>{
const amount = Number(tx.amount);
if(isNaN(amount)) return;

const color = amount >= 0 ? "#22c55e" : "#ef4444";
const sign = amount >= 0 ? "+" : "-";

const status = tx.status || "completed";

let statusText = "✅ Completed";
if(status==="pending") statusText="⏳ Pending";
if(status==="failed") statusText="❌ Failed";

const div = document.createElement("div");
div.className = "tx";

div.innerHTML = `
<strong>${tx.note || "Transaction"}</strong><br>
<span style="color:${color};font-weight:600;">
${sign}${currencySymbol}${Math.abs(amount).toLocaleString()}
</span>
<div class="small">${statusText}</div>
<div class="small">Ref: ${tx.reference || "-"}</div>
<div class="small">${formatDate(tx.date)}</div>
`;

box.appendChild(div);
});

// ===== PENDING =====
const pendingBox = document.getElementById("pendingTransactions");

const q = query(collection(db,"pendingTransfers"),where("sender","==",username));
const snapPending = await getDocs(q);

pendingBox.innerHTML = "";

if(snapPending.empty){
pendingBox.innerHTML = `<div class="tx">No pending transfers</div>`;
}else{
snapPending.forEach(d=>{
const p = d.data();

pendingBox.innerHTML += `
<div class="tx">
⏳ ${currencySymbol}${Number(p.amount).toLocaleString()} → ${p.iban}
<br><small>${formatDate(p.date)}</small>
</div>
`;
});
}

// ===== TRANSFER =====
let pendingTransfer = null;

window.openPinModal = ()=>{
const receiver = document.getElementById("receiver").value.trim();
const amount = parseFloat(document.getElementById("amount").value);

if(!receiver || isNaN(amount) || amount<=0){
alert("Enter valid details");
return;
}

pendingTransfer = {receiver, amount};
document.getElementById("pinModal").style.display="flex";
};

window.closePin = ()=>{
document.getElementById("pinModal").style.display="none";
};

window.confirmPin = async ()=>{

const enteredPin = document.getElementById("pinInput").value;

if(enteredPin !== data.pin){
alert("Wrong PIN");
return;
}

let newBalance = calculateBalance(txArray);

if(newBalance < pendingTransfer.amount){
alert("Insufficient funds");
return;
}

const ref = "ACH-" + Math.floor(Math.random()*100000000);

// ADD TX
txArray.unshift({
amount: -pendingTransfer.amount,
note: "Transfer to " + pendingTransfer.receiver,
date: new Date().toISOString(),
reference: ref,
status: "pending"
});

await updateDoc(userRef,{transactions: txArray});

// SAVE PENDING
await addDoc(collection(db,"pendingTransfers"),{
sender: username,
iban: pendingTransfer.receiver,
amount: pendingTransfer.amount,
date: new Date().toISOString(),
status: "pending"
});

showSuccess("Transfer Successful");
location.reload();
};

// ===== BILL =====
window.payBill = async (name, amount)=>{
txArray.unshift({
amount: -amount,
note: name + " Bill",
date: new Date().toISOString(),
status: "completed"
});

await updateDoc(userRef,{transactions: txArray});
showSuccess(name+" paid");
location.reload();
};

// ===== GIFT =====
window.buyGiftCard = async (store, amount)=>{
txArray.unshift({
amount: -amount,
note: store + " Gift Card",
date: new Date().toISOString(),
status: "completed"
});

await updateDoc(userRef,{transactions: txArray});
showSuccess(store+" purchased");
location.reload();
};

// ===== PDF =====
window.downloadStatement = ()=>{
const { jsPDF } = window.jspdf;
const doc = new jsPDF();

let y = 20;

doc.text("DeChase Bank Statement",20,y);
y+=10;

doc.text("Name: "+data.fullName,20,y); y+=8;
doc.text("Balance: "+currencySymbol+balanceValue.toLocaleString(),20,y);

doc.save("statement.pdf");
};

// ===== LOGOUT =====
window.logout = ()=>{
localStorage.clear();
location.replace("index.html");
};

}

initDashboard();