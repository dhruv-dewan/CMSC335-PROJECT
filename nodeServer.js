const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');

require("dotenv").config({ path: path.resolve(__dirname, 'envVariables/.env') })

