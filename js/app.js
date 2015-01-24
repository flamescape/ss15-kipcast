
angular.module('app', ['ngRoute', 'steam'])

    .config(function($routeProvider){
        $routeProvider
            .when('/', {
                templateUrl: 'partials/prompt.html',
                controller: 'PromptCtrl as p'
            })
            .when('/id/:steamid', {
                templateUrl: 'partials/profile.html',
                controller: 'ProfileCtrl as p'
            })
        ;
    })

    .controller('PromptCtrl', function(steam, $location){
        var p = this;
        
        p.steamId = null;
        p.steamIdInput = 'http://steamcommunity.com/profiles/76561198001860563/';
        
        p.calcSteamId = function($event){
            steam.getId64(p.steamIdInput).then(function(id){
                p.steamId = id;
                $location.path('/id/'+id);
            });
        };
        
    })
    
    .controller('ProfileCtrl', function($routeParams, steam){
        var p = this;
        
        p.steamId = $routeParams.steamid;
        
        p.updateFriends = function() {
            p.loadingFriends = true;
            steam.getFriends(p.steamId).then(function(friends){
                p.friends = friends;
            }).finally(function(){
                p.loadingFriends = false;
            });
        };
        
        p.updateGames = function() {
            p.loadingGames = true;
            steam.getGames(p.steamId).then(function(games){
                p.games = games;
            }).finally(function(){
                p.loadingGames = false;
            });
        };
        
        p.updateFriends();
        p.updateGames();
        
    })
    
;

