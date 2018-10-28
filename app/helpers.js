const cryptoRandomString = require('crypto-random-string');


// Generates a random hash and makes sure it doesn't match any of the existing
exports.generateWhitehash = function(user) {
	console.log("Generating hash...");
	var hash = cryptoRandomString(8);
	console.log("Hash: " + hash);
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

