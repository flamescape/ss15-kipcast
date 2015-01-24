angular.module('steam', ['yql']).factory('steam', function(yql, $q){

    var steam = {};
    
    steam.vanityToId64 = function(name){
        return yql("select * from xml where url='http://steamcommunity.com/id/"+name+"/?xml=1'").then(function(data){
            return data.data.query.results.profile.steamID64;
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
        return steam.getId64(steamid).then(function(steamid){
            return yql("SELECT * FROM data.html.cssselect WHERE url='http://steamcommunity.com/profiles/"+steamid+"/friends/' AND css='.friendBlock.persona'");
        }).then(function(data){
            console.log('FRIENDS', data);
            return data.data.query.results.results.div.map(function(div){
                return {
                    name: div.div[1].p.content.trim(),
                    profileUrl: div.a.href,
                    online: (div.div[1].p.span.content||'').trim(),
                    avatar: div.div[0].img.src.replace(/.jpg$/, '_full.jpg'),
                    isIngame: !!div.class.match(/in-game/),
                    isOnline: !!div.class.match(/online/),
                    isOffline: !!div.class.match(/offline/),
                    _html: div
                }
            });
        });
    };
    
    steam.getGames = function(steamid){
        return steam.getId64(steamid).then(function(steamid){
            return yql("select * from xml where url='http://steamcommunity.com/profiles/"+steamid+"/games/?tab=all&xml=1'");
        }).then(function(data){
            console.log('GAMES', data);
            return data.data.query.results.gamesList.games.game;
        });
    };
    
    return steam;
    
});
