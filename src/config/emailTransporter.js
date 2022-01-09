const nodemailer = require('nodemailer');
const nodemailerStub = require('nodemailer-stub');
// sending email part with nodemailer, first create a transporter nodemailerStub.stubTransport object
//const transporter = nodemailer.createTransport(nodemailerStub.stubTransport);

const config = require('config');
const mailConfig = config.get('mail');

// with SMTP server create another transporter withput nodemailerStub
const transporter = nodemailer.createTransport({ ...mailConfig });

module.exports = transporter;
