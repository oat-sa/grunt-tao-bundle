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


/**
 * Test the module lib/soureMapHelper
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
describe('sourceMapHelper fixModuleCreate', () => {

    const fixModuleCreate = require('../lib/sourceMapHelper.js').fixModuleCreate;

    it('should return the same string without the pattern', () => {
        expect(fixModuleCreate('{"foo":true}')).to.equal('{"foo":true}');
        expect(fixModuleCreate('null')).to.equal('null');
        expect(fixModuleCreate('')).to.equal('');
        expect(fixModuleCreate('{"version":3,"sources":[]}')).to.equal('{"version":3,"sources":[]}');
    });

    it('should fix the module-create path', async () => {

        const input = '{"version":3,"sources":["../controller/routes.js","../../../../../../../module-create.js"],"names":["define"],"mappings":"AAqBAA,OAAA,iCAAA,GAAA,WACA,aAEA,MAAA,KCvBAA,OAAA,0CAAA","file":"taoTestTaker.min.js","sourceRoot":"/"}';
        const output = '{"version":3,"sources":["../controller/routes.js","module-create.js"],"names":["define"],"mappings":"AAqBAA,OAAA,iCAAA,GAAA,WACA,aAEA,MAAA,KCvBAA,OAAA,0CAAA","file":"taoTestTaker.min.js","sourceRoot":"/"}';

        expect(fixModuleCreate(input)).to.equal(output);
    });

});
