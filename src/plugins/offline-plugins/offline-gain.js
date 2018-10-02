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

  var OfflineGain = function(o) {
    this.init(o);
  };

  OfflineGain.prototype = {
    init: function(o) {
      var self = this;
      self.machine = o.machine;
      self.input = self.machine.ctx.createGain();
      self.input.gain.value = o.gain;
      self.output = self.machine.ctx.createGain();

      self.input.connect(self.output);

      return self;
    }
  };

  // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return {
        OfflineGain: OfflineGain
      };
    });
  }

  // Add support for CommonJS libraries such as browserify.
  if (typeof exports !== 'undefined') {
    exports.OfflineGain = OfflineGain;
  }


  // Define globally in case AMD is not available or unused.
  if (typeof window !== 'undefined') {
    window.OfflineGain = OfflineGain;
  } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
    global.OfflineGain = OfflineGain;
  }
})();

