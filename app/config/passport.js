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

  passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    User.findById(jwt_payload._id, function(err, user){
      if (err){
        return done(err, false);
      }
      if (user){
          if (user.tokenWhitelist.includes(jwt_payload.tokenWhitelist)) {
            return done(null, user);
          } else {
            return done(null, false);
          }
      } else {
        return done(null, false);
      }
    });
  }));
};