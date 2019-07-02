/*
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2018-2019 (original work) Open Assessment Technologies SA
 *
 */

/**
 * The TAO bundler : get the sources from an extension and "bundle" them in a unique file.
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
const requirejs  = require('requirejs');
const path       = require('path');
const fs         = require('fs-extra');
const amdResolve = require('./amdResolve.js');

/*
 * Creates bundles from the given configuration
 * @param {bundleOptions} - the bundle configuration
 * @returns {Promise}
 */
module.exports = async function bundler({
    amd = {
        baseUrl: '',
        paths: {},
        shim: {},
        default: [],
        bootstrap: [],
        vendor: [],
        exclude: []
    },
    paths = {},
    workDir = 'output',
    outputDir = 'loader',
    extension = '',
    rootExtension = '',
    bundles = [],
    dependencies = {},
    getExtensionPath = () => {},
    getExtensionCssPath = () => {},
    allowExternal = []
} = {}){

    var pathConfig = {
        ...amd.paths,   //paths from the main config
        ...paths        //paths added for the extension
    };

    /**
     * Does the given extension is the root extension ?
     * @param {String} targetExtension - the extension to check
     * @returns {Boolean}
     */
    const isRootExtension = targetExtension => targetExtension === rootExtension;

    /**
     * Add modules (or module pattern) to the incl/excl target
     * @param {String[]} modulePatterns - a list of module or pattern
     * @param {Set} target - the includes or excludes Set
     */
    const addModulesTo = async (modulePatterns, target) => {
        if(Array.isArray(modulePatterns)){
            for(let modulePattern of modulePatterns) {
                const resolved = await amdResolve(modulePattern, {
                    targetExtension : extension,
                    cwd : getExtensionPath(extension),
                    extensionPrefix: !isRootExtension(extension),
                    aliases : pathConfig
                });
                resolved.forEach( module => target.add(module) );
            }
        }
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
     * @param {bundle} bundle
     * @returns {Object} the bundle configuration for r.js
     */
    const createRJsBundleConfig = async (bundle) => {

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
        const includeModules = async (modules) => await addModulesTo(modules, includes);

        /**
         * Add modules (or module pattern) to exclude
         * @param {String[]} modules - a list of module or pattern
         */
        const excludeModules = async (modules) => await addModulesTo(modules, excludes);

        if(bundle.vendor){
            //vendor bundle, we include vendor libraries only
            await includeModules(amd.vendor);

        } else {

            // include the defined bootstrap
            if(bundle.bootstrap){
                await includeModules(amd.bootstrap);
            }

            // include an entrypoint module
            if(typeof bundle.entryPoint === 'string'){
                await includeModules([bundle.entryPoint]);
            }

            //include the extension default (conventional patterns)
            if(bundle.default) {
                await includeModules(amd.default);
            }

            //always exclude the vendor libs
            //
            await excludeModules(amd.vendor);
        }

        //each bundle can define it's own includes
        if(Array.isArray(bundle.include)){
            await includeModules(bundle.include);
        }

        //each bundle can define it's own excludes
        if(Array.isArray(bundle.exclude)){
            await excludeModules(bundle.exclude);
        }

        bundleConfig.include        = Array.from(includes);
        bundleConfig.excludeShallow = Array.from(excludes);

        //add artificial define to trigger the load of the dependencies
        const loadBundle = [];
        if(Array.isArray(bundle.dependencies)){
            //explicit dependency override
            bundle.dependencies.forEach( dependency => loadBundle.push(dependency));

        } else if(Array.isArray(dependencies)){

            //dependency using extension bundles
            dependencies.forEach( dependency => loadBundle.push(`${dependency}/${outputDir}/${dependency}.min`));
        }
        if(loadBundle.length){
            //if the bundle has a bootstrap we add the dependency globaly,
            //otherwise mimic use the AMD mechanism
            //TODO using window.bundles creates a strong coupling here, we need to abstract it
            bundleConfig.override = {
                wrap : {
                    start : '',
                    end : bundle.bootstrap ?
                        `window.bundles = (window.bundles || []).concat(${JSON.stringify(loadBundle)});` :
                        `define("${destModule.replace('bundle', 'min')}", ${JSON.stringify(loadBundle)}, function(){});`

                }
            };
        }

        return bundleConfig;
    };

    /**
     * Creates the paths from :
     *  - the main configuration (amd.paths)
     *  - the additional paths defined
     *  - the current and the root extension
     *  - the dependencies
     *  @returns {Object} the paths
     */
    const createPathsConfig = async () => {

        const addExtensionToPath = async (targetExtension) => {
            const targetExtensionPath = getExtensionPath(targetExtension);
            const targetExtensionCssPath = getExtensionCssPath(targetExtension);

            const pathExists = await fs.pathExists(targetExtensionPath);
            if(pathExists){
                pathConfig[targetExtension] = targetExtensionPath;
            }
            const cssPathExists =  await fs.pathExists(targetExtensionCssPath);
            if(cssPathExists) {
                pathConfig[`${targetExtension}Css`] = targetExtensionCssPath;
            }
        };

        //add the current extension to the path
        await addExtensionToPath(extension);

        if(!isRootExtension(extension)){
            await addExtensionToPath(rootExtension);
        }

        //add also each dependency
        if(Array.isArray(dependencies)){
            dependencies.forEach( async (dependency) => {
                if(dependency !== rootExtension){
                    try {
                        // load the requirejs paths of each dependency into the global pathConfig
                        const dependencyPaths = require(path.resolve(workDir, `../../../../${dependency}/views/build/grunt/paths.json`));
                        console.log(dependency, dependencyPaths);
                        pathConfig = {...pathConfig, ...dependencyPaths};
                    }
                    catch (e) {
                        console.error(e);
                    }
                    await addExtensionToPath(dependency);
                }
            });
        }
        return pathConfig;
    };

    /**
     * Create the exclude list for all bundles :
     *  - if the extension is not the root extension, we exclude all root extension modules
     *  - exclude the modules from the main config amd.exclude
     *  - exclude the modules from the dependencies
     *  - exclusion applies on modules, plugins and css
     *  @returns {Promise<String[]} the list of excludes
     */
    const createGlobalExclude = async () => {

        //global excludes
        const globalExcludes = new Set();

        /**
         * List all modules and plugins of an extension to build the exclude list,
         * the result is directly add to the Set above
         * @param {String} targetExtension
         */
        const excludeExtension = async targetExtension => {

            const resolveOptions = {
                targetExtension,
                cwd : getExtensionPath(targetExtension),
                extensionPrefix : !isRootExtension(targetExtension),
                aliases : amd.paths
            };
            const excludedModules     = await amdResolve('**/*', resolveOptions);
            const excludedCssModules  = await amdResolve('**/*', {...resolveOptions, type : 'css'});
            const excludedTplModules  = await amdResolve('**/*', {...resolveOptions, type : 'tpl'});
            const excludedJsonModules = await amdResolve('**/*', {...resolveOptions, type : 'json'});

            let excluded = [
                ...excludedModules,
                ...excludedCssModules,
                ...excludedTplModules,
                ...excludedJsonModules
            ];

            //extension css exclude too
            const cssPath = getExtensionCssPath(targetExtension);
            if(await fs.pathExists(cssPath)){
                const excludedGloablCSS = await amdResolve('**/*', {
                    targetExtension : `${targetExtension}Css`,
                    cwd : cssPath,
                    extensionPrefix : true,
                    type : 'css',
                    aliases : amd.paths
                });
                excluded = excluded.concat(excludedGloablCSS);
            }

            excluded
                .filter( module => !/\.(min|bundle)$/.test(module) )
                .forEach( module => globalExcludes.add(module) );
        };

        if(Array.isArray(amd.exclude)){
            amd.exclude.forEach( module => globalExcludes.add(module) );
        }

        if(!isRootExtension(extension)){
            await excludeExtension(rootExtension);
        }

        if(Array.isArray(dependencies)){
            for(let dependency of dependencies){
                if(!isRootExtension(dependency)){
                    await excludeExtension(dependency);
                }
            }
        }

        return Array.from(globalExcludes);
    };

    /**
     * Parse the logs from requirejs which are using the following format :
     *
     *  bundle.js
     *  ----------
     *  dependency.js
     *  dependency.js
     *
     *  bundle.js
     *  ----------
     *  dependency.js
     *  dependency.js
     *
     * @param {String} logs - the log to parse
     * @returns {Object[]} the structured bundle infos
     */
    const parseRJsLogs = logs => {
        const notEmpty = content => /\S+/.test(content);

        return logs.split(/(\r?\n){2}/)
            .filter( notEmpty )
            .map( content => {
                const bundleContent = content
                    .split(/\r?\n/)
                    .filter( notEmpty );

                const bundleInfo = {
                    title : bundleContent[0],

                    content : bundleContent.slice(2)
                };
                return bundleInfo;
            });
    };

    //generate the exclude list
    const globalExcludes = await createGlobalExclude();

    const rJsPathConfig = await createPathsConfig();

    //generate the config for each bundle (akka modules in rjs terminology)
    const rJsModules = [];
    for (let bundle of bundles){
        const bundleConfig = await createRJsBundleConfig(bundle);
        bundleConfig.excludeShallow = [...bundleConfig.excludeShallow, ...globalExcludes];
        rJsModules.push(bundleConfig);
    }

    /**
     * The options for the optimizer
     */
    const rJsOptions = {
        //never ever optimize using r.js
        logLevel:                2,
        optimize:                'none',
        preserveLicenseComments: true,
        removeCombined:          false,
        findNestedDependencies:  true,
        skipDirOptimize:         false,
        optimizeCss:             'none',
        buildCss:                false,
        inlineText:              true,
        skipPragmas:             true,
        generateSourceMaps:      true,
        baseUrl:                 amd.baseUrl,
        paths:                   rJsPathConfig,
        shim:                    amd.shim,
        dir:                     workDir,
        modules:                 rJsModules
    };

    return new Promise( (resolve, reject) => {

        //run the rjs bundler
        requirejs.optimize(
            rJsOptions,
            results => {
                const bundlesInfos = parseRJsLogs(results);

                //safety check: does a bundle contains unwanted dependencies
                // (not available for the root extension)
                // We check the dependencies to see if one of the bundle dependency doesn't
                // belong to the extension, useful to spot configuration error
                if(!isRootExtension(extension)){
                    const validModuleExp = new RegExp(`(tpl|css|txt|json)?!?${extension}(Css)?/`);
                    bundlesInfos.forEach( bundleInfo => {
                        bundleInfo.content.forEach( file => {
                            const module = file.replace(/\.[^/.]+$/, '');

                            if( allowExternal.indexOf(module) === -1 &&
                                !validModuleExp.test(module) &&
                                !amd.bootstrap.indexOf(module) === -1){

                                reject(new Error(`The bundle ${bundleInfo.title} contains a forbidden dependency "${module}". Check your configuration!`));
                                return false;
                            }
                        });
                    });
                }

                resolve(bundlesInfos);
            },
            reject
        );
    });
};
