var Promise = require('bluebird');
var _ = require('underscore');

module.exports = function cargo(jobHandler, options){

    var timeout = null;
    var jobs = [];

    _.extend({
        size: 25,
        delay: 200
    }, options);

    jobHandler = Promise.method(jobHandler);

    function doJobs() {
        var workingjobs = jobs;
        jobs = [];
        timeout && clearTimeout(timeout);
        timeout = null;
        return jobHandler(workingjobs).return(workingjobs).filter(function(job){
            return job.promise.isPending();
        }).each(function(job){
            var err = Error('Job was not resolved or rejected');
            err.job = job;
            job.reject(err);
        });
    }

    return function push(item){

        var job = {
            item: item
        };

        job.promise = new Promise(function(resolve, reject){
            job.resolve = resolve;
            job.reject = reject;
        });

        jobs.push(job);

        if (jobs.length === options.size) {
            doJobs();
        }

        if (!timeout) {
            timeout = setTimeout(doJobs, options.delay);
        }

        return job.promise;

    };
};
