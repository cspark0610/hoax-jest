const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

//separate function to generate activation token which is a random string for user
const generateActivationToken = (length) => {
	return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
	// es necesaria la desestructuracion aca si es que voy a pasar un campo inactive dentro de req.body
	const { username, email, password } = body;

	// hashes the password incoming from req.body
	const hashedPassword = await bcrypt.hash(password, 10);
	// 3rd alternative
	const user = { username, email, password: hashedPassword, activationToken: generateActivationToken(16) };
	await User.create(user);
};

const findByEmail = async (email) => {
	return await User.findOne({ where: { email } });
};

module.exports = { save, findByEmail };

// 1st alternative literal object with all the fields
// const user = {
// 	username: req.body.username,
// 	email: req.body.email,
// 	password: hashedPassword,
// };

//2nd alternative using Object.assign
//const user = Object.assign({}, req.body, { password: hashedPassword });
