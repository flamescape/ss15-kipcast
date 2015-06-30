angular.module('progress', [])

    .factory('progress', function($q, $rootScope){
        var promises = [];
        
        function emit() {
            $rootScope.$emit('progressUpdate', {pos: sv.pos, max: sv.max});
            //console.log('progressUpdate', Math.round((sv.pos/sv.max) * 100, 1) + '%');
        }
        
        var sv = function(p){
            if (sv.max > 0 && sv.max === sv.pos) {
                sv.reset();
            }
            p = $q.when(p).finally(function(){
                sv.pos++;
                emit();
            });
            promises.push(p);
            sv.max = promises.length;
            emit();
            return p;
        };
        
        sv.reset = function(){
            sv.pos = 0;
            sv.max = 0;
            promises = [];
        };
        
        sv.reset();
        
        return sv;
    })

;