const express = require('express');
const app = express();
const UserRouter = require('./user/UserRouter');

// parse incoming request data with express native function json()
app.use(express.json());

app.use(UserRouter);

module.exports = app;
