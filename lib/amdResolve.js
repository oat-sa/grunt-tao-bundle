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
 * This module provides a library to resolve AMD modules against the file system
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

const glob = require('glob');
const path = require('path');

/**
 * White-list of the supported modules types, and their specificity
 * @type {Object}
 */
const supportedModuleTypes = {
    js : {
        fileExtension : 'js',
        amdLoader : '',
        addFileExtension : false
    },
    css : {
        fileExtension : 'css',
        amdLoader : 'css!',
        addFileExtension : false
    },
    tpl: {
        fileExtension : 'tpl',
        amdLoader : 'tpl!',
        addFileExtension : false
    },
    'json' : {
        fileExtension : 'json',
        amdLoader : 'json!',
        addFileExtension : true
    }
};

/**
 * Resolve AMD modules based on a pattern
 *
 * @param {String} pattern - a pattern to find modules, ie. taoQtiTest/runner/*
 * @param {Object} [options]
 * @param {String}  options.targetExtension - the extension name, ie. taoQtiTest
 * @param {String[]}  options.dependencies - array of extension names
 * @param {Boolean} options.extensionPrefix - do we prefix the found module with the extension name ?
 * @param {String}  options.cwd - the full path of the extension js root, ie. /home/foo/project/package-tao/taoQtiTest/views/js
 * @param {String}  options.type - the module type within the supported module types list
 * @returns {Promise<String[]>} the list of AMD modules matching the pattern
 * @throws {TypeError} when the module type is not supported
 */
module.exports = function resolve(pattern, {
    targetExtension = '',
    dependencies = [],
    extensionPrefix = true,
    cwd = '',
    type = 'js',
    excludeDirs = ['loader', 'test'],
    aliases = {}
} = {}) {

    if(!supportedModuleTypes[type]){
        throw new TypeError(`Unsupported module type '${type}', please select one in ${Object.keys(supportedModuleTypes).join(',')}.`);
    }

    if(!pattern){
        return Promise.resolve([]);
    }

    //if the pattern doesn't include star, we don't expand it
    if(!/\*/.test(pattern)){
        return Promise.resolve([pattern]);
    }

    const {fileExtension, amdLoader, addFileExtension} = supportedModuleTypes[type];

    //define regular expressions to use on file path
    const patterns = {
        endsWithFileType: new RegExp(`\\.${fileExtension}$`),
        startsWithExtension: new RegExp(`^${targetExtension}/`),
        containsExtension: new RegExp(`/${targetExtension}/`)
    };
    if (Array.isArray(dependencies) && dependencies.length) {
        patterns.startsWithDependency = new RegExp(`^${dependencies.join('|')}`);
        patterns.containsDependency = new RegExp(`/${dependencies.join('|')}`);
    }

    //check if the pattern has an alias
    const matchingAlias =  Object.entries(aliases)
        .find( ([alias]) => pattern.startsWith(`${alias}/`) );

    //resolve the aliases, only to resolve the modules against the file system
    let aliasedPattern = pattern;
    if(matchingAlias){
        aliasedPattern = path.join(
            matchingAlias[1],
            pattern.substring(matchingAlias[0].length)
        );
    }

    //remove the extension prefix from the pattern :
    //taoQtiTest/runner/**/* becomes runner/**/*
    //because we resolve from the extensionPath
    const filePattern = aliasedPattern.replace(patterns.startsWithExtension, '');

    return new Promise( (resolve, reject) => {
        glob(filePattern, {
            cwd,
            noext: true,
            ignore : excludeDirs.reduce( (acc, dir) => {
                acc.push(`${dir}/**/*`);
                acc.push(`**/${dir}/**/*`);
                return acc;
            }, [])
        }, (err, matches) => {

            // determine if the given file path should have the target extension prefix added to it
            const needsPrefix = (file) => {
                if(!extensionPrefix) {
                    return false;
                }
                if (patterns.startsWithExtension.test(file) || patterns.containsExtension.test(file)) {
                    return false;
                }
                if (Array.isArray(dependencies) && dependencies.length) {
                    if (patterns.startsWithDependency.test(file) || patterns.containsDependency.test(file)) {
                        return false;
                    }
                }
                return true;
            }

            if(err){
                return reject(err);
            }

            if(!matches || !matches.length){
                return resolve([]);
            }
            return resolve(
                matches
                    .filter(src => patterns.endsWithFileType.test(src) )
                    .map( file => {

                        let moduleName = amdLoader;

                        //if this is not the root extension, we append back the extension prefix
                        //and remove the file extension :
                        //runner/provider/qti.js becomes taoQtiTest/runner/provider/qti
                        if(needsPrefix(file)) {
                            moduleName += targetExtension + '/';
                        }

                        //keep or remove the extension suffix
                        if(addFileExtension){
                            moduleName += file;
                        } else {
                            moduleName += file.replace(patterns.endsWithFileType, '');
                        }

                        //unalias
                        if (matchingAlias) {
                            moduleName =  path.join(
                                matchingAlias[0],
                                moduleName.substring(matchingAlias[1].length)
                            );
                        }

                        return moduleName;
                    })
            );
        });
    });
};
