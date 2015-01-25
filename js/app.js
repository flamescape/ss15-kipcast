
angular.module('app', ['ngRoute', 'steam', 'angular-extend-promises', 'progress'])

    .config(function($routeProvider, $compileProvider){
        $routeProvider
            .when('/', {
                templateUrl: 'partials/prompt.html',
                controller: 'PromptCtrl as p'
            })
            .when('/id/:steamid', {
                templateUrl: 'partials/profile.html',
                controller: 'ProfileCtrl as p'
            })
            .otherwise('/')
        ;
        
        $compileProvider.aHrefSanitizationWhitelist(/./);
    })

    .filter('isSingleplayerGame', function(){
        return function(games, inverse){
            return !!games && games.filter(function(game){
                if (!game || !game.info) return false;
                
                var res = !game.info.isMultiplayer && !game.info.isCoop;
                return inverse ? !res : res;
            });
        };
    })
    
    .factory('friends', function(steam){
        var sv = {};
        
        var selectedFriends = [];
        
        sv.select = function(f){
            if (!f.selected) {
                f.selected = true;
                selectedFriends.push(f);
                if (!f.gamesPromise) {
                    // fetch games belonging to friend (f)
                    f.gamesPromise = steam.getId64(f.profileUrl).then(function(steamid){
                        return steam.getGames(steamid);
                    }).then(function(games){
                        f.games = games;
                    });
                }
            } else {
                f.selected = false;
                var idx = selectedFriends.indexOf(f);
                if (idx >= 0) {
                    selectedFriends.splice(idx, 1);
                }
            }
        };
        
        sv.clearSelection = function(){
            selectedFriends.forEach(function(sf){
                sf.selected = false;
            });
            selectedFriends = [];
        };
        
        sv.getSelectedFriendsWithGame = function(appid){
            return selectedFriends.filter(function(sf){
                return !sf.games || !!sf.games.some(function(g){
                    return g.appID === appid;
                });
            });
        };
        
        sv.getNumFriendsSelected = function(){
            return selectedFriends.length;
        };
        
        return sv;
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
    
    .controller('ProfileCtrl', function($routeParams, steam, $rootScope, progress){
        var p = this;
        
        p.steamId = 'http://steamcommunity.com/profiles/' + $routeParams.steamid;
        
        p.toggleFriends = function(){
            $rootScope.$emit('toggleFriends');
        };
        
        progress.reset();
        p.progressPct = '0%';
        
        $rootScope.$on('progressUpdate', function(evt, prog){
            p.progressPct = Math.round((prog.pos/prog.max) * 100) + '%';
        });
        
        steam.getProfileData(p.steamId).then(function(profile){
            p.profile = profile;
            if (profile.customURL) {
                p.steamId = 'http://steamcommunity.com/id/'+profile.customURL;
            }
            console.log('MY PROFILE', profile);
        });
        
    })
    
    .controller('GamesCtrl', function($routeParams, $q, steam, friends){
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
            // fetching categories
            $q.when(games).map(function(game){
                return steam.getGameInfo(game.appID).then(function(info){
                    game.info = info;
                });
            }, {concurrency:6});
        };
        
        gc.isGameOwnedByAllFriends = function(g){
            return friends.getSelectedFriendsWithGame(g.appID).length === friends.getNumFriendsSelected();
        };
        
        gc.updateGames().then(gc.fetchGameInfo);
        
    })
    
    .controller('FriendsCtrl', function($routeParams, steam, $rootScope, friends){
        var fc = this;
        
        fc.steamId = $routeParams.steamid;
        
        fc.isExpanded = false;
        
        $rootScope.$on('toggleFriends', function(){
            fc.isExpanded = !fc.isExpanded;
        });
        
        fc.filter = '';
        
        fc.updateFriends = function() {
            fc.loadingFriends = true;
            steam.getFriends(fc.steamId).then(function(friends){
                fc.friends = friends;
            }).finally(function(){
                fc.loadingFriends = false;
            });
        };
        
        fc.selectFriend = friends.select;
        
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

