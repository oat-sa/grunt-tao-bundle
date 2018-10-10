const describe = require('mocha').describe;
const it       = require('mocha').it;
const expect   = require('chai').expect;

const path     = require('path');
const dataDir  = path.resolve(__dirname, 'data');

describe('bundler', () => {

    const bundler = require('../lib/bundler.js');

    //it('should expose a function', () => expect(bundler).to.be.a('function'));

    it('should return a promise', () => {
        expect(bundler()).to.be.an.instanceof(Promise);
    });

    it('should create a default bundle', async () => {

        const results = await bundler( {
            amd : {
                baseUrl: path.join(dataDir, 'extA/views/js'),
                shim: {},
                default : ['controller/**/*']
            },
            rootExtension: 'extA',
            extension : 'extA',
            bundles : [{
                name : 'extA',
                default: true
            }],
            getExtensionPath :    extension => path.join(dataDir, extension, 'views/js'),
            getExtensionCssPath : extension => path.join(dataDir, extension, 'views/css')
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].title).to.be.equal('loader/extA.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'controller/controllera.js',
            'core/util/util.js',
            'controller/controllerb.js'
        ]);
    });

    it('should create a multiple bundles', async () => {

        const results = await bundler( {
            amd : {
                baseUrl: path.join(dataDir, 'extA/views/js'),
                shim: {},
                default : ['controller/**/*'],
                vendor  : ['lib/**/*']
            },
            extension : 'extA',
            rootExtension: 'extA',
            bundles : [{
                name : 'vendor',
                vendor : true
            }, {
                name : 'extA',
                default : true
            }],
            getExtensionPath :    extension => path.join(dataDir, extension, 'views/js'),
            getExtensionCssPath : extension => path.join(dataDir, extension, 'views/css')
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(2);
        expect(results[0].title).to.be.equal('loader/vendor.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'lib/liba.js',
            'lib/libb.js',
            'lib/libc.js'
        ]);
        expect(results[1].title).to.be.equal('loader/extA.bundle.js');
        expect(results[1].content).to.be.deep.equal([
            'controller/controllera.js',
            'core/util/util.js',
            'controller/controllerb.js'
        ]);
    });

    it('should create a bundle without the dependencies', async () => {

        const results = await bundler( {
            amd : {
                baseUrl: path.join(dataDir, 'extA/views/js'),
                shim: {},
                default : ['controller/**/*']
            },
            extension : 'extB',
            rootExtension : 'extA',
            bundles : [{
                name : 'extB',
                default: true
            }],
            getExtensionPath :    extension => path.join(dataDir, extension, 'views/js'),
            getExtensionCssPath : extension => path.join(dataDir, extension, 'views/css')
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].title).to.be.equal('extB/loader/extB.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'extB/component/compa.js',
            'extB/controller/controllera.js'
        ]);
    });

    it('should create a bundle and exlcude some dependencies', async () => {

        const results = await bundler( {
            amd : {
                baseUrl: path.join(dataDir, 'extA/views/js'),
                shim: {},
                default : ['controller/**/*', 'component/**/*']
            },
            extension : 'extB',
            rootExtension : 'extA',
            bundles : [{
                name : 'extB',
                default: true,
                exclude: ['extB/component/compa']
            }],
            getExtensionPath :    extension => path.join(dataDir, extension, 'views/js'),
            getExtensionCssPath : extension => path.join(dataDir, extension, 'views/css')
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].title).to.be.equal('extB/loader/extB.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'extB/controller/controllera.js'
        ]);
    });

    it('should create a bundle and exlcude extension dependencies', async () => {

        const results = await bundler( {
            amd : {
                baseUrl: path.join(dataDir, 'extA/views/js'),
                shim: {},
                default : ['controller/**/*']
            },
            extension : 'extC',
            rootExtension : 'extA',
            dependencies: ['extB'],
            bundles : [{
                name : 'extC',
                default: true
            }],
            getExtensionPath :    extension => path.join(dataDir, extension, 'views/js'),
            getExtensionCssPath : extension => path.join(dataDir, extension, 'views/css')
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].title).to.be.equal('extC/loader/extC.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'extC/component/compa.js',
            'extC/controller/controllera.js'
        ]);
    });

    it('should create a bootstrap bundle from an entrypoint', async () => {

        const results = await bundler( {
            amd : {
                baseUrl: path.join(dataDir, 'extA/views/js'),
                shim: {},
                bootstrap: ['loader/bootstrap']
            },
            extension : 'extA',
            rootExtension : 'extA',
            bundles : [{
                name : 'login',
                bootstrap : true,
                entryPoint: 'controller/controllerb'
            }],
            getExtensionPath :    extension => path.join(dataDir, extension, 'views/js'),
            getExtensionCssPath : extension => path.join(dataDir, extension, 'views/css')
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].title).to.be.equal('loader/login.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'loader/bootstrap.js',
            'core/util/util.js',
            'controller/controllerb.js'
        ]);
    });
});
