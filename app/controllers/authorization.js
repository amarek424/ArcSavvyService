var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var async = require('async');
var bcrypt = require('bcrypt');
var mailgun = require('mailgun-js')({apiKey: process.env.mailgunapikey, domain: process.env.mailgundomain});
var helpers = require('../helpers');
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
    newUser.verify.code = Math.floor(100000 + Math.random() * 900000);

    // replace this url key with a key that they will make the user validate immediately  123-123ß

    // try to save new user
    newUser.save(function(err){
      if (err) {
        return res.json({success: false, message: 'Email address unavailable.'});
      }

      var message = {
        from: 'ArcSavvy <amarek424@gmail.com>',
        to: newUser.email,
        subject: 'ArcSavvy Account Verification',
        html: '<h2>Welcome to ArcSavvy!</h2><p>You need to <a href="http://localhost:4200/verify/' + req.body.email + '\">verify</a> your email address.</p><label>' + newUser.verify.code + '</label>'
      };
      mailgun.messages().send(message, function (err, body){
        if (err){
          console.log('Mailgun ERROR!');
          console.log(err);
        }

        // Update profile with whitelist
        let whitehash = helpers.generateWhitehash(user);
        // Remove oldest hash from whitelist if full
        if (newUser.tokenWhitelist.length >= 3) {
          newUser.tokenWhitelist.shift();
        }

        newUser.tokenWhitelist.push(whitehash);

        user.findOneAndUpdate({ email: newUser.email },
        {
          $set: { tokenWhitelist: newUser.tokenWhitelist }
        }, function(err, foundUser) {
          if (err || foundUser == null){
            res.json({ success: false, message: 'Authentication failed. server error.'});
          } else {

            foundUser.password = null;
            foundUser.verify = null;
            foundUser.loggedIn = null;
            foundUser.tokenWhitelist = whitehash;

            userJson = foundUser.toJSON();
            var token = jwt.sign(userJson, process.env.secret, {
              expiresIn: 3600
            });

            res.json({ success: true, token: 'JWT ' + token, message: 'Successfully created new user.'});
          }
        });
      });
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
  }, function(err, foundUser){
    if (err) throw err;
    if (!user){
      res.send({success: false, message: 'Authentication failed. User not found.'});
    } else {
      // CHeck the password, user just passed
      foundUser.comparePassword(req.body.password, function(err, isMatch){

        if (isMatch && !err){
          // Update profile with whitelist
          let whitehash = helpers.generateWhitehash(user);
          // Remove oldest hash from whitelist if full
          if (foundUser.tokenWhitelist.length >= 3) {
            foundUser.tokenWhitelist.shift();
          }

          foundUser.tokenWhitelist.push(whitehash);

          user.findOneAndUpdate({ email: foundUser.email },
          {
            $set: { tokenWhitelist: foundUser.tokenWhitelist }
          }, function(err, foundUser) {
            if (err || foundUser == null){
              res.json({ success: false, message: 'Authentication failed. server error.'});
            } else {
              console.log(foundUser);
              if (foundUser.verify.code) {
                res.json({ success: false, message: 'Email verification still required.', code: 6});
              } else {
                foundUser.password = null;
                foundUser.verify = null;
                foundUser.loggedIn = null;
                foundUser.tokenWhitelist = whitehash;

                userJson = foundUser.toJSON();
                var token = jwt.sign(userJson, process.env.secret, {
                  expiresIn: 3600
                });

                res.json({ success: true, token: 'JWT ' + token});
              }
            }
          });
        } else {
          //password doesnt match
          res.json({ success: false, message: 'Authentication failed. No password match.'});
        }
      });
    }
  });
}

// Create a new validation code
// POST params
// email - the email of the account to verify
exports.createNewValidateCode = (req, res) => {
  newCode = Math.floor(100000 + Math.random() * 900000);
  user.findOneAndUpdate({
    email: req.body.email,
    verify: { $exists: true }
  },
  {
    $set: { 'verify.code': newCode, 'verify.attempts': 3 }
  }, function(err, foundUser){
    if (err || foundUser == null){
      return res.json({ success: false, message: 'Cannot create new code for that user.'});
    }
    var message = {
      from: 'ArcSavvy <bdor528@gmail.com>',
      to: foundUser.email,
      subject: 'ArcSavvy Account Verification',
      html: '<h2>Welcome to ArcSavvy!</h2><p>You need to verify your email address.</p><br/><label>' + newCode + '</label>'
    };
    mailgun.messages().send(message, function (err, body){
      if (err){
        console.log('Mailgun ERROR!');
      }
      return res.json({ success: true, message: 'New validation code created.\nCheck your inbox.'});

    });
  });
}

// Verify user account by email code
// POST params
// code - the code from the register email
// email - the email of the account to verify
exports.verifyUser = (req, res) => {
  // find user and clear its unverified status
  user.findOneAndUpdate({
    email: req.body.email
  },
  {
    $inc: { 'verify.attempts': -1 }
  }, function(err, foundUser){
    // if error or the user cannot be found, return error
    if (err){
      return res.json({ success: false, message: 'Verification error.'});
    } else if (foundUser == null) {
      return res.json({ success: false, message: 'This user cannot be found.'});
    } else if (!foundUser.verify) {
      return res.json({ success: false, message: 'This user is already verified.'})
    } else if (foundUser.verify.attempts > 0) {
        // Verification code correct: Delete verification field
        if (foundUser.verify.code == req.body.code) {
          user.findOneAndUpdate({
            email: req.body.email
          },
          {
            $unset: { verify: 1 } // Was 'null' instead of 'true'
          },
          {
            multi: true, safe: true
          }, function(err, foundUser){
            // if error or the user cannot be found, return error
            if (err || foundUser == null){
              return res.json({ success: false, message: 'Unable to complete verification.'});
            } else {
              return res.json({ success: true, message: 'Account verified successfully!'});
            }
          });
        } else {
          response_message = 'Invalid verification code.';
          if (foundUser.verify.attempts === 1) {
            response_message += '/nValidation attempts exceeded.'
          }
          return res.json({ success: false, message: response_message});
        }
      // Attempts exceeded
      } else {
        user.findOneAndUpdate({
          email: req.body.email
        },
        {
          $set: { 'verify.code': 0000000 }
        }, function(err, foundUser){
          // if error or the user cannot be found, return error
          if (err || foundUser == null){
            return res.json({ success: false, message: 'Verification failed.\nUser not found'});
          } else {
            return res.json({ success: false, message: 'Validation attempts exceeded.\nCreate a new code.', code: 7});
          }
        });
      }
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
        res.json({ success: true, message: 'Password reset link sent.\nCheck your inbox.'});
      });

    }
  ], function(err) {
    return res.status(422).json({ message: err });
  });
};

// resets the users password
exports.resetPassword = (req, res) => {
  // find the user based on the email they enter and the token they have
  user.findOne({email: req.body.email, reset_password_token: req.body.token, reset_password_expires: {
      $gt: Date.now()
    }}).exec(function(err, resetUser) {
    if(err || resetUser == null){
      res.json({ success: false, message: 'Token bad or expired!'});
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

// check if the given email address is available
exports.checkEmailExists = (req, res) => {
  user.findOne({email: req.body.email}).exec(function(err, foundAccount) {
    if (err){
      console.log(err);
      res.json({ success: true, message: 'Error: please try again'});
    }
    
    if (foundAccount == null || foundAccount == undefined) {
      console.log("Available");
      res.json({ success: true, message: 'Email available'});
    } else {
      res.json({ success: false, message: 'Email already exists'});
    }
  })
}

// log the user out. 
// WARNING! JWT tokens are STILL ACTIVE even when a user logs out.
// This function marks the User as logged out in the DB, which is checked by PassPort before token is accepted.
exports.logoutUser = (req, res) => {
  user.findOne({
    _id: req.user._id
  }, function(err, foundUser){
    // if error or the user cannot be found, return error
    if (err || foundUser == null){
      return res.json({ success: false, message: 'Logout failed!'});
    }
    // ADD FUNCTION TO REMOVE FROM WHITELIST
    console.log("Before: " + foundUser.tokenWhitelist);
    foundUser.tokenWhitelist = []; // Logging out ALL devices
    //foundUser.tokenWhitelist = helpers.removeFromWhitelist(foundUser, req.headers.authorization);
    foundUser.save();
    console.log("After: " + foundUser.tokenWhitelist);
    return res.json({ success: true, message: 'Bye.'});
  });
}
