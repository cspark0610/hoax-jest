const bcrypt = require('bcrypt');
const UserService = require('../user/UserService');
const TokenService = require('../auth/TokenService');

const jwtAuthentication = async (req, res, next) => {
	const authorizationHeader = req.headers.authorization;
	if (authorizationHeader) {
		// 'Bearer oiaunvduvnuvd'
		const token = authorizationHeader.split(' ')[1];
		try {
			const user = await TokenService.verifyToken(token);
			req.authenticatedUser = user;
		} catch (error) {}
	}

	next();
};

module.exports = jwtAuthentication;
