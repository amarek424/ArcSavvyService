const user = require('../models/user');
const helpers = require('../helpers');

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

//update user address
exports.setAddress = (req, res, next) => {
	var tokenUser = helpers.getObjectFromJwt(req.headers.authorization);
	user.findOneAndUpdate({ _id: tokenUser._id },
    {
      $set: { 'address.line1': req.body.line1,
      		  'address.line2': req.body.line2,
      		  'address.city': req.body.city,
      		  'address.state': req.body.state,
      		  'address.zip': req.body.zip }
    }, function(err, foundUser) {
      if (err || foundUser == null){
        res.json({ success: false, message: 'Address update failed.'});
      } else {
        res.json({ success: true, message: 'Address added successfully'});
      }
    });
}

//update a users name
exports.setName = (req, res, next) => {
	var tokenUser = helpers.getObjectFromJwt(req.headers.authorization);
	user.findOneAndUpdate({ _id: tokenUser._id },
    {
      $set: { 'firstName': req.body.firstname,
      		  'lastName': req.body.lastname }
    }, function(err, foundUser) {
      if (err || foundUser == null){
        res.json({ success: false, message: 'Name update failed.'});
      } else {
        res.json({ success: true, message: 'Name added successfully'});
      }
    });
}
