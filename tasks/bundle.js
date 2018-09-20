const bundler = require('../lib/bundler.js');
const babler  = require('../lib/babler.js');

module.exports = function(grunt) {

    /**
     * Register the Grunt task tao-bundle
     */
    grunt.registerMultiTask('bundle', 'Bundle client side code in TAO extensions', function() {
        var options = this.options();
        var done    = this.async();

        const processTask = async () => {

            const results = await bundler(grunt, options);

            grunt.log.write(results);

            await babler(grunt, options);

        };

        processTask()
            .then( done )
            .catch( err => {
                grunt.log.error(err.message);
                grunt.log.fail('Unable to bundle your code');
            });
        // Placeholder task
        // merge everything into the destination
        // the options and the source files JSON
/*
        this.files.forEach(function(file){

            var content = extend({}, options);
            var dest = file.dest;

            grunt.log.debug("base content %j", content);

            file.src.forEach(function(source){

                grunt.log.debug("adding %s", source);
                extend(content, grunt.file.readJSON(source));
                grunt.log.debug("content is now %j", content);
            });

            grunt.log.debug("writing to %s", dest);

            grunt.file.write(dest, JSON.stringify(content));

            if(grunt.file.exists(dest)){

                grunt.verbose.write("%s created", dest);
                count++;
            } else {
                grunt.fail.warn('Unable to write %s', dest);
            }
        });
        if(count > 0){
            grunt.log.ok( "%s %s created", count, (count > 1 ? 'files' : 'file'));
        }*/
    });
};

