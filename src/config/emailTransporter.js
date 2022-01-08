const nodemailer = require('nodemailer');
const nodemailerStub = require('nodemailer-stub');
// sending email part with nodemailer, first create a transporter nodemailerStub.stubTransport object
//const transporter = nodemailer.createTransport(nodemailerStub.stubTransport);

// with SMTP server create another transporter withput nodemailerStub
const transporter = nodemailer.createTransport({
	host: 'localhost',
	port: 5857,
	tls: {
		rejectUnauthorized: false,
	},
});

module.exports = transporter;
