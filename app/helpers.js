const cryptoRandomString = require('crypto-random-string');

export class helpers() {
	// Generates a random hash and makes sure it doesn't match any of the existing
	generateWhitehash(user) {
		var hash = cryptoRandomString(8);
		return hash;
	}

	// Removes a hash from the whitelist
	removeFromWhitelist(user, hash) {
		var tokenWhitelist = user.tokenWhitelist;
		for (var i = tokenWhitelist.length-1; i >= 0; i--) {
			if (tokenWhitelist[i] === hash) {
				tokenWhitelist.splice(i, 1);
				break;
			}
		}
		return tokenWhitelist;
	}
}
