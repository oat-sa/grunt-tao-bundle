define(['packages', 'packages/plugins/hint'], function (lib, pluginHint) {
    'use strict';
    return `${lib.version} ${lib.hint}`;
});
