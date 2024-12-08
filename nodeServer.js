const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

// User Authentication and Sessiin
//const bcrypt = require("bcrypt"); 
//const jwt = require("jsonwebtoken");
//const session = require("express-session");

const app = express();
const portNumber = 5000;
// const { MongoClient, ServerApiVersion } = require('mongodb');

require("dotenv").config({ path: path.resolve(__dirname, 'envVariables/.env') })

app.use(bodyParser.urlencoded({extended:false}));
process.stdin.setEncoding("utf8");

app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);

app.set("views", path.resolve(__dirname, "WebPages"));
app.set("view engine", "ejs");

app.get("/", (request, response) => {
    response.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

async function saveUser(user) {
  // TODO: Save user to database
}

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  //const salt = await bcrypt.genSalt(10);
  //const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = {
    username: username,
    email: email,
    password: hashedPassword,
    highScore: 0,
  };

  try {
    await saveUser(newUser);
    res.redirect("/login");
  } catch (err) {
    res.status(500)
    res.send("Error registering user");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

async function getUserByEmail(email) {
  // TODO: Get user from database by email
}

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(400)
    res.send("User not found");
  }

  //const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400)
    res.send("Invalid credentials");
  }

  // Storing user in session here to keep track of user -- NEEDS TO BE TESTED
  req.session.user = user;
  res.redirect("/dashboard");
});

// Dashboard (User profile and leaderboard)
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("dashboard", { user: req.session.user });
});

async function getLeaderboard() {
  // TODO: Get leaderboard from database
}

app.get("/leaderboard", async (req, res) => {
  const leaderboard = await getLeaderboard();
  res.render("leaderboard", { leaderboard });
});

// LOGOUT ROUTE
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Server Shutdown
const prompt = "Type stop to shutdown the server: \n";
process.stdout.write(prompt);
process.stdin.on("readable", function () {
  const dataInput = process.stdin.read();
  if (dataInput !== null) {
    const command = dataInput.trim();
    if (command === "stop") {
      process.stdout.write("Shutting down the server\n");
      process.exit(0);
    } else {
      process.stdout.write('Invalid command: ' + command + '\n');
    }
    process.stdout.write(prompt);
    process.stdin.resume();
  }
});

