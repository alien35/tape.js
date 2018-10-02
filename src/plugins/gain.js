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

    var GainUtil = function(o) {
        this.init(o);
    };

    GainUtil.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Gain';
            self.id = 'gain-' + id ++;
            self.type = 'gain';
            self.input = o.ctx.createGain();
            if (o.gain === undefined) {
                self.gain = 0.5;
            } else {
                self.gain = o.gain;
            }
            self.input.gain.value = self.gain;
            self.output = o.ctx.createGain();
            self.input.connect(self.output);
        },
        update: function(o) {
            var self = this;
            self.gain = o.gain;
            self.input.gain.value = o.gain;
            return self;
        }
    };


    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                Gain: Gain
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.GainUtil = GainUtil;
    }

    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.GainUtil = GainUtil;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.GainUtil = GainUtil;
    }

})();

