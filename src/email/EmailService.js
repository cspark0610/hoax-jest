const transporter = require('../config/emailTransporter');
const nodemailer = require('nodemailer');

const sendEmailAccountActivation = async (email, token) => {
	const info = await transporter.sendMail({
		//mail options
		from: 'my app <info@myapp.com>',
		to: email,
		subject: 'Activate your account',
		html: `
			<div>
				<b>Please click below to activate your account</b>
			</div>
			<div>
				<a href="http://localhost:3000/#/login?token=${token}">Activate</a>
			</div>
		`,
	});
	if (process.env.NODE_ENV === 'development') {
		console.log('url', nodemailer.getTestMessageUrl(info));
	}
};
module.exports = { sendEmailAccountActivation };
