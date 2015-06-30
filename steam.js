var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var _ = require('underscore');
var memoize = require('memoizee');
var cheerio = require('cheerio');
var fs = require('fs-extra-promise');
var debug = require('debug')('fg:steam');
var debugApi = require('debug')('fg:steam-api');
var BigNumber = require('bignumber.js');
var cargo = require('./cargo');

module.exports = function(apiKey){

	var steam = {};

	var getProfile = memoize(cargo(function(jobs){
		var steamids = _.uniq(_.pluck(jobs, 'item'));

		debugApi('GetPlayerSummaries', steamids);
		return request({
			uri: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
			qs: {key: apiKey, steamids: steamids.join(',')},
			json: true
		}).spread(function(res, body){
			return body.response.players;
		}).each(function(ply){
			_.where(jobs, {item: ply.steamid}).forEach(function(job){
				job.resolve(ply);
			});
		});
	}, {delay: 100, size: 25}), {maxAge: 1000*30});

	steam.getProfile = Promise.method(memoize(function(id){
		debug('steam.getProfile', id);
		return steam.getId64(id).then(getProfile);
	}, {maxAge: 1000*30}));

	steam.getFriends = function(id){
		return steam.getId64(id).then(function(id){
			return request({
				uri: 'http://api.steampowered.com/ISteamUser/GetFriendList/v0001/',
				qs: {key: apiKey, steamid: id, relationship: 'friend'},
				json: true
			});
		}).spread(function(res, body){
			return body.friendslist.friends;
		}).map(function(friend){
			return getProfile(friend.steamid).then(function(profile){
				_.extend(friend, profile);
			}).return(friend);
		});
	};

	steam.getGames = memoize(function(id){
		return steam.getId64(id).then(function(id){
			return request({
				uri: 'http://api.steampowered.com/IPlayerService/GetOwnedGames/v1/',
				qs: {key: apiKey, steamid: id, include_appinfo: 1, include_played_free_games: 1},
				json: true
			});
		}).spread(function(res, body){
			return body.response.games;
		}).map(function(game){
			return steam.getGameInfo(game.appid).then(function(info){
				_.extend(game, info);
			}).return(game);
		}, {concurrency: 3});
	}, {maxAge: 1000*60});

	steam.getGameInfo = memoize(function(appid){
		appid = parseInt(appid);
		if (isNaN(appid)) {
			throw Error('AppID is not valid');
		}

		debug('steam.getGameInfo', appid);

		var cachePath = 'gameinfo/'+appid+'.json';
		return fs.existsAsync(cachePath).then(function(exists){
			if (!exists) {
				// fetch from store and write file
				debugApi('Loading from store');
				return request({
					uri: 'http://store.steampowered.com/app/'+appid+'/'
				}).spread(function(res, body){
					var game = {};
					var $ = cheerio.load(body);

					game.categories = $('#category_block .game_area_details_specs a.name').toArray().map(function(a){
						return $(a).text();
					});

					return fs.writeJsonAsync(cachePath, game).return(game);
				});
			} else {
				// load from file
				debugApi('Loading from cache');
				return fs.readJsonAsync(cachePath);
			}
		}).then(function(game){
			game.isMultiplayer = game.categories.indexOf('Multi-player') >= 0;
            game.isCoop = game.categories.indexOf('Co-op') >= 0;
            return game;
		});
	}, {maxAge: 1000*60});

	steam.vanityToId64 = memoize(function(name){
		debug('steam.vanityToId64', name);

		debugApi('ResolveVanityURL', name);
		return request({
			uri: 'http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/',
			qs: {key: apiKey, vanityurl: name},
			json: true
		}).spread(function(response, body){
			if (body.response.success === 42) {
				throw Error('Name not found');
			}

			if (body.response.success !== 1) {
				throw Error('Error trying to find steamid from vanity URL: '+name);
			}

			return body.response.steamid;
		});
	});

	steam.getId64 = Promise.method(memoize(function(id){
	    var sp, m;
	    debug('steam.getId64', id);

	    if (!id) {
	        throw new ReferenceError('SteamID argument required');
	    } else if (typeof id !== 'string') {
	        throw new TypeError('SteamID must be a string');
	    }
	    
	    if (m = id.match(/https?:\/\/(www\.)?steamcommunity\.com\/profiles\/(\d+)/)) {
	        // SteamID64
	        debug('> found ID64 URL', id);
	        id = m[2];
	    } else if (m = id.match(/https?:\/\/(www\.)?steamcommunity\.com\/id\/([^\/]+)/)) {
	        // Vanity URL
	       	debug('> found vanity URL', id);
	        id = steam.vanityToId64(m[2].toLowerCase());
	    } else if (id.match(/^\d+$/)) {
	        // SteamID64
	        debug('> found ID64', id);
	    } else if (m = id.match(/^STEAM_\d+:\d+:\d+$/)) {
	        // SteamID classic
	        debug('> found classic SteamID', id);
	        sp = id.split(':');
	        id = (new BigNumber('76561197960265728')).plus(sp[2]*2).plus(sp[1]).toPrecision(17);
	    } else if (m = id.match(/^\[U:\d+:\d+\]$/)) {
	        // SteamID3 format
	        debug('> found SteamID3', id);
	        throw new Error('SteamID3 not supported yet');
	    } else {
	    	debug('> found vanity ID', id);
	        id = steam.vanityToId64(id.toLowerCase());
	    }

	    return id;
	}));

	return steam;

};
