/*!
 *  tape.js v2.0.9
 *  self.machinejs.com
 *  tape.js v2.0.9
 *  (c) 2018, ALexander Leon
 *  alexjleon.com
 *
 *  MIT License
 */

(function() {

    var OfflinePanner = function(o) {
        this.init(o);
    };

    OfflinePanner.prototype = {
        init: function(o) {
            var self = this;
            self.machine = o.machine;
            self.input = self.machine.ctx.createGain();
            self.panner = self.machine.ctx.createPanner();

            self.panner.setPosition(o.position, 0, 1 - Math.abs(o.position));
            self.output = self.machine.ctx.createGain();
      
            self.input.connect(self.panner);
            self.panner.connect(self.output);
      
            return self;
        }
    };

    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                OfflinePanner: OfflinePanner
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.OfflinePanner = OfflinePanner;
    }


    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.OfflinePanner = OfflinePanner;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.OfflinePanner = OfflinePanner;
    }
})();

