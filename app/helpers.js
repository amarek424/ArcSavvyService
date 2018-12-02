const cryptoRandomString = require('crypto-random-string');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

// Generates a random hash and makes sure it doesn't match any of the existing
exports.generateWhitehash = function(user) {
	var hash = cryptoRandomString(8);
	return hash;
}

// Removes a hash from the whitelist
exports.removeFromWhitelist = function(user, hash) {
	var tokenWhitelist = user.tokenWhitelist;
	for (var i = tokenWhitelist.length-1; i >= 0; i--) {
		if (tokenWhitelist[i] === hash) {
			tokenWhitelist.splice(i, 1);
			break;
		}
	}
	return tokenWhitelist;
}


exports.getObjectFromJwt = function(token) {
var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = process.env.secret;
  opts.passReqToCallback = true;
  opts.passReqToCallback = true;

  passport.use(new JwtStrategy(opts, function(jwt_payload) {
    return jwt_payload;
  }));
}
