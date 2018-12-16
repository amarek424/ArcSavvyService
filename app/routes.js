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
	authRoutes.post('/login', AuthController.authenticateUser);
	authRoutes.post('/verify', AuthController.verifyUser);
	authRoutes.post('/forgot', AuthController.forgotPassword);
	authRoutes.post('/reset', AuthController.resetPassword);
	authRoutes.post('/newcode', AuthController.createNewValidateCode);
	authRoutes.post('/emailexists', AuthController.checkEmailExists);
	authRoutes.post('/logout', passport.authenticate('jwt', {session: false}), AuthController.logoutUser);
	authRoutes.post('/deactivate', passport.authenticate('jwt', {session: false}), AuthController.deactivateUser);
	authRoutes.post('/checkAuthStatus', passport.authenticate('jwt', {session: false}), AuthController.checkAuthStatus);

	// Perform user/profile related stuff
	apiRoutes.use('/profile', passport.authenticate('jwt', {session: false}), profileRoutes);

	profileRoutes.get('/', UserController.getProfile); // Make this a function that returns current user instead
	profileRoutes.get('/users', UserController.getUsers);
	profileRoutes.get('/user/:email', UserController.getUser);

}
