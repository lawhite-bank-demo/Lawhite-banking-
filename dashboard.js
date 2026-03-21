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


// FIREBASE CONFIG
const firebaseConfig = {
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// INIT DASHBOARD
async function initDashboard(){

const username = localStorage.getItem("user");

if(!username){
window.location.replace("index.html");
return;
}

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);

if(!snap.exists()){
alert("User not found");
window.location.replace("index.html");
return;
}

const data = snap.data();

// SESSION CHECK
const savedSession = Number(localStorage.getItem("session"));
const firebaseSession = Number(data.session);

if(savedSession !== firebaseSession){
localStorage.clear();
window.location.replace("index.html");
return;
}


// SUCCESS BANNER
function showSuccess(message){
const banner = document.getElementById("successBanner");
banner.innerText = "✅ " + message;
banner.style.display = "block";
setTimeout(()=>{banner.style.display="none";},2000);
}


// DATE FORMAT
function formatDate(date){
return new Date(date).toLocaleString();
}


// USER INFO
document.getElementById("welcome").innerText="Hello, "+data.fullName;
document.getElementById("name").innerText=data.fullName;
document.getElementById("acc").innerText=data.accountNumber;


// ACCOUNT DETAILS
document.getElementById("iban").innerText = data.accountNumber || "-";
document.getElementById("swift").innerText = data.swift || "-";
document.getElementById("bankAddress").innerText = data.bankAddress || "-";
document.getElementById("bankAddressSupport").innerText = data.bankAddress || "-";


// PROFILE
document.getElementById("nameProfile").innerText=data.fullName;
document.getElementById("emailProfile").innerText=data.email;


// BALANCE SYSTEM
let balanceValue = 0;
let currencySymbol = "€";
let balanceField = "balance";

if(data.currency === "USD"){
balanceValue = Number(data.usdBalance || 0);
currencySymbol = "$";
balanceField = "usdBalance";
}else{
balanceValue = Number(data.balance || 0);
currencySymbol = "€";
balanceField = "balance";
}

let hidden = false;

const balanceEl = document.getElementById("balance");
const toggleEl = document.getElementById("toggleBalance");

function renderBalance(){
if(hidden){
balanceEl.innerText="••••••";
toggleEl.innerText="👁 Show balance";
}else{
balanceEl.innerText = currencySymbol + balanceValue.toLocaleString();
toggleEl.innerText="👁 Hide balance";
}
}

toggleEl.onclick=()=>{
hidden=!hidden;
renderBalance();
};

renderBalance();


// WALLET
document.getElementById("eurWallet").innerText=Number(data.balance||0).toLocaleString();
document.getElementById("usdWallet").innerText=Number(data.usdBalance||0).toLocaleString();
document.getElementById("gbpWallet").innerText=Number(data.gbpBalance||0).toLocaleString();
document.getElementById("audWallet").innerText=Number(data.audBalance||0).toLocaleString();


// CARD
document.getElementById("cardNumber").innerText=data.cardNumber||"0000 0000 0000 0000";
document.getElementById("cardName").innerText=data.cardName||"-";
document.getElementById("cardExpiry").innerText=data.cardExpiry||"--/--";

const cvvElement=document.getElementById("cardCVV");

window.revealCVV=()=>{
cvvElement.innerText=data.cardCVV;
setTimeout(()=>{cvvElement.innerText="***";},5000);
};


// PAY BILL
window.payBill = async function(name, amount){

if(balanceValue < amount){
alert("Insufficient balance");
return;
}

balanceValue -= amount;

await updateDoc(userRef,{ [balanceField]: balanceValue });

showSuccess(name+" bill paid");
location.reload();
};


// BUY GIFT CARD
window.buyGiftCard = async function(store, amount){

if(balanceValue < amount){
alert("Insufficient balance");
return;
}

balanceValue -= amount;

await updateDoc(userRef,{ [balanceField]: balanceValue });

showSuccess(store+" gift card purchased");
location.reload();
};


// TRANSACTIONS
const box=document.getElementById("transactions");
box.innerHTML="";

let txArray=[];

if(data.transactions){
txArray = Array.isArray(data.transactions)
? data.transactions
: Object.values(data.transactions);
}

if(txArray.length===0){
box.innerHTML=`<div class="tx">No transactions yet</div>`;
}else{

txArray.sort((a,b)=>new Date(b.date)-new Date(a.date));

txArray.slice(0,20).forEach(tx=>{

const amount = parseFloat(tx.amount) || 0;
const color=amount>=0?"#22c55e":"#ef4444";
const sign=amount>=0?"+":"-";

const div=document.createElement("div");
div.className="tx";

div.innerHTML=`
<strong>${tx.note||"Transaction"}</strong><br>
<span style="color:${color};font-weight:600;">
${sign}${currencySymbol}${Math.abs(amount).toLocaleString()}
</span>
<div class="small">Ref: ${tx.reference || "-"}</div>
<div class="small">${formatDate(tx.date)}</div>
`;

box.appendChild(div);

});
}


// PENDING TRANSFERS
const pendingBox=document.getElementById("pendingTransactions");

const q=query(collection(db,"pendingTransfers"),where("sender","==",username));
const pendingSnap=await getDocs(q);

if(pendingSnap.empty){
pendingBox.innerHTML=`<div class="tx">No pending transfers</div>`;
}else{
pendingSnap.forEach(docu=>{
const p=docu.data();

const div=document.createElement("div");
div.className="tx";

div.innerHTML=`
<strong>🏦 Transfer Pending</strong><br>
${currencySymbol}${Number(p.amount).toLocaleString()} → ${p.iban}
<div class="small">${formatDate(p.date)}</div>
`;

pendingBox.appendChild(div);
});
}


// 🔥 FINAL AUTO TRANSFER SYSTEM (ONLY ONE)
window.askPin = async () => {

const receiverValue = document.getElementById("receiver").value.trim();
const amountValue = parseFloat(document.getElementById("amount").value);

if(!receiverValue || isNaN(amountValue) || amountValue <= 0){
alert("Enter valid details");
return;
}

if(prompt("Enter PIN") !== data.pin){
alert("Wrong PIN");
return;
}

if(balanceValue < amountValue){
alert("Insufficient funds");
return;
}

const ref = "ACH-" + Math.floor(Math.random()*100000000);

balanceValue -= amountValue;

let txArray = data.transactions
? (Array.isArray(data.transactions) ? data.transactions : Object.values(data.transactions))
: [];

txArray.unshift({
amount: -amountValue,
note: "Transfer to " + receiverValue,
date: new Date().toISOString(),
reference: ref
});

await updateDoc(userRef,{
[balanceField]: balanceValue,
transactions: txArray
});

await addDoc(collection(db,"pendingTransfers"),{
sender: username,
iban: receiverValue,
amount: amountValue,
date: new Date().toISOString(),
status: "pending"
});

alert("Transfer Successful ✅");
location.reload();

};


// LOGOUT
window.logout=()=>{
localStorage.clear();
window.location.replace("index.html");
};

}

initDashboard();