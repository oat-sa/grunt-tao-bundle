const bundler = require('../lib/bundler.js');
const transformer  = require('../lib/transformer.js');

module.exports = function(grunt) {

    /**
     * Register the Grunt task tao-bundle
     */
    grunt.registerMultiTask('bundle', 'Bundle client side code in TAO extensions', async function() {

        const done    = this.async();
        const options = this.options();

        const extendedConfig = {
            ...options,
            extensionPath   : options.getExtensionPath(options.extension),
            extensionCssPath   : options.getExtensionCssPath(options.extension),
            rootExtensionPath   : options.getExtensionPath(options.rootExtension)
        };

        try {
            const results = await bundler(grunt, extendedConfig);
            grunt.verbose.write(results);

        } catch(err){
            console.error(err);
            grunt.log.error(grunt.util.error(err.message, err));
            grunt.fail.fatal('Unable to bundle your code');
        }

        try {
            await transformer(grunt, options);
        } catch(err){
            grunt.log.error(err.message);
            grunt.util.error(err.message, err);
            grunt.fail.fatal('Unable transform your code');
        }

        done();


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

