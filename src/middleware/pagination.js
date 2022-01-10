const pagination = (req, res, next) => {
	// http://localhost:3000/api/1.0/users?page=1&size=1000
	// la pagina corriente la recibo a atraves de req.query.page
	const pageAsInt = Number.parseInt(req.query.page);
	const sizeAsInt = Number.parseInt(req.query.size);

	let page = isNaN(pageAsInt) ? 0 : pageAsInt;
	if (page < 0) page = 0;
	let size = isNaN(sizeAsInt) ? 10 : sizeAsInt;
	if (size > 10 || size < 1) size = 10;

	req.pagination = { size, page };
	next();
};

module.exports = pagination;
