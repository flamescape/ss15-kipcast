
angular.module('app', ['ngRoute', 'steam'])

    .config(function($routeProvider){
        $routeProvider.when('/', {
            templateUrl: 'partials/prompt.html',
            controller: 'PromptCtrl as p'
        });
    })

    .controller('PromptCtrl', function(steam){
        var p = this;
        
        p.steamId = null;
        p.steamIdInput = 'http://steamcommunity.com/profiles/76561198001860563/';
        
        p.calcSteamId = function($event){
            steam.getId64(p.steamIdInput).then(function(id){
                p.steamId = id;
            });
            p.updateFriends();
            p.updateGames();
        };
        
        p.updateFriends = function() {
            p.loadingFriends = true;
            steam.getFriends(p.steamIdInput).then(function(friends){
                p.friends = friends;
                console.log('FRIENDS', friends);
            }).finally(function(){
                p.loadingFriends = false;
            });
        };
        
        p.updateGames = function() {
            p.loadingGames = true;
            steam.getGames(p.steamIdInput).then(function(games){
                p.games = games;
                console.log('GAMES', games);
            }).finally(function(){
                p.loadingGames = false;
            });
        };
        
    })
    
;

