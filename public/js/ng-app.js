
angular.module('app', ['ngRoute', 'progress', 'restangular'])

    .config(function($routeProvider, $compileProvider, $locationProvider, RestangularProvider){
        $routeProvider
            .when('/', {templateUrl: 'partials/prompt.html', controller: 'PromptCtrl as p'})
            .when('/id/:steamid', {templateUrl: 'partials/profile.html', controller: 'ProfileCtrl as p'})
            .otherwise('/')
        ;
        
        $compileProvider.aHrefSanitizationWhitelist(/./);

        $locationProvider.html5Mode(true);

        RestangularProvider.setBaseUrl('x');
    })

    .filter('isSingleplayerGame', function(){
        return function(games, inverse){
            return !!games && games.filter(function(game){
                if (!game) return false;
                
                var res = !game.isMultiplayer && !game.isCoop;
                return inverse ? !res : res;
            });
        };
    })
    
    .factory('friends', function(Restangular){
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
                    f.gamesPromise = Restangular.one('user', f.steamid).all('games').getList().then(function(games){
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
                    return g.appid === appid;
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

    .controller('PromptCtrl', function($location, $timeout, Restangular){
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
            Restangular.one('lookup').get({id: p.steamIdInput}).then(function(id){
                p.steamId = id;
                $location.path('/id/'+id);
            }).catch(function(err){
                return p.addError(err);
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
    
    .controller('ProfileCtrl', function($routeParams, $rootScope, progress, $location, friends, Restangular){
        var p = this;
        
        p.steamId = $routeParams.steamid;
        
        p.friends = friends;
        
        progress.reset();
        p.progressPct = '0%';
        
        $rootScope.$on('progressUpdate', function(evt, prog){
            p.progressPct = (Math.round((prog.pos/prog.max) * 95) + 5) + '%';
        });
        
        Restangular.one('user', p.steamId).get().then(function(profile){
            p.profile = profile;
            if (profile.profileurl) {
                p.steamId = profile.profileurl;
            }
            console.log('MY PROFILE', profile);
        });
        
        p.showNav = false;
        p.showInfoPage = function(idx){
            p.curInfoPage = idx;
            p.showNav = false;
        };
        
        p.switchProfile = function(steamid){
            return Restangular.one('lookup').get({id: steamid}).then(function(steamid){
                $location.path("/id/"+steamid);
            });
        };

        p.getNames = function(){
            if (!p.profile) return 'My';
            var names = friends.getSelectedFriends().filter(function(f){
                return !!f.games;
            }).map(function(f){
                return f.personaname;
            });
            names.unshift(p.profile.personaname);
            var lastName = names.pop();
            var t = names.reduce(function(str, name, idx){
                return str += (idx == names.length-1) ? (name + ' & ' ) : (name + ', ')
            }, '');
            return t + lastName + "'s";
        };
        
        p.getNumFriendsSelected = friends.getNumFriendsSelected;
        
    })
    
    .controller('GamesCtrl', function($routeParams, $q, friends, Restangular){
        var gc = this;
        
        gc.steamId = $routeParams.steamid;
        
        gc.updateGames = function() {
            gc.loadingGames = true;
            return Restangular.one('user', gc.steamId).all('games').getList().then(function(games){
                console.log('MY GAMES', games);
                return (gc.games = games);
            }).finally(function(){
                gc.loadingGames = false;
            });
        };

        gc.fetchGameInfo = function(games){
            // fetching categories
            // $q.when(games).map(function(game){
            //     return Restangular.one('games', game.appID).get().then(function(info){
            //         game.info = info;
            //     });
            // }, {concurrency:6});
        };
        
        gc.isGameOwnedByAllFriends = function(g){
            return friends.getSelectedFriendsWithGame(g.appid).length === friends.getNumFriendsSelected();
        };
        
        gc.updateGames().then(gc.fetchGameInfo);
        
    })
    
    .controller('FriendsCtrl', function($routeParams, $rootScope, friends, Restangular){
        var fc = this;
        
        fc.steamId = $routeParams.steamid;
        
        fc.isExpanded = false;
        
        $rootScope.$on('toggleFriends', function(){
            fc.isExpanded = !fc.isExpanded;
        });
        
        fc.filter = '';
        
        fc.updateFriends = function() {
            fc.loadingFriends = true;
            Restangular.one('user', fc.steamId).all('friends').getList().then(function(friends){
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

