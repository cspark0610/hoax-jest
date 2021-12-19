//with it functions i m decribing register procceess
const request = require('supertest');
const app = require('../src/app');

jest.setTimeout(15000);
describe('user resgistration', () => {
	it('returns 200 ok when request is valid', (done) => {
		//voy a iniciar el servidor y voy a mandar una peticion http para registro de usuario
		// con supertest voy a hacer una peticion http, debo importar la instancia de app
		// e importar libreria supertest
		request(app)
			.post('/api/1.0/users/register')
			.send({
				username: 'user1',
				email: 'user1@mail.com',
				password: 'P4ssword',
			})
			//como el metodo .send() es una promesa , voy a tener que hacer un then
			//para verificar que el status code sea 200
			.then(() => {
				expect(response.statusCode).toBe(200);
				done();
			});
	});

	//no es buena practica hacer multiples expect dentro de un test it()
	it('returns success message when signup request is valid', (done) => {
		request(app)
			.post('/api/1.0/users/register')
			.send({
				username: 'user1',
				email: 'user1@mail.com',
				password: 'P4ssword',
			})
			.then((response) => {
				expect(response.body.message).toBe('User created');
				done();
			});
	});
});
