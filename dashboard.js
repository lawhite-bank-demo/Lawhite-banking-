// FIREBASE IMPORTS

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore,
doc,
getDoc,
updateDoc,
collection,
getDocs
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

const ELASTIC_API_KEY = "YOUR_ELASTIC_KEY";

async function sendOTP(email){

const otp = Math.floor(100000 + Math.random()*900000);

currentOTP = otp;
otpExpiry = Date.now() + 60000;

await fetch("https://api.elasticemail.com/v2/email/send",{
method:"POST",
headers:{
"Content-Type":"application/x-www-form-urlencoded"
},
body:
"apikey="+ELASTIC_API_KEY+
"&subject=DeChase OTP"+
"&from=dechasebank@gmail.com"+
"&to="+email+
"&bodyText=Your OTP is "+otp
});

}


// INIT DASHBOARD

async function initDashboard(){

const username = localStorage.getItem("user");

if(!username) return window.location.replace("index.html");

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);

if(!snap.exists()){
alert("User not found");
return;
}

const data = snap.data();


// SUCCESS BANNER

function showSuccess(message){

const banner = document.getElementById("successBanner");

if(!banner) return;

banner.innerText = "✅ " + message;
banner.style.display="block";

setTimeout(()=>{
banner.style.display="none";
},2000);

}


// USER INFO

if(document.getElementById("welcome"))
document.getElementById("welcome").innerText =
"Hello, " + data.fullName;

if(document.getElementById("name"))
document.getElementById("name").innerText = data.fullName;

if(document.getElementById("acc"))
document.getElementById("acc").innerText = data.accountNumber;

if(document.getElementById("iban"))
document.getElementById("iban").innerText = data.iban;

if(document.getElementById("swift"))
document.getElementById("swift").innerText = data.swift;


// PROFILE

if(document.getElementById("nameProfile"))
document.getElementById("nameProfile").innerText = data.fullName;

if(document.getElementById("emailProfile"))
document.getElementById("emailProfile").innerText = data.email;


// BALANCE

let balanceValue = Number(data.balance || 0);
let hidden = false;

const balanceEl = document.getElementById("balance");
const toggleEl = document.getElementById("toggleBalance");

function renderBalance(){

if(!balanceEl) return;

balanceEl.innerText =
hidden ? "••••••" : "€"+balanceValue.toLocaleString();

if(toggleEl){
toggleEl.innerText =
hidden ? "👁 Show balance" : "👁 Hide balance";
}

}

if(toggleEl){
toggleEl.onclick = ()=>{
hidden = !hidden;
renderBalance();
};
}

renderBalance();


// MULTI CURRENCY WALLET

if(document.getElementById("eurWallet"))
document.getElementById("eurWallet").innerText =
Number(data.balance || 0).toLocaleString();

if(document.getElementById("usdWallet"))
document.getElementById("usdWallet").innerText =
Number(data.usdBalance || 0).toLocaleString();

if(document.getElementById("gbpWallet"))
document.getElementById("gbpWallet").innerText =
Number(data.gbpBalance || 0).toLocaleString();

if(document.getElementById("audWallet"))
document.getElementById("audWallet").innerText =
Number(data.audBalance || 0).toLocaleString();


// CARD DISPLAY

if(document.getElementById("cardNumber"))
document.getElementById("cardNumber").innerText =
data.cardNumber || "0000 0000 0000 0000";

if(document.getElementById("cardName"))
document.getElementById("cardName").innerText =
data.cardName || "-";

if(document.getElementById("cardExpiry"))
document.getElementById("cardExpiry").innerText =
data.cardExpiry || "--/--";

if(document.getElementById("cardType"))
document.getElementById("cardType").innerText =
data.cardType || "CARD";

const cvvElement = document.getElementById("cardCVV");

if(cvvElement) cvvElement.innerText="***";


// REVEAL CVV

window.revealCVV = ()=>{

if(!cvvElement) return;

cvvElement.innerText = data.cardCVV;

setTimeout(()=>{
cvvElement.innerText="***";
},5000);

};


// FREEZE CARD

window.toggleCard = async ()=>{

const newStatus = !data.cardFrozen;

await updateDoc(userRef,{
cardFrozen:newStatus
});

alert(newStatus ? "Card Frozen" : "Card Unfrozen");

location.reload();

};


// COMPLETED TRANSACTIONS

const box = document.getElementById("transactions");

if(box){

box.innerHTML="";

if(data.transactions){

const txArray = Array.isArray(data.transactions)
? data.transactions
: Object.values(data.transactions);

txArray.sort((a,b)=> new Date(b.date) - new Date(a.date));

txArray.slice(0,20).forEach(tx=>{

const amount = Number(tx.amount);

const div = document.createElement("div");

div.innerHTML = `
<strong>${tx.note || tx.merchant || "Transaction"}</strong><br>
€${Math.abs(amount).toLocaleString()}
<div class="small">${new Date(tx.date).toLocaleString()}</div>
`;

box.appendChild(div);

});

}

}


// PENDING TRANSACTIONS

const pendingBox = document.getElementById("pendingTransactions");

if(pendingBox && data.pendingTransactions){

const pendingArray = Array.isArray(data.pendingTransactions)
? data.pendingTransactions
: Object.values(data.pendingTransactions);

pendingArray.forEach(tx=>{

const div = document.createElement("div");

div.innerHTML = `
<strong>${tx.merchant}</strong><br>
€${Math.abs(tx.amount).toLocaleString()}
<div class="small">Status: Pending</div>
<div class="small">${new Date(tx.date).toLocaleString()}</div>
`;

pendingBox.appendChild(div);

});

}


// RECEIVER LOOKUP

const receiverInput=document.getElementById("receiver");
const receiverNameBox=document.getElementById("receiverName");

if(receiverInput && receiverNameBox){

receiverInput.addEventListener("input",async()=>{

const value=receiverInput.value.trim();

if(!value){
receiverNameBox.innerText="";
return;
}

const users=await getDocs(collection(db,"users"));

let foundName=null;

users.forEach(d=>{
const u=d.data();
if(u.accountNumber===value || u.iban===value)
foundName=u.fullName;
});

receiverNameBox.innerText =
foundName ? "Receiver: "+foundName : "Account not found";

});

}


// TRANSFER

window.askPin = async ()=>{

const receiverValue =
document.getElementById("receiver").value.trim();

const amountValue =
parseFloat(document.getElementById("amount").value);

if(!receiverValue || !amountValue)
return alert("Fill all fields");

if(prompt("Enter PIN") !== data.pin)
return alert("Wrong PIN");

if(balanceValue < amountValue)
return alert("Insufficient funds");

await sendOTP(data.email);

const enteredOTP = prompt("Enter OTP sent to email");

if(Date.now() > otpExpiry)
return alert("OTP expired");

if(enteredOTP != currentOTP)
return alert("Invalid OTP");

showSuccess("Transfer Approved");

};


// CURRENCY CONVERTER

window.convertCurrency = async ()=>{

const amountInput = document.getElementById("convertAmount");
const typeInput = document.getElementById("convertType");
const resultBox = document.getElementById("conversionResult");

if(!amountInput || !typeInput || !resultBox) return;

const amount = parseFloat(amountInput.value);
const type = typeInput.value;

if(!amount) return alert("Enter amount");

try{

const res = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
const data = await res.json();

const rate = data.rates[type];
const result = amount * rate;

resultBox.innerText =
amount + " EUR = " + result.toFixed(2) + " " + type;

}catch(err){

resultBox.innerText = "Conversion failed";

}

};


// LOGOUT

window.logout = ()=>{

localStorage.clear();
sessionStorage.clear();

window.location.replace("index.html");

};

}

initDashboard();