// 🔥 FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBDp6wmJMY8WPyKPNE-bvVSiz4AIUbn71U",
  authDomain: "dechase-bank.firebaseapp.com",
  projectId: "dechase-bank"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ✅ CHECK LOGIN
const username = localStorage.getItem("user");
if (!username) location.href = "index.html";


// ✅ LOAD USER
const userRef = doc(db, "users", username);
const snap = await getDoc(userRef);

if (!snap.exists()) {
  alert("User not found");
  location.href = "index.html";
}

const data = snap.data();


// ✅ DISPLAY USER INFO
document.getElementById("welcome").innerText =
  "Hello, " + (data.fullName || username);

document.getElementById("name").innerText =
  data.fullName || username;

document.getElementById("acc").innerText =
  data.accountNumber || "N/A";

document.getElementById("iban").innerText =
  data.iban || "N/A";

document.getElementById("swift").innerText =
  data.swift || "DEUTDEFF";


// ======================================================
// 💰 BALANCE
// ======================================================

// Use stored balance directly (prevents double counting)
let balanceValue = Number(data.balance || 0);

let hidden = false;

function renderBalance() {
  document.getElementById("balance").innerText =
    hidden ? "••••••" : "€" + balanceValue.toLocaleString();

  document.getElementById("toggleBalance").innerText =
    hidden ? "👁 Show balance" : "👁 Hide balance";
}

toggleBalance.onclick = () => {
  hidden = !hidden;
  renderBalance();
};

renderBalance();


// ======================================================
// 🧾 TRANSACTIONS (SORTED BY DATE)
// ======================================================

const box = document.getElementById("transactions");

box.innerHTML = "";

if (Array.isArray(data.transactions) && data.transactions.length > 0) {

  const sorted = data.transactions
    .sort((a,b)=> new Date(b.date) - new Date(a.date))
    .slice(0,6); // show latest 6

  sorted.forEach(tx => {

    const amount = Number(tx.amount || 0);
    const color = amount > 0 ? "green" : "red";

    const div = document.createElement("div");
    div.className = color;

    div.innerHTML = `
      ${tx.note || "Transaction"}
      (€${Math.abs(amount).toLocaleString()})
      <div class="small">${tx.date || ""}</div>
    `;

    box.appendChild(div);

  });

} else {
  box.innerHTML = "<div class='small'>No transactions yet</div>";
}


// ======================================================
// 📂 SHOW ACTION PANELS
// ======================================================

window.showTransfer = () =>
  transferBox.style.display = "block";

window.showBills = () =>
  billBox.style.display = "block";

window.showGift = () =>
  giftBox.style.display = "block";


// ======================================================
// 🔐 TRANSFER WITH PIN
// ======================================================

let transferData = null;

window.askPin = () => {

  transferData = {
    receiver: receiver.value.trim(),
    amount: parseFloat(amount.value)
  };

  if (!transferData.receiver || !transferData.amount)
    return alert("Fill all fields");

  pinModal.style.display = "flex";
};

window.closePin = () =>
  pinModal.style.display = "none";


window.confirmTransfer = async () => {

  if (pinInput.value !== data.pin)
    return alert("Wrong PIN");

  const users = await getDocs(collection(db,"users"));

  let receiverName = null;
  let receiverData = null;

  users.forEach(d=>{
    if(d.id === transferData.receiver || d.data().iban === transferData.receiver){
      receiverName = d.id;
      receiverData = d.data();
    }
  });

  if(!receiverName) return alert("Receiver not found");
  if(balanceValue < transferData.amount) return alert("Insufficient funds");

  const date = new Date().toLocaleString();

  await updateDoc(userRef,{
    balance: balanceValue - transferData.amount,
    transactions: [
      ...(data.transactions || []),
      {
        amount: -transferData.amount,
        note: "Sent to " + receiverName,
        date
      }
    ]
  });

  await updateDoc(doc(db,"users",receiverName),{
    balance: Number(receiverData.balance || 0) + transferData.amount,
    transactions: [
      ...(receiverData.transactions || []),
      {
        amount: transferData.amount,
        note: "Received from " + username,
        date
      }
    ]
  });

  alert("Transfer successful");
  location.reload();
};


// ======================================================
// 💡 PAY BILLS
// ======================================================

window.payBill = async () => {

  const amt = parseFloat(billAmount.value);

  if (!amt) return alert("Enter amount");
  if (balanceValue < amt) return alert("Insufficient funds");

  const date = new Date().toLocaleString();

  await updateDoc(userRef,{
    balance: balanceValue - amt,
    transactions: [
      ...(data.transactions || []),
      {
        amount: -amt,
        note: billType.value + " bill paid",
        date
      }
    ]
  });

  alert("Bill paid");
  location.reload();
};


// ======================================================
// 🎁 BUY GIFT CARD
// ======================================================

window.buyGift = async () => {

  const amt = parseFloat(giftAmount.value);

  if (!amt) return alert("Enter amount");
  if (balanceValue < amt) return alert("Insufficient funds");

  const date = new Date().toLocaleString();

  await updateDoc(userRef,{
    balance: balanceValue - amt,
    transactions: [
      ...(data.transactions || []),
      {
        amount: -amt,
        note: giftType.value + " gift card",
        date
      }
    ]
  });

  alert("Gift card purchased");
  location.reload();
};


// ======================================================
// 🚪 LOGOUT
// ======================================================

window.logout = () => {
  localStorage.removeItem("user");
  location.href = "index.html";
};