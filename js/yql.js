angular.module('yql', []).factory('yql', function($http){

    return function(query){
        return $http({
            method: 'GET',
            url: 'https://query.yahooapis.com/v1/public/yql',
            params: {
                q: query,
                format: 'json',
                diagnostics: 'true',
                env: 'store://datatables.org/alltableswithkeys',
                ts: (new Date()).toString()
            }
        });
    };
    
});
