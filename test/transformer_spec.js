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
const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const mock = require('mock-require');

/**
 * Test the module lib/bundler
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
describe('transformer', () => {

    const dataDir     = path.resolve(__dirname, 'data');
    const options = {
        amd : {
            baseUrl: path.join(dataDir, 'extA/views/js'),
            shim: {},
            default : ['controller/**/*'],
            vendor  : ['lib/**/*'],
            bootstrap: ['loader/bootstrap']
        },
        rootExtension: 'extA',
        getExtensionPath :    extension => path.join(dataDir, extension, 'views/js'),
        getExtensionCssPath : extension => path.join(dataDir, extension, 'views/css')
    };

    beforeEach( () => {
        mock('fs-extra', {
            writeFile(){
                return Promise.resolve(true);
            },
            pathExists(){
                return Promise.resolve(true);
            },
            readFile(){
                return Promise.resolve('controller/controllerb');
            }
        });
    });
    afterEach( () => mock.stopAll() );

    it('should return a promise', () => {
        expect(require('../lib/transformer.js')()).to.be.an.instanceof(Promise);
    });

    it('should use uglify by default', async () => {
        mock('uglify-js', {
            minify(code, options){
                expect(code).to.include('controller/controllerb');
                expect(options).to.be.an('object');
                return {
                    code: 'foo',
                    map : 'bar'
                };
            }
        });
        const transformer = mock.reRequire('../lib/transformer.js');
        const results = await transformer ({
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
        expect(results[0].src).to.equal('output/loader/login.bundle.js');
        expect(results[0].dest).to.include('test/data/extA/views/js/loader/login.min.js');
        expect(results[0].sourceMap).to.include('test/data/extA/views/js/loader/login.min.js.map');
        expect(results[0].method).to.equal('uglify');
    });

    it('should wrap errors', async () => {
        mock('uglify-js', {
            minify(){
                return {
                    error: new Error('oops')
                };
            }
        });
        const transformer = mock.reRequire('../lib/transformer.js');
        try {
            await transformer ({
                ...options,
                extension : 'extA',
                bundles : [{
                    name : 'login',
                    bootstrap : true,
                    entryPoint: 'controller/controllerb'
                }]
            });
        } catch(err){
            expect(err).to.be.an('error');
            expect(err.message).to.equal('oops');
        }
    });

    it('should not transform', async () => {
        const transformer = mock.reRequire('../lib/transformer.js');
        const results = await transformer ({
            ...options,
            extension : 'extA',
            bundles : [{
                name : 'login',
                bootstrap : true,
                entryPoint: 'controller/controllerb',
                babel : false,
                uglify: false
            }]
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].src).to.equal('output/loader/login.bundle.js');
        expect(results[0].dest).to.include('test/data/extA/views/js/loader/login.min.js');
        expect(results[0].sourceMap).to.include('test/data/extA/views/js/loader/login.min.js.map');
        expect(results[0].method).to.equal('none');
    });


    it('should use babel', async () => {
        mock('@babel/core', {
            transformAsync(code, options){
                expect(code).to.include('controller/controllerb');
                expect(options).to.be.an('object');
                return Promise.resolve({
                    code: 'foo',
                    map : 'bar'
                });
            }
        });
        const transformer = mock.reRequire('../lib/transformer.js');
        const results = await transformer ({
            ...options,
            extension : 'extA',
            bundles : [{
                name : 'login',
                bootstrap : true,
                entryPoint: 'controller/controllerb',
                babel : true
            }]
        });

        expect(results).to.be.an('array');
        expect(results.length).to.be.equal(1);
        expect(results[0].src).to.equal('output/loader/login.bundle.js');
        expect(results[0].dest).to.include('test/data/extA/views/js/loader/login.min.js');
        expect(results[0].sourceMap).to.include('test/data/extA/views/js/loader/login.min.js.map');
        expect(results[0].method).to.equal('babel');
    });
});
