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
 * Copyright (c) 2019 (original work) Open Assessment Technlogies SA
 *
 */

/**
 * This resolver function is intended to fix the missing relative paths to the css resources in the sourceMappingURL value
 * @author Ihar Suleimanau <ihar@taotesting.com>
 */

/**
 * Gets a sourceMappingURL parameter without a path to the sourceMap file.
 *
 * @param {Object} sourceMapObject
 * @param {String} sourceMapObject.file - sourceMap file name
 * @returns {string}
 */
const getSourceMapNoPath = sourceMapObject => `sourceMappingURL=${sourceMapObject.file}.css.map`;

/**
 * Gets a sourceMappingURL parameter with the correct path to the sourceMap file.
 * Its the issue fix: {@link: https://oat-sa.atlassian.net/browse/TDR-7}
 *
 * @param {Object} sourceMapObject
 * @param {String} sourceMapObject.file - sourceMap file name
 * @param {String} sourceMapObject.path - sourceMap file path
 * @returns {string}
 */
const getSourceMapWithPath = sourceMapObject => `sourceMappingURL=${sourceMapObject.path}/${sourceMapObject.file}.css.map`;

/**
 * Match all sourceMaps
 * @param {String} source - file contents
 * @returns {Array<{file: String, path: String}>} matches - an array of found sourceMap files
 */
const matchAllSourceMaps = source => {
    const matches = [];
    const search = /sourceMappingURL=([\w|\-|.]+).css.map/g;
    let match;

    while ((match = search.exec(source))) {
        matches.push({
            file: match[1],
            path: ''
        });
    }
    return matches;
};

/**
 *
 * @param {String} mapBody
 * @param {String} codeBody
 * @param {Object} paths
 * @param {String} cssSourceMapPath
 * @returns {Object<{code: String, map: String}>}
 */
module.exports = function resolve({
    mapBody,
    codeBody,
    paths = {},
    cssSourceMapPath
}) {

    let resolved = null;
    let matchedSourceMaps;

    if (!cssSourceMapPath) {
        return resolved;
    }

    matchedSourceMaps = matchAllSourceMaps(codeBody);

    resolved = {
        map: mapBody,
        code: codeBody
    };

    for (const i in matchedSourceMaps) {
        // Extract the sourceMap path from the `css!` imports
        const matchResult = (new RegExp(`css!([\\w|\\-|.|\\/]+)/${matchedSourceMaps[i].file}([\\.css|\\'\\"])`))
            .exec(codeBody);

        if (Array.isArray(matchResult)) {
            const matchedSourceMapPath = matchResult[1];

            // Check (and replace) the possible path aliases in the extracted sourceMap path
            for (let [pathKey, pathValue] of Object.entries(paths)) {
                if (matchedSourceMapPath.indexOf(pathKey) !== -1) {
                    matchedSourceMaps[i].path = matchedSourceMapPath.replace(pathKey, pathValue);
                    break;
                }
            }

            // Set the extracted sourceMap path
            if (!matchedSourceMaps[i].path) {
                matchedSourceMaps[i].path = matchedSourceMapPath;
            }
        } else {
            // Set default sourceMap path
            matchedSourceMaps[i].path = cssSourceMapPath;
        }

        // Prepend the matchedSourceMaps values with the relative sourceMap paths
        resolved.map = resolved.map.replace(
            getSourceMapNoPath(matchedSourceMaps[i]),
            getSourceMapWithPath(matchedSourceMaps[i])
        );
        resolved.code = resolved.code.replace(
            getSourceMapNoPath(matchedSourceMaps[i]),
            getSourceMapWithPath(matchedSourceMaps[i])
        );
    }

    return resolved;
};
