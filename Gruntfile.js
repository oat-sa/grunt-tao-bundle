module.exports = function (grunt) {
    grunt.initConfig({
        eslint: {
            all: ['Gruntfile.js', 'tasks/*.js']
        },

        clean: {
            options: {
                force: true
            },
            test: ['output/*']
        },

        mochaTest: {
            options: {
                reporter: 'spec'
            },
            test: {
                src: ['test/*_spec.js']
            }
        },

        watch: {
            test: {
                files: ['tasks/*.js', 'lib/*.js', 'test/*_spec.js'],
                tasks: ['test'],
                options: {
                    debounceDelay: 2000
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('test', 'Run tests', ['mochaTest:test', 'clean:test']);
    grunt.registerTask('devtest', ['watch:test']);
};
