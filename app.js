// LOGIN FUNCTION
function loginUser() {

  const username = document.getElementById("username").value.toLowerCase();
  const pin = document.getElementById("pin").value;

  const users = JSON.parse(localStorage.getItem("bankUsers"));

  const user = users.find(u => u.username === username && u.pin === pin);

  if (user) {

    localStorage.setItem("loggedInUser", JSON.stringify(user));

    if (user.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "./Dashboard.html";
    }

  } else {
    document.getElementById("error").innerText = "Invalid username or PIN";
  }
}


// SHOW BALANCE
function loadDashboard(){

  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  if(!user){
    window.location.href = "index.html";
    return;
  }

  document.getElementById("welcome").innerText = "Hello, " + user.username;
  document.getElementById("balance").innerText =
    "€" + user.balance.toLocaleString();
}


// ADMIN PANEL USERS
function loadAdmin(){

  const users = JSON.parse(localStorage.getItem("bankUsers"));
  const container = document.getElementById("userList");

  users.forEach(user => {

    if(user.role === "admin") return;

    container.innerHTML += `
      <div class="card">
        <h3>${user.username}</h3>
        <p>€${user.balance.toLocaleString()}</p>
      </div>
    `;
  });
}