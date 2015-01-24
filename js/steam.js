angular.module('steam', ['yql']).factory('steam', function(yql){

    var steam = {};
    
    steam.getId64 = function(steamid){
        var v = BigNumber('76561197960265728'), sp;

        if (!steamid) {
            throw new ReferenceError('SteamID argument required');
        } else if (typeof steamid !== 'string') {
            throw new TypeError('SteamID must be a string');
        } else {
            sp = steamid.split(':');
        }

        if (sp.length < 3 || !sp[2] || !sp[1]) {
            throw new Error('Invalid SteamID');
        }
        
        return v.plus(sp[2]*2).plus(sp[1]).toPrecision(17);
    };
    
    steam.getFriends = function(steamid){
        steamid = steam.getId64(steamid);
        
        return yql("SELECT * FROM data.html.cssselect WHERE url='http://steamcommunity.com/id/kipke/friends/' AND css='.friendBlock.persona'").then(function(data){
            return data.data.query.results.results.div.map(function(div){
                return {
                    name: div.div[1].p.content.trim(),
                    profileUrl: div.a.href,
                    online: (div.div[1].p.span.content||'').trim(),
                    avatar: div.div[0].img.src,
                    _html: div
                }
            });
        });
    };
    
    return steam;
    
});
