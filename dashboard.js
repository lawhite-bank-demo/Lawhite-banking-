// FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore,
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// FIREBASE CONFIG
const firebaseConfig = {
apiKey: "YOUR_API_KEY",
authDomain: "YOUR_PROJECT.firebaseapp.com",
projectId: "YOUR_PROJECT",
storageBucket: "YOUR_PROJECT.appspot.com",
messagingSenderId: "XXXX",
appId: "XXXX"
};


// INIT FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// USER LOGIN CHECK
const username = localStorage.getItem("username");

if(!username){
window.location.href="index.html";
}


// GLOBAL VARIABLES
let userData = {};
let balanceVisible = true;


// LOAD USER DATA
async function loadUser(){

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);

if(!snap.exists()){
alert("User not found");
return;
}

userData = snap.data();


// WELCOME
document.getElementById("welcome").innerText =
"Welcome, " + (userData.fullName || username);


// ACCOUNT INFO
document.getElementById("name").innerText =
userData.fullName || "-";

document.getElementById("acc").innerText =
userData.accountNumber || "-";

document.getElementById("iban").innerText =
userData.iban || "-";

document.getElementById("swift").innerText =
userData.swift || "-";


// PROFILE
document.getElementById("nameProfile").innerText =
userData.fullName || "-";

document.getElementById("emailProfile").innerText =
userData.email || "-";


// BALANCE
updateBalance();


// WALLET
document.getElementById("eurWallet").innerText =
userData.walletEUR || 0;

document.getElementById("usdWallet").innerText =
userData.walletUSD || 0;

document.getElementById("gbpWallet").innerText =
userData.walletGBP || 0;

document.getElementById("audWallet").innerText =
userData.walletAUD || 0;


// CARD
document.getElementById("cardNumber").innerText =
userData.cardNumber || "0000 0000 0000 0000";

document.getElementById("cardName").innerText =
userData.fullName || "-";

document.getElementById("cardExpiry").innerText =
userData.cardExpiry || "--/--";

document.getElementById("cardCVV").innerText="***";


// LOAD TRANSACTIONS
loadTransactions();

}


function updateBalance(){

const balance = userData.balance || 0;

document.getElementById("balance").innerText =
balanceVisible ? "€"+Number(balance).toLocaleString() : "••••";

}


// TRANSACTIONS
function loadTransactions(){

const box = document.getElementById("transactions");

box.innerHTML="";

const txs = userData.transactions || [];

for(let i=txs.length-1;i>=0;i--){

const t = txs[i];

const div = document.createElement("div");

div.innerHTML = `

<div><b>${t.note || "Transaction"}</b></div>

<div>€${Number(t.amount).toLocaleString()}</div>

<div class="small">Ref: ${t.reference || "-"}</div>

<div class="small">
${new Date(t.date).toLocaleString()}
</div>

`;

box.appendChild(div);

}

}


// TOGGLE BALANCE
document.getElementById("toggleBalance").onclick=function(){

balanceVisible = !balanceVisible;

updateBalance();

};


// SHOW CVV
window.revealCVV=function(){

document.getElementById("cardCVV").innerText =
userData.cardCVV || "***";

};


// FREEZE CARD
window.toggleCard=function(){

alert("Card freeze/unfreeze feature active.");

};


// SEND TRANSFER
window.askPin=function(){

const pin = prompt("Enter your PIN");

if(!pin) return;

document.getElementById("successBanner").style.display="block";

setTimeout(()=>{
document.getElementById("successBanner").style.display="none";
},3000);

};


// CURRENCY CONVERTER
window.convertCurrency=function(){

const amount =
parseFloat(document.getElementById("convertAmount").value) || 0;

const type =
document.getElementById("convertType").value;

let result = 0;

if(type==="USD") result = amount*1.08;
if(type==="GBP") result = amount*0.86;

document.getElementById("conversionResult").innerText =
"≈ "+result.toFixed(2)+" "+type;

};


// LOGOUT
window.logout=function(){

localStorage.removeItem("username");

window.location.href="index.html";

};


// START APP
loadUser();