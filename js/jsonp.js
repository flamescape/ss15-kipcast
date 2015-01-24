angular.module('jsonp', []).factory('jsonp', function($http){

    return function(url){
        return $http({
            method: 'GET',
            url: 'https://jsonp.nodejitsu.com/',
            params: {
                url: url
            }
        }).then(function(res){
            console.log('JSONProxy result:', res);
        }).catch(function(res){
            return angular.element(res.data.error);
        });
    };
    
});
