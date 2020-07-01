(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined'
        ? (module.exports = factory())
        : typeof define === 'function' && define.amd
        ? define(factory)
        : ((global = global || self), (global.TAO = factory()));
})(this, function () {
    'use strict';
    const TAO = {};
    TAO.version = '1.0.0';
    return TAO;
});
