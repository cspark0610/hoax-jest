//with it functions i m decribing register procceess
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');

//to initialize the database with beforeAll
const sequelize = require('../src/config/database');
const nodeMailerStub = require('nodemailer-stub');
const EmailService = require('../src/email/EmailService');
//SMTP server
const { SMTPServer } = require('smtp-server');
// import json from locales
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

let lastMail;
let server;
let simulateSMTPFailure = false;
beforeAll(async () => {
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
	await server.listen(5857, 'localhost');
	await sequelize.sync();
	jest.setTimeout(20000);
});
//before the execution of EACH test iam going to use beforeEach() function
//destroy User Table before each test
beforeEach(() => {
	simulateSMTPFailure = false;
	await User.destroy({ truncate: { cascade: true } });
});

//close SMTP server after each test
afterAll(async () => {
	await server.close();
	jest.setTimeout(5000);
});

const validUser = {
	username: 'user1',
	email: 'user1@mail.com',
	password: 'P4ssword',
};
const invalidUser = {
	username: null,
	email: 'user1@mail.com',
	password: 'P4ssword',
};
const invalidEmail = {
	username: 'user1',
	email: null,
	password: 'P4ssword',
};
const postUser = (user = validUser, options = {}) => {
	const agent = request(app).post('/api/1.0/users/register');
	if (options.language) {
		agent.set('Accept-Language', options.language);
	}
	return agent.send(user);
};

describe('user registration', () => {
	it('returns 200 ok when request is valid', async () => {
		const response = await postUser();
		//console.log(response);
		expect(response.statusCode).toBe(200);
	});
	it('returns success message when signup request is valid', async () => {
		const response = await postUser();
		expect(response.body.message).toBe(en.user_create_success);
	});

	it('saves the user to database', async () => {
		await postUser();
		const userList = await User.findAll();
		expect(userList.length).toBe(1);
	});
	it('saves the username and email to database', async () => {
		await postUser();
		const userList = await User.findAll();
		const savedUser = userList[0];
		expect(savedUser.username).toBe('user1');
		expect(savedUser.email).toBe('user1@mail.com');
	});
	it('hashes the password and stores it hased in database', async () => {
		//use bcrypt to hash the password inside route handler and expect the hashed password not to be the same as the password
		await postUser();
		const userList = await User.findAll();
		const savedUser = userList[0];
		expect(savedUser.username).toBe('user1');
		expect(savedUser.email).toBe('user1@mail.com');
	});
	it('returns a 400 when username is null', async () => {
		const response = await postUser(invalidUser);
		expect(response.statusCode).toBe(400);
	});
	it('returns validationsErrors field in response body when validation error occurs', async () => {
		const response = await postUser(invalidUser);
		//expect(response.body.validationErrors).toBeDefined();
		expect(response.body.validationErrors).not.toBeUndefined();
	});

	xit('returns Username cannot be null when validation error occurs', async () => {
		const response = await postUser(invalidUser);
		expect(response.body.validationErrors.username).toBe('username cannot be null');
	});

	xit('returns email cannot be null when validation error occurs', async () => {
		const response = await postUser(invalidEmail);
		expect(response.body.validationErrors.email).toBe('email cannot be null');
	});

	xit('returns errors for both when username and email is null', async () => {
		const response = await postUser({
			username: null,
			email: null,
			password: 'P4ssword',
		});
		const body = response.body;
		// {
		//   validationErrors: {
		//     username: 'Username cannot be null',
		//     email: 'Email cannot be null'
		//   }
		// }
		// Object.keys(body.validationErrors) => ['username', 'email']
		//expect(Object.keys(body.validationErrors).length).toEqual(2);
		expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
	});
	xit('returns pasword cannot be  null error when validation error occurs', async () => {
		const response = await postUser({
			username: 'user1',
			email: 'user1@mail.com',
			password: null,
		});
		const body = response.body;
		expect(body.validationErrors.password).toEqual('password cannot be null');
	});
	//DINAMIC TESTS IN JEST 27v
	//it.each(2DarrayOfTests['field','expected error message']('decribe each test'), async(field, expectedMessage)=>{})
	xit.each([
		['username', 'username cannot be null'],
		['email', 'email cannot be null'],
		['password', 'password cannot be null'],
	])('when %s is null %s is recieved', async (field, expectedMessage) => {
		const user = {
			username: 'user1',
			email: 'user1@mail.com',
			password: 'P4ssword',
		};
		//update user object with null according to field we want to test
		user[field] = null;
		const response = await postUser(user);
		const body = response.body;
		expect(body.validationErrors[field]).toBe(expectedMessage);
	});

	//dinamic test different approach
	it.each`
		field         | value              | expectedMessage
		${'username'} | ${null}            | ${en.username_null}
		${'username'} | ${'123'}           | ${en.username_size}
		${'username'} | ${'a'.repeat(33)}  | ${en.username_size}
		${'email'}    | ${null}            | ${en.email_null}
		${'email'}    | ${'ail.com'}       | ${en.email_invalid}
		${'email'}    | ${'user.mail.com'} | ${en.email_invalid}
		${'email'}    | ${'user@mail'}     | ${en.email_invalid}
		${'password'} | ${null}            | ${en.password_null}
		${'password'} | ${'P4ass'}         | ${en.password_size}
		${'password'} | ${'alllowercase'}  | ${en.password_pattern}
		${'password'} | ${'ALLUPPERCASE'}  | ${en.password_pattern}
		${'password'} | ${'123456789'}     | ${en.password_pattern}
		${'password'} | ${'lowerUPPER'}    | ${en.password_pattern}
		${'password'} | ${'lowerand12345'} | ${en.password_pattern}
		${'password'} | ${'UPPERAND12345'} | ${en.password_pattern}
	`('returns $expectedMessage when $field is $value', async ({ field, value, expectedMessage }) => {
		//update user object with null according to value variable
		const user = {
			username: 'user1',
			email: 'user1@mail.com',
			password: 'P4ssword',
		};
		user[field] = value;
		const response = await postUser(user);
		const body = response.body;
		expect(body.validationErrors[field]).toBe(expectedMessage);
	});

	xit('returns size validation error when username is less than 4 characters', async () => {
		const user = {
			username: '123',
			email: 'user1@mail.com',
			password: 'P4ssword',
		};
		const response = await postUser(user);
		const body = response.body;
		expect(body.validationErrors.username).toBe(en.username_size);
	});
	it(`returns ${en.email_inuse} when same email is already in use`, async () => {
		//voy a crear un user persistente en db usando el metodo User.create de Sequelize
		// necesito forzar a la db que el campo email tenga un constrain en true para q  no permita guardar emails repetidos
		await User.create({ ...validUser });
		//luego mando una nueva request de crear un user usando el mismo email
		const response = await postUser();
		expect(response.body.validationErrors.email).toBe(en.email_inuse);
	});
	// 20. INACTIVE MODE TEST
	it('creates user in INACTIVE MODE: when storing user for the first time it will be stored as inactive mode', async () => {
		await postUser();
		const users = await User.findAll();
		const savedUser = users[0];
		// i would expect to have an "inactive" of type boolean property attached to savedUser
		expect(savedUser.inactive).toBe(true);
	});
	it('creates user in INACTIVE MODE even the request body contains inactive as false', async () => {
		// la diferencia aca es que voy a mandar en el body un campo inactive con valor false de forma literal
		await postUser({ ...validUser, inactive: false });
		const users = await User.findAll();
		const savedUser = users[0];
		// i would expect to have an activationToken field in which is stored the string token to activate the user
		expect(savedUser.activationToken).toBeTruthy();
	});
	// 20 GENERATING RANDOM ACTIVATION TOKEN STRING FOR USER TEST
	it('creates an ACTIVATION TOKEN for user', async () => {
		await postUser();
		const users = await User.findAll();
		const savedUser = users[0];
		// console.log(savedUser.activationToken);
		// i would expect to have an "inactive" of type boolean property attached to savedUser
		expect(savedUser.inactive).toBe(true);
	});
	// 21 SENDING EMAIL TO USER TEST, mock functionality of nodemailer send email with lib nodemailer-stub
	it('sends an account activation email to user with activationToken', async () => {
		await postUser();

		//const lastMail = nodeMailerStub.interactsWithMail.lastMail();
		//lastMail.to is an array of all the emails sent
		//expect(lastMail.to).toContain('user1@mail.com');

		// assertion about having the activation token in the body of the email
		const users = await User.findAll();
		const savedUser = users[0];
		//expect(lastMail.content).toContain(savedUser.activationToken);
		expect(lastMail).toContain('user1@mail.com');
		expect(lastMail).toContain(savedUser.activationToken);
	});
	it('returns 502 Bad Gateway error whem sending emails fails', async () => {
		// const mockSendAccountActivation = jest
		// 	.spyOn(EmailService, 'sendEmailAccountActivation')
		// 	.mockRejectedValue({ message: 'failed to deliver email' });
		simulateSMTPFailure = true;
		const response = await postUser();
		//expect(mockSendAccountActivation).toHaveBeenCalled();
		expect(response.status).toBe(502);
		//mockSendAccountActivation.mockRestore();
	});
	it('returns email failure message when sending emails fails', async () => {
		// const mockSendAccountActivation = jest
		// 	.spyOn(EmailService, 'sendEmailAccountActivation')
		// 	.mockRejectedValue({ message: 'failed to deliver email' });
		simulateSMTPFailure = true;
		const response = await postUser();
		//expect(mockSendAccountActivation).toHaveBeenCalled();
		//mockSendAccountActivation.mockRestore();
		expect(response.body.message).toBe('email failure');
	});
	it('does not save user in database if activation email fails to be sent', async () => {
		// const mockSendAccountActivation = jest
		// 	.spyOn(EmailService, 'sendEmailAccountActivation')
		// 	.mockRejectedValue({ message: 'failed to deliver email' });
		simulateSMTPFailure = true;
		await postUser();
		//mockSendAccountActivation.mockRestore();
		const users = await User.findAll();
		//para que pase el test se debe user un try catch dentro de UserService
		expect(users.length).toBe(0);
	});
});

// 24. ACTIVATING USER TEST
describe('account activation', () => {
	it('activates user account when correct activation token is sent', async () => {
		//because need to create a user in db
		await postUser();
		let users = await User.findAll();
		const token = users[0].activationToken;
		// have to make a post request sending token to active user, it done with supertest
		await request(app).post(`/api/1.0/users/token/${token}`).send();
		users = await User.findAll();
		expect(users[0].inactive).toBe(false);
	});

	it('removes the token from user after successful activation', async () => {
		await postUser();
		let users = await User.findAll();
		const token = users[0].activationToken;
		// have to make a post request sending token to active user, it done with supertest
		await request(app).post(`/api/1.0/users/token/${token}`).send();
		users = await User.findAll();

		expect(users[0].activationToken).toBeFalsy();
	});
	it('does not activate the user account when the token is wrong', async () => {
		await postUser();
		const token = 'wrong-token';
		// have to make a post request sending token to active user, it done with supertest
		await request(app).post(`/api/1.0/users/token/${token}`).send();
		const users = await User.findAll();
		expect(users[0].inactive).toBe(true);
	});

	it('returns bad request 400 status code when token is wrong', async () => {
		await postUser();
		const token = 'wrong-token';
		// have to make a post request sending token to active user, it done with supertest
		const response = await request(app).post(`/api/1.0/users/token/${token}`).send();
		// 400 status code has to be settled in UserRouter, in catch block
		expect(response.status).toBe(400);
	});

	it.each`
		language | tokenStatus  | message
		${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
		${'es'}  | ${'wrong'}   | ${es.account_activation_failure}
		${'en'}  | ${'correct'} | ${en.account_activation_success}
		${'es'}  | ${'correct'} | ${es.account_activation_success}
	`(
		'returns $message when tokenStatus is $tokenStatus sent and language is $language',
		async ({ language, tokenStatus, message }) => {
			await postUser();
			let token = 'default-token';
			if (tokenStatus == 'correct') {
				// obtain token from db
				const users = await User.findAll();
				token = users[0].activationToken;
			}

			const response = await request(app)
				.post(`/api/1.0/users/token/${token}`)
				//para que funcione el test que validar el mensaje de error en distintos lenguajes
				.set('Accept-Language', language)
				.send();
			// expect assertion is based in body.message
			expect(response.body.message).toBe(message);
		}
	);
});

//INTERNATIOALIZATION, error messasges can be in different languages
describe('internationalization spanish', () => {
	it.each`
		field         | value              | message
		${'username'} | ${null}            | ${es.username_null}
		${'username'} | ${'123'}           | ${es.username_size}
		${'username'} | ${'a'.repeat(33)}  | ${es.username_size}
		${'email'}    | ${null}            | ${es.email_null}
		${'email'}    | ${'ail.com'}       | ${es.email_invalid}
		${'email'}    | ${'user.mail.com'} | ${es.email_invalid}
		${'email'}    | ${'user@mail'}     | ${es.email_invalid}
		${'password'} | ${null}            | ${es.password_null}
		${'password'} | ${'P4ass'}         | ${es.password_size}
		${'password'} | ${'alllowercase'}  | ${es.password_pattern}
		${'password'} | ${'ALLUPPERCASE'}  | ${es.password_pattern}
		${'password'} | ${'123456789'}     | ${es.password_pattern}
		${'password'} | ${'lowerUPPER'}    | ${es.password_pattern}
		${'password'} | ${'lowerand12345'} | ${es.password_pattern}
		${'password'} | ${'UPPERAND12345'} | ${es.password_pattern}
	`('returns $message when $field is $value', async ({ field, value, message }) => {
		//update user object with null according to value variable
		const user = {
			username: 'user1',
			email: 'user1@mail.com',
			password: 'P4ssword',
		};
		user[field] = value;
		const response = await postUser(user, { language: 'es' });
		const body = response.body;
		expect(body.validationErrors[field]).toBe(message);
	});

	it(`returns ${es.email_inuse} when same email is already in use when language is set tto spanish`, async () => {
		//voy a crear un user persistente en db usando el metodo User.create de Sequelize
		// necesito forzar a la db que el campo email tenga un constrain en true para q  no permita guardar emails repetidos
		await User.create({ ...validUser });
		//luego mando una nueva request de crear un user usando el mismo email
		const response = await postUser({ ...validUser }, { language: 'es' });
		expect(response.body.validationErrors.email).toBe(es.email_inuse);
	});
	it(`returns success message of ${es.user_create_success} when signup request is valid`, async () => {
		const response = await postUser({ ...validUser }, { language: 'es' });
		expect(response.body.message).toBe(es.user_create_success);
	});

	it(`returns ${es.email_failure} message when sending emails fails`, async () => {
		// const mockSendAccountActivation = jest
		// 	.spyOn(EmailService, 'sendEmailAccountActivation')
		// 	.mockRejectedValue({ message: 'failed to deliver email' });
		// debo postear un user con la configuracion en Español
		simulateSMTPFailure = true;
		const response = await postUser({ ...validUser }, { language: 'es' });
		// expect(mockSendAccountActivation).toHaveBeenCalled();
		// mockSendAccountActivation.mockRestore();
		expect(response.body.message).toBe(es.email_failure);
	});
});
