
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
        
        sv.deselect = function(f) {
            f.selected = false;
            var idx = selectedFriends.indexOf(f);
            if (idx >= 0) {
                selectedFriends.splice(idx, 1);
            }
        };
        
        sv.select = function(f){
            if (!f.selected) {
                f.selected = true;
                f.gamesError = null;
                selectedFriends.push(f);
                if (!f.gamesPromise) {
                    // fetch games belonging to friend (f)
                    f.gamesPromise = steam.getId64(f.profileUrl).then(function(steamid){
                        return steam.getGames(steamid);
                    }).then(function(games){
                        if (!games || games.error) {
                            f.gamesPromise = null;
                            f.gamesError = (games && games.error) || "Could not retreive games list. Profile is private or unavailable";
                            return sv.deselect(f);
                        }
                        f.games = games;
                        f.gamesError = null;
                    });
                }
            } else {
                sv.deselect(f);
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

        sv.getSelectedFriends = function(){
            return selectedFriends;
        };
        
        sv.flyoutExpanded = false;
        sv.toggleFlyout = function(){
            sv.flyoutExpanded = !sv.flyoutExpanded;
        };
        
        return sv;
    })

    .controller('PromptCtrl', function(steam, $location, $timeout){
        var p = this;
        
        p.helpVisible = false;
        p.steamId = null;
        p.steamIdInput = '';
        
        p.errors = [];
        p.addError = function(err){
            p.errors.push(err);
            $timeout(function(){
                p.errors.shift();
            }, 6000);
        };
        
        p.calcSteamId = function($event){
            steam.getProfileData(p.steamIdInput).then(function(profile){
                if (!!profile.error) {
                    return p.addError(profile.error);
                }
                
                p.steamId = profile.steamID64;
                $location.path('/id/'+profile.steamID64);
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
    
    .controller('ProfileCtrl', function($routeParams, steam, $rootScope, progress, $location, friends){
        var p = this;
        
        p.steamId = 'http://steamcommunity.com/profiles/' + $routeParams.steamid;
        
        p.friends = friends;
        
        progress.reset();
        p.progressPct = '0%';
        
        $rootScope.$on('progressUpdate', function(evt, prog){
            p.progressPct = (Math.round((prog.pos/prog.max) * 95) + 5) + '%';
        });
        
        steam.getProfileData(p.steamId).then(function(profile){
            p.profile = profile;
            if (profile.customURL) {
                p.steamId = 'http://steamcommunity.com/id/'+profile.customURL;
            }
            console.log('MY PROFILE', profile);
        });
        
        p.showNav = false;
        p.showInfoPage = function(idx){
            p.curInfoPage = idx;
            p.showNav = false;
        };
        
        p.switchProfile = function(steamid){
            return steam.getId64(steamid).then(function(steamid){
                $location.path("/id/"+steamid);
            });
        };

        p.getNames = function(){
            if (!p.profile) return 'My';
            var names = friends.getSelectedFriends().filter(function(f){
                return !!f.games;
            }).map(function(f){
                return f.name;
            });
            names.unshift(p.profile.steamID);
            var lastName = names.pop();
            var t = names.reduce(function(str, name, idx){
                return str += (idx == names.length-1) ? (name + ' & ' ) : (name + ', ')
            }, '');
            return t + lastName + "'s";
        };
        
        p.getNumFriendsSelected = friends.getNumFriendsSelected;
        
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
        
        fc.clearFilter = function(){
            fc.filter = '';
            $('#filterInput').focus();
        };
        
        fc.clearSelection = friends.clearSelection;
        fc.selectFriend = friends.select;
        fc.getNumFriendsSelected = friends.getNumFriendsSelected;
        
        friends.clearSelection();
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

