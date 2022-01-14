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
	await User.destroy({ truncate: true });
});
const deleteUser = async (id = 5, options = {}) => {
	let agent = request(app).delete(`/api/1.0/users/${id}`);

	if (options.language) {
		// set language in header
		agent.set('Accept-Language', options.language);
	}
	if (options.token) {
		// contemplo el caso de que el token venga dentro del objeto options
		agent.set('Authorization', `Bearer ${options.token}`);
	}

	return agent.send();
};

const auth = async (options = {}) => {
	// este funcion  rebice un objeto options con la propiedad token y la retorna
	let token;
	if (options.auth) {
		let response = await request(app).post('/api/1.0/auth').send(options.auth);
		token = response.body.token ? response.body.token : '';
	}
	return token;
};

const activeUser = {
	username: 'user1',
	email: 'user1@mail.com',
	password: 'P4ssword',
	inactive: false,
};
const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = { ...activeUser }) => {
	const hash = await bcrypt.hash(user.password, 10);
	user.password = hash;
	return await User.create(user);
};

describe('user delete', () => {
	it('returns 403 forbidden when request is sent unauthorized', async () => {
		const response = await deleteUser();
		expect(response.status).toBe(403);
	});
	it.each`
		language | message
		${'en'}  | ${en.unauthorized_user_delete}
		${'es'}  | ${es.unauthorized_user_delete}
	`(
		'returns $message in response.body when update request is sent without basic authorization when language is $language',
		async ({ language, message }) => {
			const response = await deleteUser(5, { language });
			expect(response.body.message).toBe(message);
		}
	);
	it('returns forbidden when delete request is sent with correct credentials but for different user', async () => {
		await addUser();
		const userToBeDelete = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });
		const token = await auth({ auth: credentials });
		const response = await deleteUser(userToBeDelete.id, { token: token });
		expect(response.status).toBe(403);
	});

	it('returns 403 forbidden when i pass an invalid token', async () => {
		const response = await deleteUser(5, { token: 'anywrongtoken' });
		expect(response.status).toBe(403);
	});

	// // success delete scenarios
	// para mandar una peticion de delete a la api se debe proveer el token

	it('returns 200 ok when valid delete request is sent from a correct authenticated user', async () => {
		const savedUser = await addUser();
		console.log('savedUser id', savedUser);
		const token = await auth({ auth: credentials });
		console.log('token', token);
		const response = await deleteUser(savedUser.id, { token: token });
		expect(response.status).toBe(200);
	});

	it('deletes user in database when valid delete request is sent from a correct authenticated user', async () => {
		const savedUser = await addUser();
		const token = await auth({ auth: credentials });
		await deleteUser(savedUser.id, { token: token });
		const inDBUser = await User.findOne({ where: { id: savedUser.id } });
		expect(inDBUser).toBeNull();
	});
});
