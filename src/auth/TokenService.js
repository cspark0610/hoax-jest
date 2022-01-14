//const jwt = require('jsonwebtoken');
const { randomString } = require('../shared/tokenGenerator');
const Token = require('./Token');

// create token with sign method, in which we pass as payload
// to sign an json object containing the info we want to encode
// as second argument we pass the necessary JWT_SECRET
const createToken = async (user) => {
	const token = randomString(32);
	await Token.create({
		token: token,
		userId: user.id,
	});
	return token;
	//return jwt.sign({ id: user.id }, 'secret_key', { expiresIn: '8h' });
};

const verifyToken = async (token) => {
	//query token in db table
	const tokenInDb = await Token.findOne({
		where: {
			token: token,
		},
	});
	const userId = tokenInDb.userId;
	return {
		id: userId,
	};
	//return jwt.verify(token, 'secret_key');
};

const deleteToken = async (token) => {
	await Token.destroy({ where: { token: token } });
};

module.exports = {
	createToken,
	verifyToken,
	deleteToken,
};
