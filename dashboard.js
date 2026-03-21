// FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore, doc, getDoc, updateDoc,
collection, getDocs, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// FIREBASE CONFIG
const firebaseConfig = {
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// OTP
let currentOTP = null;
let otpExpiry = null;

async function sendOTP(email){
if(!window.emailjs) return false;

const otp = Math.floor(100000 + Math.random()*900000);
currentOTP = otp;
otpExpiry = Date.now() + 180000;

try{
await emailjs.send("service_ab123cd","template_x9k21a",{to_email:email,otp});
return true;
}catch{
return false;
}
}

// INIT
async function initDashboard(){

const username = localStorage.getItem("user");
if(!username) return location.href="index.html";

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);
if(!snap.exists()) return location.href="index.html";

const data = snap.data();

// SESSION
if(Number(localStorage.getItem("session")) !== Number(data.session)){
localStorage.clear();
return location.href="index.html";
}

// HELPERS
function showSuccess(msg){
const b=document.getElementById("successBanner");
b.innerText="✅ "+msg;
b.style.display="block";
setTimeout(()=>b.style.display="none",2000);
}

function formatDate(d){
return new Date(d).toLocaleString();
}

// USER INFO
document.getElementById("welcome").innerText="Hello, "+data.fullName;
document.getElementById("name").innerText=data.fullName;
document.getElementById("acc").innerText=data.accountNumber;

// USA / EU SWITCH
if((data.country||"").toUpperCase()==="USA"){
document.getElementById("ibanSection").style.display="none";
document.getElementById("usAccountSection").style.display="block";

const acc=data.accountNumber||"";
document.getElementById("accountNumberMasked").innerText =
acc.slice(-4).padStart(acc.length,"*");

document.getElementById("accountNumber").innerText=acc;
document.getElementById("routingNumber").innerText=data.routingNumber||"-";

}else{
document.getElementById("iban").innerText=data.iban||"-";
}

document.getElementById("swift").innerText=data.swift||"-";
document.getElementById("bankAddress").innerText=data.bankAddress||"-";
document.getElementById("bankAddressSupport").innerText=data.bankAddress||"-";

// PROFILE
document.getElementById("nameProfile").innerText=data.fullName;
document.getElementById("emailProfile").innerText=data.email;

// BALANCE
let currency = (data.currency||"EUR").toUpperCase();
let balanceValue = currency==="USD"
? Number(data.usdBalance||0)
: Number(data.balance||0);

let symbol = currency==="USD" ? "$" : "€";
let field = currency==="USD" ? "usdBalance" : "balance";

let hidden=false;

function renderBalance(){
document.getElementById("balance").innerText =
hidden ? "••••••" : symbol+balanceValue.toLocaleString();
}

document.getElementById("toggleBalance").onclick=()=>{
hidden=!hidden;
renderBalance();
};

renderBalance();

// WALLET
document.getElementById("eurWallet").innerText=Number(data.balance||0).toLocaleString();
document.getElementById("usdWallet").innerText=Number(data.usdBalance||0).toLocaleString();

// CARD
document.getElementById("cardNumber").innerText=data.cardNumber||"";
document.getElementById("cardName").innerText=data.cardName||"-";
document.getElementById("cardExpiry").innerText=data.cardExpiry||"--/--";

window.revealCVV=()=>{
const el=document.getElementById("cardCVV");
el.innerText=data.cardCVV;
setTimeout(()=>el.innerText="***",5000);
};

// TRANSACTIONS
const box=document.getElementById("transactions");
box.innerHTML="";

let txArray=data.transactions
? (Array.isArray(data.transactions)?data.transactions:Object.values(data.transactions))
: [];

if(txArray.length===0){
box.innerHTML=`<div class="tx">No transactions yet</div>`;
}else{
txArray.sort((a,b)=>new Date(b.date)-new Date(a.date));

txArray.forEach(tx=>{
const amount=Number(tx.amount||0);
const color=amount>=0?"#22c55e":"#ef4444";

box.innerHTML+=`
<div class="tx">
<strong>${tx.note}</strong><br>
<span style="color:${color}">
${amount>=0?"+":"-"}${symbol}${Math.abs(amount).toLocaleString()}
</span>
<div class="small">Ref: ${tx.reference||"DCB-"+Math.floor(Math.random()*99999999)}</div>
<div class="small">${formatDate(tx.date)}</div>
</div>
`;
});
}

// PENDING
const pendingBox=document.getElementById("pendingTransactions");

const pendingSnap=await getDocs(
query(collection(db,"pendingTransfers"),where("sender","==",username))
);

pendingBox.innerHTML = pendingSnap.empty
? `<div class="tx">No pending transfers</div>`
: "";

pendingSnap.forEach(d=>{
const p=d.data();

pendingBox.innerHTML+=`
<div class="tx">
<strong>🏦 Transfer Pending</strong><br>
${symbol}${Number(p.amount).toLocaleString()} → ${p.iban}
<div class="small">${formatDate(p.date)}</div>
</div>
`;
});

// PAY BILL
window.payBill=async(name,amount)=>{
if(balanceValue<amount) return alert("Insufficient");

balanceValue-=amount;
await updateDoc(userRef,{[field]:balanceValue});

showSuccess(name+" paid");
location.reload();
};

// GIFT
window.buyGiftCard=async(name,amount)=>{
if(balanceValue<amount) return alert("Insufficient");

balanceValue-=amount;
await updateDoc(userRef,{[field]:balanceValue});

showSuccess(name+" purchased");
location.reload();
};

// TRANSFER
window.askPin=async()=>{
const receiver=document.getElementById("receiver").value;
const amount=parseFloat(document.getElementById("amount").value);

if(prompt("PIN")!=data.pin) return alert("Wrong PIN");

const sent=await sendOTP(data.email);
if(!sent) return;

if(prompt("OTP")!=currentOTP) return alert("Wrong OTP");

await addDoc(collection(db,"pendingTransfers"),{
sender:username,
iban:receiver,
amount,
date:new Date().toISOString(),
status:"pending"
});

showSuccess("Transfer sent");
location.reload();
};

// LOGOUT
window.logout=()=>{
localStorage.clear();
location.href="index.html";
};

}

initDashboard();