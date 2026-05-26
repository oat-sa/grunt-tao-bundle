/* eslint-disable */
define([], function () {
    'use strict';

    // ES2015
    // Arrow functions
    const add = (a, b) => a + b;

    // Class
    class CustomDOMElement extends HTMLElement {}

    // Template literals
    const greeting = `Hello, ${name}!`;

    // Destructuring
    const [first, second] = [1, 2];

    // ES2016
    // Exponentiation operator
    let x = 10 ** 2;
    x **= 3;

    // esprima 4 parsing support ends around here

    // ES2018
    // Object rest/spread
    const obj1 = { a: 1, b: 2, c: 3 };
    const { a, ...rest } = obj1;

    // Named capture groups in regex
    let regex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
    let match = regex.exec('2024-06-01');

    // ES2019
    // Optional catch binding
    try {
        throw new Error('Test');
    } catch {
        doSomething();
    }

    // ES2020
    // Dynamic import - not strictly compatible with AMD modules anyway?
    import('./dynamicModule.js').then(module => {
        console.log('Dynamic module loaded:', module);
    }).catch(err => {
        console.error('Failed to load dynamic module:', err);
    });

    // Optional chaining
    const obj = { a: { b: { c: 42 } } };
    const obj_c = obj?.a?.b?.c;

    // Nullish coalescing
    const value = obj.a.b.c ?? 'Default value';

    // ES2021
    // Logical assignment operators
    let d, e;
    d ||= e;
    obj.a.b ||= d;

    d &&= e;
    obj.a.b &&= d;

    // Numeric separators
    let budget = 1_000_000_000_000;

    // ES2025 - not yet supported
    // Regexp modifiers
    // regex = /(?i:a)a/;

    // ES2026 - not yet supported
    // Explicit resource management (hypothetical)
    // using handlerSync = openSync();

    return {};
});
