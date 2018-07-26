var jwt = require('jsonwebtoken');
var config = require('../config/main');
var crypto = require('crypto');
var async = require('async');
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
      user.findOneAndUpdate({ _id: forgetfulUser._id }, { reset_password_token: token, reset_password_expires: Date.now() + 86400000 }, { upsert: true, new: true }).exec(function(err, new_user) {
        done(err, token, new_user);
      });
    },
    function(token, forgetfulUser, done) {

      var message = {
        from: 'ArcSavvy <bdor528@gmail.com>',
        to: forgetfulUser.email,
        subject: 'Reset your ArcSavvy account password now',
        text: 'Reset your password here http://localhost:8080/api/auth/reset_password?token=' + token
      };

      mailgun.messages().send(message, function (err, body){
        if (err){
          console.log(err)
        }
        console.log(body);
      });

    }
  ], function(err) {
    return res.status(422).json({ message: err });
  });
};


exports.resetPassword = (req, res, next) => {
  user.findOne({
    reset_password_token: req.body.token,
    reset_password_expires: {
      $gt: Date.now()
    }
  }).exec(function(err, forgetfulUser) {
    if (!err && forgetfulUser) {
      if (req.body.newPassword === req.body.verifyPassword) {
        user.password = bcrypt.hashSync(req.body.newPassword, 10);
        user.reset_password_token = undefined;
        user.reset_password_expires = undefined;
        user.save(function(err) {
          if (err) {
            return res.status(422).send({
              message: err
            });
          } else {

            var message = {
              from: 'ArcSavvy <bdor528@gmail.com>',
              to: user.email,
              subject: 'ArcSavvy Password Reset Confirmation',
              text: 'Your password has been reset!'
            };

            mailgun.messages().send(message, function (err, body){
              if (err){
                console.log('Mailgun ERROR!')
              }
              console.log(body);
            });
          }
        });
      } else {
        return res.status(422).send({
          message: 'Passwords do not match'
        });
      }
    } else {
      return res.status(400).send({
        message: 'Password reset token is invalid or has expired.'
      });
    }
  });
};
