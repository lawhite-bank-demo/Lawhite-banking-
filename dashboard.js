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
if(savedSession !== Number(data.session)){
localStorage.clear();
window.location.replace("index.html");
return;
}


// ===== HELPERS =====
function formatDate(date){
return new Date(date).toLocaleString();
}

function showSuccess(msg){
const banner = document.getElementById("successBanner");
if(banner){
banner.innerText = "✅ " + msg;
banner.style.display="block";
setTimeout(()=>banner.style.display="none",2000);
}
}


// ===== USER INFO =====
document.getElementById("welcome").innerText="Hello, "+data.fullName;
document.getElementById("name").innerText=data.fullName;
document.getElementById("acc").innerText=data.accountNumber;

document.getElementById("iban").innerText=data.accountNumber||"-";
document.getElementById("swift").innerText=data.swift||"-";
document.getElementById("bankAddress").innerText=data.bankAddress||"-";


// ===== PROFILE =====
document.getElementById("nameProfile").innerText=data.fullName;
document.getElementById("emailProfile").innerText=data.email;


// ===== BALANCE =====
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

const balanceEl = document.getElementById("balance");
const toggleEl = document.getElementById("toggleBalance");

let hidden = false;

function renderBalance(){
balanceEl.innerText = hidden
? "••••••"
: currencySymbol + balanceValue.toLocaleString();

toggleEl.innerText = hidden ? "👁 Show" : "👁 Hide";
}

toggleEl.onclick=()=>{hidden=!hidden;renderBalance();};
renderBalance();


// ===== WALLET =====
document.getElementById("eurWallet").innerText=Number(data.balance||0).toLocaleString();
document.getElementById("usdWallet").innerText=Number(data.usdBalance||0).toLocaleString();
document.getElementById("gbpWallet").innerText=Number(data.gbpBalance||0).toLocaleString();
document.getElementById("audWallet").innerText=Number(data.audBalance||0).toLocaleString();


// ===== CARD =====
document.getElementById("cardNumber").innerText=data.cardNumber||"****";
document.getElementById("cardName").innerText=data.cardName||"-";
document.getElementById("cardExpiry").innerText=data.cardExpiry||"--/--";

const cvvEl=document.getElementById("cardCVV");
window.revealCVV=()=>{
cvvEl.innerText=data.cardCVV;
setTimeout(()=>cvvEl.innerText="***",5000);
};


// ===== TRANSACTIONS =====

const box=document.getElementById("transactions");
box.innerHTML="";

let txArray = getSafeTransactions(data);

if(txArray.length===0){
box.innerHTML=`<div class="tx">No transactions yet</div>`;
}else{

txArray.sort((a,b)=>new Date(b.date)-new Date(a.date));

txArray.forEach(tx=>{

const amount = Number(tx.amount);
if(isNaN(amount)) return;

const color = amount>=0?"#22c55e":"#ef4444";
const sign = amount>=0?"+":"-";

const status = tx.status || "completed";

let statusText = "✅ Completed";
if(status === "pending") statusText = "⏳ Pending";
if(status === "failed") statusText = "❌ Failed";

const div=document.createElement("div");
div.className="tx";

div.innerHTML = `
<strong>${tx.note||"Transaction"}</strong><br>
<span style="color:${color};font-weight:600;">
${sign}${currencySymbol}${Math.abs(amount).toLocaleString()}
</span>
<div class="small">${statusText}</div>
<div class="small">Ref: ${tx.reference||"-"}</div>
<div class="small">${formatDate(tx.date)}</div>
`;

box.appendChild(div);
});
}


// ===== PENDING =====
const pendingBox=document.getElementById("pendingTransactions");

const q=query(collection(db,"pendingTransfers"),where("sender","==",username));
const snapPending=await getDocs(q);

if(snapPending.empty){
pendingBox.innerHTML=`<div class="tx">No pending transfers</div>`;
}else{
snapPending.forEach(d=>{
const p=d.data();

const div=document.createElement("div");
div.className="tx";

div.innerHTML=`
<strong>Pending Transfer</strong><br>
${currencySymbol}${Number(p.amount).toLocaleString()} → ${p.iban}
<div class="small">${formatDate(p.date)}</div>
`;

pendingBox.appendChild(div);
});
}


// ===== ADD MONEY =====
window.addMoney = async ()=>{
const amount=parseFloat(prompt("Amount to add"));
if(isNaN(amount)||amount<=0)return;

balanceValue+=amount;

txArray.unshift({
amount:amount,
note:"Incoming Transfer",
date:new Date().toISOString(),
reference:"DEP-"+Math.floor(Math.random()*100000000),
status:"completed"
});

await updateDoc(userRef,{
[balanceField]:balanceValue,
transactions:txArray
});

alert("Money added");
location.reload();
};


// ===== TRANSFER =====
let pendingTransfer = null;

window.openPinModal = ()=>{
const receiver=document.getElementById("receiver").value.trim();
const amount=parseFloat(document.getElementById("amount").value);

if(!receiver || isNaN(amount) || amount<=0){
alert("Enter valid details");
return;
}

pendingTransfer={receiver,amount};
document.getElementById("pinModal").style.display="flex";
};

window.closePin=()=>{
document.getElementById("pinModal").style.display="none";
pendingTransfer=null;
};

window.confirmPin = async ()=>{

const enteredPin=document.getElementById("pinInput").value;

if(enteredPin!==data.pin){
alert("Wrong PIN");
return;
}

const {receiver,amount}=pendingTransfer;

if(balanceValue<amount){
alert("Insufficient funds");
return;
}

balanceValue-=amount;

const ref="ACH-"+Math.floor(Math.random()*100000000);

txArray.unshift({
amount:-amount,
note:"Transfer to "+receiver,
date:new Date().toISOString(),
reference:ref,
status:"pending"
});

await updateDoc(userRef,{
[balanceField]:balanceValue,
transactions:txArray
});

await addDoc(collection(db,"pendingTransfers"),{
sender:username,
iban:receiver,
amount:amount,
date:new Date().toISOString(),
status:"pending"
});

alert("Transfer Successful");
location.reload();
};


// ===== LOGOUT =====
window.logout=()=>{
localStorage.clear();
window.location.replace("index.html");
};

}
initDashboard();