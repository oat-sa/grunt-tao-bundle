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
 * Copyright (c) 2018 (original work) Open Assessment Technlogies SA
 *
 */

const bundler = require('../lib/bundler.js');
const transformer  = require('../lib/transformer.js');

/**
 * Register the 'bundle' Grunt task
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 *
 */
module.exports = function(grunt) {

    /**
     * Register the Grunt task tao-bundle
     */
    grunt.registerMultiTask('bundle', 'Bundle client side code in TAO extensions', async function() {

        const done    = this.async();

        /**
         * @typedef {Object} bundleOptions
         * @param {Object} amd - the AMD configuration for all bundles (same as the runtime config)
         * @param {String} amd.baseUrl - relative path to resolve the AMD modules
         * @param {Object} amd.paths - the list of AMD paths/alias
         * @param {Object} amd.shim - the AMD configuration for all bundles
         * @param {Object} [paths] - additional list of AMD paths/alias for the given bundles (added to amd.paths)
         * @param {String} workDir - the temporary working directory to copy the sources and generates the bundles
         * @param {String} outputDir - the directory (inside the workDir) where the bundles will be generated
         * @param {String} extension - the name of the TAO extension the bundles belong to
         * @param {String} rootExtension - the name of the TAO root extension (the one that is not prefixed and contains the libs and the SDK)
         * @param {bundle[]} bundles - the configuration per bundle
         * @param {String[]} dependencies - the list of the dependencies (code from dependencies is excluded)
         * @param {String[]} [allowExternal] - the list of modules allowed to be included, mostly for internal aliases
         */

        /**
         * @typedef {Object} bundle
         * @param {Object} bundle
         * @param {String} bundle.name - the name with no extension, ie 'vendor'
         * @param {Boolean} bundle.vendor - if true, the bundle will include ONLY the amd.vendor libraries
         * @param {Boolean} bundle.bootstrap - if true, the bundle will include the amd.bootstrap modules
         * @param {String} bundle.entryPoint - an optional name of the module entryPoint
         * @param {Boolean} bundle.default  - if true we include the modules from the amd.default (the defalt extension modules)
         * @param {String[]} [bundle.include] - additional modules to include to the bundle
         * @param {String[]} [bundle.exclude] - additional modules to exclude from the bundle
         * @param {String[]} [bundle.dependencies] - overrides the dependencies to load for the bundle, USE THE FULL MODULE PATH
         * @param {Boolean} [bundle.babel = false] - Do we use the Babel transpiler
         * @param {Boolean} [bundle.uglify = true] - We minimify the bundle with uglify js (incompatible with the babel option)
         */

        /**
         * @type {bundleOptions}
         */
        const options = this.options();
        const extendedConfig = {
            ...options,
            extensionPath   : options.getExtensionPath(options.extension),
            extensionCssPath   : options.getExtensionCssPath(options.extension),
            rootExtensionPath   : options.getExtensionPath(options.rootExtension)
        };

        try {
            grunt.log.subhead('Start bundling');

            const results = await bundler(extendedConfig);

            results.forEach( bundle => {
                grunt.log.ok(`${bundle.title} bundled with ${bundle.content.length} modules`);
                grunt.log.debug( bundle.content );
            });

            grunt.log.writeln('Bundling done');

        } catch(err){
            grunt.log.error(grunt.util.error(err.message, err));
            grunt.fail.fatal('Unable to bundle your code');
        }

        try {

            grunt.log.subhead('Start transform');

            const generated = await transformer(extendedConfig);
            generated.forEach( file => grunt.log.ok(`${file} transformed`));
            grunt.log.writeln('Transform done');

        } catch(err){
            grunt.log.error(grunt.util.error(err.message, err));
            grunt.fail.fatal('Unable transform your code');
        }

        done();
    });
};

