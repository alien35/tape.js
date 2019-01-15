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

    var OfflineCompressor = function(o) {
      this.init(o);
    };
  
    OfflineCompressor.prototype = {
      init: function(o) {
        var self = this;
        self.machine = o.machine;
        self.input = self.machine.ctx.createGain();
        self.compressorNode = self.machine.ctx.createDynamicsCompressor();
        self.compressorNode.threshold.value = o.threshold;
        self.compressorNode.knee.value = o.knee;
        self.compressorNode.attack.value = o.attack;
        self.compressorNode.release.value = o.release;
        self.compressorNode.ratio.value = o.ratio;

        self.output = self.machine.ctx.createGain();
  
        self.input.connect(self.compressorNode);
        self.compressorNode.connect(self.output);
  
        return self;
      }
    };
  
    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
      define([], function() {
        return {
            OfflineCompressor: OfflineCompressor
        };
      });
    }
  
    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
      exports.OfflineCompressor = OfflineCompressor;
    }
  
  
    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
      window.OfflineCompressor = OfflineCompressor;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
      global.OfflineCompressor = OfflineCompressor;
    }
  })();
  
  