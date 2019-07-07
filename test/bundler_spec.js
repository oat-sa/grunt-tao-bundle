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
 * Copyright (c) 2018 (original work) Open Assessment Technlogies SA
 *
 */
const describe = require('mocha').describe;
const it       = require('mocha').it;
const expect   = require('chai').expect;
const path     = require('path');

/**
 * Test the module lib/bundler
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
describe('bundler', () => {

    const bundler = require('../lib/bundler.js');
    const dataDir  = path.resolve(__dirname, 'data');
    const options = {
        amd : {
            baseUrl: path.join(dataDir, 'extA/views/js'),
            shim: {},
            default : ['controller/**/*'],
            vendor  : ['lib/**/*'],
            bootstrap: ['loader/bootstrap']
        },
        rootExtension: 'extA',
        workdir : path.join(dataDir, 'output'),
        rootPath: dataDir,
        getExtensionPath :    extension => path.join(dataDir, extension, 'views/js'),
        getExtensionCssPath : extension => path.join(dataDir, extension, 'views/css')
    };

    it('should return a promise', () => {
        expect(bundler()).to.be.an.instanceof(Promise);
    });

    it('should create a default bundle', async () => {

        const results = await bundler( {
            ...options,
            extension : 'extA',
            bundles : [{
                name : 'extA',
                default: true
            }]
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

        const results = await bundler({
            ...options,
            extension : 'extA',
            bundles : [{
                name : 'vendor',
                vendor : true
            }, {
                name : 'extA',
                default : true
            }]
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

        const results = await bundler({
            ...options,
            extension : 'extB',
            bundles : [{
                name : 'extB',
                default: true
            }]
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
            ...options,
            extension : 'extB',
            bundles : [{
                name : 'extB',
                default: true,
                exclude: ['extB/component/compa']
            }]
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
            ...options,
            extension : 'extC',
            dependencies: ['extB'],
            bundles : [{
                name : 'extC',
                default: true
            }]
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

        const results = await bundler({
            ...options,
            extension : 'extA',
            bundles : [{
                name : 'login',
                bootstrap : true,
                entryPoint: 'controller/controllerb'
            }]
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

    it('should create a bundle with vendorised paths', async () => {

        const results = await bundler({
            ...options,
            extension : 'extB',
            paths: require(path.join(dataDir, 'extB/views/build/grunt/paths.json')),
            bundles : [{
                name : 'extB',
                entryPoint: 'extB/some-fake-lib/some-fake-file'
            }]
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].title).to.be.equal('extB/loader/extB.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'extB/some-fake-lib/some-fake-file.js'
        ]);
    });

    it('should create a bundle and automatically exclude vendorised dependencies', async () => {

        const results = await bundler({
            ...options,
            extension : 'extD',
            dependencies: ['extB'],
            bundles : [{
                name : 'extD',
                include: [
                    'extD/compb'
                ]
            }]
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].title).to.be.equal('extD/loader/extD.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'extD/compb.js'
        ]);
    });

    it('should throw when forbidden libraries are included in bundle', async () => {
        try {
            const results = await bundler({
                ...options,
                extension : 'extD',
                allowExternal: [],
                bundles : [{
                    name : 'extD',
                    include: [
                        'extA/lib/libc'
                    ]
                }]
            });
            expect(false, 'Bundler should have thrown already!').to.be.true;
        }
        catch (e) {
            expect(e).to.be.an.instanceof(Error);
            expect(e.message).to.be.equal('The bundle extD/loader/extD.bundle.js contains a forbidden dependency "extA/lib/libc". Check your configuration!');
        }
    });

    it('should not throw when allowed libraries are included in bundle', async () => {
        const results = await bundler({
            ...options,
            extension : 'extD',
            allowExternal: ['extA/lib/libc'],
            bundles : [{
                name : 'extD',
                include: [
                    'extA/lib/libc'
                ]
            }]
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].title).to.be.equal('extD/loader/extD.bundle.js');
        expect(results[0].content).to.be.deep.equal([
            'extA/lib/libc.js'
        ]);
    });

});
