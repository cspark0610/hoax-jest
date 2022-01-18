const User = require('./User');
const bcrypt = require('bcrypt');
const EmailService = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const UserNotFoundException = require('./UserNotFoundException');
const { Op } = require('sequelize');
const { randomString } = require('../shared/tokenGenerator');
const NotFoundException = require('../error/NotFoundException');
const TokenService = require('../auth/TokenService');

const save = async (body) => {
	// es necesaria la desestructuracion aca si es que voy a pasar un campo inactive dentro de req.body
	const { username, email, password } = body;

	// hashes the password incoming from req.body
	const hashedPassword = await bcrypt.hash(password, 10);
	// 3rd alternative
	const user = { username, email, password: hashedPassword, activationToken: randomString(16) };

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

const activate = async (token) => {
	const user = await User.findOne({
		where: {
			activationToken: token,
		},
	});
	if (!user) {
		throw new InvalidTokenException();
	}
	user.inactive = false;
	user.activationToken = null;
	await user.save();
};

const getUsers = async (page, size, authenticatedUser) => {
	const authenticatedUserId = authenticatedUser ? authenticatedUser.id : 0;
	const usersWithCount = await User.findAndCountAll({
		where: {
			inactive: false,
			// want to exclude the logged in user from the list of users paginated using its id
			id: {
				[Op.not]: authenticatedUserId,
			},
		},
		attributes: ['id', 'username', 'email', 'inactive'],
		limit: size,
		//offset : a partir de que numero de registro quiero empezar a mostrar (siempre los indices empiezan en cero)
		offset: size * page,
	});
	//math.ceil redondea hacia "arriba" 15inactivos/10 pageSize = 1.5 = 2
	return {
		content: usersWithCount.rows,
		page,
		size,
		totalPages: Math.ceil(usersWithCount.count / size),
	};
};

const getUserById = async (id) => {
	const user = await User.findOne({
		where: {
			id: id,
			inactive: false,
		},
		attributes: ['id', 'username', 'email', 'inactive'],
	});
	if (!user) {
		throw new UserNotFoundException();
	}
	return user;
};

const updateUser = async (id, body) => {
	const user = await User.findOne({ where: { id } });
	//puedo editar solamente el username y el email, el password entra en otro moodulo
	const { username, email } = body;
	if (user.username) user.username = username;
	if (user.email) user.email = email;

	await user.save();
};

const deleteUser = async (id) => {
	await User.destroy({ where: { id: id } });
	//await TokenService.deleteTokensOfUser(id);
};

const passwordResetRequest = async (email) => {
	const user = await findByEmail(email);
	if (!user) {
		throw new NotFoundException('email_not_inuse');
	}
	user.passwordResetToken = randomString(16);
	await user.save();
	try {
		// aca tb debo llamar al servicio de email para enviar el email con el passwordResetToken
		await EmailService.sendPasswordResetEmail(email, user.passwordResetToken);
	} catch (error) {
		// Email exception tiene status code 502
		throw new EmailException();
	}
};

const updatePassword = async (updateRequest) => {
	const user = await findByPasswordResetToken(updateRequest.passwordResetToken);
	const hash = await bcrypt.hash(updateRequest.password, 10);
	user.password = hash;
	// se debe nullear el token de reseteo de password una vez que se actualiza la password
	user.passwordResetToken = null;
	// final test
	user.inactive = false;
	user.activationToken = null;
	//clear all tokens
	await TokenService.clearTokens(user.id);

	await user.save();
};

const findByPasswordResetToken = (token) => {
	return User.findOne({ where: { passwordResetToken: token } });
};

module.exports = {
	save,
	findByEmail,
	activate,
	getUsers,
	getUserById,
	updateUser,
	deleteUser,
	passwordResetRequest,
	updatePassword,
	findByPasswordResetToken,
};

// 1st alternative literal object with all the fields
// const user = {
// 	username: req.body.username,
// 	email: req.body.email,
// 	password: hashedPassword,
// };

//2nd alternative using Object.assign
//const user = Object.assign({}, req.body, { password: hashedPassword });
