const jwt = require('jsonwebtoken');

// create token with sign method, in which we pass as payload
// to sign an json object containing the info we want to encode
// as second argument we pass the necessary JWT_SECRET
const createToken = (user) => {
	return jwt.sign({ id: user.id }, 'secret_key', { expiresIn: '8h' });
};

const verifyToken = (token) => {
	return jwt.verify(token, 'secret_key');
};

module.exports = {
	createToken,
	verifyToken,
};
