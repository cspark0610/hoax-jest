const bcrypt = require('bcrypt');
const UserService = require('../user/UserService');

const basicAuthentication = async (req, res, next) => {
	// this middleware is meant to check req.headers.authorization, check if its an active user and compare password
	// and set in req the property authenticatedUser assigning user found in db
	const authorizationHeader = req.headers.authorization;
	if (authorizationHeader) {
		// Basic ....
		const encoded = authorizationHeader.split(' ')[0];
		const decoded = Buffer.from(encoded, 'base64').toString('ascii');
		const [email, password] = decoded.split(':');

		const user = await UserService.findByEmail(email);

		if (user && !user.inactive) {
			const match = await bcrypt.compare(password, user.password);
			if (match) {
				req.authenticatedUser = user;
			}
		}
		next();
	}
};

module.exports = basicAuthentication;
