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


// GET USERNAME FROM LOCAL STORAGE
const username = localStorage.getItem("username");

if(!username){
  window.location.href = "index.html";
}


// LOAD USER DATA
async function loadUser(){

  const userRef = doc(db,"users",username);
  const snap = await getDoc(userRef);

  if(!snap.exists()){
    alert("User not found");
    return;
  }

  const data = snap.data();


  // BALANCE
  const balanceEl = document.getElementById("balance");
  if(balanceEl){
    balanceEl.innerText = "€" + Number(data.balance).toLocaleString();
  }


  // ACCOUNT NAME
  const nameEl = document.getElementById("name");
  if(nameEl){
    nameEl.innerText = data.fullName || username;
  }


  // ACCOUNT NUMBER
  const accEl = document.getElementById("accountNumber");
  if(accEl){
    accEl.innerText = data.accountNumber || "";
  }


  // LOAD TRANSACTIONS
  const txContainer = document.getElementById("transactions");

  if(!txContainer) return;

  txContainer.innerHTML = "";

  const transactions = data.transactions || [];

  // SHOW NEWEST FIRST
  transactions.reverse().forEach(t => {

    const amount = Number(t.amount).toLocaleString();

    const date = new Date(t.date).toLocaleString();

    const reference = t.reference || "-";

    const card = document.createElement("div");
    card.className = "txCard";

    card.innerHTML = `
    
      <div class="txTitle">${t.note || "Transaction"}</div>

      <div class="txAmount">€${amount}</div>

      <div class="txRef">Ref: ${reference}</div>

      <div class="txDate">${date}</div>

    `;

    txContainer.appendChild(card);

  });

}


// START
loadUser();