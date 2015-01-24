
angular.module('app', ['ngRoute'])

    .config(function($routeProvider){
        $routeProvider.when('/', {
            templateUrl: 'partials/prompt.html',
            controller: 'PromptCtrl as p'
        });
    })

    .controller('PromptCtrl', function(){
        this.steamId = 'http://steamcommunity.com/profiles/76561198001860563/';
    })
    
;

