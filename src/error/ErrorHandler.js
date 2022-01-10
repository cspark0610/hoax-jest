module.exports = (err, req, res, next) => {
	const { status, message } = err;

	// let validationErrors;
	// if (errors.length) {
	// 	validationErrors = {};
	// 	errors.forEach((error) => (validationErrors[error.param] = req.t(error.msg)));
	// }
	res.status(status || 500).send({ message: req.t(message) });
};
