const crypto = require('crypto');

//separate function to generate activation token which is a random string for user
const randomString = (length) => {
	return crypto.randomBytes(length).toString('hex').substring(0, length);
};

module.exports = {
	randomString,
};
