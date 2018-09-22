const babel     = require('@babel/core');
const path      = require('path');
const uglify    = require('uglify-js');


module.exports = async function(grunt, {
    workDir = 'output',
    outputDir = 'loader',
    extension = '',
    extensionPath = '',
    rootExtension = '',
    bundles = []
} = {}){

    /**
     * Is the current extensiont the root extension ?
     * @returns {Boolean}
     */
    const isRootExtension = () => extension === rootExtension;

    for (let bundle of bundles) {

        const bundleFile = path.join(
            workDir,
            isRootExtension() ? '' : extension,
            outputDir,
            `${bundle.name}.bundle.js`
        );

        const destFile   = path.join(
            extensionPath,
            outputDir,
            `${bundle.name}.min.js`
        );

        if(!grunt.file.exists(bundleFile)){
            grunt.log.error(`Unable to access ${bundleFile}`);
            grunt.log.fail('Bundling error');
        }

        const code = grunt.file.read(bundleFile);
        let transformResult = {};
        if(bundle.babel){

            grunt.log.debug(`Transpile and optimize ${bundleFile} with Babel`);

            try {
                transformResult = await babel.transformAsync(code, {
                    sourceMap: true,
                    presets: [
                        '@babel/env',
                        'minify'
                    ],
                    sourceType: 'script'
                });
            } catch (err){
                transformResult.error = err;
            }

        } else {
            grunt.log.debug('Uglify file ' + bundleFile);

            transformResult = uglify.minify(code, {
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
        }

        if(transformResult.error){
            grunt.verbose.error(transformResult.error);
            grunt.log.error(`Unable to transform ${bundleFile} : ${transformResult.error.message}`);
            grunt.log.fail('Transform error');
        }

        if(transformResult.warning){
            grunt.log.warn(transformResult.warning);
        }

        grunt.file.write(destFile, transformResult.code);
        grunt.log.ok(`${destFile} generated`);

        if(transformResult.map){
            grunt.file.write(`${destFile}.map`, transformResult.map);
            grunt.log.ok(`${destFile}.map generated`);
        }
    }
};



