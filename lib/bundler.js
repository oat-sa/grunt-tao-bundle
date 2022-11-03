/**
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
 * Copyright (c) 2018-2020 (original work) Open Assessment Technologies SA
 *
 */

/**
 * The TAO bundler : get the sources from an extension and "bundle" them in a unique file.
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
const requirejs = require('requirejs');
const path = require('path');
const fs = require('fs-extra');
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
    rootPath = '',
    extension = '',
    rootExtension = '',
    bundles = [],
    dependencies = [],
    getExtensionPath = () => {},
    getExtensionCssPath = () => {},
    allowExternal = [],
    packages = []
} = {}) {
    let pathConfig = {
        ...amd.paths, //paths from the main config
        ...paths //paths added for the extension
    };

    /**
     * Does the given extension is the root extension ?
     * @param {String} targetExtension - the extension to check
     * @returns {Boolean}
     */
    const isRootExtension = targetExtension => targetExtension === rootExtension;

    const isVendorModule = modulePattern => amd.vendor.includes(modulePattern);

    const loadExtensionPaths = extension => {
        try {
            return require(`${rootPath}/${extension}/views/build/grunt/paths.json`);
        } catch (e) {
            return {};
        }
    };

    /**
     * Add modules (or module pattern) to the incl/excl target
     * @param {String[]} modulePatterns - a list of module or pattern
     * @param {String} fileType - a file extension
     * @param {Set} target - the includes or excludes Set
     * @affects target
     */
    const addModulesTo = async (modulePatterns, fileType, target) => {
        const allResolved = await resolveModules(modulePatterns, fileType);
        allResolved.forEach(module => target.add(module));
    };

    /**
     * Use the amdResolve tool to resolve module names to paths
     * @param {String[]} modulePatterns - a list of module or pattern
     * @param {String} fileType - a file extension
     * @returns {Array}
     */
    const resolveModules = async (modulePatterns, fileType) => {
        var allResolved = [];
        if (Array.isArray(modulePatterns)) {
            for (let modulePattern of modulePatterns) {
                const resolved = await amdResolve(modulePattern, {
                    targetExtension: extension,
                    dependencies,
                    type: fileType,
                    cwd: getExtensionPath(extension),
                    extensionPrefix: !isRootExtension(extension) && !isVendorModule(modulePattern),
                    aliases: pathConfig
                });
                allResolved = [...allResolved, ...resolved];
            }
        }
        return allResolved;
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
     * @param {Array} globalExcludes
     * @returns {Object} the bundle configuration for r.js
     */
    const createRJsBundleConfig = async (bundle, globalExcludes) => {
        //the destination
        const destModule = path.join(isRootExtension(extension) ? '' : extension, outputDir, `${bundle.name}.bundle`);

        const bundleConfig = {
            create: true,
            name: destModule
        };

        //add include and excludes into Sets to avoid duplicate
        const excludes = new Set();
        const includes = new Set();
        excludes.name = 'excludes';
        includes.name = 'includes';

        /**
         * Add modules (or module pattern) to include
         * @param {String[]} modules - a list of module or pattern
         */
        const includeModules = async (modules, fileType) => await addModulesTo(modules, fileType, includes);

        /**
         * Add modules (or module pattern) to exclude
         * @param {String[]} modules - a list of module or pattern
         */
        const excludeModules = async (modules, fileType) => await addModulesTo(modules, fileType, excludes);

        /**
         * Exclude all the modules (or module pattern)
         * from  all supported file types
         */
        const excludeAllModules = async modules => {
            await excludeModules(modules, 'js');
            await excludeModules(modules, 'css');
            await excludeModules(modules, 'tpl');
            await excludeModules(modules, 'json');
        };

        if (bundle.vendor && !bundle.standalone) {
            //vendor bundle, we include vendor libraries only
            await includeModules(amd.vendor);
        } else {
            // include the defined bootstrap
            if (bundle.bootstrap || bundle.standalone) {
                await includeModules(amd.bootstrap);
            }

            // include an entrypoint module
            if (typeof bundle.entryPoint === 'string') {
                await includeModules([bundle.entryPoint]);
            }

            //include the extension default (conventional patterns)
            if (bundle.default) {
                await includeModules(amd.default);
            }

            if (bundle.vendor || bundle.standalone) {
                //we include vendor libraries in a standalone bundle
                await includeModules(amd.vendor);
            } else {
                //always exclude the vendor libs from standard bundle
                await excludeAllModules(amd.vendor);
            }
        }

        //each bundle can define it's own includes
        if (Array.isArray(bundle.include)) {
            await includeModules(bundle.include);
        }

        //each bundle can define it's own excludes
        if (Array.isArray(bundle.exclude)) {
            await excludeModules(bundle.exclude);
        }

        //exclude the globals
        if (Array.isArray(globalExcludes)) {
            globalExcludes.forEach(module => excludes.add(module));
        }

        //each bundle's dependencies can have a paths.json whose keys should be excludes
        if (Array.isArray(dependencies)) {
            await Promise.all(
                dependencies.map(dependency => {
                    const dependencyKeys = Object.keys(loadExtensionPaths(dependency));
                    if (dependencyKeys.length) {
                        const pathsToExclude = dependencyKeys.map(key => `${key}/**/*`);
                        return excludeAllModules(pathsToExclude);
                    }
                    return true;
                })
            );
        }

        bundleConfig.include = Array.from(includes).filter(module => !excludes.has(module));
        bundleConfig.excludeShallow = Array.from(excludes);
        bundleConfig.exclude = bundle.excludeNested;

        //add artificial define to trigger the load of the dependencies
        const loadBundle = [];
        if (!bundle.standalone) {
            if (Array.isArray(bundle.dependencies)) {
                //explicit dependency override
                bundle.dependencies.forEach(dependency => loadBundle.push(dependency));
            } else if (Array.isArray(dependencies)) {
                //dependency using extension bundles
                dependencies.forEach(dependency => loadBundle.push(`${dependency}/${outputDir}/${dependency}.min`));
            }
        }
        if (loadBundle.length) {
            //if the bundle has a bootstrap we add the dependency globaly,
            //otherwise mimic use the AMD mechanism
            //TODO using window.bundles creates a strong coupling here, we need to abstract it
            bundleConfig.override = {
                wrap: {
                    start: '',
                    end: bundle.bootstrap
                        ? `window.bundles = (window.bundles || []).concat(${JSON.stringify(loadBundle)});`
                        : `define("${destModule.replace('bundle', 'min')}", ${JSON.stringify(
                              loadBundle
                          )}, function(){});`
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
        const addExtensionToPath = async targetExtension => {
            const targetExtensionPath = getExtensionPath(targetExtension);
            const targetExtensionCssPath = getExtensionCssPath(targetExtension);

            const pathExists = await fs.pathExists(targetExtensionPath);
            if (pathExists) {
                pathConfig[targetExtension] = targetExtensionPath;
            }
            const cssPathExists = await fs.pathExists(targetExtensionCssPath);
            if (cssPathExists) {
                pathConfig[`${targetExtension}Css`] = targetExtensionCssPath;
            }
        };

        //add the current extension to the path
        await addExtensionToPath(extension);

        if (!isRootExtension(extension)) {
            await addExtensionToPath(rootExtension);
        }

        //add also each dependency
        if (Array.isArray(dependencies)) {
            await Promise.all(
                dependencies.map(dependency => {
                    if (dependency !== rootExtension) {
                        // load the requirejs paths of each dependency into the global pathConfig
                        const dependencyPaths = loadExtensionPaths(dependency);
                        pathConfig = { ...pathConfig, ...dependencyPaths };

                        return addExtensionToPath(dependency);
                    }
                })
            );
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
                dependencies,
                cwd: getExtensionPath(targetExtension),
                extensionPrefix: !isRootExtension(targetExtension),
                aliases: pathConfig
            };
            const excludedModules = await amdResolve('**/*', resolveOptions);
            const excludedCssModules = await amdResolve('**/*', { ...resolveOptions, type: 'css' });
            const excludedTplModules = await amdResolve('**/*', { ...resolveOptions, type: 'tpl' });
            const excludedJsonModules = await amdResolve('**/*', { ...resolveOptions, type: 'json' });

            let excluded = [...excludedModules, ...excludedCssModules, ...excludedTplModules, ...excludedJsonModules];

            //extension css exclude too
            const cssPath = getExtensionCssPath(targetExtension);
            if (await fs.pathExists(cssPath)) {
                const excludedGloablCSS = await amdResolve('**/*', {
                    targetExtension: `${targetExtension}Css`,
                    dependencies,
                    cwd: cssPath,
                    extensionPrefix: true,
                    type: 'css',
                    aliases: pathConfig
                });
                excluded = excluded.concat(excludedGloablCSS);
            }

            excluded.filter(module => !/\.(min|bundle)$/.test(module)).forEach(module => globalExcludes.add(module));
        };

        if (Array.isArray(amd.exclude)) {
            amd.exclude.forEach(module => globalExcludes.add(module));
        }

        if (!isRootExtension(extension)) {
            await excludeExtension(rootExtension);
        }

        if (Array.isArray(dependencies)) {
            for (let dependency of dependencies) {
                if (!isRootExtension(dependency)) {
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

        return logs
            .split(/(\r?\n){2}/)
            .filter(notEmpty)
            .map(content => {
                const bundleContent = content.split(/\r?\n/).filter(notEmpty);

                const bundleInfo = {
                    title: bundleContent[0],

                    content: bundleContent.slice(2)
                };
                return bundleInfo;
            });
    };

    //generate the exclude list
    const globalExcludes = await createGlobalExclude();

    const rJsPathConfig = await createPathsConfig();

    //generate the config for each bundle (akka modules in rjs terminology)
    const rJsModules = [];
    const standaloneModules = [];
    for (let bundle of bundles) {
        const exclude = bundle.standalone ? amd.exclude : globalExcludes;
        const bundleConfig = await createRJsBundleConfig(bundle, exclude);

        if (bundle.standalone) {
            standaloneModules.push(`${bundleConfig.name}.js`);
        }

        rJsModules.push(bundleConfig);
    }

    const rJsPackages = packages.map(package => {
        package.location = path.resolve(package.location);
        return package;
    });

    /**
     * The options for the optimizer
     */
    const rJsOptions = {
        //never ever optimize using r.js
        logLevel: 2,
        optimize: 'none',
        preserveLicenseComments: true,
        removeCombined: false,
        findNestedDependencies: true,
        skipDirOptimize: false,
        optimizeCss: 'none',
        buildCss: false,
        inlineText: true,
        skipPragmas: true,
        generateSourceMaps: true,
        baseUrl: amd.baseUrl,
        paths: rJsPathConfig,
        shim: amd.shim,
        dir: workDir,
        modules: rJsModules,
        packages: rJsPackages
    };

    const isPackage = module => {
        const moduleLoader = module.match(/^(tpl|css|txt|json)!/);

        const package = rJsPackages.find(({ name, location }) => {
            const packagePath = moduleLoader !== null ? `${moduleLoader[0]}${name}` : location;

            return module.startsWith(packagePath);
        });

        return package !== undefined;
    };

    return new Promise((resolve, reject) => {
        //run the rjs bundler
        requirejs.optimize(
            rJsOptions,
            results => {
                const bundlesInfos = parseRJsLogs(results);

                //safety check: does a bundle contains unwanted dependencies
                // (not available for the root extension)
                // We check the dependencies to see if one of the bundle dependency doesn't
                // belong to the extension, useful to spot configuration error
                if (!isRootExtension(extension)) {
                    const validModuleExp = new RegExp(`(tpl|css|txt|json)?!?${extension}(Css)?/`);
                    bundlesInfos.forEach(bundleInfo => {
                        if (standaloneModules.includes(bundleInfo.title)) {
                            return;
                        }

                        bundleInfo.content.forEach(file => {
                            const module = file.replace(/\.[^/.]+$/, '');

                            if (
                                !validModuleExp.test(module) &&
                                !allowExternal.includes(module) &&
                                !amd.bootstrap.includes(module) &&
                                !isPackage(module)
                            ) {
                                reject(
                                    new Error(
                                        `The bundle ${bundleInfo.title} contains a forbidden dependency "${module}". Check your configuration!`
                                    )
                                );
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
