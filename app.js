var path = require('path');
var debug = require('debug')('fg:http');
var config = require('./config');
var steam = require('./steam')(config.steamApiKey);

var express = require('express');
var app = express();

app.get('/x/lookup', function(req, res){
	debug('/x/lookup?id=%s', req.query.id);

	steam.getId64(req.query.id).then(function(id){
		res.json(id);
	}).catch(function(err){
		res.status(500).json(err);
	});
});

app.get('/x/user/:id', function(req, res){
	debug('/x/user/%s', req.params.id);

	steam.getProfile(req.params.id).then(function(profile){
		res.json(profile);
	}).catch(function(err){
		res.status(500).json(err);
	});
});

app.get('/x/user/:id/friends', function(req, res){
	debug('/x/user/%s/friends', req.params.id);

	steam.getFriends(req.params.id).then(function(friends){
		res.json(friends);
	}).catch(function(err){
		res.status(500).json(err);
	});
});

app.get('/x/user/:id/games', function(req, res){
	debug('/x/user/%s/games', req.params.id);

	steam.getGames(req.params.id).then(function(games){
		res.json(games);
	}).catch(function(err){
		res.status(500).json(err);
	});
});

app.use(express.static('./public'));

app.get('*', function(req, res){
	res.sendFile(path.join(__dirname, './public/index.html'));
});

app.listen(config.listenPort);
