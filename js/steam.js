angular.module('steam', ['yql', 'jsonp','firebase']).factory('steam', function($q, yql, jsonp,$firebase){

    var fb = new Firebase('https://dazzling-fire-3634.firebaseio.com/');

    var steam = {};
    
    var vanityCache = {};
    
    steam.vanityToId64 = function(name){
        if (vanityCache[name]) {
            return vanityCache[name];
        }
        return yql("select * from xml where url='http://steamcommunity.com/id/"+name+"/?xml=1'").then(function(data){
            return (vanityCache[name] = data.data.query.results.profile.steamID64);
        });
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
        
        return steam.getId64(steamid).then(function(steamid){
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
        });
    };

    lookup = function(steamid){
        var ref = new Firebase('https://dazzling-fire-3634.firebaseio.com/');
        var sync = $firebase(ref.child('profiles').child(steamid));
        return sync.$asObject();
    }
    
    steam.getGames = function(steamid){
        return steam.getId64(steamid).then(function(){
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
        });
    };
    
    steam.getGameInfo = function(appid) {
        var sync = $firebase(fb.child('game').child(appid));
        var game = sync.$asObject();
        
        return game.$loaded().then(function(){
            if (!game || !game.lastUpdated) {
                return yql("SELECT * FROM data.html.cssselect WHERE url='http://store.steampowered.com/app/"+appid+"' AND css='#category_block .game_area_details_specs a'").then(function(data){
                    var cats = data.data.query.results.results.a;
                    if (!(cats instanceof Array)) {
                        cats = [cats];
                    }
                    cats = cats.map(function(a){
                        return a.content;
                    });
                    game.runLink = 'steam://rungameid/'+appid;
                    console.log(game.runLink);
                    game.lastUpdated = (new Date()).getTime();
                    game.isMultiplayer = cats.indexOf('Multi-player') >= 0;
                    game.isCoop = cats.indexOf('Co-op') >= 0;
                    game.$save();
                    
                    return game;
                });
            }
            
            return game;
        });
    };
    
    return steam;
    
});
