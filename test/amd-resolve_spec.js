const describe = require('mocha').describe;
const it       = require('mocha').it;
const expect   = require('chai').expect;

const path     = require('path');
const dataDir  = path.resolve(__dirname, 'data');
const extensionAPath = path.join(dataDir, 'extA/views/js');
const extensionBPath = path.join(dataDir, 'extB/views/js');
const extensionCPath = path.join(dataDir, 'extC/views/js');

describe('amd-resolve', () => {

    const amdResolve = require('../lib/amdResolve.js');

    it('should expose a function', () => expect(amdResolve).to.be.a('function'));

    it('should return a promise', () => {
        expect(amdResolve()).to.be.an.instanceof(Promise);
    });

    it('should resolve modules through a simple pattern', async () => {

        const results = await amdResolve( 'controller/**/*', {
            targetExtension : 'extA',
            cwd : extensionAPath
        });

        expect(results).to.deep.equal([
            'extA/controller/controllera',
            'extA/controller/controllerb'
        ]);
    });

    it('should resolve modules through a complex pattern without prefix', async () => {

        const results = await amdResolve( '{core,lib}/**/*', {
            targetExtension : 'extA',
            cwd : extensionAPath,
            extensionPrefix : false
        });

        expect(results).to.deep.equal([
            'core/corea',
            'core/coreb',
            'core/corec',
            'core/util/util',
            'lib/liba',
            'lib/libb',
            'lib/libc'
        ]);
    });

    it('should not include excluded modules', async () => {

        const results = await amdResolve( '**/*', {
            targetExtension : 'extB',
            cwd : extensionBPath,
            excludeDirs : ['test']
        });

        expect(results).to.deep.equal([
            'extB/component/compa',
            'extB/controller/controllera'
        ]);
    });

    it('should resolve css modules', async () => {

        const results = await amdResolve( '**/*', {
            targetExtension : 'extC',
            cwd : extensionCPath,
            type : 'css'
        });

        expect(results).to.deep.equal([
            'css!extC/component/compa'
        ]);
    });

    it('should resolve tpl modules', async () => {

        const results = await amdResolve( '**/*', {
            targetExtension : 'extC',
            cwd : extensionCPath,
            type : 'tpl'
        });

        expect(results).to.deep.equal([
            'tpl!extC/component/compa'
        ]);
    });

    it('should throw with a wrong file type ', () => {
        expect( () => amdResolve('**/*', { type : 'php'} )).to.throw(TypeError, /^Unsupported module type 'php'/);
    });
});
