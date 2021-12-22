const User = require('./User');
const bcrypt = require('bcrypt');

const save = async (body) => {
	// hashes the password incoming from req.body
	const hashedPassword = await bcrypt.hash(body.password, 10);
	// 3rd alternative
	const user = { ...body, password: hashedPassword };
	await User.create(user);
};

const findByEmail = async (email) => {
	return await User.findOne({ where: { email } });
};

module.exports = { save, findByEmail };

// 1st alternative
// const user = {
// 	username: req.body.username,
// 	email: req.body.email,
// 	password: hashedPassword,
// };

//2nd alternative using Object.assign
//const user = Object.assign({}, req.body, { password: hashedPassword });
