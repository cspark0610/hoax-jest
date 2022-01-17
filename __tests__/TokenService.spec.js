const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const sequelize = require('../src/config/database');
const TokenService = require('../src/auth/TokenService');

beforeAll(async () => {
	await sequelize.sync();
});

beforeEach(async () => {
	await User.destroy({ truncate: { cascade: true } });
});

//console.log('eightDaysAgo', eightDaysAgo.getTime());
// eightDaysAgo 1641739840536
//console.log('7', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime());
// 7daysAgo 1641739840036

describe('set timeout to clear token expired', () => {
	it('clears the expired token with scheduled task', async () => {
		// para no tener que esparar el test 1 hora y 2 segundos se usa jest.useFakeTimers();
		jest.useFakeTimers();

		//create a token a lastused 8 days ago
		const token = 'test-token';
		const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

		await Token.create({
			token,
			lastUsedAt: eightDaysAgo,
		});
		TokenService.scheduleClearExpiredTokens();

		jest.advanceTimersByTime(60 * 60 * 1000 + 5000);
		const tokenInDB = await Token.findOne({ where: { token } });
		expect(tokenInDB).toBeNull();
		// como ahora la funcion tiene un setInteval, en el test se debe poner un setTimeout()
		// para que el test se ejecute inmediatamente despues de que se ejecute el setInterval
		// no es una buena practica, dado que se esta haciendo una espera de 1 hora y 2 segundos

		// setTimeout(async () => {
		// 	const tokenInDB = await Token.findOne({ where: { token } });
		// 	expect(tokenInDB).toBeNull();
		// 	done();
		// }, 2000 + 60 * 60 * 1000);
	});
});
