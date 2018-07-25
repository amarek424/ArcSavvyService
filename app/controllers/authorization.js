var jwt = require('jsonwebtoken');
var config = require('../config/main');
var crypto = require('crypto');
var mailgun = require('mailgun-js')({apiKey: config.mailgunapikey, domain: config.mailgundomain});
const user = require('../models/user');

// register new users
exports.registerUser = (req, res) => {
  if(!req.body.email || !req.body.password) {
    res.json({ success: false, message: 'Please enter an email and password to register.'});
  }else{
    var newUser = new user({
      email: req.body.email,
      password: req.body.password,
      firstName: req.body.firstname,
      lastName: req.body.lastname
    });

    // Generate hash for email verification
    var current_date = (new Date()).valueOf().toString();
    var random = Math.random().toString();
    newUser.verify = crypto.createHash('sha1').update(current_date + random).digest('hex');

    // try to save new user
    newUser.save(function(err){
      if (err) {
        return res.json({success: false, message: 'Email address already exists.'});
      }


      var message = {
        from: 'ArcSavvy <bdor528@gmail.com>',
        to: newUser.email,
        subject: 'Veryify your ArcSavvy account now',
        text: 'Veryify your account here http://localhost:8080/api/auth/verify/' + newUser.verify
      };
      mailgun.messages().send(message, function (err, body){
        if (err){
          console.log('Mailgun ERROR!')
        }
        console.log(body);
      });


      res.json({ success: true, message: 'Successfully created new user.'});
    });
  }
}

// Authentication: auth user and get jwt token
exports.authenticateUser = (req, res) => {
  user.findOne({
    email: req.body.email
  }, function(err, user){
    if (err) throw err;
    if (!user){
      res.send({success: false, message: 'Authentication failed. User not found.'});
    } else {
      // CHeck the password, user just passed
      user.comparePassword(req.body.password, function(err, isMatch){
        if (isMatch && !err){
          // Create the token
          var token = jwt.sign(user.toJSON(), config.secret, {
            expiresIn: 604800
          });
          res.json({ success: true, token: 'JWT ' + token});
        } else {
          //password doesnt match
          res.json({ success: false, message: 'Authentication failed. No password match.'});
        }
      });
    }
  });
}

// Verify user account by email URL
exports.verifyUser = (req, res) => {
  user.findOneAndUpdate({
    verify: req.params.verify
  },
  {
    $unset: {verify: null }, $set: {active: true}
  }, function(err, user){
    if (err || user == null){
        return res.json({ success: false, message: 'Invalid verification URL.'});
    }
    res.json({ success: true, message: 'Account verified! ' + user.email});
  });
}
