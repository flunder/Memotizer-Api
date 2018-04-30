const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const bodyparser = require('body-parser');
const morgan = require('morgan');
const app = express();
const router = require('./router');
const cors = require('cors');

mongoose.connect('mongodb://localhost:auth/authdd')

require("./models/user");
require("./models/category");
require("./models/memo");
require("./models/note");

app.use(morgan('combined'));
app.use(cors());
app.use(bodyparser.json({type: '*/*'}))
mongoose.set('debug', true)

router(app);
const port = process.env.PORT || 3090;
const server = http.createServer(app);
server.listen(port);
console.log('Server listening on:', port);
