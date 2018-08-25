var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var async = require('async');
var bcrypt = require('bcrypt');
var mailgun = require('mailgun-js')({apiKey: process.env.mailgunapikey, domain: process.env.mailgundomain});
const user = require('../models/user');


// Creates a new user and sends verify email
// POST Params:
// body.email - the new users email address, must be unique
// body.password - the new users account Password
// body.firstname
// body.lastname
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

    // OLD: Generate hash for email verification
    // var current_date = (new Date()).valueOf().toString();
    // var random = Math.random().toString();
    // newUser.verify = crypto.createHash('sha1').update(current_date + random).digest('hex');
    console.log(Math.floor(100000 + Math.random() * 900000));
    newUser.verify.code = Math.floor(100000 + Math.random() * 900000);

    // replace this url key with a key that they will make the user validate immediately  123-123ß

    // try to save new user
    newUser.save(function(err){
    if (err) {
      return res.json({success: false, message: 'Email address unavailable.'});
    }

    var message = {
      from: 'ArcSavvy <bdor528@gmail.com>',
      to: newUser.email,
      subject: 'ArcSavvy Account Verification',
      html: '<h2>Welcome to ArcSavvy!</h2><p>You need to verify your email address.<br><a href="https://arcsavvyservice.herokuapp.com/api/auth/verify/' + newUser.verify.code + '">Verify</a> my account'
    };
    mailgun.messages().send(message, function (err, body){
      if (err){
        console.log('Mailgun ERROR!');
      }
      console.log(body);
    });
      res.json({ success: true, message: 'Successfully created new user.'});
    });
  }
}

// Authenticates user and sends jwt token
// POST Params:
// body.email - email addres to logon with
// body.password - password to hash and compare
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
          user.password = null;
          userJson = user.toJSON();
          delete userJson.password;
          delete userJson.createdAt;
          delete userJson.updatedAt;
          delete userJson._id;
          delete userJson.__v;
          userJson['ipAddress'] = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
          var token = jwt.sign(userJson, process.env.secret, {
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
// GET params
// verify - the token from the register email
exports.verifyUser = (req, res) => {
  // find user and clear its unverified status
  user.findOneAndUpdate({
    verify: {code: req.body.code},
    email: req.body.email
  },
  {
    $unset: {verify: null}, {$dec: { verify: 1 }}
  }, function(err, user){
    // if error or the user cannot be found, return error
    if (err || user == null){
        return res.json({ success: false, message: 'Invalid verification URL.'});
    }
    res.json({ success: true, message: 'Account verified! ' + user.email});
  });
}


// Reset user password
// POST params
// body.email - the email address of the account to reset.
exports.forgotPassword = (req, res) => {
  async.waterfall([
    function(done) {
      // Find the user info by email
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
      // create the random token to send via email
      crypto.randomBytes(20, function(err, buffer) {
        var token = buffer.toString('hex');
        done(err, forgetfulUser, token);
      });
    },
    function(forgetfulUser, token, done) {
      // update our user with the reset token and expire date
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
      // Send the link and code to the user via email
      var message = {
        from: 'ArcSavvy <bdor528@gmail.com>',
        to: forgetfulUser.email,
        subject: 'Reset your ArcSavvy account password now',
        html: '<h2>Forgot your ArcSavvy password?</h2><p>Reset your password here <a href="https://arcsavvyservice.herokuapp.com/api/auth/reset/">Reset Password</a><br>'
            + 'Enter this code: ' + token + '</p>'
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
  // find the user based on the email they enter and the token they have
  user.findOne({email: req.body.email, reset_password_token: req.body.token, reset_password_expires: {
      $gt: Date.now()
    }}).exec(function(err, resetUser) {
    if(err || resetUser == null){
      res.json({ success: false, message: 'Token bad or expired!'})
    }
    // check if the two passwords in the form match before continuing
    if (req.body.newPassword === req.body.verifyPassword){
      // Set the new user attributes and save to db
      resetUser.password = req.body.newPassword;
      resetUser.reset_password_token = undefined;
      resetUser.reset_password_expires = undefined;
      resetUser.save(function(err) {
        if (err) {
          return res.status(422).send({
            success: false, message: 'Password reset failed.'
          });
        } else {
          // If everything is successful, send the email confirming the change
          var message = {
            from: 'ArcSavvy <bdor528@gmail.com>',
            to: resetUser.email,
            subject: 'ArcSavvy Password Reset Confirmation',
            html: '<h2>Your password has been reset!</h2'
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
