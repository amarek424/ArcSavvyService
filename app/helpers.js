const cryptoRandomString = require('crypto-random-string');

export class helpers() {
	// Generates a random hash and makes sure it doesn't match any of the existing
	generateWhitehash(user) {
		var hash = cryptoRandomString(8);
		return hash;
	}
}