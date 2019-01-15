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

    var Compressor = function(o) {
        this.init(o);
    };

    Compressor.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Compressor';
            self.id = 'compressor-' + id ++;
            self.type = 'compressor';
            self.input = o.ctx.createGain();
            self.compressorNode = o.ctx.createDynamicsCompressor();

            if (o.threshold === undefined) {
                self.threshold = -50;
            } else {
                self.threshold = o.threshold;
            }
            self.compressorNode.threshold.value = self.threshold;

            if (o.knee === undefined) {
                self.knee = 20;
            } else {
                self.knee = o.knee;
            }
            self.compressorNode.knee.value = self.knee;

            if (o.attack === undefined) {
                self.attack = 0.5
            } else {
                self.attack = o.attack;
            }
            self.compressorNode.attack.value = self.attack;

            if (o.release === undefined) {
                self.release = 0.5;
            } else {
                self.release = o.release;
            }
            self.compressorNode.release.value = self.release;

            if (o.ratio === undefined) {
                self.ratio = 10;
            } else {
                self.ratio = o.ratio;
            }
            self.compressorNode.ratio.value = self.ratio;

            self.output = o.ctx.createGain();
            self.input.connect(self.compressorNode);
            self.compressorNode.connect(self.output);
        },

        update: function(o) {
            var self = this;
            
            if (o.threshold !== undefined) {
                self.threshold = o.threshold;
                self.compressorNode.threshold.value = self.threshold;
            }

            if (o.knee !== undefined) {
                self.knee = o.knee;
                self.compressorNode.knee.value = self.knee;
            }

            if (o.attack !== undefined) {
                self.attack = o.attack;
                self.compressorNode.attack.value = self.attack;
            }

            if (o.release !== undefined) {
                self.release = o.release;
                self.compressorNode.release.value = self.release;
            }

            if (o.ratio !== undefined) {
                self.ratio = o.ratio;
                self.compressorNode.ratio.value = self.ratio;
            }
            
            return self;
        }
    };


    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                Compressor: Compressor
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.Compressor = Compressor;
    }

    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.Compressor = Compressor;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.Compressor = Compressor;
    }

})();

