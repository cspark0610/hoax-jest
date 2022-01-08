const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const EmailService = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');

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

	const transaction = await sequelize.transaction();
	//crear un User con la transaction correspondiente para manejar el catch
	await User.create(user, { transaction: transaction });
	try {
		// send email with activation token
		await EmailService.sendEmailAccountActivation(email, user.activationToken);
		// si el envio del email fue exitoso, commiteamos la transaction
		await transaction.commit();
	} catch (error) {
		//caso de error de en vio de email hacer un rollback de la transaction
		await transaction.rollback();
		throw new EmailException();
	}
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
