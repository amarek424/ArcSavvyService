const user = require('../models/user');

// Returns all user's info
exports.getUsers = (req, res, next) => {
	console.log('Getting all users info.')
	user.find({})
	.select('-password')
	.limit(10)
	.exec(function(err, result) {
		if (err) throw err;
		res.json(result);
	});
}

// Returns the current user's account info
exports.getProfile = (req, res, next) => {
	console.log('Getting current user info.');
	user.findById(req.user.id, function (err, user){
		if (err) {
			return res.json({ success: false, message: 'Error: User ID not found'})
		}
		user.password = null;
		res.json(user);
	});
}

//returns a user by email address
exports.getUser = (req, res, next) => {
	console.log('Getting a user.');
	user.find({email: req.params.email})
	.select('-password')
	.exec(function(err, result) {
		if (err) throw err;
		res.json(result);
	});
}
