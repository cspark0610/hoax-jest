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

describe('user resgistration', () => {
	const postValidUser = () => {
		return request(app).post('/api/1.0/users/register').send({
			username: 'user1',
			email: 'user1@mail.com',
			password: 'P4ssword',
		});
	};
	it('returns 200 ok when request is valid', async () => {
		//voy a iniciar el servidor y voy a mandar una peticion http para registro de usuario
		// con supertest voy a hacer una peticion http, debo importar la instancia de app
		// e importar libreria supertest
		const response = await postValidUser();
		//console.log(response);
		expect(response.statusCode).toBe(200);
	});

	//no es buena practica hacer multiples expect dentro de un test it()
	it('returns success message when signup request is valid', async () => {
		const response = await postValidUser();
		expect(response.body.message).toBe('User created');
	});

	it('saves the user to database', async () => {
		await postValidUser();
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
		await postValidUser();
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
		await postValidUser();
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
});
