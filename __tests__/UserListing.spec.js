const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(async () => {
	await sequelize.sync();
});
beforeEach(() => {
	return User.destroy({ truncate: true });
});

const getUsers = () => {
	return request(app).get('/api/1.0/users');
};
const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
	for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
		await User.create({
			username: `user${i + 1}`,
			email: `user${i + 1}@mail.com`,
			password: 'password',
			inactive: i >= activeUserCount ? true : false,
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
	it('returns only id, username and email in content array for each user', async () => {
		// implica poner en el servicio como opcion del findAll de sequelize :attributes: ['id', 'username', 'email'],
		await addUsers(11);
		const response = await getUsers();
		const firstUser = response.body.content[0];
		expect(Object.keys(firstUser)).toEqual(['id', 'username', 'email']);
	});
});
