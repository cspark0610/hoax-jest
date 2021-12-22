const app = require('./src/app');
const sequelize = require('./src/config/database');

//con el force true estoy sincronizando la base de datos efectivamente si es q hago cambios dentro de lo modelos
sequelize.sync({ force: true });
//console.log('env' + ' ' + process.env.NODE_ENV);

app.listen(3000, () => {
	console.log('server is running on port 3000');
});
