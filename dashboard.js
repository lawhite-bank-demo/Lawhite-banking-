// ===== FIREBASE =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore, doc, getDoc, updateDoc,
collection, getDocs, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== HELPERS =====
function getTx(data){
return data.transactions
? (Array.isArray(data.transactions)?data.transactions:Object.values(data.transactions))
: [];
}

function calcBalance(tx){
let t=0; tx.forEach(x=>t+=Number(x.amount)||0); return t;
}

// ===== INIT =====
async function initDashboard(){

const username = localStorage.getItem("user");
if(!username) return location.replace("index.html");

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);

if(!snap.exists()) return location.replace("index.html");

const data = snap.data();

// SESSION
if(Number(localStorage.getItem("session")) !== Number(data.session)){
localStorage.clear();
return location.replace("index.html");
}

// USER INFO
document.getElementById("welcome").innerText="Hello, "+data.fullName;
document.getElementById("nameProfile").innerText=data.fullName;
document.getElementById("emailProfile").innerText=data.email;

// ACCOUNT
document.getElementById("iban").innerText=data.iban || "-";
document.getElementById("swift").innerText=data.swift || "-";
document.getElementById("bankAddress").innerText=data.bankAddress || "DeChase Bank, Berlin";

// TRANSACTIONS
let tx = getTx(data);
tx.sort((a,b)=>new Date(b.date)-new Date(a.date));

let balance = calcBalance(tx);
const symbol = data.currency==="USD"?"$":"€";

// BALANCE
const balEl=document.getElementById("balance");
const toggle=document.getElementById("toggleBalance");

let hidden=false;
function render(){
balEl.innerText=hidden?"••••":symbol+balance.toLocaleString();
toggle.innerText=hidden?"👁 Show":"👁 Hide";
}
toggle.onclick=()=>{hidden=!hidden;render();}
render();

// TX UI
const box=document.getElementById("transactions");
box.innerHTML="";

tx.forEach(t=>{
const amt=Number(t.amount);
const color=amt>=0?"#22c55e":"#ef4444";

box.innerHTML+=`
<div class="tx">
<strong>${t.note}</strong><br>
<span style="color:${color}">
${amt>=0?"+":"-"}${symbol}${Math.abs(amt).toLocaleString()}
</span>
</div>`;
});

// PENDING
const pendingBox=document.getElementById("pendingTransactions");
const q=query(collection(db,"pendingTransfers"),where("sender","==",username));
const pSnap=await getDocs(q);

if(pSnap.empty){
pendingBox.innerHTML="<div class='tx'>No pending transfers</div>";
}else{
pSnap.forEach(d=>{
const p=d.data();
pendingBox.innerHTML+=`<div class="tx">⏳ ${symbol}${p.amount}</div>`;
});
}

// TRANSFER
let pending=null;

window.openPinModal=()=>{
const r=document.getElementById("receiver").value.trim();
const a=parseFloat(document.getElementById("amount").value);

if(!r||!a) return alert("Enter details");

pending={r,a};
document.getElementById("pinModal").classList.remove("hidden");
};

window.closePin=()=>{
document.getElementById("pinModal").classList.add("hidden");
};

window.confirmPin=async()=>{

const pin=document.getElementById("pinInput").value;

if(pin!==data.pin) return alert("Wrong PIN");

if(balance<pending.a) return alert("Insufficient funds");

tx.unshift({
amount:-pending.a,
note:"Transfer",
date:new Date().toISOString()
});

await updateDoc(userRef,{transactions:tx});

await addDoc(collection(db,"pendingTransfers"),{
sender:username,
iban:pending.r,
amount:pending.a,
date:new Date().toISOString()
});

alert("Transfer Sent");
location.reload();
};

// PAY BILL
window.payBill=async(name,amount)=>{
tx.unshift({
amount:-amount,
note:name+" Bill",
date:new Date().toISOString()
});
await updateDoc(userRef,{transactions:tx});
alert("Bill Paid");
location.reload();
};

// GIFT
window.buyGiftCard=async(name,amount)=>{
tx.unshift({
amount:-amount,
note:name+" Gift Card",
date:new Date().toISOString()
});
await updateDoc(userRef,{transactions:tx});
alert("Gift Purchased");
location.reload();
};

// LOGOUT
window.logout=()=>{
localStorage.clear();
location.replace("index.html");
};

}

initDashboard();