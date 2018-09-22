const requirejs = require('requirejs');
const path      = require('path');


module.exports = function(grunt, {
    amd = {
        baseUrl : '',
        paths : {},
        shim : {}
    },
    paths = {},
    workDir = 'output',
    outputDir = 'loader',
    extension = '',
    extensionPath = '',
    extensionCssPath = '',
    rootExtension = '',
    rootExtensionPath = '',
    bundles = [],
    dependencies = {}
} = {}){

    const isRootExtension = targetExtension => targetExtension === rootExtension;

    /**
     * Resolve AMD modules based on a pattern
     * @param {String} targetExtension - the extension name, ie. taoQtiTest
     * @param {String} cwd - the full path of the extension js root, ie. /home/foo/project/package-tao/taoQtiTest/views/js
     * @param {String} pattern - a pattern to find modules, ie. `taoQtiTest/runner/*`
     * @returns {String[]} the list of AMD modules matching the pattern
     */
    const resolveAMDModules = (targetExtension, cwd, pattern, type = 'js') => {
        const fileTypePattern = new RegExp(`\\.${type}$`);
        const extensionPattern   = new RegExp(`^${targetExtension}`);

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
            filter: src => {
                return fileTypePattern.test(src);
            }
        },
            filePattern
        )
        .map( file => {

            let moduleName = '';

            if(type !== 'js'){
                moduleName  = type + '!';
            }

            //if this is not the root extension, we append back the extension prefix
            //and remove the file extension :
            //`runner/provider/qti.js` becomes `taoQtiTest/runner/provider/qti`
            if(!isRootExtension(targetExtension) && !extensionPattern.test(file)){
                moduleName +=  targetExtension + '/';
            }

            //otherwise just remove the `.js` suffix
            moduleName += file.replace(fileTypePattern, '');

            return moduleName;
        });
    };

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

        //the destination
        const destModule = path.join(
            isRootExtension(extension) ? '' : extension,
            outputDir,
            `${bundle.name}.bundle`
        );

        const bundleConfig =  {
            create : true,
            name   : destModule
        };

        //add include and excludes into Sets to avoid duplicate
        const excludes = new Set();
        const includes = new Set();

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
        }

        //each bundle can define it's own includes
        if(Array.isArray(bundle.include)){
            includeModules(bundle.include);
        }

        //each bundle can define it's own excludes
        if(Array.isArray(bundle.exclude)){
            includeModules(bundle.exclude);
        }

        bundleConfig.include        = Array.from(includes);
        bundleConfig.excludeShallow = Array.from(excludes);

        return bundleConfig;
    };

    const createPathsConfig = () => {
        const pathConfig = {
            ...amd.paths,   //paths from the main config
            ...paths        //paths added for the extension
        };
        pathConfig[extension] = extensionPath;
        if(grunt.file.exists(extensionCssPath)){
            pathConfig[`${extension}Css`] = extensionCssPath;
        }
        Object.keys(dependencies).forEach( dependency => {
            if(dependency !== rootExtension){
                pathConfig[dependency] = dependencies[dependency];
            }
        });
        return pathConfig;
    };

    const createGlobalExclude = () => {

        //gloabal excludes
        const globalExcludes = new Set();

        const excludeExtension = (targetExtension, targetExtensionPath) => {
            [
                ...resolveAMDModules(targetExtension, targetExtensionPath,  '**/*'),
                ...resolveAMDModules(targetExtension, targetExtensionPath,  '**/*', 'css'),
                ...resolveAMDModules(targetExtension, targetExtensionPath,  '**/*', 'tpl')
            ]
            .filter( module => !/\.(min|bundle)$/.test(module) )
            .forEach( module => globalExcludes.add(module) );
        };

        if(Array.isArray(amd.exclude)){
            amd.exclude.forEach( module => globalExcludes.add(module) );
        }

        if(!isRootExtension(extension)){
            excludeExtension(rootExtension, rootExtensionPath);
        }

        if(dependencies){
            Object.keys(dependencies).forEach( dependency => {
                excludeExtension(dependency, dependencies[dependency]);
            });
        }

        return Array.from(globalExcludes);
    };

    /**
     * The options for the optimizer
     */
    const rJsOptions = {
        //never ever optimize using r.js
        logLevel:                grunt.option('verbose') ? 0 : grunt.option('debug') ? 1 : 2,
        optimize:                'none',
        preserveLicenseComments: false,
        removeCombined:          false,
        findNestedDependencies:  false,
        skipDirOptimize:         true,
        optimizeCss:             'none',
        buildCss:                false,
        inlineText:              true,
        skipPragmas:             true,
        generateSourceMaps:      true,
        baseUrl:                 amd.baseUrl,
        paths:                   createPathsConfig(),
        shim:                    amd.shim,
        dir:                     workDir,
        modules:                 bundles.map( bundle => {
            const bundleConfig = createRJsBundleConfig(bundle);
            bundleConfig.excludeShallow = [...bundleConfig.excludeShallow, ...createGlobalExclude()];
            return bundleConfig;
        })
    };

    if(grunt.option('debug')){
        grunt.log.debug('----> r.js configuration');
        grunt.log.debug(require('util').inspect(rJsOptions, { depth: 3 }));
        grunt.log.debug('----> r.js configuration available into rjs.json ');
        grunt.file.write('rjs.json', JSON.stringify(rJsOptions));
    }

    return new Promise( (resolve, reject) => {
        requirejs.optimize(
            rJsOptions,
            resolve,
            reject
         );
    });
};
