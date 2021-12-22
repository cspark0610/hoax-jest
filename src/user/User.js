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
			// con el express-validator custom() no necesito el constrain en DB model USER
			// unique: true,
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
