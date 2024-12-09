const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

// User Authentication and Sessiin
const bcrypt = require("bcrypt"); 
const jwt = require("jsonwebtoken");
const session = require("express-session");

const app = express();
const portNumber = 4000;
const { MongoClient, ServerApiVersion } = require('mongodb');
app.set("views", path.resolve(__dirname, "WebPages"));
app.set("view engine", "ejs");


require("dotenv").config({ path: path.resolve(__dirname, 'envVariables/.env') })

// Session Middleware
app.use(session({
  secret: 'your_secret_key', // Replace with a real secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using https
}));

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

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
  //const salt = bcrypt.genSaltSync();
  //const hashedPassword = bcrypt.hashSync(password, salt);

  const newUser = {
    username: username,
    email: email,
    password: password, // Note: Temporarily not hashing
    highScore: 0,
  };

  try {
    await saveUser(newUser);
    res.redirect("/login");
  } catch (err) {
    res.status(500).send("Error registering user");
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
    return res.status(400).send("User not found");
  }

  //const isMatch = bcrypt.compareSync(password, hashed);
  if (false) { // Temporarily disabled
    return res.status(400).send("Invalid credentials");
  }

  // Storing user in session 
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

app.get("/trivia", async (req, res) => {
  const apiUrl = "https://opentdb.com/api.php?amount=10&category=18&difficulty=medium&type=multiple";

  try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
          const questions = data.results.map((item) => {
              const options = [...item.incorrect_answers, item.correct_answer].sort(() => Math.random() - 0.5);
              return {
                  question: item.question,
                  options: options,
                  correctAnswer: item.correct_answer, // For validation
              };
          });

          req.session.questions = questions; // Store questions in session
          req.session.correctAnswers = questions.map(q => q.correctAnswer); // Store correct answers in session

          res.render("trivia", { questions });
      } else {
          console.error("No questions fetched from API.");
          res.render("trivia", { questions: [] });
      }
  } catch (error) {
      console.error("Error fetching trivia questions:", error);
      res.status(500).send("Unable to load trivia questions. Please try again later.");
  }
});


app.post("/submit-answers", (req, res) => {
  const userAnswers = req.body; // Contains user's answers
  const correctAnswers = req.session.correctAnswers || []; // Get correct answers from session
  const questions = req.session.questions || []; // Get questions from session

  let score = 0;

  // Calculate the score
  correctAnswers.forEach((correctAnswer, index) => {
      if (userAnswers[`question-${index}`] === correctAnswer) {
          score++;
      }
  });

  const total = correctAnswers.length;

  // Render results.ejs with all required variables
  res.render("results", {
      score,
      total,
      userAnswers,
      questions: questions.map((q, index) => ({
          text: q.question,
          correctAnswer: q.correctAnswer,
      })),
  });
});


app.get('/results', (req, res) => {
  res.render('results', {
    score: score,
    total: total,
    questions: questions || [], // Pass an empty array if questions is undefined
    userAnswers: userAnswers || {}
  });
});

