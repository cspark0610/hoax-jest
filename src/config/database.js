const Sequelize = require('sequelize');
const config = require('config');

const dbConfig = config.get('database');
// console.log(dbConfig);
// create own instance of sequelize
// 1 - db name
// 2 - username
// 3 - password
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
	dialect: dbConfig.dialect,
	storage: dbConfig.storage,
	logging: dbConfig.logging,
});

module.exports = sequelize;
