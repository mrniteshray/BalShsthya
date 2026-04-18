// Self-contained shims for Vite environment
// No imports from node_modules to avoid CJS/ESM conflicts in the browser

// inherits shim
function inherits(ctor, superCtor) {
    if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    }
}

// Minimal EventEmitter shim
function EventEmitter() {
    this._events = {};
}
EventEmitter.prototype.on = function (name, fn) {
    (this._events[name] = this._events[name] || []).push(fn);
    return this;
};
EventEmitter.prototype.emit = function (name, ...args) {
    (this._events[name] || []).forEach(fn => {
        try {
            fn.apply(this, args);
        } catch (e) {
            console.error('[POLYFILL] EventEmitter error:', e);
        }
    });
    return this;
};
EventEmitter.prototype.removeListener = function (name, fn) {
    if (!this._events[name]) return this;
    this._events[name] = this._events[name].filter(f => f !== fn);
    return this;
};
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.once = function (name, fn) {
    const self = this;
    function onceFn(...args) {
        self.removeListener(name, onceFn);
        fn.apply(self, args);
    }
    this.on(name, onceFn);
    return this;
};
EventEmitter.prototype.removeAllListeners = function (name) {
    if (name) {
        delete this._events[name];
    } else {
        this._events = {};
    }
    return this;
};
EventEmitter.EventEmitter = EventEmitter;

// util shim
const util = {
    inherits: inherits,
    debuglog: () => () => { },
    inspect: (obj) => {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        try { return JSON.stringify(obj); } catch (e) { return '[Object]'; }
    },
    format: (f, ...args) => {
        if (typeof f !== 'string') return String(f);
        return f.replace(/%s/g, () => args.shift());
    }
};

const process = window.process || {
    env: { NODE_ENV: 'development' },
    nextTick: (fn) => setTimeout(fn, 0),
    browser: true
};

// Global assignments
window.process = process;
if (!window.global) window.global = window;

export { inherits, EventEmitter, util, process };
export default { inherits, EventEmitter, util, process };
