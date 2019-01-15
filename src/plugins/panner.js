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

    var Panner = function(o) {
        this.init(o);
    };

    Panner.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Panner';
            self.id = 'panner-' + id ++;
            self.type = 'panner';
            self.input = o.ctx.createGain();
            if (o.gain === undefined) {
                self.gain = 0.5;
            } else {
                self.gain = o.gain;
            }
            self.input.gain.value = self.gain;
            self.output = o.ctx.createGain();
            self.pannerNode = o.ctx.createPanner();
            if (o.position !== undefined) {
                self.position = o.position;
            } else {
                self.position = 0;
            }
            self.pannerNode.setPosition(self.position, 0, 1 - Math.abs(self.position));
            self.input.connect(self.pannerNode);
            self.pannerNode.connect(self.output);
        },
        update: function(o) {
            var self = this;
            self.position = o.position;
            self.pannerNode.setPosition(self.position, 0, 1 - Math.abs(self.position));
            return self;
        }
    };


    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                Panner: Panner
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.Panner = Panner;
    }

    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.Panner = Panner;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.Panner = Panner;
    }

})();

