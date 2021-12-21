const express = require('express');
const router = express.Router();
const UserService = require('./UserService');

//ROUTE HANDLERS
router.post('/api/1.0/users/register', async (req, res) => {
	await UserService.save(req.body);
	//console.log(await UserService.save(req.body));
	return res.status(200).send({
		message: 'User created',
	});
});

module.exports = router;
