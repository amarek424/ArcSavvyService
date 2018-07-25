var express = require('express');
var passport = require('passport');
UserController = require('./controllers/profile');
AuthController = require('./controllers/authorization');

module.exports = function(app) {

	var apiRoutes = express.Router(),
		profileRoutes = express.Router(),
		authRoutes = express.Router();

	// Default response
	app.get('/', (req, res) => { res.send('Welcome to the ArcSavvy API.'); });

	// Set up routes
	app.use('/api', apiRoutes);

	apiRoutes.use('/auth', authRoutes);
	authRoutes.post('/register', AuthController.registerUser);
	authRoutes.post('/authenticate', AuthController.authenticateUser);
	authRoutes.get('/verify/:verify', AuthController.verifyUser);

	// Perform user/profile related stuff
	apiRoutes.use('/profile', passport.authenticate('jwt', {session: false}), profileRoutes);
	profileRoutes.get('/', UserController.getUser); // Make this a function that returns current user instead
	profileRoutes.get('/users', UserController.getUsers);

}
