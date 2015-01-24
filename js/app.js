
angular.module('app', ['ngRoute', 'steam'])

    .config(function($routeProvider){
        $routeProvider.when('/', {
            templateUrl: 'partials/prompt.html',
            controller: 'PromptCtrl as p'
        });
    })

    .controller('PromptCtrl', function(steam){
        var p = this;
        
        p.steamId = 'http://steamcommunity.com/profiles/76561198001860563/';
        
        steam.getFriends('STEAM_0:1:20797417').then(function(friends){
            p.friends = friends;
            console.log(friends);
        });
        
        
    })
    
;

