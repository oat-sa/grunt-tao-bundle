(function (mod) {
    if (typeof exports == 'object' && typeof module == 'object')
        // CommonJS
        mod(require('../main'));
    else if (typeof define == 'function' && define.amd)
        // AMD
        define(['../main'], mod);
    // Plain browser env
    else mod(TAO);
})(function (TAO) {
    'use strict';

    TAO.hint = 'Hello from plugin';
});
