module.exports = {
	database: {
		database: 'hoaxify',
		username: 'my-db-user',
		password: 'db-p4ss',
		dialect: 'sqlite',
		storage: ':memory:',
		logging: false,
	},
	mail: {
		host: 'localhost',
		// puerto dinamico para que los smtp servers de los distintos spec que los consumen corran en distintos puertos
		port: Math.floor(Math.random() * 2000) + 10000,
		tls: {
			rejectUnauthorized: false,
		},
	},
};
