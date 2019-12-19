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
 * Copyright (c) 2019 (original work) Open Assessment Technlogies SA
 *
 */

const describe = require('mocha').describe;
const it       = require('mocha').it;
const path     = require('path');
const { expect, assert } = require('chai');
const fs        = require('fs-extra');

const dataDir  = path.resolve(__dirname, 'data');
const cssSourceMapPath = '../../../my-extension/views/css';
const pathAliases = require(path.join(dataDir, 'extE/views/build/grunt/paths.json'));
const loaderPath = path.join(dataDir, 'extE/views/js/loader');

/**
 * Test the module lib/sourceMapPathResolve
 *
 * @author Ihar Suleimanau <ihar@taotesting.com>
 */
describe('sourceMapPathResolve', () => {

    const sourceMapPathResolve = require('../lib/sourceMapPathResolve.js');

    it('should expose a function', () => assert.typeOf(sourceMapPathResolve, 'function'));

    it('should return a "null" result if resolved nothing for an empty cssSourceMapPath', () => {
        const result = sourceMapPathResolve({
            mapBody: 'some map file body',
            codeBody: 'some bunble file body',
            paths: pathAliases,
            cssSourceMapPath: ''
        });
        assert.typeOf(result, 'null');
    });

    it('should return an Object(map, code) for non-empty cssSourceMapPath', () => {
        const result = sourceMapPathResolve({
            mapBody: 'some map file body',
            codeBody: 'some bunble file body',
            paths: pathAliases,
            cssSourceMapPath
        });
        assert.typeOf(result, 'object');
    });

    it('should return transformed "sourceMappingURL" values for "css!" imports without ".css" extensions',
        async () => {
        const bundleA      = await fs.readFile(path.join(loaderPath, 'bundleA.js'), 'utf-8');
        const bundleAMap = await fs.readFile(path.join(loaderPath, 'bundleA.js.map'), 'utf-8');
        const resolvedBundleA      = await fs.readFile(path.join(loaderPath, 'resolved.bundleA.js'), 'utf-8');
        const resolvedBundleAMap = await fs.readFile(path.join(loaderPath, 'resolved.bundleA.js.map'), 'utf-8');

        const result = sourceMapPathResolve({
            mapBody: bundleAMap,
            codeBody: bundleA,
            paths: pathAliases,
            cssSourceMapPath
        });
        expect(result).to.deep.equal({
            map: resolvedBundleAMap,
            code: resolvedBundleA
        });
    });

    it('should return transformed "sourceMappingURL" values for "css!" imports with ".css" extensions',
        async () => {
        const bundleB      = await fs.readFile(path.join(loaderPath, 'bundleB.js'), 'utf-8');
        const bundleBMap = await fs.readFile(path.join(loaderPath, 'bundleB.js.map'), 'utf-8');
        const resolvedBundleB      = await fs.readFile(path.join(loaderPath, 'resolved.bundleB.js'), 'utf-8');
        const resolvedBundleBMap = await fs.readFile(path.join(loaderPath, 'resolved.bundleB.js.map'), 'utf-8');

        const result = sourceMapPathResolve({
            mapBody: bundleBMap,
            codeBody: bundleB,
            paths: pathAliases,
            cssSourceMapPath
        });
        expect(result).to.deep.equal({
            map: resolvedBundleBMap,
            code: resolvedBundleB
        });
    });

});

