const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');
const User = require('./User');

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
router.post(
	'/api/1.0/users/register',
	check('username')
		.notEmpty()
		.withMessage('username cannot be null')
		.bail()
		.isLength({ min: 4, max: 32 })
		.withMessage('username must be at least 4 characters and maximun 32 characters'),
	check('email')
		.notEmpty()
		.withMessage('email cannot be null')
		.bail()
		.isEmail()
		.withMessage('email is not valid')
		.bail()
		.custom(async (email) => {
			const user = await UserService.findByEmail(email);
			if (user) {
				throw new Error('email in use');
			}
		}),
	check('password')
		.notEmpty()
		.withMessage('password cannot be null')
		.bail()
		.isLength({ min: 6 })
		.withMessage('password must be at least 6 characters')
		.bail()
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
		.withMessage('password must have al least one uppercase letter, one lowercase letter and one number'),
	async (req, res) => {
		const { errors } = validationResult(req);

		if (errors.length) {
			const validationErrors = {};
			errors.forEach((error) => {
				validationErrors[error.param] = error.msg;
			});
			//console.log('aaaa', validationErrors);
			return res.status(400).send({
				validationErrors: validationErrors,
			});
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

		await UserService.save(req.body);
		return res.status(200).send({
			message: 'User created',
		});
	}
);

module.exports = router;
