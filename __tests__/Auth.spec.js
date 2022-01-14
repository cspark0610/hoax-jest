const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
// import json from locales
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

// before start all tests, sync the database
beforeAll(async () => {
	await sequelize.sync();
});

beforeEach(async () => {
	await User.destroy({ truncate: { cascade: true } });
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

const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const postAuthentication = (credentials, options = {}) => {
	let agent = request(app).post('/api/1.0/auth');
	if (options.language) {
		agent.set('Accept-Language', options.language);
	}
	return agent.send(credentials);
};

const postLogout = async (options = {}) => {
	const agent = request(app).post('/api/1.0/logout').send();
	if (options.token) {
		agent.set('Authorization', `Bearer ${options.token}`);
	}
	return agent.send();
};

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

	it('returns only user id and username and token when login is successful', async () => {
		// primer agrego un usuario a la db
		const user = await addUser();
		// despues hago un post simulando el login, pasando sus credenciales
		// las cuales consisten en un obj compuesto por su email y password usando los datos del usuario previemente agregado
		const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
		// response.body es el objeto que se devuelve en el AuthController desde res.send()
		expect(response.body.id).toBe(user.id);
		expect(response.body.username).toBe(user.username);
		expect(Object.keys(response.body)).toEqual(['id', 'username', 'token']);
	});
	//implemantation of authentication fail scenario test
	it('returns 401 unauthorized when user credentials are incorrect', async () => {
		await addUser();
		const response = await postAuthentication({ email: 'non-exists@mail.com', password: 'P4ssword' });
		expect(response.status).toBe(401);
	});

	it.each`
		language | message
		${'en'}  | ${en.authentication_failure}
		${'es'}  | ${es.authentication_failure}
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
	// JWT token test
	it('returns JWT token in response body when credentials are correct', async () => {
		await addUser();
		const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
		// i m going to attach in body a new field called "token" with stores JWT token
		expect(response.body.token).not.toBeUndefined();
	});
});

describe('token logout', () => {
	it('returns 200 ok when unauthorized request is sent for logout', async () => {
		const response = await postLogout();
		expect(response.status).toBe(200);
	});
	it('removes corresponding token from databse', async () => {
		await addUser();
		const response = await postAuthentication(credentials);
		const token = response.body.token;
		await postLogout({ token: token });
		const storedToken = await Token.findOne({ where: { token: token } });
		expect(storedToken).toBeNull();
	});
});
