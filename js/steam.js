angular.module('steam', ['yql', 'jsonp', 'firebase', 'progress', 'angular-storage', 'worigin'])
.factory('steam', function($q, yql, jsonp, $firebase, progress, store, worigin){

    var fb = new Firebase('https://dazzling-fire-3634.firebaseio.com/');

    var steam = {};
    
    var vanityCache = {};
    var profileCache = {};
    
    steam.vanityToId64 = function(name){
        if (vanityCache[name]) {
            return vanityCache[name];
        }
        return yql("select * from xml where url='http://steamcommunity.com/id/"+name+"/?xml=1'").then(function(data){
            var profile = data.data.query.results.profile;
            profileCache[profile.steamID64] = profile;
            vanityCache[name] = profile.steamID64;
            return profile.steamID64;
        });
    };
    
    steam.getProfileData = function(steamid){
        return progress(steam.getId64(steamid).then(function(steamid){
            if (profileCache[steamid]) {
                return profileCache[steamid];
            }
            
            return yql("select * from xml where url='http://steamcommunity.com/profiles/"+steamid+"/?xml=1'").then(function(data){
                var profile = data.data.query.results.profile;
                
                if (!profile.steamID64) {
                    profile.error = "Sorry, Steam profile \""+steamid+"\" not found";
                } else if (profile.privacyMessage && profile.privacyMessage.content) {
                    profile.error = profile.privacyMessage.content;
                } else if (profile.privacyState && profile.privacyState == "private") {
                    profile.error = "Sorry, this profile is private";
                }
                
                profileCache[steamid] = profile;
                return profile;
            });
        }).catch(function(){
            return {error: "Sorry, Steam profile \""+steamid+"\" not found"};
        }));
    };
    
    steam.getId64 = function(steamid){
        var v = BigNumber('76561197960265728'), sp, m;
    
        if (!steamid) {
            throw new ReferenceError('SteamID argument required');
        } else if (typeof steamid !== 'string') {
            throw new TypeError('SteamID must be a string');
        }
        
        if (m = steamid.match(/https?:\/\/steamcommunity\.com\/profiles\/(\d+)/)) {
            // SteamID64
            steamid = m[1];
        } else if (m = steamid.match(/https?:\/\/steamcommunity\.com\/id\/([^\/]+)/)) {
            // Vanity URL
            steamid = steam.vanityToId64(m[1]);
        } else if (steamid.match(/^\d+$/)) {
            // SteamID64
        } else if (m = steamid.match(/^STEAM_\d+:\d+:\d+$/)) {
            // SteamID classic
            sp = steamid.split(':');
            steamid = v.plus(sp[2]*2).plus(sp[1]).toPrecision(17);
        } else if (m = steamid.match(/^\[U:\d+:\d+\]$/)) {
            // SteamID3 format
            throw new Error('SteamID3 not supported yet');
        } else {
            steamid = steam.vanityToId64(steamid);
        }

        return $q.when(steamid);
    };
    
    steam.getFriends = function(steamid){
        var id64 = null;
        
        return progress(steam.getId64(steamid).then(function(steamid){
            id64 = steamid;
            
            return yql("SELECT * FROM data.html.cssselect WHERE url='http://steamcommunity.com/profiles/"+id64+"/friends/' AND css='.friendBlock.persona'");
        }).then(function(data){
            var divs = data.data.query.results.results.div;
            if (!(divs instanceof Array)) {
                divs = [divs];
            }
            return divs.map(function(div){
                return {
                    name: div.div[1].p.content.trim(),
                    profileUrl: div.a.href,
                    online: (div.div[1].p.span.content||'').trim(),
                    avatar: div.div[0].img.src.replace(/.jpg$/, '_full.jpg'),
                    isIngame: !!div.class.match(/in-game/),
                    isOnline: !!div.class.match(/online/),
                    isOffline: !!div.class.match(/offline/),
                    _html: div
                };
            });
        }).catch(function(err){
            console.log('Error fetching YQL. Falling back to JSONP', err);
        
            return jsonp("http://steamcommunity.com/profiles/"+id64+"/friends/").then(function($){
                if ($.find('#mainContents h2:contains("Error")').length) {
                    throw new Error($.find('#message').text());
                }
                return $.find('.friendBlock.persona').map(function(){
                    var div = angular.element(this);
                    return {
                        name: div.find('.friendBlockContent').clone().children().remove().end().text().trim(),
                        profileUrl: div.find('a:first').attr('href'),
                        online: div.find('.friendSmallText').text().trim(),
                        avatar: div.find('div > img').attr('src').replace(/.jpg$/, '_full.jpg'),
                        isIngame: !!div.find('.in-game').length,
                        isOnline: !!div.find('.online').length,
                        isOffline: !!div.find('.offline').length,
                        _html: div
                    };
                }).toArray();
            });
        }).catch(function(err){
            console.log('Fallback failed. Uhoh!', err);
        }));
    };

    lookup = function(steamid){
        var ref = new Firebase('https://dazzling-fire-3634.firebaseio.com/');
        var sync = $firebase(ref.child('profiles').child(steamid));
        return sync.$asObject();
    };
    
    steam.getGames = function(steamid){
        return progress(steam.getId64(steamid).then(function(){
            // get cached games list if available
            return steamid;
        }).then(function(steamid){
            return yql("select * from xml where url='http://steamcommunity.com/profiles/"+steamid+"/games/?tab=all&xml=1'");
        }).then(function(data){
            var games = data.data.query.results.gamesList.games.game;
            if (!(games instanceof Array)) {
                games = [games];
            }
            return games;
        }).catch(function(){
            return {error: "Could not retreive games list. Profile is private or unavailable"};
        }));
    };

    steam.getLiveGameInfo = function(appid){
        return yql("SELECT * FROM data.html.cssselect WHERE url='http://store.steampowered.com/app/"+appid+"' AND css='#category_block .game_area_details_specs a'").then(function(data){
            var res = data.data.query.results.results;
            if (res) {
                var game = {};
                var cats = res.a;
                cats = (cats instanceof Array?cats:[cats]).map(function(a){
                    return a.content;
                });
                game.isMultiplayer = cats.indexOf('Multi-player') >= 0;
                game.isCoop = cats.indexOf('Co-op') >= 0;
                return game;
            };
            
            // else, fall back to bigpicture API
            return yql('select * from json where url="http://store.steampowered.com/api/appdetails/?appids='+appid+'"').then(function(res){
                var game = {};
                
                var results = res.data.query.results;
                var data = results[Object.keys(results)].data;
                if (!data) {
                    throw new Error('No data available for '+appid);
                }
                
                var cats = data.categories;
                if (!cats || !(cats instanceof Array)) {
                    throw new Error('No categories available for '+appid);
                }
                
                cats = cats.map(function(c){
                    return c.description;
                });
                game.isMultiplayer = cats.indexOf('Multi-player') >= 0;
                game.isCoop = cats.indexOf('Co-op') >= 0;
                
                return game;
            });
        }).catch(function(){
            // if all else fails, presume non-multiplayer
            return {
                isMultiplayer: false,
                isCoop: false
            };
        });
    };
    
    steam.getGameInfo = function(appid) {
        var storePath = ['game',appid].join('/');
        var game = store.get(storePath);
        if (game) {
            return $q.when(game);
        }
    
        var sync = $firebase(fb.child('game').child(appid));
        var game = sync.$asObject();
        
        return progress(game.$loaded().then(function(){
            if (!game || !game.lastUpdated) {
                return steam.getLiveGameInfo(appid).then(function(gameData){
                    
                    if (!gameData) {
                        console.log('No game data to play with for', appid);
                        return;
                    }
                    
                    game.isMultiplayer = gameData.isMultiplayer;
                    game.isCoop = gameData.isCoop;
                    game.lastUpdated = (new Date()).getTime();
                    game.$save();
                    
                    return game;
                });
            }
            
            return game;
        }).tap(function(game){
            if (!game) return;
            store.set(storePath, {
                isCoop: game.isCoop,
                isMultiplayer: game.isMultiplayer,
                lastUpdated: game.lastUpdated
            });
        }).catch(function(err){
            console.log((err && err.message) || err);
        }));
    };
    
    return steam;
    
});
