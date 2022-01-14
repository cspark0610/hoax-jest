// Sequelize library
const Sequelize = require('sequelize');
// own instance of sequelize
const sequelize = require('../config/database');

const Model = Sequelize.Model;

class Token extends Model {}

Token.init(
	{
		token: {
			type: Sequelize.STRING,
		},
		// remove this field because i established a relation with userId as foreignKey
		// userId: {
		// 	type: Sequelize.INTEGER,
		// },
	},
	{ sequelize, modelName: 'token' }
);

//always export class
module.exports = Token;
