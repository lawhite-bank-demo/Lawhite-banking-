// FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore,
doc,
getDoc,
updateDoc
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


// USERNAME FROM LOGIN
const username = localStorage.getItem("username");

if(!username){
window.location.href="index.html";
}


// LOAD USER
async function loadUser(){

const ref = doc(db,"users",username);
const snap = await getDoc(ref);

if(!snap.exists()){
alert("User not found");
return;
}

const data = snap.data();


// WELCOME
document.getElementById("welcome").innerText =
"Welcome, " + (data.fullName || username);


// ACCOUNT INFO
document.getElementById("name").innerText = data.fullName || "-";
document.getElementById("acc").innerText = data.accountNumber || "-";
document.getElementById("iban").innerText = data.iban || "-";
document.getElementById("swift").innerText = data.swift || "-";


// PROFILE
document.getElementById("nameProfile").innerText =
data.fullName || "-";

document.getElementById("emailProfile").innerText =
data.email || "-";


// BALANCE
balance = data.balance || 0;

document.getElementById("balance").innerText =
"€" + Number(balance).toLocaleString();


// WALLETS
document.getElementById("eurWallet").innerText =
data.walletEUR || 0;

document.getElementById("usdWallet").innerText =
data.walletUSD || 0;

document.getElementById("gbpWallet").innerText =
data.walletGBP || 0;

document.getElementById("audWallet").innerText =
data.walletAUD || 0;


// CARD
document.getElementById("cardNumber").innerText =
data.cardNumber || "0000 0000 0000 0000";

document.getElementById("cardName").innerText =
data.fullName || "-";

document.getElementById("cardExpiry").innerText =
data.cardExpiry || "--/--";

cvv = data.cardCVV || "***";


// TRANSACTIONS
const txBox = document.getElementById("transactions");

txBox.innerHTML="";

const transactions = data.transactions || [];

transactions.reverse().forEach(t=>{

const div=document.createElement("div");

div.innerHTML=`

<div><b>${t.note || "Transaction"}</b></div>

<div>€${Number(t.amount).toLocaleString()}</div>

<div class="small">Ref: ${t.reference || "-"}</div>

<div class="small">
${new Date(t.date).toLocaleString()}
</div>

`;

txBox.appendChild(div);

});


}

loadUser();


// BALANCE HIDE
let balanceVisible=true;
let balance=0;

document.getElementById("toggleBalance").onclick=()=>{

if(balanceVisible){

document.getElementById("balance").innerText="••••";

balanceVisible=false;

}else{

document.getElementById("balance").innerText=
"€"+Number(balance).toLocaleString();

balanceVisible=true;

}

};


// SHOW CVV
let cvv="***";

window.revealCVV=function(){

document.getElementById("cardCVV").innerText=cvv;

};


// FREEZE CARD
window.toggleCard=async function(){

alert("Card freeze toggled");

};


// TRANSFER
window.askPin=async function(){

const pin=prompt("Enter your PIN");

if(!pin) return;

alert("Transfer request submitted");

document.getElementById("successBanner").style.display="block";

setTimeout(()=>{

document.getElementById("successBanner").style.display="none";

},3000);

};


// CURRENCY CONVERTER
window.convertCurrency=function(){

const amount=parseFloat(
document.getElementById("convertAmount").value
);

const type=document.getElementById("convertType").value;

let result=0;

if(type==="USD") result=amount*1.08;
if(type==="GBP") result=amount*0.86;

document.getElementById("conversionResult").innerText=
"≈ "+result.toFixed(2)+" "+type;

};


// LOGOUT
window.logout=function(){

localStorage.removeItem("username");

window.location.href="index.html";

};