var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('../models/user');
// var config = require('./main');

module.exports = function(passport){

  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.token = getJwt;
  opts.secretOrKey = process.env.secret;

  passport.use(new JwtStrategy(opts, function(jwt_payload, done){
    console.log("JSON : " + JSON.stringify(jwt_payload));
    console.log("H " + opts.jwtFromRequest);
    User.findById(jwt_payload._id, function(err, user){
      if (err){
        return done(err, false);
      }
      console.log("test");
      if (user){
          done(null, user);
      } else {
        done(null, false);
      }
    });
  }));
};



var getJwt = function (request) {
  var token = null;
  if (request.headers.authorization) {
    token = request.headers.authorization;
  }
  return token;
}