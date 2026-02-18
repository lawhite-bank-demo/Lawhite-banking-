const user = JSON.parse(localStorage.getItem("currentUser"));

if(!user){
  window.location.href = "index.html";
}
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if(!currentUser){
  window.location.href = "index.html";
}

document.getElementById("welcome").innerText =
  "Welcome, " + currentUser.username;

document.getElementById("balance").innerText =
  "€" + currentUser.balance.toLocaleString();

document.getElementById("iban").innerText =
  "IBAN: " + (currentUser.iban || "Not assigned");

loadTransactions();

function loadTransactions(){
  const txContainer = document.getElementById("transactions");
  txContainer.innerHTML = "";

  if(!currentUser.transactions || currentUser.transactions.length === 0){
    txContainer.innerHTML = "<p>No transactions yet</p>";
    return;
  }

  currentUser.transactions.forEach(tx => {
    const div = document.createElement("div");
    div.className = "tx";
    div.innerHTML = `
      <strong>${tx.type}</strong><br>
      Amount: €${tx.amount}<br>
      Date: ${tx.date}
    `;
    txContainer.appendChild(div);
  });
}

function saveUser(){
  let users = JSON.parse(localStorage.getItem("users")) || [];

  const index = users.findIndex(u => u.username === currentUser.username);
  users[index] = currentUser;

  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
}

function sendMoney(){
  let amount = prompt("Enter amount to send:");

  if(!amount || amount <= 0) return;

  if(amount > currentUser.balance){
    alert("Insufficient funds");
    return;
  }

  currentUser.balance -= Number(amount);

  if(!currentUser.transactions) currentUser.transactions = [];

  currentUser.transactions.push({
    type: "Sent",
    amount: amount,
    date: new Date().toLocaleString()
  });

  saveUser();
  location.reload();
}

function deposit(){
  let amount = prompt("Enter deposit amount:");

  if(!amount || amount <= 0) return;

  currentUser.balance += Number(amount);

  if(!currentUser.transactions) currentUser.transactions = [];

  currentUser.transactions.push({
    type: "Deposit",
    amount: amount,
    date: new Date().toLocaleString()
  });

  saveUser();
  location.reload();
}

function logout(){
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
