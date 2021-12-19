const express = require('express');
const app = express();

//route handler for /api/1.0/users/register post request
app.post('/api/1.0/users', (req, res) => {
	return res.status(200).send({
		message: 'User created',
	});
});

module.exports = app;
