const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

// before start all tests, sync the database
beforeAll(async () => {
	await sequelize.sync();
});
beforeEach(async () => {
	await User.destroy({ truncate: { cascade: true } });
});
const putUser = async (id = 5, body = null, options = {}) => {
	// refactor to receive jwt token
	let agent = request(app);
	let token;
	if (options.auth) {
		// // create basic auth header with node Buffer
		// // Authorization: 'Basic nvdjn....'
		// const { email, password } = options.auth;
		// const base64 = Buffer.from(`${email}:${password}`).toString('base64');
		// agent.set('Authorization', `Basic ${base64}`);
		// // o usar la funcion de supertest .auth
		// // agent.auth(email, password);
		let response = await agent.post('/api/1.0/auth').send(options.auth);
		token = response.body.token ? response.body.token : '';
	}
	agent = request(app).put(`/api/1.0/users/${id}`);

	if (options.language) {
		agent.set('Accept-Language', options.language);
	}

	if (token) {
		agent.set('Authorization', `Bearer ${token}`);
	}
	if (options.token) {
		// contemplo el caso de que el token venga dentro del objeto options
		agent.set('Authorization', `Bearer ${options.token}`);
	}

	return agent.send(body);
};
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

describe('user update', () => {
	it('returns 403 forbidden when request is sent without basic authorization', async () => {
		const response = await putUser();
		expect(response.status).toBe(403);
	});
	it.each`
		language | message
		${'en'}  | ${en.unauthorized_user_update}
		${'es'}  | ${es.unauthorized_user_update}
	`(
		'returns $message in response.body when update request is sent without basic authorization when language is $language',
		async ({ language, message }) => {
			const response = await putUser(5, null, { language });
			expect(response.body.message).toBe(message);
		}
	);

	it('returns 403 forbidden when request is sent with incorrect email in basic authorization', async () => {
		await addUser();
		const response = await putUser(5, null, { auth: { email: 'user100@mail.com', password: 'P4ssword' } });
		expect(response.status).toBe(403);
	});

	it('returns 403 forbidden when update request is sent with correct credentials but for different user', async () => {
		await addUser();
		const userToBeUpdated = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });
		// voy a pasar credenciales de otro usuario erroneas
		const response = await putUser(userToBeUpdated.id, null, {
			auth: { email: 'user1@mail.com', password: 'P4ssword' },
		});
		expect(response.status).toBe(403);
	});

	it('returns 403 forbidden when update request is sent by inactive user using correct credentials', async () => {
		const inactiveUser = await addUser({ ...activeUser, inactive: true });
		const response = await putUser(inactiveUser.id, null, {
			auth: { email: 'user1@mail.com', password: 'P4ssword' },
		});
		expect(response.status).toBe(403);
	});

	// success update scenarios
	it('returns 200 ok when valid update request is sent from a correct authenticated user', async () => {
		const savedUser = await addUser();
		const validUpdateBody = { username: 'user1-updated' };
		const response = await putUser(savedUser.id, validUpdateBody, {
			auth: { email: savedUser.email, password: 'P4ssword' },
		});

		expect(response.status).toBe(200);
	});

	it('updates username in database when valid update request body is sent from a correct authenticated user', async () => {
		const savedUser = await addUser();
		const validUpdateBody = { username: 'user1-updated' };
		await putUser(savedUser.id, validUpdateBody, {
			auth: { email: savedUser.email, password: 'P4ssword' },
		});
		const updatedUserInDB = await User.findOne({ where: { id: savedUser.id } });
		expect(updatedUserInDB.username).toEqual(validUpdateBody.username);
	});
	it('returns 403 forbidden when i pass an invalid token', async () => {
		const response = await putUser(5, null, { token: 'anywrongtoken' });
		expect(response.status).toBe(403);
	});
});
