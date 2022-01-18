module.exports = (err, req, res, next) => {
	const { status, message } = err;

	// let validationErrors;
	// if (errors.length) {
	// 	validationErrors = {};
	// 	errors.forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
	// }
	res.status(status).send({ message: req.t(message) });
};
