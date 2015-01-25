angular.module('worigin', []).factory('worigin', function($http){

    return function(url){
        return $http({
            method: 'JSONP',
            url: 'http://www.whateverorigin.org/get',
            params: {
                url: url,
                callback: 'JSON_CALLBACK'
            }
        }).then(function(res){
            if (res.status < 200 || res.status >= 400) {
                throw new Error(res.data.contents);
            }
            return res.data.contents;
        });
    };
    
});
