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

  var OfflineDistortion = function(o) {
    this.init(o);
  };

  OfflineDistortion.prototype = {
    init: function(o) {
      var self = this;
      self.machine = o.machine;
      self.input = self.machine.ctx.createGain();
      self.distortionNode = self.machine.ctx.createWaveShaper();
      self.filterNode = self.machine.ctx.createBiquadFilter();
      self.wetNode = self.machine.ctx.createGain();
      self.dryNode = self.machine.ctx.createGain();
      self.output = self.machine.ctx.createGain();

      self.filterNode.frequency.value = o.frequency;
      self.filterNode.Q.value = 5;
      self.filterNode.gain.value = o.filterGain;
      self.filterNode.type = o.filterType;
      self.distortionNode.curve = o.curve;
      self.wet = o.wet;
      self._getWetLevel = getWetLevel.bind(self);
      self._getDryLevel = getDryLevel.bind(self);
      self.input.connect(self.distortionNode);
      self.distortionNode.connect(self.filterNode);
      self.filterNode.connect(self.wetNode);
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
        OfflineDistortion: OfflineDistortion
      };
    });
  }

  // Add support for CommonJS libraries such as browserify.
  if (typeof exports !== 'undefined') {
    exports.OfflineDistortion = OfflineDistortion;
  }


  // Define globally in case AMD is not available or unused.
  if (typeof window !== 'undefined') {
    window.OfflineDistortion = OfflineDistortion;
  } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
    global.OfflineDistortion = OfflineDistortion;
  }
})();

