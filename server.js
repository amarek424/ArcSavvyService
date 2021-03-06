var express = require('express');
var app = express();
var cors = require('cors')

app.use(cors());

var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var passport = require('passport');
var user = require('./app/models/user');
var jwt = require('jsonwebtoken');
var router = require('./app/routes');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(morgan('dev'));

// initialize passport
app.use(passport.initialize());

mongoose.connect(process.env.database,
	{ useNewUrlParser: true })
	.then(res => console.log("Connected to DB"))
	.catch(err => console.log(err));

// Use passport Strategy
require('./app/config/passport')(passport);


var defaultPort = 8080;
app.listen(process.env.PORT || defaultPort);
console.log("API listening on port " + defaultPort);

router(app);
