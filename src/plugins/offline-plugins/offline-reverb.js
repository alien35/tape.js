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

    var OfflineReverb = function(o) {
        this.init(o);
    };

    OfflineReverb.prototype = {
        init: function(o) {
            var self = this;
            self.machine = o.machine;
            self.input = self.machine.ctx.createGain();
            self.gainNode = self.machine.ctx.createGain();
            self.reverbNode = self.machine.ctx.createConvolver();
            self.wetNode = self.machine.ctx.createGain();
            self.dryNode = self.machine.ctx.createGain();

            self.gainNode.gain.value = o.gain;
            self.reverbNode.normalize = true;
            self.reverbNode.buffer = o.reverbNodeBuffer;
            self.output = self.machine.ctx.createGain();

            self.wet = o.wet;
            self._getWetLevel = getWetLevel.bind(self);
            self._getDryLevel = getDryLevel.bind(self);
            self.wetNode.gain.value = self._getWetLevel();
            self.dryNode.gain.value = self._getDryLevel();

            self.input.connect(self.gainNode);
            self.gainNode.connect(self.reverbNode);
            self.reverbNode.connect(self.wetNode);
            self.input.connect(self.dryNode);
            self.wetNode.connect(self.output);
            self.dryNode.connect(self.output);
            return self;
        }
    };

    var getWetLevel = function () {
        var self = this;
        if (self.wet > 1 || self.wet < 0) {
            return 0;
        }
        if (self.wet >= 0.5) {
            return 1;
        }
        return 1 - ((0.5 - self.wet) * 2);
    };

    var getDryLevel = function () {
        var self = this;
        if (self.wet > 1 || self.wet < 0) {
            return 0;
        }
        if (self.wet <= 0.5) {
            return 1;
        }
        return 1 - ((self.wet - 0.5) * 2);
    };

    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                OfflineReverb: OfflineReverb
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.OfflineReverb = OfflineReverb;
    }


    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.OfflineReverb = OfflineReverb;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.OfflineReverb = OfflineReverb;
    }
})();

