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
 * Copyright (c) 2018 (original work) Open Assessment Technologies SA
 *
 */

/**
 * This module provides a library to resolve AMD modules against the file system
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

const glob = require('glob');

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
 * @param {Boolean} options.extensionPrefix - do we prefix the found module with the extension name ?
 * @param {String}  options.cwd - the full path of the extension js root, ie. /home/foo/project/package-tao/taoQtiTest/views/js
 * @param {String}  options.type - the module type within the supported module types list
 * @returns {Promise<String[]>} the list of AMD modules matching the pattern
 * @throws {TypeError} when the module type is not supported
 */
module.exports = function resolve(pattern, {
    targetExtension = '',
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

    const fileTypePattern  = new RegExp(`\\.${fileExtension}$`);
    const extensionPattern = new RegExp(`^${targetExtension}/`);

    //check if the pattern has an alias
    const matchinAliases =  Object.entries(aliases)
        .filter( ([alias]) => new RegExp(`^${alias}`).test(pattern) );

    //resolve the aliases, only to resolve the modules against the file system
    const aliasedPattern = matchinAliases
        .reduce( (acc, [alias, replacement]) => {
            return acc.replace(new RegExp(`^${alias}`), replacement);
        }, pattern);

    //remove the extension prefix from the pattern :
    //taoQtiTest/runner/**/* becomes runner/**/*
    //because we resolve from the extensionPath
    const filePattern = aliasedPattern.replace(extensionPattern, '');

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
            if(err){
                return reject(err);
            }

            if(!matches || !matches.length){
                return resolve([]);
            }
            return resolve(
                matches
                    .filter(src => fileTypePattern.test(src) )
                    .map( file => {

                        let moduleName = amdLoader;

                        //if this is not the root extension, we append back the extension prefix
                        //and remove the file extension :
                        //runner/provider/qti.js becomes taoQtiTest/runner/provider/qti
                        if(extensionPrefix && !extensionPattern.test(file)){
                            moduleName +=  targetExtension + '/';
                        }

                        //keep or remove the extension suffix
                        if(addFileExtension){
                            moduleName += file;
                        } else {
                            moduleName += file.replace(fileTypePattern, '');
                        }

                        //unalias
                        if (matchinAliases.length) {
                            moduleName = matchinAliases
                                .reduce( (acc, [alias, replacement]) => {
                                    return acc.replace(replacement, alias);
                                }, moduleName);
                        }

                        return moduleName;
                    })
            );
        });
    });
};

