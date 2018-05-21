const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const bodyparser = require('body-parser');
const nodemailer = require('nodemailer');
const morgan = require('morgan');
const router = require('./router');
const cors = require('cors');
const got = require('got');

const app = express();

mongoose.connect('mongodb://localhost:auth/authdd', { useMongoClient: false })

require("./models/user");
require("./models/category");
require("./models/memo");
require("./models/note");

app.use(morgan('combined'));
app.use(cors());
app.use(bodyparser.json({type: '*/*'}))
app.use(bodyparser.urlencoded({ extended: false }))
app.enable('trust proxy');

// mongoose.set('debug', true)

router(app);

const port = process.env.PORT || 3090;
const server = http.createServer(app);
server.listen(port, () => {
    console.log(`Server listening on ${port}`);
});
