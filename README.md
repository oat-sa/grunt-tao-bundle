# grunt-tao-bundle

Grunt task to bundle assets from a TAO Extension.

## Concept

The TAO software architecture is based on atomic components called extensions. Each extension provides it's own source code (client and server side code). TAO extensions can be dependent on other extensions.

In order to create bundles that doesn't impact the extension dependency model, we bundle the code for a given extension only, no matter if an asset is dependent of an asset in another extension.

This task produce bundles sandboxed to a given extension.

The task is made of 2 steps :
1. The bundling, based on the configuration, we aggregate the assets of the extension, into a single file. Since the TAO client source code is managed using AMD modules and use some [requirejs](https://requirejs.org) internals, we use the [r.js](https://requirejs.org/docs/optimization.html) optimizer to parse the dependency tree and bundle the assets. We don't use it to minimify the resources.
2. The transform step is used to either transpile the code, using [Babel 7](https://babeljs.io/) (still experimental) or [UglifyJs](http://lisperator.net/uglifyjs/) to compress and minimify it.

![tao bundler concept](./doc/tao-bundler.png?raw=true "TAO Bundler concept")

## Getting Started

This plugin requires [node.js >= 8.6.0](https://nodejs.org/en/download/) and to be installed along with  [Grunt](http://gruntjs.com/).
To add install it :

```shell
npm install @oat-sa/grunt-tao-bundle --save-dev
```

## The "tao-bundle" task

### Overview
In your project's Gruntfile, add a section named `bundle` to the data object passed into `grunt.initConfig()` or `grunt.config.merge()`.

```js
grunt.initConfig({
  bundle: {
    options: {
        amd : require('config/amd.json')
    },
    taoce : {
        options : {
            extension : 'taoCe',
            extensionPath : root + '/taoCe/views/js',
            outputDir : 'loader',
            bundles : [{
                name : 'taoCe',
                default : true,
                babel: true
            }]
        }
    }
  },
})
```

## Options

| Option | Type | Description | Scope | Example value |
|--------|------|-------------|-------|---------------|
| `amd`  |`Object` | The AMD/requirejs configuration |  All extensions, all bundles | |
| `amd.baseUrl` | `String` | Relative path to resolve the AMD modules | All extensions, all bundles | `../js` |
| `amd.paths` | `Object` | The list of AMD paths/alias | All extensions, all bundles | |
| `amd.shim` | `Object` |  the AMD shim configuration | All extensions, all bundle | |
| `amd.vendor` | `String[]` | A list of vendor modules | All extensions, all bundle | `['lodash', 'core/**/*']` |
| `amd.exclude` | `String[]` | A list of modules to always exclude | All extensions, all bundle | `['mathJax', 'ckeditor']` |
| `amd.bootstrap` | `String[]` | A list of module to include to bootstrap a bundle | All extensions, all bundle | `['loader/bootrstrap']` |
| `amd.default` | `String[]` | A list of modules to include for _default_ bundles. It's the default pattern for TAO extension source code. | All extensions, all bundle | `['controller/**/*', 'component/**/*', 'provider/**/*']` |
| `paths` | `Object` | Additional list of paths/alias | The current extension  | |
| `workDir` | `String` | The temporary working directory to copy the sources and generates the bundles | The current extension | `output` |
| `outputDir` | `String` | The directory (inside the workDir) where the bundles will be generated | The current extension | `loader` |
| `extension` | `String` | The name of the current extension | The current extension | `taoQtiTest` |
| `rootExtension` | `String` | The name of the root extension (the one with no prefix in AMD and that contains the libs and SDK) | All extensions | `tao` |
| `dependencies` | `String[]` | The list of **extension** dependencies, the code from a dependency is excluded from the bundle. | The current extensions | `['taoItems', 'taoTests', 'taoQtiItem']` |
| `allowExternal` | `String[]` | Allow external dependency into the bundle. It's not a good practice, but this can be used for aliases. Allow them to be included without the bundler to warn you about forbidden dependency. | The current extensions | `['qtiInfoControlContext']` |
| `getExtensionPath` | `Function` | A function that resolves the path to the JS files from an extension | All extensions | `extension => root + '/' + extension + '/views/js' ` |
| `getExtensionCssPath` | `Function` | A function that resolves the path to the CSS files from an extension | All extensions | `extension => root + '/' + extension + '/views/css' ` |
| `bundles` | `Object[]` | The bundles configuration | The current extensions |  |
| `bundle.name` | `String` | The bundle name without the file extension | The current bundle | `vendor` or `taoQtiTest`  |
| `bundle.vendor` | `Boolean` | When `true`, the bundle will include *ONLY* the libraries from `amd.vendor` (Default : `false`) | The current bundle |  |
| `bundle.bootstrap` | `Boolean` | When `true`, the bundle will include the modules from `amd.bootstrap` (Default : `false`) | The current bundle |  |
| `bundle.entryPoint` | `String` | Define an entryPoint for the bundle. Useful to create a separate bundle for a given entryPoint| The current bundle | `'controller/login'`  |
| `bundle.default` | `Boolean` | When `true`, the bundle will include the modules from `amd.default` (Default : `false`) | The current bundle |  |
| `bundle.include` | `String[]` | A list of additional module to add to the bundle, especially when modules are not in the correct folder. | The current bundle | `['taoQtiItem/qtiCommonRenderer/**/*']`  |
| `bundle.exclude` | `String[]` | A list of additional module to exclude from the bundle, but if module has nested dependencies that are part of the built file | The current bundle | `['taoQtiItem/qtiItem/test/**/*']`  |
| `bundle.excludeNested` | `String[]` | A list of module to exclude from the bundle | The current bundle | `['taoQtiItem/qtiItem/test/**/*']`  |
| `bundle.dependencies` | `String[]` | Override the extension dependency loading : if set, loads the exact list of module| The current bundle | `['taoQtiItem/loader/taoQtiItemRunner.min']`  |
| `bundle.babel` | `Boolean` | *Experimental* When `true`, the bundle will use Babel to transpile the code (Default : `false`) | The current bundle |  |
| `bundle.uglify` | `Boolean` | When `true`, the bundle will be minimified (Default : `true`) | The current bundle |  |
| `bundle.package` | `Object[]` | Extends [packages](https://requirejs.org/docs/api.html#packages) to the bundle (Default : `[]`) | The current bundle | `[{ name: 'codemirror', location: '../../../tao/views/node_modules/codemirror', main: 'lib/codemirror'}]`

### Examples

The configuration from the `tao` extension :
```
grunt.config.merge({
    bundle : {
        //define the global options for all extensions' tasks
        options: {
            rootExtension        : 'tao',
            getExtensionPath     : extension => `${root}/${extension}/views/js`,
            getExtensionCssPath  : extension => `${root}/${extension}/views/css`,
            amd                  : require('../config/requirejs.build.json'),
            workDir              : 'output',
            outputDir            : 'loader'
        },

        tao : {
            options : {
                extension : 'tao',
                bundles : [{
                    //bundles sources from amd.vendor
                    name   : 'vendor',
                    vendor : true
                }, {
                    //bundles sources from controller/login with amd.bootstrap
                    name      : 'login',
                    bootstrap : true,
                    default   : false,
                    entryPoint: 'controller/login'
                }, {
                    //bundles sources from amd/default, amd.boostrap and the includes
                    name      : 'tao',
                    bootstrap : true,
                    default   : true,
                    include   : ['layout/**/*', 'form/**/*', 'lock', 'report', 'users']
                }]
            }
        }
    }
});
```

The configuration from the `taoQtiItem` extension :
```
grunt.config.merge({
    bundle : {
        taoqtiitem : {
            options : {
                extension : 'taoQtiItem',
                dependencies : ['taoItems']

                //the source code of this extension relies on custom alias, so we can add them
                paths : {
                    'qtiCustomInteractionContext' : `${root}/taoQtiItem/views/js/runtime/qtiCustomInteractionContext`,
                    'qtiInfoControlContext' : `${root}taoQtiItem/views/js/runtime/qtiInfoControlContext`
                },

                bundles : [{
                    name : 'taoQtiItem',
                    default : true,

                    //we need to list the dependencies manually, since the
                    //sources contains tests in subfoldesr
                    include : [
                        'taoQtiItem/mathRenderer/mathRenderer',
                        'taoQtiItem/portableElementRegistry/**/*',
                        'taoQtiItem/qtiCommonRenderer/helpers/**/*',
                        'taoQtiItem/qtiCommonRenderer/renderers/**/*',
                        'taoQtiItem/qtiCreator/**/*',
                        'taoQtiItem/qtiItem/**/*',
                        'taoQtiItem/qtiRunner/**/*',
                        'taoQtiItem/qtiXmlRenderer/**/*',
                        'qtiCustomInteractionContext',
                        'qtiInfoControlContext'
                    ]
                }]
            }
        }
    }
});
```
## Test

```sh
npm test
```

## Release History
 * _0.5.0_ Extend optimizer with packages option
 * _0.4.1_ Fix paths for the embedded source-maps
 * _0.4.0_ Add Jenkins file
 * _0.2.0_ Babel implementation
 * _0.1.0_ Initial release

## License

See [GPL-2.0](https://spdx.org/licenses/GPL-2.0)
