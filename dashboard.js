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
await emailjs.send("service_ab123cd","template_x9k21a",{to_email: email,otp: otp});
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

// SESSION CHECK
if(Number(localStorage.getItem("session")) !== Number(data.session)){
localStorage.clear();
window.location.replace("index.html");
return;
}

// HELPERS
function showSuccess(msg){
const banner = document.getElementById("successBanner");
banner.innerText = "✅ " + msg;
banner.style.display = "block";
setTimeout(()=>banner.style.display="none",2000);
}

function formatDate(date){
return new Date(date).toLocaleString();
}

// USER INFO
document.getElementById("welcome").innerText = "Hello, " + data.fullName;
document.getElementById("name").innerText = data.fullName;
document.getElementById("acc").innerText = data.accountNumber;

// USA / EU SWITCH
const ibanSection = document.getElementById("ibanSection");
const usSection = document.getElementById("usAccountSection");

if(data.country === "USA"){

ibanSection.style.display = "none";
usSection.style.display = "block";

const acc = data.accountNumber || "";
document.getElementById("accountNumberMasked").innerText =
acc.slice(-4).padStart(acc.length,"*");

document.getElementById("accountNumber").innerText = acc;
document.getElementById("routingNumber").innerText = data.routingNumber || "-";

}else{

ibanSection.style.display = "block";
usSection.style.display = "none";
document.getElementById("iban").innerText = data.iban || "-";

}

document.getElementById("swift").innerText = data.swift || "-";
document.getElementById("bankAddress").innerText = data.bankAddress || "-";
document.getElementById("bankAddressSupport").innerText = data.bankAddress || "-";

// PROFILE
document.getElementById("nameProfile").innerText = data.fullName;
document.getElementById("emailProfile").innerText = data.email;

// BALANCE
let balanceValue = data.currency === "USD"
? Number(data.usdBalance || 0)
: Number(data.balance || 0);

let currencySymbol = data.currency === "USD" ? "$" : "€";
let balanceField = data.currency === "USD" ? "usdBalance" : "balance";

let hidden = false;

function renderBalance(){
document.getElementById("balance").innerText =
hidden ? "••••••" : currencySymbol + balanceValue.toLocaleString();

document.getElementById("toggleBalance").innerText =
hidden ? "👁 Show balance" : "👁 Hide balance";
}

document.getElementById("toggleBalance").onclick=()=>{
hidden=!hidden;
renderBalance();
};

renderBalance();

// WALLET
document.getElementById("eurWallet").innerText = Number(data.balance||0).toLocaleString();
document.getElementById("usdWallet").innerText = Number(data.usdBalance||0).toLocaleString();
document.getElementById("gbpWallet").innerText = Number(data.gbpBalance||0).toLocaleString();
document.getElementById("audWallet").innerText = Number(data.audBalance||0).toLocaleString();

// CARD
document.getElementById("cardNumber").innerText = data.cardNumber || "";
document.getElementById("cardName").innerText = data.cardName || "-";
document.getElementById("cardExpiry").innerText = data.cardExpiry || "--/--";

const cvvElement = document.getElementById("cardCVV");

window.revealCVV = ()=>{
cvvElement.innerText = data.cardCVV;
setTimeout(()=>cvvElement.innerText="***",5000);
};

// TRANSACTIONS
const box = document.getElementById("transactions");
box.innerHTML = "";

let txArray = data.transactions
? (Array.isArray(data.transactions)?data.transactions:Object.values(data.transactions))
: [];

if(txArray.length === 0){
box.innerHTML = `<div class="tx">No transactions yet</div>`;
}else{

txArray.sort((a,b)=>new Date(b.date)-new Date(a.date));

txArray.slice(0,20).forEach(tx=>{

const amount = Number(tx.amount || 0);
const color = amount >= 0 ? "#22c55e" : "#ef4444";

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

}

// ✅ PENDING (OUTSIDE LOOP)
const pendingBox = document.getElementById("pendingTransactions");

const pendingSnap = await getDocs(
query(collection(db,"pendingTransfers"), where("sender","==",username))
);

pendingBox.innerHTML = pendingSnap.empty
? `<div class="tx">No pending transfers</div>`
: "";

pendingSnap.forEach(docu=>{
const p = docu.data();

pendingBox.innerHTML += `
<div class="tx">
<strong>🏦 Transfer Pending</strong><br>
${currencySymbol}${Number(p.amount).toLocaleString()} → ${p.iban}
<div class="small">${formatDate(p.date)}</div>
</div>
`;
});

// TRANSFER
window.askPin = async ()=>{

const receiver = document.getElementById("receiver").value.trim();
const amount = parseFloat(document.getElementById("amount").value);

if(prompt("Enter PIN") !== data.pin) return alert("Wrong PIN");
if(balanceValue < amount) return alert("Insufficient funds");

const sent = await sendOTP(data.email);
if(!sent) return;

if(prompt("Enter OTP") != currentOTP) return alert("Invalid OTP");

await addDoc(collection(db,"pendingTransfers"),{
sender:username,
iban:receiver,
amount:amount,
date:new Date().toISOString(),
status:"pending"
});

showSuccess("Transfer submitted");
location.reload();

};

// PAY BILL
window.payBill = async (name, amount)=>{
if(balanceValue < amount) return alert("Insufficient balance");

balanceValue -= amount;
await updateDoc(userRef,{[balanceField]:balanceValue});

showSuccess(name+" paid");
location.reload();
};

// GIFT
window.buyGiftCard = async (store, amount)=>{
if(balanceValue < amount) return alert("Insufficient balance");

balanceValue -= amount;
await updateDoc(userRef,{[balanceField]:balanceValue});

showSuccess(store+" purchased");
location.reload();
};

// LOGOUT
window.logout = ()=>{
localStorage.clear();
window.location.replace("index.html");
};

}

initDashboard();