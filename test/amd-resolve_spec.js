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

const dataDir  = path.resolve(__dirname, 'data');
const extensionAPath = path.join(dataDir, 'extA/views/js');
const extensionBPath = path.join(dataDir, 'extB/views/js');
const extensionCPath = path.join(dataDir, 'extC/views/js');

/**
 * Test the module lib/amdResolve
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
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

    it('should resolve a pattern with an alias', async () => {

        const results = await amdResolve( 'alias/**/*', {
            targetExtension : 'extA',
            cwd : extensionAPath,
            extensionPrefix : false,
            aliases : {
                foo : 'bar',
                alias : 'core'
            }
        });

        expect(results).to.deep.equal([
            'alias/corea',
            'alias/coreb',
            'alias/corec',
            'alias/util/util'
        ]);
    });

    it('should resolve a pattern with an complex aliases', async () => {

        const results = await amdResolve( 'foo/alias/**/*', {
            targetExtension : 'extA',
            cwd : extensionAPath,
            extensionPrefix : false,
            aliases : {
                'foo/alias' : 'core',
                ootch : 'lib'
            }
        });

        expect(results).to.deep.equal([
            'foo/alias/corea',
            'foo/alias/coreb',
            'foo/alias/corec',
            'foo/alias/util/util'
        ]);
    });

    it('should resolve a pattern with an complex aliases', async () => {

        const results = await amdResolve( 'foo/aliasButton/**/*', {
            targetExtension : 'extA',
            cwd : extensionAPath,
            extensionPrefix : false,
            aliases : {
                'foo/alias' : 'lib',
                'foo/aliasButton' : 'core'
            }
        });

        expect(results).to.deep.equal([
            'foo/aliasButton/corea',
            'foo/aliasButton/coreb',
            'foo/aliasButton/corec',
            'foo/aliasButton/util/util'
        ]);
    });

    it('should resolve a pattern with an aliases that resolve elsewhere', async () => {

        const results = await amdResolve( 'core/**/*', {
            targetExtension : 'extA',
            cwd : extensionAPath,
            extensionPrefix : false,
            aliases : {
                'core' : '../../../extC/views/js',
            }
        });

        expect(results).to.deep.equal([
            'core/component/compa',
            'core/controller/controllera'
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
