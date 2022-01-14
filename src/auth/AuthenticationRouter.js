const express = require('express');
const router = express.Router();
const UsersService = require('../user/UserService');
const TokenService = require('../auth/TokenService');
const AuthenticationException = require('./AuthenticationException');
const ForbiddenException = require('../error/ForbiddenException');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');

router.post('/api/1.0/auth', check('email').isEmail(), async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return next(new AuthenticationException());
	}

	const { email, password } = req.body;
	const user = await UsersService.findByEmail(email);
	if (!user) {
		//return res.status(401).send();
		return next(new AuthenticationException());
	}
	// otro requerimiento del controllador seria chequear que el password hasheado
	// del user encontrado en db coincida con el de la credencial provista
	// para ello se usa el metodo compare de bcrypt
	const match = await bcrypt.compare(password, user.password);
	if (!match) {
		return next(new AuthenticationException());
	}
	if (user.inactive) {
		return next(new ForbiddenException());
	}

	res.send({
		id: user.id,
		username: user.username,
		// add new field in response.body in which we will store the token
		token: await TokenService.createToken(user),
	});
});

router.post('/api/1.0/logout', async (req, res) => {
	const authorizationHeader = req.headers.authorization;
	if (authorizationHeader) {
		const token = authorizationHeader.split(' ')[1];
		await TokenService.deleteToken(token);
	}
	res.status(200).send();
});

module.exports = router;
