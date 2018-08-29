var express = require('express');
var app = express();
app.all('*', function(req, res, next) {
     var origin = req.get('origin');
     res.header('Access-Control-Allow-Origin', origin);
     res.header("Access-Control-Allow-Headers", "X-Requested-With");
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     res.header('Access-Control-Allow-Headers', 'Authorization');
     res.header('Access-Control-Allow-Methods', 'POST');
     res.header('Access-Control-Allow-Methods', 'GET');
     res.header('Access-Control-Allow-Methods', 'OPTIONS');
     next();
});
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var passport = require('passport');
// var config = require('./app/config/main');
var user = require('./app/models/user');
var jwt = require('jsonwebtoken');
// var databaseConfig = require('./app/config/main');
var router = require('./app/routes');

// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
//   res.header("Access-Control-Allow-Credentials", "true");
//   next();
// });

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
