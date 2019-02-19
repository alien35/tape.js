/*!
 *  tape.js v2.0.9
 *  TapeMachinejs.com
 *  tape.js v2.0.9
 *  (c) 2018, ALexander Leon
 *  alexjleon.com
 *
 *  MIT License
 */

(function() {

    var id = 1000;

    var EffectsChain = function(o) {
        this.init(o);
    };

    EffectsChain.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Effects Chain';
            self.id = 'effects-chain-' + id ++;
            self.type = 'effects chain';
            self.children = o.children || [];
            self.input = o.ctx.createGain();
            self.output = o.ctx.createGain();
            self.input.connect(self.output);
        }
    };

    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                EffectsChain: EffectsChain
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.EffectsChain = EffectsChain;
    }

    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.EffectsChain = EffectsChain;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.EffectsChain = EffectsChain;
    }

})();

