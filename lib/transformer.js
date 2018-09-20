const babel     = require('@babel/core');
const path      = require('path');
const uglify    = require('uglify-js');


module.exports = async function(grunt, {
    workDir = 'output',
    outputDir = 'loader',
    bundles = []
} = {}){

    for (let bundle of bundles) {

        const bundleFile = path.join(workDir, outputDir, bundle.name + '.bundle.js');
        const destFile   = path.join(outputDir, bundle.name + '.min.js')

        if(!grunt.file.exists(bundleFile)){
            grunt.log.error(`Unable to access ${bundleFile}`);
            grunt.log.fail('Bundling error');
        }

        if(bundle.babel){

            grunt.log.debug('Babel file ' + bundleFile);

            await babel.transformFileAsync(bundleFile, {
                sourceMap: true,
                presets: [
                    '@babel/env',
                    '@babel/minify'
                ],
                sourceType: 'script',
                filename : destFile
            });
        } else {
            grunt.log.debug('Uglify file ' + bundleFile);

            const result = uglify.minify(grunt.file.read(bundleFile), {
                mangle : false,
                output: {
                    'max_line_len': 666
                },
                sourceMap: {
                    content : grunt.file.read(`${bundleFile}.map`),
                    filename: `${bundle.name}.min.js`,
                    url: `${bundle.name}.min.js.map`
                }
            });
            if(result.error){
                grunt.log.error(`Unable to access ${bundleFile}`);
                grunt.log.fail('Uglify error');

            }
            if(result.warning){
                grunt.log.warn(result.warning);
            }
            grunt.file.write(destFile, result.code);
            grunt.file.write(`${destFile}.map`, result.map);

        }
    }
};



