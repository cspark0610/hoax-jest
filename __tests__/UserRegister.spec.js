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
});
//before the execution of EACH test iam going to use beforeEach() function
//destroy User Table before each test
beforeEach(() => {
	simulateSMTPFailure = false;
	return User.destroy({ truncate: true });
});

//close SMTP server after each test
afterAll(async () => {
	await server.close();
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
		//voy a iniciar el servidor y voy a mandar una peticion http para registro de usuario
		// con supertest voy a hacer una peticion http, debo importar la instancia de app
		// e importar libreria supertest
		const response = await postUser();
		//console.log(response);
		expect(response.statusCode).toBe(200);
	});

	//no es buena practica hacer multiples expect dentro de un test it()
	it('returns success message when signup request is valid', async () => {
		const response = await postUser();
		expect(response.body.message).toBe('user created');
	});

	it('saves the user to database', async () => {
		await postUser();
		const userList = await User.findAll();
		expect(userList.length).toBe(1);
		// request(app)
		// 	.post('/api/1.0/users/register')
		// 	.send({
		// 		username: 'user1',
		// 		email: 'user1@mail.com',
		// 		password: 'P4ssword',
		// 	})
		// 	.then(() => {
		// 		User.findAll().then((userList) => {
		// 			expect(userList.length).toBe(1);
		// 			done();
		// 		});
		// 	});
	});
	it('saves the username and email to database', async () => {
		await postUser();
		const userList = await User.findAll();
		const savedUser = userList[0];
		expect(savedUser.username).toBe('user1');
		expect(savedUser.email).toBe('user1@mail.com');

		// request(app)
		// 	.post('/api/1.0/users/register')
		// 	.send({
		// 		username: 'user1',
		// 		email: 'user1@mail.com',
		// 		password: 'P4ssword',
		// 	})
		// 	.then(() => {
		// 		User.findAll().then((userList) => {
		// 			const savedUser = userList[0];
		// 			expect(savedUser.username).toBe('user1');
		// 			expect(savedUser.email).toBe('user1@mail.com');
		// 			done();
		// 		});
		// 	});
	});
	it('hashes the password and stores it hased in database', async () => {
		//use bcrypt to hash the password inside route handler and expect the hashed password not to be the same as the password
		await postUser();
		const userList = await User.findAll();
		const savedUser = userList[0];
		expect(savedUser.username).toBe('user1');
		expect(savedUser.email).toBe('user1@mail.com');

		// 	request(app)
		// 		.post('/api/1.0/users/register')
		// 		.send({
		// 			username: 'user1',
		// 			email: 'user1@mail.com',
		// 			password: 'P4ssword',
		// 		})
		// 		.then(() => {
		// 			User.findAll().then((userList) => {
		// 				const savedUser = userList[0];
		// 				expect(savedUser.password).not.toBe('P4ssword');
		// 				done();
		// 			});
		// 		});
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
		//console.log('hola', body);
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

	const username_null = 'username cannot be null';
	const username_size = 'username must be at least 4 characters and maximun 32 characters';
	const email_null = 'email cannot be null';
	const email_invalid = 'email is not valid';
	const password_null = 'password cannot be null';
	const password_size = 'password must be at least 6 characters';
	const password_pattern = 'password must contain at least one uppercase letter, one lowercase letter and one number';
	const email_inuse = 'email is already in use';
	const user_create_success = 'user created successfully';
	it.each`
		field         | value              | expectedMessage
		${'username'} | ${null}            | ${username_null}
		${'username'} | ${'123'}           | ${username_size}
		${'username'} | ${'a'.repeat(33)}  | ${username_size}
		${'email'}    | ${null}            | ${email_null}
		${'email'}    | ${'ail.com'}       | ${email_invalid}
		${'email'}    | ${'user.mail.com'} | ${email_invalid}
		${'email'}    | ${'user@mail'}     | ${email_invalid}
		${'password'} | ${null}            | ${password_null}
		${'password'} | ${'P4ass'}         | ${password_size}
		${'password'} | ${'alllowercase'}  | ${password_pattern}
		${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
		${'password'} | ${'123456789'}     | ${password_pattern}
		${'password'} | ${'lowerUPPER'}    | ${password_pattern}
		${'password'} | ${'lowerand12345'} | ${password_pattern}
		${'password'} | ${'UPPERAND12345'} | ${password_pattern}
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
		expect(body.validationErrors.username).toBe('username must be at least 4 characters and maximun 32 characters');
	});
	it(`returns ${email_inuse} when same email is already in use`, async () => {
		//voy a crear un user persistente en db usando el metodo User.create de Sequelize
		// necesito forzar a la db que el campo email tenga un constrain en true para q  no permita guardar emails repetidos
		await User.create({ ...validUser });
		//luego mando una nueva request de crear un user usando el mismo email
		const response = await postUser();
		expect(response.body.validationErrors.email).toBe(email_inuse);
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
	// 23. ACTIVATING USER TEST
	it('activates user account when correct activation token is sent', async () => {
		//becasue i need a user in DB
		await postUser();
		let users = await User.findAll();
		const token = users[0].activationToken;
		//console.log(token);
		await request(app).post(`/api/1.0/users/token/${token}`).send();
		users = await User.findAll();
		//console.log('a', users[0]);
		expect(users[0].activationToken).toBe(token);
		expect(users[0].inactive).toBe(false);
	});
});

//adding internationalization , error messasges can be in different languages
describe('internationalization spanish', () => {
	const username_null = 'username no puede ser nulo';
	const username_size = 'username debe contener al menos 4 caracteres y maximo 32';
	const email_null = 'email no puede ser nulo';
	const email_invalid = 'email no valido';
	const password_null = 'password no puede ser nulo';
	const password_size = 'password debe contener al menos 6 caracteres';
	const password_pattern = 'password debe contener al menos una letra mayuscula, una letra minuscula y un numero';
	const email_inuse = 'email en uso';
	const user_create_success = 'usuario creado';
	const email_failure = 'email fallido';
	it.each`
		field         | value              | expectedMessage
		${'username'} | ${null}            | ${username_null}
		${'username'} | ${'123'}           | ${username_size}
		${'username'} | ${'a'.repeat(33)}  | ${username_size}
		${'email'}    | ${null}            | ${email_null}
		${'email'}    | ${'ail.com'}       | ${email_invalid}
		${'email'}    | ${'user.mail.com'} | ${email_invalid}
		${'email'}    | ${'user@mail'}     | ${email_invalid}
		${'password'} | ${null}            | ${password_null}
		${'password'} | ${'P4ass'}         | ${password_size}
		${'password'} | ${'alllowercase'}  | ${password_pattern}
		${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
		${'password'} | ${'123456789'}     | ${password_pattern}
		${'password'} | ${'lowerUPPER'}    | ${password_pattern}
		${'password'} | ${'lowerand12345'} | ${password_pattern}
		${'password'} | ${'UPPERAND12345'} | ${password_pattern}
	`('returns $expectedMessage when $field is $value', async ({ field, value, expectedMessage }) => {
		//update user object with null according to value variable
		const user = {
			username: 'user1',
			email: 'user1@mail.com',
			password: 'P4ssword',
		};
		user[field] = value;
		const response = await postUser(user, { language: 'es' });
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
		expect(body.validationErrors.username).toBe('username must be at least 4 characters and maximun 32 characters');
	});
	it(`returns ${email_inuse} when same email is already in use when language is set tto spanish`, async () => {
		//voy a crear un user persistente en db usando el metodo User.create de Sequelize
		// necesito forzar a la db que el campo email tenga un constrain en true para q  no permita guardar emails repetidos
		await User.create({ ...validUser });
		//luego mando una nueva request de crear un user usando el mismo email
		const response = await postUser({ ...validUser }, { language: 'es' });
		expect(response.body.validationErrors.email).toBe(email_inuse);
	});
	it(`returns success message of ${user_create_success} when signup request is valid`, async () => {
		const response = await postUser({ ...validUser }, { language: 'es' });
		expect(response.body.message).toBe(user_create_success);
	});

	it(`returns ${email_failure} message when sending emails fails`, async () => {
		// const mockSendAccountActivation = jest
		// 	.spyOn(EmailService, 'sendEmailAccountActivation')
		// 	.mockRejectedValue({ message: 'failed to deliver email' });
		// debo postear un user con la configuracion en Español
		simulateSMTPFailure = true;
		const response = await postUser({ ...validUser }, { language: 'es' });
		// expect(mockSendAccountActivation).toHaveBeenCalled();
		// mockSendAccountActivation.mockRestore();
		expect(response.body.message).toBe('email fallido');
	});
});
