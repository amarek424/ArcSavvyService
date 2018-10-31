var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('../models/user');
// var config = require('./main');

module.exports = function(passport){

  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = process.env.secret;
  opts.passReqToCallback = true;

  passport.use(new JwtStrategy(opts, function(req, jwt_payload, done)
  
  {
    //var tokenFromRequest = req.headers.authorization;
    // console.log(tokenFromRequest);
    User.findById(jwt_payload._id, function(err, user){
      if (err){
        return done(err, false);
      }
      if (user){
          if (user.tokenWhitelist.includes(jwt_payload.tokenWhitelist)) {
            console.log(jwt_payload.tokenWhitelist);
            done(null, user);
          } else {
            done(null, false);
          }
      } else {
        done(null, false);
      }
    });
  }));
};