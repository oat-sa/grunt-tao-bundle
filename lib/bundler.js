const requirejs = require('requirejs');
const path      = require('path');

module.exports = async function(grunt, {
    amd = {
        baseUrl : '',
        paths : {},
        shim : {}
    },
    workDir = 'output',
    outputDir = 'loader',
    extension = '',
    extensionPath = '',
    rootExtension = '',
    rootExtensionPath = '',
    bundles = []
} = {}){

    /**
     * Is the current extensiont the root extension ?
     * @returns {Boolean}
     */
    const isRootExtension = () => extension === rootExtension;


    /**
     * Resolve AMD modules based on a pattern
     * @param {String} targetExtension - the extension name, ie. taoQtiTest
     * @param {String} cwd - the full path of the extension js root, ie. /home/foo/project/package-tao/taoQtiTest/views/js
     * @param {String} pattern - a pattern to find modules, ie. `taoQtiTest/runner/*`
     * @returns {String[]} the list of AMD modules matching the pattern
     */
    const resolveAMDModules = (targetExtension, cwd, pattern) => {
        const jsExtensionPattern = /\.js$/;
        const extensionPattern   = new RegExp('^' + targetExtension);

        if(!pattern){
            return [];
        }

        //if the pattern doesn't include star, we don't expand it
        if(!/\*/.test(pattern)){
            return [pattern];
        }

        //remove the extension prefix from the pattern :
        //`taoQtiTest/runner/**/*` becomes `runner/**/*`
        //because we resolve from the extensionPath
        const filePattern = pattern.replace(targetExtension + '/', '');

        return grunt.file.expand({
            cwd,
            filter: src => jsExtensionPattern.test(src)
        },
            filePattern
        )
        .map( file => {
            //if this is not the root extension, we append back the extension prefix
            //and remove the file extension :
            //`runner/provider/qti.js` becomes `taoQtiTest/runner/provider/qti`
            if(!isRootExtension(extension) && !extensionPattern.test(file)){
                return extension + '/' + file.replace(jsExtensionPattern, '');
            }

            //otherwise just remove the `.js` suffix
            return file.replace(jsExtensionPattern, '');
        });
    };


    /**
     * Generates the r.js configuration for the bundles
     * The configuration is done by resolving the modules and
     * based on the bundle configuration
     *
     * Please note, the bundle is based on including and excluding
     * the exhaustive list of modules : don't rely on the dependency tree.
     *
     * Excludes only exclude the given module (shallowExclude), not the dependencies.
     *
     * @param {Object} bundle
     * @param {String} bundle.name - the name with no extension, ie 'vendor'
     * @param {Boolean} bundle.vendor - if true, the bundle will include ONLY the amd.vendor libraries
     * @param {Boolean} bundle.bootstrap - if true, the bundle will include the amd.bootstrap modules
     * @param {String} bundle.entryPoint - an optionnal name of the module entryPoint
     * @param {Boolean} bundle.default  - if true we include the modules from the amd.default (the defalt extension modules)
     * @param {String[]} bundle.include - additional modules to include to the bundle
     * @param {String[]} bundle.exclude - additional modules to exclude from the bundle
     * @returns {Object} the bundle configuration for r.js
     */
    const createRJsBundleConfig = bundle => {

        const bundleConfig =  {
            create : true,
            name   : outputDir + '/' + bundle.name + '.bundle'
        };

        //add include and excludes into Sets to avoid duplicate
        const excludes = new Set();
        const includes = new Set();

        /**
         * Add modules (or module pattern) to the incl/excl target
         * @param {String[]} modules - a list of module or pattern
         * @param {Set} target - the includes or excludes Set
         */
        const addModulesTo = (modules, target) => (
            modules
                .reduce( (acc, includePattern) => [
                    ...acc,
                    ...resolveAMDModules(extension, extensionPath,  includePattern)
                ], [])
                .forEach( module => target.add(module)  )
        );

        /**
         * Add modules (or module pattern) to include
         * @param {String[]} modules - a list of module or pattern
         */
        const includeModules = modules => addModulesTo(modules, includes);

        /**
         * Add modules (or module pattern) to exclude
         * @param {String[]} modules - a list of module or pattern
         */
        const excludeModules = modules => addModulesTo(modules, excludes);


        if(bundle.vendor){
            //vendor bundle, we include vendor libraries only
            includeModules(amd.vendor);

        } else {

            // include the defined bootstrap
            if(bundle.bootstrap && Array.isArray(amd.bootstrap)){
                includeModules(amd.bootstrap);
            }

            // include an entrypoint module
            if(typeof bundle.entryPoint === 'string'){
                includeModules([bundle.entryPoint]);
            }

            //include the extension default (conventional patterns)
            if(bundle.default && Array.isArray(amd.default)) {
                includeModules(amd.default);
            }

            //always exclude the vendor libs
            excludeModules(amd.vendor);

            if(!isRootExtension()){
                //we need to manually exclude all the source from the root extension
                resolveAMDModules(rootExtension, rootExtensionPath,  '**/*')
                    .forEach( module => excludes.add(module) );
            }
        }

        //each bundle can define it's own includes
        if(Array.isArray(bundle.include)){
            includeModules(bundle.include);
        }

        //each bundle can define it's own excludes
        if(Array.isArray(bundle.exclude)){
            includeModules(bundle.exclude);
        }

        //global excludes
        if(Array.isArray(amd.exclude)){
            excludeModules(amd.exclude);
        }

        bundleConfig.include        = Array.from(includes);
        bundleConfig.excludeShallow = Array.from(excludes);

        return bundleConfig;
    };

    /**
     * The options for the optimizer
     */
    const rJsOptions = {
        //never ever optimize using r.js
        optimize:                'none',
        preserveLicenseComments: false,
        findNestedDependencies:  true,
        skipDirOptimize:         true,
        optimizeCss:             'none',
        buildCss:                false,
        inlineText:              true,
        skipPragmas:             true,
        generateSourceMaps:      true,
        baseUrl:                 amd.baseUrl,
        paths:                   amd.paths,
        shim:                    amd.shim,
        dir:                     workDir
    };

    // add the path to the current extension to the options
    rJsOptions.paths[extension] = extensionPath;
    rJsOptions.paths[extension + 'Css'] = path.join(extensionPath , '../css');

    rJsOptions.modules = bundles.map( createRJsBundleConfig );

    if(grunt.option('debug') === 'debug'){
        grunt.log.debug('r.js configuration');
        grunt.log.debug(require('util').inspect(rJsOptions));
    }

    // TODO: extend this to send build log to grunt.log.ok / grunt.log.error
    // by overriding the r.js logger (or submit issue to r.js to expand logging support)
    requirejs.define('node/print', [], function() {
        return function print(msg) {
            if (msg.substring(0, 5) === 'Error') {
                grunt.log.errorlns(msg);
                grunt.fail.warn('RequireJS failed.');
            } else {
                grunt.log.debug(msg);
            }
        };
    });

    return new Promise( (resolve, reject) => {
        requirejs.optimize(
            rJsOptions,
            resolve,
            reject
         );
    });
};



