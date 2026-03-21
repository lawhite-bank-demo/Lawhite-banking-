// FIREBASE IMPORTS
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

// CONFIG
const firebaseConfig = {
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// SAFE TRANSACTIONS
function getSafeTransactions(data){
return data.transactions
? (Array.isArray(data.transactions)
? [...data.transactions]
: Object.values(data.transactions))
: [];
}

// INIT
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

// ===== USER INFO =====
document.getElementById("welcome").innerText = "Hello, " + data.fullName;

// ===== BALANCE =====
let balanceValue = data.currency==="USD"
? Number(data.usdBalance||0)
: Number(data.balance||0);

let currencySymbol = data.currency==="USD"?"$":"€";
let balanceField = data.currency==="USD"?"usdBalance":"balance";

const balanceEl = document.getElementById("balance");
const toggleEl = document.getElementById("toggleBalance");

let hidden = false;

function renderBalance(){
balanceEl.innerText = hidden
? "••••••"
: currencySymbol + balanceValue.toLocaleString();
toggleEl.innerText = hidden ? "👁 Show" : "👁 Hide";
}

toggleEl.onclick = ()=>{ hidden=!hidden; renderBalance(); };
renderBalance();

// ===== TRANSACTIONS =====
const box = document.getElementById("transactions");
box.innerHTML = "";

let txArray = getSafeTransactions(data);

txArray.sort((a,b)=>new Date(b.date)-new Date(a.date));

txArray.forEach(tx=>{
const amount = Number(tx.amount);
if(isNaN(amount)) return;

const color = amount>=0?"#22c55e":"#ef4444";
const sign = amount>=0?"+":"-";

const div = document.createElement("div");
div.className = "tx";

div.innerHTML = `
<div style="display:flex;justify-content:space-between;">
<div>
<strong>${tx.note || "Transaction"}</strong><br>
<span class="small">${new Date(tx.date).toLocaleString()}</span>
</div>
<div style="text-align:right;">
<span style="color:${color};font-weight:700;">
${sign}${currencySymbol}${Math.abs(amount).toLocaleString()}
</span>
</div>
</div>
`;

box.appendChild(div);
});

// ===== PENDING =====
const pendingBox = document.getElementById("pendingTransactions");

if(pendingBox){
const q = query(collection(db,"pendingTransfers"),where("sender","==",username));
const snapPending = await getDocs(q);

pendingBox.innerHTML = "";

if(snapPending.empty){
pendingBox.innerHTML = `<div class="tx">No pending transfers</div>`;
}else{
snapPending.forEach(d=>{
const p = d.data();

const div = document.createElement("div");
div.className = "tx";

div.innerHTML = `
<strong>⏳ Pending</strong><br>
${currencySymbol}${Number(p.amount).toLocaleString()} → ${p.iban}
<div class="small">${new Date(p.date).toLocaleString()}</div>
`;

pendingBox.appendChild(div);
});
}
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

// ALWAYS REFRESH DATA
const freshSnap = await getDoc(userRef);
const freshData = freshSnap.data();

let txArray = getSafeTransactions(freshData);
let newBalance = Number(freshData[balanceField] || 0);

if(newBalance < pendingTransfer.amount){
alert("Insufficient funds");
return;
}

newBalance -= pendingTransfer.amount;

const ref = "ACH-" + Math.floor(Math.random()*100000000);

txArray.unshift({
amount: -pendingTransfer.amount,
note: "Transfer to " + pendingTransfer.receiver,
date: new Date().toISOString(),
reference: ref,
status: "pending"
});

await updateDoc(userRef,{
[balanceField]: newBalance,
transactions: txArray
});

await addDoc(collection(db,"pendingTransfers"),{
sender: username,
iban: pendingTransfer.receiver,
amount: pendingTransfer.amount,
date: new Date().toISOString(),
status: "pending"
});

alert("Transfer Successful ✅");
location.reload();
};

// ===== ADD MONEY =====
window.addMoney = async ()=>{
const amount = parseFloat(prompt("Enter amount"));
if(isNaN(amount) || amount<=0) return;

balanceValue += amount;

txArray.unshift({
amount: amount,
note: "Deposit",
date: new Date().toISOString(),
status: "completed"
});

await updateDoc(userRef,{
[balanceField]: balanceValue,
transactions: txArray
});

location.reload();
};

// ===== PDF =====
window.downloadStatement = ()=>{

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

doc.setFontSize(16);
doc.text("DeChase Bank Statement",20,20);

doc.setFontSize(12);
doc.text("Name: "+data.fullName,20,30);
doc.text("Balance: "+currencySymbol+balanceValue,20,40);

let y = 50;

txArray.slice(0,20).forEach(tx=>{
doc.text(`${tx.note} (${tx.amount})`,20,y);
y+=8;
});

doc.save("statement.pdf");
};

// ===== LOGOUT =====
window.logout = ()=>{
localStorage.clear();
window.location.replace("index.html");
};

}

initDashboard();