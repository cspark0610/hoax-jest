const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const bcrypt = require('bcrypt');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

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

const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
	let agent = request.agent(app).post('/api/1.0/password-reset');
	if (options.language) {
		agent.set('Accept-Language', options.language);
	}
	return agent.send({ email: email });
};

describe('password reset request', () => {
	// por default express manda un 404 cuando no encuentra una ruta asociada
	it('returns 404 when a password request is sent from an emails which does not exists', async () => {
		const response = await postPasswordReset();
		expect(response.status).toBe(404);
	});

	it.each`
		language | message
		${'en'}  | ${en.email_not_inuse}
		${'es'}  | ${es.email_not_inuse}
	`(
		'returns $message in response.body for unknown email for passwoord request when language is $language',
		async ({ language, message }) => {
			const response = await postPasswordReset('user1@mail.com', { language: language });
			expect(response.body.message).toBe(message);
		}
	);

	it.each`
		language | message
		${'en'}  | ${en.validation_failure}
		${'es'}  | ${es.validation_failure}
	`(
		'returns 400 $message in response.body for invalid format email for passwoord request when language is $language',
		async ({ language, message }) => {
			const response = await postPasswordReset(null, { language: language });
			expect(response.body.message).toBe(message);
		}
	);
	it('returns 200 when passowrd reset request is sent from known email in db', async () => {
		const user = await addUser();
		const response = await postPasswordReset(user.email);
		expect(response.status).toBe(200);
	});
	it.each`
		language | message
		${'en'}  | ${en.password_reset_request_success}
		${'es'}  | ${es.password_reset_request_success}
	`(
		'returns $message in response.body for existing email in db for passwoord request when language is $language',
		async ({ language, message }) => {
			const user = await addUser();
			const response = await postPasswordReset(user.email, { language: language });
			expect(response.body.message).toBe(message);
		}
	);
	it('creates password reset token when password reset reqeust is sent for known email', async () => {
		const user = await addUser();
		await postPasswordReset(user.email);
		const userInDB = await User.findOne({ where: { email: user.email } });
		// toBeTruthy() no es lo mismo que not.toBeNull()
		expect(userInDB.passwordResetToken).toBeTruthy();
	});
});
