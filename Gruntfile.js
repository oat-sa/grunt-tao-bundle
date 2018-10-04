module.exports = function(grunt) {

    grunt.initConfig({

        eslint: {
            all: [
                'Gruntfile.js',
                'tasks/*.js'
            ]
        },

        'bundle': {
            test: {
                options: {
                    foo : true
                },
                files: {
                    'test/data/out/dest.json' : ['test/data/*.json']
                }
            }
        },

        clean : {
            options: {
                force : true
            },
            test: ['test/data/out/*']
        },

        mochaTest: {
            options: {
                reporter: 'spec'
            },
            test: {
                src: ['test/amd-resolve_spec.js']
            }
        },

        watch : {
            test: {
                files : ['tasks/*.js', 'lib/*.js', 'test/*_spec.js'],
                tasks:  ['test'],
                options: {
                    debounceDelay: 2000
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.loadTasks('tasks');


    grunt.registerTask('test', 'Run tests', [
        //'clean:test',
        //'bundle:test',
        'mochaTest:test'
    ]);

    grunt.registerTask('devtest', ['watch:test']);
};

