const nodemailer = require('nodemailer');
const nodemaailerStub = require('nodemailer-stub');
// sending email part with nodemailer, first create a transporter nodemailerStub.stubTransport object
const transporter = nodemailer.createTransport(nodemaailerStub.stubTransport);

module.exports = transporter;
