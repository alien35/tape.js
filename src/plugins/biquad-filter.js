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
  var TpBiquadFilterNode = function(o) {
    this.init(o);
  };

  TpBiquadFilterNode.prototype = {
    init: function(o) {
      var self = this;
      self.node = o.ctx.createBiquadFilter();
      self.name = 'EQ';
      self.node.frequency.value = o.frequency || 0;
      self.node.detune.value = o.detune || 0;
      self.node.Q.value = o.q || 0;
      self.node.gain.value = o.gain || 1;
      self.node.type = o.type || 'allpass';
      self.input = o.ctx.createGain();
      self.output = o.ctx.createGain();
      self.type = 'eq';
    }
  };

  var PeakingFilter = function(o) {
    this.init(o);
  };

  PeakingFilter.prototype = {
    init: function (o) {
        var self = this;
        self.input = o.ctx.createGain();
        self.filterNode = o.ctx.createBiquadFilter();
        self.name = 'Peaking Filter';
        self.filterNode.frequency.value = o.frequency || 500;
        self.filterNode.Q.value = o.q || 5;
        self.filterNode.gain.value = o.gain || 5;
        self.filterNode.type = 'peaking';
        self.output = o.ctx.createGain();
        self.input.connect(self.filterNode);
        self.filterNode.connect(self.output);
        self.type = 'eq';
    }
  };

  var EqThree = function(o) {
      this.init(o);
  };

  EqThree.prototype = {
      init: function (o) {
          var self = this;
          var gainDb = -40.0;
          var bandSplit = [360, 3600];

          self.type = 'eq';

          self.ctx = o.ctx;

          self.input = self.ctx.createGain();
          self.lBand = self.ctx.createBiquadFilter();
          self.lInvert = self.ctx.createGain();
          self.mBand = self.ctx.createGain();
          self.hBand = self.ctx.createBiquadFilter();
          self.hInvert = self.ctx.createGain();
          self.lGain = self.ctx.createGain();
          self.mGain = self.ctx.createGain();
          self.hGain = self.ctx.createGain();
          self.output = self.ctx.createGain();

          self.lBand.type = 'highshelf';
          self.lBand.frequency.value = bandSplit[1];
          self.lBand.gain.value = gainDb;
          self.lInvert.gain.value = -1;
          self.hBand.type = 'lowshelf';
          self.hBand.frequency.value = bandSplit[0];
          self.hBand.gain.value = gainDb;
          self.hInvert.gain.value = -1.0;

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

          self.name = 'EQ Three';
          if (o.lo) {
              self.lo = o.lo;
              self.lGain.gain.value = o.lo;
          } else {
              self.lo = 0;
              self.lGain.gain.value = 0;
          }
          if (o.mid) {
              self.mid = o.mid;
              self.mGain.gain.value = o.mid;
          } else {
              self.mid = 0;
              self.mGain.gain.value = 0;
          }
          if (o.hi) {
              self.hi = o.hi;
              self.hGain.gain.value = o.hi;
          } else {
              self.hi = 0;
              self.hGain.gain.value = 0;
          }
      },

      update: function(o) {
          var self = this;
          if (o.lo) {
              var lo = o.lo;
              self.lo = lo;
              self.lGain.gain.value = lo;
          }
          if (o.mid) {
              var mid = o.mid;
              self.mid = mid;
              self.mGain.gain.value = mid;
          }
          if (o.hi) {
              var hi = o.hi;
              self.hi = hi;
              self.hGain.gain.value = hi;
          }
          if (o.bypass !== undefined) {
              self.bypass = o.bypass;
          }
          return self;
      }

  };



  var Detuner = function(o) {
      this.init(o);
  };

  Detuner.prototype = {
      init: function (o) {
          var self = this;
          self.input = o.ctx.createGain();
          self.output = o.ctx.createBiquadFilter();
          self.output.type = 'lowpass';
          self.output.detune.value = 4;
          self.input.connect(self.output);
      },

      update: function(o) {
            var self = this;

      }

    };

  // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return {
        Detuner: Detuner,
        TpBiquadFilterNode: TpBiquadFilterNode,
        PeakingFilter: PeakingFilter,
        EqThree: EqThree
      };
    });
  }

  // Add support for CommonJS libraries such as browserify.
  if (typeof exports !== 'undefined') {
    exports.TpBiquadFilterNode = TpBiquadFilterNode;
    exports.PeakingFilter = PeakingFilter;
    exports.EqThree = EqThree;
    exports.Detuner = Detuner;
  }


  // Define globally in case AMD is not available or unused.
  if (typeof window !== 'undefined') {
    window.TpBiquadFilterNode = TpBiquadFilterNode;
    window.PeakingFilter = PeakingFilter;
    window.EqThree = EqThree;
    window.Detuner = Detuner;
  } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
    global.TpBiquadFilterNode = TpBiquadFilterNode;
    global.PeakingFilter = PeakingFilter;
    global.EqThree = EqThree;
    global.Detuner = Detuner;
  }
})();
