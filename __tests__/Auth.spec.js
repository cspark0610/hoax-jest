const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');

// before start all tests, sync the database
beforeAll(async () => {
	await sequelize.sync();
});

beforeEach(async () => {
	await User.destroy({ truncate: true });
});
describe('authentication', () => {
	const validUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };

	const addUser = async (user = validUser) => {
		const hash = await bcrypt.hash(user.password, 10);
		return User.create({ ...user, password: hash });
	};
	const postAuthentication = async (credentials, options = {}) => {
		let agent = request(app).post('/api/1.0/auth');
		if (options.language) {
			agent.set('Accept-Language', options.language);
		}
		return await agent.send(credentials);
	};

	it('returns 200 ok when user credentials, which are composed by email and password are correct', async () => {
		await addUser();
		const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
		expect(response.status).toBe(200);
	});

	it('returns only user id and username when login is successful', async () => {
		// primer agrego un usuario a la db
		const user = await addUser();
		// despues hago un post simulando el login, pasando sus credenciales
		// las cuales consisten en un obj compuesto por su email y password usando los datos del usuario previemente agregado
		const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
		// response.body es el objeto que se devuelve en el AuthController desde res.send()
		expect(response.body.id).toBe(user.id);
		expect(response.body.username).toBe(user.username);
		expect(Object.keys(response.body)).toEqual(['id', 'username']);
	});
	//implemantation of authentication fail scenario test
	it('returns 401 unauthorized when user credentials are incorrect', async () => {
		await addUser();
		const response = await postAuthentication({ email: 'non-exists@mail.com', password: 'P4ssword' });
		expect(response.status).toBe(401);
	});

	it.each`
		language | message
		${'en'}  | ${'incorrect credentials'}
		${'es'}  | ${'credenciales incorrectas'}
	`('returns $message when user credentials are incorrect in language $language', async ({ language, message }) => {
		const response = await postAuthentication({ email: 'user1@mail.com', password: 'password' }, { language });
		expect(response.body.message).toBe(message);
	});

	it('returns 401 unauthorized when password provided as credential is incorrect', async () => {
		// aca ya estoy seteando el password de la forma que esta en el addUser
		const response = await postAuthentication({ email: 'user1@mail.com', password: ' ' });
		expect(response.status).toBe(401);
	});

	it('returns status 401 when logging with an inactive user account', async () => {
		await addUser({ ...validUser, inactive: true });
		const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
		expect(response.status).toBe(403);
	});

	it('returns 401 when email format its empty', async () => {
		const response = await postAuthentication({ password: 'P4ssword' });
		expect(response.status).toBe(401);
	});
});
