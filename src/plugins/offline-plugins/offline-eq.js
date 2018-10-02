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

    var OfflineEq = function(o) {
        this.init(o);
    };

    OfflineEq.prototype = {
        init: function(o) {
            var self = this;
            var gainDb = -40.0;
            var bandSplit = [360, 3600];

            self.type = 'eq';
            self.machine = o.machine;

            self.input = self.machine.ctx.createGain();
            self.lBand = self.machine.ctx.createBiquadFilter();
            self.lInvert = self.machine.ctx.createGain();
            self.mBand = self.machine.ctx.createGain();
            self.hBand = self.machine.ctx.createBiquadFilter();
            self.hInvert = self.machine.ctx.createGain();
            self.lGain = self.machine.ctx.createGain();
            self.mGain = self.machine.ctx.createGain();
            self.hGain = self.machine.ctx.createGain();
            self.output = self.machine.ctx.createGain();

            self.lBand.type = 'highshelf';
            self.lBand.frequency.value = bandSplit[1];
            self.lBand.gain.value = gainDb;
            self.lInvert.gain.value = -1;
            self.hBand.type = 'lowshelf';
            self.hBand.frequency.value = bandSplit[0];
            self.hBand.gain.value = gainDb;
            self.hInvert.gain.value = -1.0;

            self.lGain.gain.value = o.lo;
            self.mGain.gain.value = o.mid;
            self.hGain.gain.value = o.hi;

            self.input.connect(self.lBand);
            self.input.connect(self.mBand);
            self.input.connect(self.hBand);
            self.hBand.connect(self.hInvert);
            self.lBand.connect(self.lInvert);
            self.hInvert.connect(self.mBand);
            self.lInvert.connect(self.mBand);
            self.lBand.connect(self.lGain);
            self.mBand.connect(self.mGain);
            self.hBand.connect(self.hGain);
            self.lGain.connect(self.output);
            self.mGain.connect(self.output);
            self.hGain.connect(self.output);

            return self;
        }
    };

    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                OfflineEq: OfflineEq
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.OfflineEq = OfflineEq;
    }


    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.OfflineEq = OfflineEq;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.OfflineEq = OfflineEq;
    }
})();

