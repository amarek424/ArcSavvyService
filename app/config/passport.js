var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('../models/user');
// var config = require('./main');

module.exports = function(passport){

  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = process.env.secret;

  passport.use(new JwtStrategy(opts, function(jwt_payload, done){
    console.log(jwt_payload._id);
    console.log('hERE');
    User.findById(jwt_payload._id, function(err, user){
      if (err){
        console.log(err);
        return done(err, false);
      }
      if (user){
        console.log(user);
        done(null, user);
      } else {
        done(null, false);
      }
    });
  }));
};
