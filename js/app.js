
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

    .controller('PromptCtrl', function(steam, $location, $timeout){
        var p = this;
        
        p.steamId = null;
        p.steamIdInput = '';
        
        p.calcSteamId = function($event){
            steam.getId64(p.steamIdInput).then(function(id){
                p.steamId = id;
                $location.path('/id/'+id);
            });
        };
        
        p.example = function(steamid) {
            p.steamIdInput = steamid;
            $timeout(p.calcSteamId, 500);
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
    
    .controller('BackgroundCtrl', function() {
        var p = this, 
            vids = ["ibbandobb", "speedrunners"],
            n = Math.floor(Math.random()*vids.length);           
        
        p.randomizeVideo = function() {
            p.mp4 = "vids/" + vids[n] + ".mp4";
            p.png = "img/" + vids[n] + ".png";
        };
        
        p.randomizeVideo(); 
    })
    
;

