# grunt-tao-bundle

> Bundle client side code in TAO extensions

## Getting Started
This plugin requires Grunt.

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-tao-bundle --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-tao-bundle');
```

## The "tao-bundle" task

### Overview
In your project's Gruntfile, add a section named `tao-bundle` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  foodfact: {
    options: {
        foo : true
    },
    files: {
        'dest.json' : ['*.json']
    }
  },
})
```

## Test

```sh
npm test
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History

 * _0.1.0_ initial release

## License

See [GPL-2.0](https://spdx.org/licenses/GPL-2.0)
