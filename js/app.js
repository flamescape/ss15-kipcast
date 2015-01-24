
angular.module('app', ['ngRoute', 'steam', 'angular-extend-promises'])

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
        
        p.helpVisible = false;
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
        
        p.showHelp = function() {
            p.helpVisible = true;
        };
        
        p.hideHelp = function() {
            p.helpVisible = false;
        };
        
    })
    
    .controller('ProfileCtrl', function($routeParams, steam){
        var p = this;
        
        
    })
    
    .controller('GamesCtrl', function($routeParams, $q, steam){
        var gc = this;
        
        gc.steamId = $routeParams.steamid;
        
        gc.updateGames = function() {
            gc.loadingGames = true;
            return steam.getGames(gc.steamId).then(function(games){
                return (gc.games = games);
            }).finally(function(){
                gc.loadingGames = false;
            });
        };

        
        gc.fetchGameInfo = function(games){
            console.log('fetching tags for', games);
            
            $q.when(games).map(function(game){
                return steam.getGameInfo(game.appID).then(function(info){
                    game.info = info;
                });
            }, {concurrency:6});
        };
        
        gc.updateGames().then(gc.fetchGameInfo);
        
    })
    
    .controller('FriendsCtrl', function($routeParams, steam){
        var fc = this;
        
        fc.steamId = $routeParams.steamid;
        fc.isExpanded = false;
        
        fc.filter = '';
        
        fc.updateFriends = function() {
            fc.loadingFriends = true;
            steam.getFriends(fc.steamId).then(function(friends){
                fc.friends = friends;
            }).finally(function(){
                fc.loadingFriends = false;
            });
        };
        
        fc.updateFriends();
    })
    
    .controller('BackgroundCtrl', function() {
        var p = this, 
            vids = ["ibbandobb", "speedrunners", "battleblock", "assettocorsa", "hammerwatch", "monaco"],
            n = Math.floor(Math.random()*vids.length);           
        
        p.randomizeVideo = function() {
            p.mp4 = "vids/" + vids[n] + ".mp4";
            p.png = "img/" + vids[n] + ".png";
        };
        
        p.randomizeVideo(); 
    })
    
;

