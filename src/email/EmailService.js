const transporter = require('../config/emailTransporter');

const sendEmailAccountActivation = async (email, token) => {
	await transporter.sendMail({
		//mail options
		from: 'my app <info@myapp.com>',
		to: email,
		subject: 'Activate your account',
		html: `Token is ${token}`,
	});
};
module.exports = { sendEmailAccountActivation };
