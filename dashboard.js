<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DeChase Bank Dashboard</title>

<style>
body{
  margin:0;
  font-family:Arial,Helvetica,sans-serif;
  background:#031427;
  color:white;
}

.container{
  max-width:420px;
  margin:auto;
  padding:20px;
}

h2{
  margin-top:0;
}

.small{
  font-size:12px;
  opacity:.7;
}

.green{color:#00ffb2}
.red{color:#ff6b6b}

/* SUCCESS BANNER */

#successBanner{
display:none;
background:#00c46b;
padding:12px;
border-radius:8px;
margin-bottom:15px;
text-align:center;
font-weight:bold;
}

/* CARD */

.bank-card{
background:linear-gradient(135deg,#0a1f44,#1d4ed8);
padding:20px;
border-radius:16px;
color:white;
box-shadow:0 10px 30px rgba(0,0,0,.4);
margin-bottom:20px;
}

.card-top{
display:flex;
justify-content:flex-end;
font-weight:bold;
}

.card-number{
font-size:22px;
letter-spacing:3px;
margin:25px 0;
}

.card-bottom{
display:flex;
justify-content:space-between;
font-size:14px;
}

.card-label{
font-size:10px;
opacity:.7;
}

.freezeCard{
margin-top:10px;
padding:10px;
width:100%;
border:none;
border-radius:10px;
background:#ff3b3b;
color:white;
font-weight:bold;
}

/* BALANCE */

.balance-card{
background:#0d2b4a;
padding:15px;
border-radius:10px;
margin-bottom:15px;
text-align:center;
}

.balance{
font-size:28px;
font-weight:bold;
}

.eye{
font-size:13px;
margin-top:5px;
cursor:pointer;
opacity:.8;
}

/* ACTION BUTTONS */

.actions{
display:flex;
gap:10px;
margin:15px 0;
}

.actions button{
flex:1;
padding:10px;
border:none;
border-radius:8px;
background:#1d4ed8;
color:white;
font-weight:bold;
}

/* PANELS */

.panel{
display:none;
background:#0d2b4a;
padding:15px;
border-radius:10px;
margin-bottom:15px;
}

.panel input{
width:100%;
padding:10px;
margin:5px 0;
border:none;
border-radius:6px;
}

.panel button{
width:100%;
padding:10px;
border:none;
border-radius:8px;
background:#00c46b;
color:white;
font-weight:bold;
margin-top:5px;
}

/* TRANSACTIONS */

#transactions div{
background:#0d2b4a;
padding:10px;
border-radius:8px;
margin-bottom:8px;
}

.logout{
margin-top:15px;
width:100%;
padding:10px;
border:none;
border-radius:8px;
background:#ff3b3b;
color:white;
font-weight:bold;
}
</style>
</head>

<body>

<div class="container">

<div id="successBanner"></div>

<h2 id="welcome">Hello</h2>

<!-- CARD -->
<div class="bank-card">

<div class="card-top">
<span id="cardType">VISA</span>
</div>

<div class="card-number" id="cardNumber">
0000 0000 0000 0000
</div>

<div class="card-bottom">

<div>
<div class="card-label">Card Holder</div>
<div id="cardName">---</div>
</div>

<div>
<div class="card-label">Expiry</div>
<div id="cardExpiry">--/--</div>
</div>

<div>
<div class="card-label">CVV</div>
<div id="cardCVV">***</div>
</div>

</div>

</div>

<button onclick="toggleCard()" class="freezeCard">
Freeze / Unfreeze Card
</button>

<!-- BALANCE -->
<div class="balance-card">
<div class="balance" id="balance">€0</div>
<div class="eye" id="toggleBalance">👁 Hide balance</div>
</div>

<!-- ACCOUNT INFO -->
<div class="panel" style="display:block">
<div class="small">Name</div>
<div id="name"></div>

<div class="small">Account Number</div>
<div id="acc"></div>

<div class="small">IBAN</div>
<div id="iban"></div>

<div class="small">SWIFT</div>
<div id="swift"></div>
</div>

<!-- ACTION BUTTONS -->
<div class="actions">
<button onclick="showTransfer()">Transfer</button>
<button onclick="showBills()">Bills</button>
<button onclick="showGift()">Gift</button>
</div>

<!-- TRANSFER PANEL -->
<div class="panel" id="transferBox">

<input id="receiver" placeholder="IBAN or Account Number">
<div id="receiverName" class="small"></div>

<input id="amount" placeholder="Amount (€)">

<button onclick="askPin()">Send Transfer</button>

</div>

<!-- BILL PANEL -->
<div class="panel" id="billBox">

<select id="billType">
<option>Electricity</option>
<option>Water</option>
<option>Internet</option>
<option>TV Subscription</option>
<option>Taxes</option>
<option>Government Fee</option>
</select>

<input id="billAmount" placeholder="Amount (€)">

<button>Pay Bill</button>

</div>

<!-- GIFT PANEL -->
<div class="panel" id="giftBox">

<input placeholder="Recipient Email">
<input placeholder="Amount (€)">

<button>Send Gift</button>

</div>

<h3>Transactions</h3>

<div id="transactions"></div>

<button class="logout" onclick="logout()">
Logout
</button>

</div>

<!-- DASHBOARD SCRIPT -->
<script type="module" src="dashboard.js"></script>

</body>
</html>