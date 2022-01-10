const express = require('express');
const UserRouter = require('./user/UserRouter');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

//configure  i18next
i18next
	.use(Backend)
	.use(middleware.LanguageDetector)
	.init({
		//options objject
		fallbackLng: 'en',
		lng: 'en',
		ns: ['translation'],
		defaultNS: 'translation',
		backend: {
			loadPath: './locales/{{lng}}/{{ns}}.json',
		},
		detection: {
			lookupHeader: 'accept-language',
		},
	});

const app = express();
//use i18 next
app.use(middleware.handle(i18next));
// parse incoming request data with express native function json()
app.use(express.json());

app.use(UserRouter);

// error handling with express native function next()
app.use((err, req, res, next) => {
	const { status, message } = err;
	// let validationErrors;
	// if (errors.length) {
	// 	validationErrors = {};
	// 	errors.forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
	// }
	res.status(status || 500).send({ message: req.t(message) });
});

module.exports = app;
