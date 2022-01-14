//const jwt = require('jsonwebtoken');
const { randomString } = require('../shared/tokenGenerator');
const Token = require('./Token');
const { Op } = require('sequelize');
// create token with sign method, in which we pass as payload
// to sign an json object containing the info we want to encode
// as second argument we pass the necessary JWT_SECRET
const createToken = async (user) => {
	const token = randomString(32);
	await Token.create({
		token: token,
		userId: user.id,
		lastUsedAt: new Date(),
	});
	return token;
	//return jwt.sign({ id: user.id }, 'secret_key', { expiresIn: '8h' });
};

const verifyToken = async (token) => {
	const exactOneWeekAgo = new Date(Date.now - 7 * 24 * 60 * 60 * 1000);

	const tokenInDb = await Token.findOne({
		where: {
			token: token,
			lastUsedAt: {
				[Op.gt]: exactOneWeekAgo,
			},
		},
	});
	// tengo que updatear el campo lastUsedAt del token en la base de datos
	tokenInDb.lastUsedAt = new Date();
	await tokenInDb.save();

	const userId = tokenInDb.userId;
	return {
		id: userId,
	};
	//return jwt.verify(token, 'secret_key');
};

const deleteToken = async (token) => {
	await Token.destroy({ where: { token: token } });
};

// const deleteTokensOfUser = async (userId) => {
// 	await Token.destroy({ where: { userId: userId } });
// };

module.exports = {
	createToken,
	verifyToken,
	deleteToken,
	//deleteTokensOfUser,
};
