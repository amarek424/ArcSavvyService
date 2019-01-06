var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('../models/user');
// var config = require('./main');

module.exports = function(passport){

  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = process.env.secret;
  opts.passReqToCallback = true;
  opts.passReqToCallback = true;

  passport.use(new JwtStrategy(opts, function(req, jwt_payload, done) {
    User.findById(jwt_payload._id, function(err, user){
      if (err){
        done(err, false);
        return;
      }
      console.log('HERE');
      if (user){
          if (user.isDeactivated) {
            console.log('isDeactivated');
            done(null, false);
            return;
          } else {
            console.log('here2');
            if (user.tokenWhitelist.indexOf(jwt_payload.tokenWhitelist) > -1) {
              console.log('Token good');
              done(null, user);
              return;
            } else {
              console.log('Token bad');
              done(null, false);
              return;
            }
          }
      } else {
        console.log('User not found');
        done(null, false);
        return;
      }
    });
  }));
};