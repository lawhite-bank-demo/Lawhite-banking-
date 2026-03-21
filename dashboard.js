import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore,
doc,
getDoc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
authDomain: "dechase-bank.firebaseapp.com",
projectId: "dechase-bank"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function getSafeTransactions(data){
return data.transactions
? (Array.isArray(data.transactions)
? [...data.transactions]
: Object.values(data.transactions))
: [];
}

async function initDashboard(){

const username = localStorage.getItem("user");
if(!username) location.replace("index.html");

const userRef = doc(db,"users",username);
const snap = await getDoc(userRef);
const data = snap.data();

// USER
document.getElementById("welcome").innerText="Hello "+data.fullName;
document.getElementById("name").innerText=data.fullName;
document.getElementById("acc").innerText=data.accountNumber;

// BALANCE
let balanceValue = data.currency==="USD"
? Number(data.usdBalance||0)
: Number(data.balance||0);

let currencySymbol = data.currency==="USD"?"$":"€";
let balanceField = data.currency==="USD"?"usdBalance":"balance";

document.getElementById("balance").innerText =
currencySymbol + balanceValue.toLocaleString();

// TRANSACTIONS
const box=document.getElementById("transactions");
let txArray=getSafeTransactions(data);

txArray.sort((a,b)=>new Date(b.date)-new Date(a.date));

txArray.forEach(tx=>{
const amount=Number(tx.amount);
if(isNaN(amount)) return;

const div=document.createElement("div");
div.className="tx";

div.innerHTML=`
${tx.note}<br>
${amount>=0?"+":"-"}${currencySymbol}${Math.abs(amount)}
<div class="small">${new Date(tx.date).toLocaleString()}</div>
`;

box.appendChild(div);
});

// ===== TRANSFER =====
let pendingTransfer=null;

window.openPinModal=()=>{
const receiver=document.getElementById("receiver").value;
const amount=parseFloat(document.getElementById("amount").value);

pendingTransfer={receiver,amount};
document.getElementById("pinModal").style.display="flex";
};

window.closePin=()=>{
document.getElementById("pinModal").style.display="none";
};

window.confirmPin=async()=>{

if(document.getElementById("pinInput").value!==data.pin){
alert("Wrong PIN");return;
}

const freshSnap=await getDoc(userRef);
const freshData=freshSnap.data();

let txArray=getSafeTransactions(freshData);
let newBalance=Number(freshData[balanceField]||0);

newBalance-=pendingTransfer.amount;

txArray.unshift({
amount:-pendingTransfer.amount,
note:"Transfer to "+pendingTransfer.receiver,
date:new Date().toISOString()
});

await updateDoc(userRef,{
[balanceField]:newBalance,
transactions:txArray
});

alert("Transfer Successful");
location.reload();
};

// ===== PDF =====
window.downloadStatement=()=>{

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

doc.text("DeChase Bank Statement",20,20);
doc.text("Name: "+data.fullName,20,30);
doc.text("Balance: "+currencySymbol+balanceValue,20,40);

let y=50;

txArray.slice(0,10).forEach(tx=>{
doc.text(`${tx.note} ${tx.amount}`,20,y);
y+=10;
});

doc.save("statement.pdf");
};

// LOGOUT
window.logout=()=>{
localStorage.clear();
location.replace("index.html");
};

}

initDashboard();