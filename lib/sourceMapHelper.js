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

/**
 * Helper function related to source maps
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

/**
 * This helper fixes a bug in the bundler (r.js), see https://github.com/requirejs/r.js/issues/994
 *
 * r.js creates some artificial entries to matches the artificial bundles it creates.
 * That's ok but the sourcemap contains the path relatively to the system it was built from...
 *
 * @param {String} sourceMapData - the sourcemap data
 * @returns {String} the source map data
 * @throws {ParseError} if the sourceMap contains invalid JSON
 */
module.exports.fixModuleCreate = function fixModuleCreate(sourceMapData) {
    //patterns to match the entries created by the bundler
    const patterns = [/module-create\.js$/, /onLayerEnd[0-9]+\.js/];

    if (typeof sourceMapData === 'string' && sourceMapData.length) {
        const sourceMap = JSON.parse(sourceMapData);
        if (sourceMap && sourceMap.version === 3 && sourceMap.sources.length) {
            sourceMap.sources.forEach((entry, index) => {
                patterns.forEach(pattern => {
                    if (pattern.test(entry)) {
                        sourceMap.sources[index] = entry.replace(/\.\.\//g, '');
                        return false;
                    }
                });
            });

            return JSON.stringify(sourceMap);
        }
    }
    return sourceMapData;
};
