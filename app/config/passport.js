var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('../models/user');
// var config = require('./main');

module.exports = function(passport){

  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  console.log(ExtractJwt.fromAuthHeaderWithScheme("jwt"));
  opts.secretOrKey = process.env.secret;
  

  passport.use(new JwtStrategy(opts, function(jwt_payload, done){
    User.findById(jwt_payload._id, function(err, user){
      if (err){
        return done(err, false);
      }
      if (user){
        // if (user.loggedIn) {
          // user.loggedIn = null;
          // user.verify = null;
          // user.password = null;
          done(null, user);
        // } else {
        //   done(null, false);
        // }
      } else {
        done(null, false);
      }
    });
  }));
};
