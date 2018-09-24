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
In your project's Gruntfile, add a section named `tao-bundle` to the data object passed into `grunt.initConfig()`.

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



## Test

```sh
npm test
```

## Release History

 * _0.1.0_ initial release

## License

See [GPL-2.0](https://spdx.org/licenses/GPL-2.0)
