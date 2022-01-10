const express = require('express');
const UserRouter = require('./user/UserRouter');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const errorHandler = require('./error/ErrorHandler');

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
app.use(errorHandler);

module.exports = app;
