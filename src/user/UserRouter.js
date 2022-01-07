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
	async (req, res) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const validationErrors = {};
			errors.array().forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
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
			message: req.t('user_create_success'),
		});
	}
);

module.exports = router;
