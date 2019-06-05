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
const babel     = require('@babel/core');
const path      = require('path');
const uglify    = require('uglify-js');
const fs        = require('fs-extra');

const fixModuleCreate = require('./sourceMapHelper.js').fixModuleCreate;

/**
 * The TAO transformer : from a bundle either transpile (Babel) or minimify (Uglify) the bundle
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 *
 *
 * Transform the bundles from the given configuration
 * @param {bundleOptions} - the bundle configuration
 * @param {String} bundlOptions.extensionPath - the absolute path of the extension JavaScript files
 * @returns {Promise}
 */
module.exports = async function transformer({
    workDir = 'output',
    outputDir = 'loader',
    extension = '',
    rootExtension = '',
    getExtensionPath = () => {},
    bundles = []
} = {}){

    /**
     * Is the current extension the root extension ?
     * @returns {Boolean}
     */
    const isRootExtension = () => extension === rootExtension;

    const generated = [];

    for (let bundle of bundles) {

        const bundleFile = path.join(
            workDir,
            isRootExtension() ? '' : extension,
            outputDir,
            `${bundle.name}.bundle.js`
        );
        const bundleSourceMap = `${bundleFile}.map`;

        const destFile   = path.join(
            getExtensionPath(extension),
            outputDir,
            `${bundle.name}.min.js`
        );
        const destFileSourceMap = `${destFile}.map`;

        const bundleExists    = await fs.pathExists(bundleFile);
        const bundleMapExists = await fs.pathExists(bundleSourceMap);

        if(!bundleExists || !bundleMapExists){
            throw new Error(`Unable to access ${bundleFile} or ${bundleSourceMap}`);
        }

        const code      = await fs.readFile(bundleFile, 'utf-8');
        const sourceMap = await fs.readFile(bundleSourceMap, 'utf-8');

        let transformResult = {};
        if(bundle.babel){

            try {
                transformResult = await babel.transformAsync(code, {
                    presets: [
                        ['@babel/env', {
                            targets : 'extends @oat-sa/browserslist-config-tao',
                            useBuiltIns : false
                        }],
                        ['minify', {
                            mangle : false
                        }]
                    ],
                    sourceMap: true,
                    inputSourceMap : JSON.parse(sourceMap),
                    comments: false,
                    sourceType: 'script'
                });
                transformResult.method = 'babel';
                transformResult.map = fixModuleCreate(JSON.stringify(transformResult.map));
                transformResult.code += `\n//# sourceMappingURL=${bundle.name}.min.js.map`;

            } catch (err){
                transformResult.error = err;
            }

        } else if(bundle.uglify === false) {

            transformResult = {
                code : code.replace('.bundle.js.map', '.min.js.map'),
                map : sourceMap,
                method: 'none'
            };

        } else {
            transformResult = uglify.minify(code, {
                mangle : false,
                output: {
                    'max_line_len': 666
                },
                sourceMap: {
                    content : fixModuleCreate(sourceMap),
                    filename: `${bundle.name}.min.js`,
                    url:      `${bundle.name}.min.js.map`
                }
            });
            transformResult.method = 'uglify';
        }

        if(transformResult.error){
            if(transformResult.error instanceof Error){
                throw transformResult.error;
            }
            throw new Error(transformResult.error);
        }

        await fs.writeFile(destFile, transformResult.code, 'utf-8');
        await fs.writeFile(destFileSourceMap, transformResult.map, 'utf-8');
        generated.push({
            src:       bundleFile,
            dest:      destFile,
            sourceMap: destFileSourceMap,
            method:    transformResult.method
        });
    }
    return generated;
};



