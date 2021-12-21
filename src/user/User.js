// here create our sequelize user MODEL INSTANCE
// User.js

// Sequelize library
const Sequelize = require('sequelize');
// own instance of sequelize
const sequelize = require('../config/database');

class User extends Sequelize.Model {}

//initialize User model with init function
User.init(
	{
		username: {
			type: Sequelize.STRING,
		},
		email: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		password: {
			type: Sequelize.STRING,
			allowNull: false,
		},
	},
	{ sequelize, modelName: 'user' }
);

//export User model
module.exports = User;
