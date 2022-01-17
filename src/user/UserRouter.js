const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const TokenService = require('../auth/TokenService');
const { check, validationResult } = require('express-validator');
const pagination = require('../middleware/pagination');
const ForbiddenException = require('../error/ForbiddenException');

const ValidationException = require('../error/ValidationException');
const basicAuthentication = require('../middleware/basicAuthentication');
const tokenAuthentication = require('../middleware/tokenAuthetication');

// MANUAL VALIDATION MIDDLEWARES
// middlewares are meant to update req.validationErrors object

const validateUsername = (req, res, next) => {
	const { username } = req.body;
	if (!username) {
		req.validationErrors = {
			username: 'Username cannot be null',
		};
		//have to put return always in order to avoid null to be written in db!
		// return res.status(400).send({
		// 	validationErrors: {
		// 		username: 'Username cannot be null',
		// 		email: 'Email cannot be null',
		// 	},
		// });
	}
	next();
};

const validateEmail = (req, res, next) => {
	const { email } = req.body;
	if (!email) {
		req.validationErrors = {
			...req.validationErrors,
			email: 'Email cannot be null',
		};
		//have to put return always in order to avoid null to be written in db!
		// return res.status(400).send({
		// 	validationErrors: {
		// 		email: 'Email cannot be null',
		// 	},
		// });
	}
	next();
};

//ROUTE HANDLERS
//in withMessage put translation.json corresponding key
router.post(
	'/api/1.0/users/register',
	check('username')
		.notEmpty()
		.withMessage('username_null')
		.bail()
		.isLength({ min: 4, max: 32 })
		.withMessage('username_size'),
	check('email')
		.notEmpty()
		.withMessage('email_null')
		.bail()
		.isEmail()
		.withMessage('email_invalid')
		.bail()
		.custom(async (email) => {
			const user = await UserService.findByEmail(email);
			if (user) {
				throw new Error('email_inuse');
			}
		}),
	check('password')
		.notEmpty()
		.withMessage('password_null')
		.bail()
		.isLength({ min: 6 })
		.withMessage('password_size')
		.bail()
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
		.withMessage('password_pattern'),
	async (req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const validationErrors = {};
			errors.array().forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
			return res.status(400).send({ validationErrors });
			//return next(new ValidationException(errors.array()));
		}

		//manual validation
		// if (req.validationErrors) {
		// 	const response = {
		// 		validationErrors: { ...req.validationErrors },
		// 	};
		// 	// response {
		// 	// 	validationErrors: {
		// 	// 		username: 'Username cannot be null',
		// 	// 		email: 'Email cannot be null',
		// 	// 	}
		// 	// }
		// 	return res.status(400).send(response);
		// }
		try {
			await UserService.save(req.body);
			return res.status(200).send({
				message: req.t('user_create_success'),
			});
		} catch (error) {
			// return res.status(502).send({
			// 	message: req.t(error.message),
			// });
			next(error);
		}
	}
);

//additional route to handle token activation
router.post('/api/1.0/users/token/:token', async (req, res, next) => {
	const token = req.params.token;
	//console.log('token', token);
	try {
		await UserService.activate(token);
		return res.send({ message: req.t('account_activation_success') });
	} catch (error) {
		next(error);
	}
});

// router for UserListing.spec
router.get('/api/1.0/users', pagination, async (req, res, next) => {
	const authenticatedUser = req.authenticatedUser;
	const { size, page } = req.pagination;
	const users = await UserService.getUsers(page, size, authenticatedUser);
	res.send(users);
});

router.get('/api/1.0/users/:id', async (req, res, next) => {
	try {
		const user = await UserService.getUserById(req.params.id);
		res.status(200).send(user);
	} catch (error) {
		next(error);
	}
});

router.put('/api/1.0/users/:id', async (req, res, next) => {
	const authenticatedUser = req.authenticatedUser;
	if (!authenticatedUser || authenticatedUser.id != req.params.id) {
		return next(new ForbiddenException('unauthorized_user_update'));
	}
	await UserService.updateUser(req.params.id, req.body);
	return res.status(200).send();
});

router.delete('/api/1.0/users/:id', async (req, res, next) => {
	const authenticatedUser = req.authenticatedUser;
	if (!authenticatedUser || authenticatedUser.id != req.params.id) {
		return next(new ForbiddenException('unauthorized_user_delete'));
	}
	await UserService.deleteUser(req.params.id);
	// hay que eliminar tambien el token del usuario
	// bad logic implementation because there is two different services interactions
	// handle deleating tokens in UserService
	// const { authorization } = req.headers;
	// const token = authorization.split(' ')[1];
	// await TokenService.deleteToken(token);
	return res.status(200).send();
});

//route to handle password reset request
router.post(
	'/api/1.0/password-reset',
	check('email').isEmail().withMessage('email_invalid'),
	async (req, res, next) => {
		const errors = validationResult(req);
		//console.log('errors', errors.array());
		if (!errors.isEmpty()) {
			next(new ValidationException(errors.array()));
		}
		try {
			await UserService.passwordResetRequest(req.body.email);
			return res.status(200).send({ message: req.t('password_reset_request_success') });
		} catch (error) {
			next(error);
		}
	}
);

module.exports = router;
