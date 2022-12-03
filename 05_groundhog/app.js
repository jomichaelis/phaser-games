'use strict';

require('dotenv').config();
const express = require('express');

const routes = require('./routes/main');

// App
const app = express();

// main routes
app.use(express.static(__dirname + '/public'));

app.get('/game.html', function (req, res) {
    return res.sendFile(__dirname + '/public/game.html');
});

app.get('/test.html', function (req, res) {
    return res.sendFile(__dirname + '/public/test.html');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use('/', routes);

app.listen(process.env.PORT || 3000, () => {
    console.log('Running');
});
