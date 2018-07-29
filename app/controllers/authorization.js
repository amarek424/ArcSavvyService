var jwt = require('jsonwebtoken');
var config = require('../config/main');
var crypto = require('crypto');
var async = require('async');
var bcrypt = require('bcrypt');
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
            expiresIn: 10000
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


// Reset user password
exports.forgotPassword = (req, res) => {
  async.waterfall([
    function(done) {
      user.findOne({
        email: req.body.email
      }).exec(function(err, forgetfulUser) {
        if (forgetfulUser) {
          done(err, forgetfulUser);
        } else {
          done('User not found.');
        }
      });
    },
    function(forgetfulUser, done) {
      // create the random token
      crypto.randomBytes(20, function(err, buffer) {
        var token = buffer.toString('hex');
        done(err, forgetfulUser, token);
      });
    },
    function(forgetfulUser, token, done) {
      user.findOneAndUpdate({ email: forgetfulUser.email },
        {
          $set: {
            reset_password_token: token,
            reset_password_expires: (Date.now() + 86400000)
          }
        }, function(err, forgetfulUser) {
          if (err || forgetfulUser == null){
            return res.json({ success: true, message: 'User lookup error'});
          }
        done(err, token, forgetfulUser);
      });
    },
    function(token, forgetfulUser, done) {
      var message = {
        from: 'ArcSavvy <bdor528@gmail.com>',
        to: forgetfulUser.email,
        subject: 'Reset your ArcSavvy account password now',
        text: 'Reset your password here http://localhost:8080/api/auth/reset/' + token
      };
      mailgun.messages().send(message, function (err, body){
        if (err){
          return res.json({ success: false, message: 'Message error!'});
        }
        res.json({ success: true, message: 'Password reset link sent. Check your inbox.'});
      });

    }
  ], function(err) {
    return res.status(422).json({ message: err });
  });
};


exports.resetPassword = (req, res) => {
  user.findOne({email: req.body.email, reset_password_token: req.body.token}).exec(function(err, resetUser) {
    if(err || resetUser == null){
      res.json({ success: false, message: 'Token bad or expired!'})
    }
    if (req.body.newPassword === req.body.verifyPassword){
      resetUser.password = req.body.newPassword;
      resetUser.reset_password_token = undefined;
      resetUser.reset_password_expires = undefined;
      resetUser.save(function(err) {
        if (err) {
          return res.status(422).send({
            success: false, message: 'Password reset failed.'
          });
        } else {

          var message = {
            from: 'ArcSavvy <bdor528@gmail.com>',
            to: resetUser.email,
            subject: 'ArcSavvy Password Reset Confirmation',
            text: 'Your password has been reset!'
          };

          mailgun.messages().send(message, function (err, body){
            if (err){
              return res.status(422).send({
                success: false, message: 'Error reseting your password.'
              });
            }
            return res.status(200).send({
              success: true, message: 'Password reset successful.'
            });
          });
        }
      });
    }
  });
};
