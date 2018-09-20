const babel     = require('@babel/core');
const path      = require('path');

module.exports = async function(grunt, {
    workDir = 'output',
    outputDir = 'loader',
    bundles = []
} = {}){

    for (let bundle of bundles) {

        const bundleFile = path.join(workDir, outputDir, bundle.name + '.bundle.js');
        if(bundle.babel){
            grunt.log.debug('Babel file ' + bundleFile);
            await babel.transformFileAsync(bundleFile, {
                sourceMap: true,
                presets: ['@babel/env'],
                sourceType: 'script',
                filename : path.join(workDir, outputDir, bundle.name + '.min.js')
            });
        }
    }
};



