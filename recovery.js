// ===============================
// LAWWHITE BANK DATA RECOVERY
// ===============================

(function(){

let users = JSON.parse(localStorage.getItem("users")) || [];

// ✅ Restore default users if database missing
if(!Array.isArray(users) || users.length === 0){
  users = [
    { username:"admin", pin:"4321", balance:15000, transactions:[] },
    { username:"katherine", pin:"1234", balance:5200, transactions:[] },
    { username:"sarah", pin:"1111", balance:40980, transactions:[] },
    { username:"martinez", pin:"2222", balance:700000, transactions:[] }
  ];
}

// ✅ Repair missing fields
users.forEach(u => {

  if(typeof u.balance !== "number"){
    u.balance = 0;
  }

  if(!u.transactions){
    u.transactions = [];
  }

  if(!u.pin){
    u.pin = "0000";
  }

});

// Save repaired users
localStorage.setItem("users", JSON.stringify(users));


// ✅ Fix currentUser if broken
let currentUser = JSON.parse(localStorage.getItem("currentUser"));

if(currentUser){

  const dbUser = users.find(u => u.username === currentUser.username);

  if(dbUser){
    currentUser.balance = dbUser.balance;
    currentUser.transactions = dbUser.transactions;
  } else {
    localStorage.removeItem("currentUser");
  }

  localStorage.setItem("currentUser", JSON.stringify(currentUser));
}

})();