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


// OTP SYSTEM

let currentOTP = null;
let otpExpiry = null;

async function sendOTP(email){

if(!window.emailjs){
alert("Email system not loaded");
return false;
}

const otp = Math.floor(100000 + Math.random()*900000);

currentOTP = otp;
otpExpiry = Date.now() + 180000;

try{

await emailjs.send(
"service_ab123cd",
"template_x9k21a",
{
to_email: email,
otp: otp
}
);

return true;

}catch(err){

console.error(err);
alert("Failed to send OTP email");
return false;

}

}


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

const savedSession = Number(localStorage.getItem("session"));
const firebaseSession = Number(data.session);

if(savedSession !== firebaseSession){
localStorage.removeItem("user");
localStorage.removeItem("session");
window.location.replace("index.html");
return;
}


// SUCCESS BANNER

function showSuccess(message){

const banner = document.getElementById("successBanner");

banner.innerText = "✅ " + message;
banner.style.display = "block";

setTimeout(()=>{
banner.style.display = "none";
},2000);

}


// DATE FORMAT

function formatDate(date){
return new Date(date).toLocaleString();
}


// USER INFO (SAFE VERSION)

const welcomeEl = document.getElementById("welcome");
if(welcomeEl) welcomeEl.innerText = "Hello, " + data.fullName;

const nameEl = document.getElementById("name");
if(nameEl) nameEl.innerText = data.fullName;

const accEl = document.getElementById("acc");
if(accEl) accEl.innerText = data.accountNumber;

console.log("User loaded:", data);

// ✅ REAL US / EU SWITCH

const ibanSection = document.getElementById("ibanSection");
const usSection = document.getElementById("usAccountSection");

if(data.country === "USA"){

    if(ibanSection) ibanSection.style.display = "none";
    if(usSection) usSection.style.display = "block";

 const acc = data.accountNumber || "";
const masked = acc.slice(-4).padStart(acc.length, "*");

// show masked
const maskedEl = document.getElementById("accountNumberMasked");
if(maskedEl) maskedEl.innerText = masked;

// keep real for copy
const realEl = document.getElementById("accountNumber");
if(realEl) realEl.innerText = acc;
    document.getElementById("routingNumber").innerText = data.routingNumber || "-";

}else{

    if(ibanSection) ibanSection.style.display = "block";
    if(usSection) usSection.style.display = "none";

    document.getElementById("iban").innerText = data.iban || "-";
}

const swiftEl = document.getElementById("swift");
if(swiftEl) swiftEl.innerText = data.swift || "-";

// BANK ADDRESS

document.getElementById("bankAddress").innerText=data.bankAddress || "-";
document.getElementById("bankAddressSupport").innerText=data.bankAddress || "-";


// PROFILE

document.getElementById("nameProfile").innerText=data.fullName;
document.getElementById("emailProfile").innerText=data.email;


// BALANCE

let balanceValue = 0;
let currencySymbol = "€";
let balanceField = "balance";

if(data.currency === "USD"){
    balanceValue = Number(data.usdBalance || 0);
    currencySymbol = "$";
    balanceField = "usdBalance";
}else{
    balanceValue = Number(data.balance || 0);
}

let hidden = false;

const balanceEl = document.getElementById("balance");
const toggleEl = document.getElementById("toggleBalance");

function renderBalance(){
balanceEl.innerText = hidden ? "••••••" : currencySymbol + balanceValue.toLocaleString();
toggleEl.innerText = hidden ? "👁 Show balance" : "👁 Hide balance";
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

if(balanceValue < amount) return alert("Insufficient balance");

balanceValue -= amount;

await updateDoc(userRef,{ [balanceField]: balanceValue });

showSuccess(name+" bill paid");

showReceipt(`
<b>${name} Bill Payment</b><br><br>
Amount: ${currencySymbol}${amount}<br>
Date: ${new Date().toLocaleString()}
`);

location.reload();

};


// BUY GIFT CARD

window.buyGiftCard = async function(store, amount){

if(balanceValue < amount) return alert("Insufficient balance");

balanceValue -= amount;

await updateDoc(userRef,{ [balanceField]: balanceValue });

showSuccess(store+" gift card purchased");

showReceipt(`
<b>${store} Gift Card</b><br><br>
Amount: ${currencySymbol}${amount}<br>
Date: ${new Date().toLocaleString()}
`);

location.reload();

};


// TRANSACTIONS

const box=document.getElementById("transactions");
box.innerHTML="";

let txArray = data.transactions
? (Array.isArray(data.transactions)?data.transactions:Object.values(data.transactions))
: [];

if(txArray.length===0){
box.innerHTML=`<div class="tx">No transactions yet</div>`;
}else{

txArray.sort((a,b)=>new Date(b.date)-new Date(a.date));

txArray.slice(0,20).forEach(tx=>{

const amount=Number(tx.amount||0);
const color=amount>=0?"#22c55e":"#ef4444";

box.innerHTML += `
<div class="tx">
<strong>${tx.note || "Transaction"}</strong><br>
<span style="color:${color};font-weight:600;">
${amount >= 0 ? "+" : "-"}${currencySymbol}${Math.abs(amount).toLocaleString()}
</span>
<div class="small">Ref: ${tx.reference || "N/A"}</div>
<div class="small">${formatDate(tx.date)}</div>
</div>
`;
});

// PENDING

const pendingBox = document.getElementById("pendingTransactions");

const pendingSnap = await getDocs(
  query(collection(db,"pendingTransfers"), where("sender","==",username))
);

pendingBox.innerHTML = pendingSnap.empty
? `<div class="tx">No pending transfers</div>`
: "";

pendingSnap.forEach(docu=>{
const p=docu.data();

pendingBox.innerHTML += `
<div class="tx">
<strong>🏦 Transfer Pending</strong><br>
${currencySymbol}${Number(p.amount).toLocaleString()} → ${p.iban}
<div class="small">${formatDate(p.date)}</div>
</div>
`;
});


// TRANSFER

window.askPin=async()=>{

const receiverValue=document.getElementById("receiver").value.trim();
const amountValue=parseFloat(document.getElementById("amount").value);

if(prompt("Enter PIN")!==data.pin) return alert("Wrong PIN");
if(balanceValue<amountValue) return alert("Insufficient funds");

const sent = await sendOTP(data.email);
if(!sent) return;

if(prompt("Enter OTP")!=currentOTP) return alert("Invalid OTP");

await addDoc(collection(db,"pendingTransfers"),{
sender:username,
iban:receiverValue,
amount:amountValue,
date:new Date().toISOString(),
status:"pending"
});

showSuccess("Transfer submitted");
location.reload();

};


// LOGOUT

window.logout=()=>{
localStorage.clear();
window.location.replace("index.html");
};

}

initDashboard();