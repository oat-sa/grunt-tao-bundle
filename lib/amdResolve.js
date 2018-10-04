const glob = require('glob');

/**
 * White list the supported modules types and the
 * linked file extension as well as the amd loader prexfix
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
 * @param {String} pattern - a pattern to find modules, ie. taoQtiTest/runner/*
 * @param {Object} [options]
 * @param {String}  options.targetExtension - the extension name, ie. taoQtiTest
 * @param {Boolean} options.extensionPrefix - do we prefix the found module with the extension name ?
 * @param {String}  options.cwd - the full path of the extension js root, ie. /home/foo/project/package-tao/taoQtiTest/views/js
 * @param {String}  options.type - the module type within the supported module types list
 * @returns {String[]} the list of AMD modules matching the pattern
 */
module.exports = function resolve(pattern, {
    targetExtension = '',
    extensionPrefix = true,
    cwd = '',
    type = 'js',
    excludeDirs = ['loader', 'test']
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

    const fileTypePattern = new RegExp(`\\.${fileExtension}$`);
    const extensionPattern   = new RegExp(`^${targetExtension}/`);

    //remove the extension prefix from the pattern :
    //taoQtiTest/runner/**/* becomes runner/**/*
    //because we resolve from the extensionPath
    const filePattern = pattern.replace(extensionPattern, '');

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

                        return moduleName;
                    })
            );
        });
    });
};

