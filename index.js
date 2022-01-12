const app = require('./src/app');
const sequelize = require('./src/config/database');
const bcrypt = require('bcrypt');
const User = require('./src/user/User');

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
	const hash = await bcrypt.hash('P4ssword', 10);
	for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
		await User.create({
			username: `user${i + 1}`,
			email: `user${i + 1}@mail.com`,
			password: hash,
			inactive: i >= activeUserCount,
		});
	}
};

//con el force true estoy sincronizando la base de datos efectivamente si es q hago cambios dentro de lo modelos
sequelize.sync({ force: true }).then(async () => {
	await addUsers(26);
});
//console.log('env' + ' ' + process.env.NODE_ENV);

app.listen(3000, () => {
	console.log('server is running on port 3000');
});
