var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('../models/user');
// var config = require('./main');

module.exports = function(passport){

  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = process.env.secret;
  console.log("JWT TOKEN: " + opts.jwtFromRequest);
  passport.use(new JwtStrategy(opts, function(jwt_payload, done){
    console.log("JWT TOKEN2: " + jwt_payload.key);
    console.log("opts: " + opts);
    User.findById(jwt_payload._id, function(err, user){
      if (err){
        return done(err, false);
      }
      if (user){
          done(null, user);
      } else {
        done(null, false);
      }
    });
  }));
};
