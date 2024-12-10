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


require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })
console.log(process.env.MONGO_DB_USERNAME);

// Session Middleware
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@firstcluster.qcigm.mongodb.net/?retryWrites=true&w=majority&appName=FirstCluster`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 }); 

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

app.get("/error", (req, res) => {
  res.render("error", { errorMessage: "An error occurred." });
});

app.get("/register", (req, res) => {
  res.render("register");
});

async function checkEmailExists(email) {
  try {
    await client.connect();
    const existingUser = await client.db(db).collection(collection).findOne({ email: email });
    return existingUser !== null; // Return true if email exists, false otherwise
  } catch (e) {
    console.error("Error checking email:", e);
    return false;
  } finally {
    await client.close();
  }
}

async function saveUser(user) {

  try {
      await client.connect();
      const result = await client.db(db).collection(collection).insertOne(user);

      console.log(`User registered in database with id ${result.insertedId}`);
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (await checkEmailExists(email)) {
    return res.render("error", { errorMessage: "Email already exists, please try again!" });
  }

  const salt = bcrypt.genSaltSync();
  const hashedPassword = bcrypt.hashSync(password, salt);

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
    console.error(err);
    return res.render("error", { errorMessage: "Error registering user, please try again!" });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

async function getUserByEmail(email) {
  try {
    await client.connect();
    const existingUser = await client.db(db).collection(collection).findOne({ email: email });
    return existingUser;
  } catch (e) {
    console.error("Error checking email:", e);
    return null;
  } finally {
    await client.close();
  }
}

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await getUserByEmail(email);
  if (user === null) {
    return res.render("error", { errorMessage: "User not found, please try again!" });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.render("error", { errorMessage: "Invalid credentials, please try again!" });
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
  try {
    await client.connect();
    return await client.db(db).collection(collection)
      .find({}, { projection: { username: 1, highScore: 1 } })
      .sort({ highScore: -1 }) // Sort by high score in descending order
      .limit(10)
      .toArray();
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    return [];
  } finally {
    await client.close();
  }
}

app.get("/leaderboard", async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.render("leaderboard", { leaderboard });
  } catch (err) {
    res.render("error", { errorMessage: "Unable to load leaderboard." });
  }
});


app.get("/leaderboard", async (req, res) => {
  const leaderboard = await getLeaderboard();
  res.render("leaderboard", { leaderboard });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

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
                  correctAnswer: item.correct_answer,
              };
          });

          req.session.questions = questions;
          req.session.correctAnswers = questions.map(q => q.correctAnswer);

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


app.post("/submit-answers", async (req, res) => {
  const userAnswers = req.body; 
  const correctAnswers = req.session.correctAnswers || [];
  const questions = req.session.questions || [];
  const user = req.session.user; // Access the logged-in user from the session

  let score = 0;

  // Calculate the user's score
  correctAnswers.forEach((correctAnswer, index) => {
      if (userAnswers[`question-${index}`] === correctAnswer) {
          score++;
      }
  });

  const total = correctAnswers.length;

  // Check and update the user's high score
  if (user) {
    try {
      await client.connect();
      const collectionRef = client.db(db).collection(collection);

      // Fetch the user's record
      const dbUser = await collectionRef.findOne({ email: user.email });

      if (dbUser && score > dbUser.highScore) {
        // Update the high score in the database
        await collectionRef.updateOne(
          { email: user.email },
          { $set: { highScore: score } }
        );

        // Update the high score in the session
        req.session.user.highScore = score;
      }
    } catch (err) {
      console.error("Error updating high score:", err);
    } finally {
      await client.close();
    }
  }

  // Render the results page
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


