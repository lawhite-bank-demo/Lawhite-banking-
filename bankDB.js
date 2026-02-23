// Create default users if not already saved
if (!localStorage.getItem("bankUsers")) {

  const users = [
    {
      username: "katherine",
      pin: "1234",
      balance: 1860000,
      transactions: []
    },
    {
      username: "sarah",
      pin: "1111",
      balance: 40980,
      transactions: []
    },
    {
      username: "martinez",
      pin: "2222",
      balance: 700000,
      transactions: []
    },
    {
      username: "admin",
      pin: "0000",
      role: "admin",
      balance: 0,
      transactions: []
    }
  ];

  localStorage.setItem("bankUsers", JSON.stringify(users));
}