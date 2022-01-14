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
		lastUsedAt: {
			//campo custom para trabajar con fechas de expiracion de token
			type: Sequelize.DATE,
		},
	},
	{
		sequelize,
		modelName: 'token',
		// para deshabilitar la creacion automatica de Sequalize de las columnas creeatedAt y updatedAt
		timestamps: false,
	}
);

//always export class
module.exports = Token;
