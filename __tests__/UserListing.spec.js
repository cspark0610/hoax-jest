const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bc = require('bcrypt');

beforeAll(async () => {
	await sequelize.sync();
});
beforeEach(async () => {
	await User.destroy({ truncate: { cascade: true } });
});

const auth = async (options = {}) => {
	// este funcion  rebice un objeto options con la propiedad token y la retorna
	let token;
	if (options.auth) {
		let response = await request(app).post('/api/1.0/auth').send(options.auth);
		token = response.body.token ? response.body.token : '';
	}
	return token;
};

const getUsers = (options = {}) => {
	// need to update this function to recieve auth object options
	let agent = request(app).get('/api/1.0/users');
	// if (options.auth) {
	// 	const { email, password } = options.auth;
	// 	agent.auth(email, password);
	// }
	if (options.token) {
		agent.set('Authorization', `Bearer ${options.token}`);
	}
	return agent.send();
};
const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
	for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
		await User.create({
			username: `user${i + 1}`,
			email: `user${i + 1}@mail.com`,
			password: await bc.hash('P4ssword', 10),
			inactive: i >= activeUserCount,
		});
	}
};

describe('listing users', () => {
	it('returns 200 ok when there are no user in database', async () => {
		const response = await getUsers();
		expect(response.status).toBe(200);
	});
	it('returns users paginated as response body', async () => {
		const response = await getUsers();
		expect(response.body).toEqual({
			content: [],
			page: 0,
			size: 10,
			totalPages: 0,
		});
	});
	it('returns 10 users in page content when there are 11 users in database', async () => {
		//need to add at least 11 active users to database
		await addUsers(11);
		const response = await getUsers();
		expect(response.body.content.length).toBe(10);
	});
	it('returns 6 users in page content where there are active 6 users and inactive 5 users in database', async () => {
		// need to add 6 active users and 5 inaactive to database
		// implica poner un filtro where en userService devolviendo solo los que estan inactive:false
		await addUsers(6, 5);
		const response = await getUsers();
		//console.log('res', response.body.content);
		expect(response.body.content.length).toBe(6);
	});
	it('returns only id, username, email and inactive in content array for each user', async () => {
		// implica poner en el servicio como opcion del findAll de sequelize :attributes: ['id', 'username', 'email'],
		await addUsers(11);
		const response = await getUsers();
		const firstUser = response.body.content[0];
		expect(Object.keys(firstUser)).toEqual(['id', 'username', 'email', 'inactive']);
	});
	it('returns 2 as totalPages when there are 15 inactive: false("active") users and 7 inactive: true ("inactive")users, total users are 22', async () => {
		await addUsers(15, 7);
		const response = await getUsers();
		//console.log('response.body.content', response.body.content);
		expect(response.body.totalPages).toBe(2);
	});

	//changing page test
	it('returns second page (nro 1) content when page is set as 1', async () => {
		await addUsers(11);
		// en supertest al hacer una req.query con el paramentro page se llama a la funcion query()
		const response = await getUsers().query({ page: 1 });
		expect(response.body.content[0].username).toBe('user11');
		expect(response.body.page).toBe(1);
	});

	it('returns first page (nro 0 ) when page is set below zero as request parameter', async () => {
		await addUsers(11);
		const response = await getUsers().query({ page: -1 });
		expect(response.body.content[0].username).toBe('user1');
		expect(response.body.page).toBe(0);
	});

	// 32. changing page size test
	it('returns 5 users and corresponding size indicator when size is set as 5 in request query parameter', async () => {
		await addUsers(11);
		// voy a pasar un req.query.size con valor 5
		const response = await getUsers().query({ size: 5 });
		expect(response.body.content.length).toBe(5);
		expect(response.body.size).toBe(5);
	});
	it('returns 10 users and corresponding size indicator when size is set as 1000', async () => {
		await addUsers(11);
		const response = await getUsers().query({ size: 1000 });
		expect(response.body.content.length).toBe(10);
		expect(response.body.size).toBe(10);
	});

	it('returns 10 users and corresponding size indicator when size is set as 0', async () => {
		await addUsers(11);
		const response = await getUsers().query({ size: 0 });
		expect(response.body.content.length).toBe(10);
		expect(response.body.size).toBe(10);
	});

	it('returns page as 0 and size as 10 when non numeric query params are provided', async () => {
		await addUsers(11);
		const response = await getUsers().query({ size: 'size', page: 'page' });
		expect(response.body.size).toBe(10);
		expect(response.body.page).toBe(0);
	});
	it('returns user page withouot logged in user when request has valid authorization', async () => {
		await addUsers(11);
		//get token with auth function which is async
		const token = await auth({
			auth: {
				email: 'user1@mail.com',
				password: 'P4ssword',
			},
		});
		const response = await getUsers({ token: token });
		expect(response.body.totalPages).toBe(1);
	});
});

describe('get user by id', () => {
	const getUser = (id = 5) => {
		return request(app).get(`/api/1.0/users/${id}`);
	};
	const createUser = async () => {
		return User.create({
			username: 'user1',
			email: 'user1@mail.com',
			password: 'password',
			inactive: false,
		});
	};
	const createInactiveUser = async () => {
		return User.create({
			username: 'user2',
			email: 'user2@mail.com',
			password: 'password',
			inactive: true,
		});
	};
	it('returns 404 when user not found', async () => {
		const response = await getUser();
		expect(response.status).toBe(404);
	});

	it.each`
		language | message
		${'es'}  | ${'no se encontr?? el usuario'}
		${'en'}  | ${'user not found'}
	`('returns $message when user not found and lenguage is set to $language', async ({ language, message }) => {
		const response = await getUser().set('Accept-Language', language);
		expect(response.body.message).toBe(message);
	});

	it('returns 200 ok when an active user exists', async () => {
		const user = await createUser();
		const response = await getUser(user.id);
		expect(response.status).toBe(200);
	});
	it('returns only attributes id, username, email, inactive fields when an active user exists', async () => {
		const user = await createUser();
		const response = await getUser(user.id);
		expect(Object.keys(response.body)).toEqual(['id', 'username', 'email', 'inactive']);
	});

	it('returns 404 when user is inactive', async () => {
		const user = await createInactiveUser();
		const response = await getUser(user.id);
		expect(response.status).toBe(404);
	});
});
