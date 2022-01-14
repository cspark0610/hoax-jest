// here create our sequelize user MODEL INSTANCE
// User.js

// Sequelize library
const Sequelize = require('sequelize');
// own instance of sequelize
const sequelize = require('../config/database');
// import Token Models to establish relations
const Token = require('../auth/Token');

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
		//new field that reflects if user is inactive of not, by default is set to true which means inactive
		inactive: {
			type: Sequelize.BOOLEAN,
			defaultValue: true,
		},
		activationToken: {
			type: Sequelize.STRING,
		},
	},
	{ sequelize, modelName: 'user' }
);

// relation one to many
User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });

//export User model
module.exports = User;
