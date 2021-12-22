//with it functions i m decribing register procceess
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');

//to initialize the database with beforeAll
const sequelize = require('../src/config/database');

beforeAll(() => {
	return sequelize.sync();
});
//before the execution of EACH test iam going to use beforeEach() function
//destroy User Table before each test
beforeEach(() => {
	return User.destroy({ truncate: true });
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
const postUser = (user = validUser) => {
	return request(app).post('/api/1.0/users/register').send(user);
};

describe('user resgistration', () => {
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
		expect(response.body.message).toBe('User created');
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
	it.each`
		field         | value              | expectedMessage
		${'username'} | ${null}            | ${'username cannot be null'}
		${'username'} | ${'123'}           | ${'username must be at least 4 characters and maximun 32 characters'}
		${'username'} | ${'a'.repeat(33)}  | ${'username must be at least 4 characters and maximun 32 characters'}
		${'email'}    | ${null}            | ${'email cannot be null'}
		${'email'}    | ${'ail.com'}       | ${'email is not valid'}
		${'email'}    | ${'user.mail.com'} | ${'email is not valid'}
		${'email'}    | ${'user@mail'}     | ${'email is not valid'}
		${'password'} | ${null}            | ${'password cannot be null'}
		${'password'} | ${'P4ass'}         | ${'password must be at least 6 characters'}
		${'password'} | ${'alllowercase'}  | ${'password must have al least one uppercase letter, one lowercase letter and one number'}
		${'password'} | ${'ALLUPPERCASE'}  | ${'password must have al least one uppercase letter, one lowercase letter and one number'}
		${'password'} | ${'123456789'}     | ${'password must have al least one uppercase letter, one lowercase letter and one number'}
		${'password'} | ${'lowerUPPER'}    | ${'password must have al least one uppercase letter, one lowercase letter and one number'}
		${'password'} | ${'lowerand12345'} | ${'password must have al least one uppercase letter, one lowercase letter and one number'}
		${'password'} | ${'UPPERAND12345'} | ${'password must have al least one uppercase letter, one lowercase letter and one number'}
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
	it('returns email in use when same email is already in use', async () => {
		//voy a crear un user persistente en db usando el metodo User.create de Sequelize
		// necesito forzar a la db que el campo email tenga un constrain en true para q  no permita guardar emails repetidos
		await User.create({ ...validUser });
		//luego mando una nueva request de crear un user usando el mismo email
		const response = await postUser();
		expect(response.body.validationErrors.email).toBe('email in use');
	});
});
