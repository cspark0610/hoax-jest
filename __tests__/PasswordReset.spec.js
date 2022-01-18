const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const bcrypt = require('bcrypt');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');
const { SMTPServer } = require('smtp-server');

const config = require('config');

//simulute smtp server
let lastMail;
let server;
let simulateSMTPFailure = false;
beforeAll(async () => {
	console.log('config.mail.port', config.mail.port);
	server = new SMTPServer({
		authOptional: true,
		onData(stream, session, callback) {
			let mailBody;
			stream.on('data', (data) => {
				mailBody += data.toString();
			});
			stream.on('end', () => {
				if (simulateSMTPFailure) {
					const err = new Error('invalid mailbox');
					err.responseCode = 553;
					return callback(err);
				}
				lastMail = mailBody;
				callback();
			});
		},
	});
	await server.listen(config.mail.port, 'localhost');
	await sequelize.sync();
	jest.setTimeout(20000);
});

beforeEach(async () => {
	simulateSMTPFailure = false;
	await User.destroy({ truncate: { cascade: true } });
});

//close SMTP server after each test
afterAll(async () => {
	await server.close();
	jest.setTimeout(5000);
});

const activeUser = {
	username: 'user1',
	email: 'user1@mail.com',
	password: 'P4ssword',
	inactive: false,
};
const addUser = async (user = { ...activeUser }) => {
	const hash = await bcrypt.hash(user.password, 10);
	user.password = hash;
	return await User.create(user);
};

const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
	let agent = request.agent(app).post('/api/1.0/user/password');
	if (options.language) {
		agent.set('Accept-Language', options.language);
	}
	return agent.send({ email: email });
};

// for password update
const putPasswordUpdate = (bodyUpdatePassword = {}, options = {}) => {
	let agent = request(app).put('/api/1.0/user/password');
	if (options.language) {
		agent.set('Accept-Language', options.language);
	}
	return agent.send(bodyUpdatePassword);
};

describe('password reset request', () => {
	// por default express manda un 404 cuando no encuentra una ruta asociada
	it('returns 404 when a password request is sent from an emails which does not exists', async () => {
		const response = await postPasswordReset();
		expect(response.status).toBe(404);
	});

	it.each`
		language | message
		${'en'}  | ${en.email_not_inuse}
		${'es'}  | ${es.email_not_inuse}
	`(
		'returns $message in response.body for unknown email for passwoord request when language is $language',
		async ({ language, message }) => {
			const response = await postPasswordReset('user1@mail.com', { language: language });
			expect(response.body.message).toBe(message);
		}
	);

	it.each`
		language | message
		${'en'}  | ${en.validation_failure}
		${'es'}  | ${es.validation_failure}
	`(
		'returns 400 $message in response.body for invalid format email for passwoord request when language is $language',
		async ({ language, message }) => {
			const response = await postPasswordReset(null, { language: language });
			expect(response.body.message).toBe(message);
		}
	);
	it('returns 200 when passowrd reset request is sent from known email in db', async () => {
		const user = await addUser();
		const response = await postPasswordReset(user.email);
		expect(response.status).toBe(200);
	});
	it.each`
		language | message
		${'en'}  | ${en.password_reset_request_success}
		${'es'}  | ${es.password_reset_request_success}
	`(
		'returns $message in response.body for existing email in db for passwoord request when language is $language',
		async ({ language, message }) => {
			const user = await addUser();
			const response = await postPasswordReset(user.email, { language: language });
			expect(response.body.message).toBe(message);
		}
	);
	it('creates password reset token when password reset reqeust is sent for known email', async () => {
		const user = await addUser();
		await postPasswordReset(user.email);
		const userInDB = await User.findOne({ where: { email: user.email } });
		// toBeTruthy() no es lo mismo que not.toBeNull()
		expect(userInDB.passwordResetToken).toBeTruthy();
	});

	it('sends password reset email with password reset token created for user', async () => {
		const user = await addUser();
		await postPasswordReset(user.email);
		const userInDB = await User.findOne({ where: { email: user.email } });
		const passwordResetToken = userInDB.passwordResetToken;

		expect(lastMail).toContain(user.email);
		expect(lastMail).toContain(passwordResetToken);
	});

	it('returns 502 bad gateway when sending email fails', async () => {
		// para simular un error en el envio de email
		simulateSMTPFailure = true;

		const user = await addUser();
		const response = await postPasswordReset(user.email);
		expect(response.status).toBe(502);
	});

	// email failure response body.message
	it.each`
		language | message
		${'en'}  | ${en.email_failure}
		${'es'}  | ${es.email_failure}
	`(
		'returns $message in response.body when sending email with password reset token when language is $language',
		async ({ language, message }) => {
			simulateSMTPFailure = true;
			const user = await addUser();
			const response = await postPasswordReset(user.email, { language: language });
			expect(response.body.message).toBe(message);
		}
	);
});

describe('Password update', () => {
	const invalidBodyUpdatePassword = {
		password: 'newP4ssword',
		passwordResetToken: 'abcd',
	};
	it('returns 403 forbidden action when password update request does not have the valid password reset token', async () => {
		const response = await putPasswordUpdate(invalidBodyUpdatePassword);
		expect(response.status).toBe(403);
	});
	it.each`
		language | message
		${'en'}  | ${en.unauthorized_password_reset}
		${'es'}  | ${es.unauthorized_password_reset}
	`(
		'returns $message in response.body when password update request does not have the valid password reset token when language is $language',
		async ({ language, message }) => {
			const response = await putPasswordUpdate(invalidBodyUpdatePassword, { language: language });
			expect(response.body.message).toBe(message);
		}
	);
	it('return 403 when password update request with invalid password pattern and the reset token is invalid', async () => {
		const response = await putPasswordUpdate({
			password: 'not-valid-pattern',
			passwordResetToken: null,
		});
		expect(response.status).toBe(403);
	});

	it('returns 400 bad request when trying to update with invalid password and reset token is valid', async () => {
		const user = await addUser();
		user.passwordResetToken = 'test-token';
		await user.save();

		const response = await putPasswordUpdate({
			password: 'not-valid',
			passwordResetToken: 'test-token',
		});
		expect(response.status).toBe(400);
	});

	it.each`
		language | value              | message
		${'en'}  | ${null}            | ${en.password_null}
		${'en'}  | ${'P4ssw'}         | ${en.password_size}
		${'en'}  | ${'alllowercase'}  | ${en.password_pattern}
		${'en'}  | ${'ALLUPPERCASE'}  | ${en.password_pattern}
		${'en'}  | ${'1234567890'}    | ${en.password_pattern}
		${'en'}  | ${'lowerandUPPER'} | ${en.password_pattern}
		${'en'}  | ${'lower4nd5667'}  | ${en.password_pattern}
		${'en'}  | ${'UPPER44444'}    | ${en.password_pattern}
		${'es'}  | ${null}            | ${es.password_null}
		${'es'}  | ${'P4ssw'}         | ${es.password_size}
		${'es'}  | ${'alllowercase'}  | ${es.password_pattern}
		${'es'}  | ${'ALLUPPERCASE'}  | ${es.password_pattern}
		${'es'}  | ${'1234567890'}    | ${es.password_pattern}
		${'es'}  | ${'lowerandUPPER'} | ${es.password_pattern}
		${'es'}  | ${'lower4nd5667'}  | ${es.password_pattern}
		${'es'}  | ${'UPPER44444'}    | ${es.password_pattern}
	`(
		'returns password validation error $message when language is set to $language and the value is $value',
		async ({ language, message, value }) => {
			const user = await addUser();
			user.passwordResetToken = 'test-token';
			await user.save();
			const response = await putPasswordUpdate(
				{
					password: value,
					passwordResetToken: 'test-token',
				},
				{ language: language }
			);
			console.log(response.body.validationsErrors);
			expect(response.body.validationsErrors.password).toBe(message);
		}
	);

	it('returns 200 when valid password is sent with valid reset token', async () => {
		const user = await addUser();
		user.passwordResetToken = 'test-token';
		await user.save();
		const response = await putPasswordUpdate({
			password: 'new-P4ssword',
			passwordResetToken: 'test-token',
		});
		expect(response.status).toBe(200);
	});
	it('updates user password in DB when valid password is sent with valid reset token', async () => {
		const user = await addUser();
		user.passwordResetToken = 'test-token';
		await user.save();
		await putPasswordUpdate({
			password: 'new-P4ssword',
			passwordResetToken: 'test-token',
		});
		const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
		expect(userInDB.password).not.toEqual(user.password);
	});

	it('deletes reset token in DB when the request is valid', async () => {
		const user = await addUser();
		user.passwordResetToken = 'test-token';
		await user.save();
		await putPasswordUpdate({
			password: 'new-P4ssword',
			passwordResetToken: 'test-token',
		});
		const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
		expect(userInDB.passwordResetToken).toBeFalsy();
	});

	it('activates and deletes activation token in DB if the account is inactive after valid password reset', async () => {
		const user = await addUser();
		user.passwordResetToken = 'test-token';
		user.activationToken = 'activation-token';
		user.inactive = true;

		await user.save();
		await putPasswordUpdate({
			password: 'new-P4ssword',
			passwordResetToken: 'test-token',
		});
		const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
		expect(userInDB.activationToken).toBeFalsy();
		expect(userInDB.inactive).toBe(false);
	});

	// el user podria estar logueado en multiples clientes
	it('deletes all tokens of user after valid password reset', async () => {
		const user = await addUser();
		user.passwordResetToken = 'test-token';
		await user.save();

		await Token.create({
			token: 'token-1',
			userId: user.id,
			lastUsedAt: Date.now(),
		});
		await putPasswordUpdate({
			password: 'new-P4ssword',
			passwordResetToken: 'test-token',
		});
		const tokens = await Token.findAll({ where: { userId: user.id } });
		expect(tokens.length).toBe(0);
	});
});
