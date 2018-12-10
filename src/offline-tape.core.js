/*!
 *  tape.js v2.0.9
 *  TapeMachinejs.com
 *
 *  (c) 2018, ALexander Leon
 *  alexjleon.com
 *
 *  MIT License
 */

(function() {

  'use strict';

  /** Global Methods **/
  /***************************************************************************/

  /**
   * Create the global controller. All contained methods and properties apply
   * to all sounds that are currently playing or will be in the future.
   */
  var OfflineTapeMachine = function(o) {
    this.init(o);
  };

  OfflineTapeMachine.prototype = {
    init: function(o) {
      var self = this;
      self.ctx = new OfflineAudioContext(2, o.sampleRate * o.length, o.sampleRate);
      return self;
    },

    render: function(o) {
      var self = this;
      var bufferSources = {};
      self.buses = o.buses;
      self.clips = o.clips;
      self.instruments = o.instruments;
      var nextEffect;
      var buses = {};
      self.buses.forEach(function(bus) {
        buses[bus.id] = {};
        buses[bus.id] = self.ctx.createGain();
        buses[bus.id].gain.value = bus.gain || 1;
        var nodeToConnect = buses[bus.id];
        var nextEffect;

        if (Array.isArray(bus.effects)) {
          for (var i = 0; i < bus.effects.length; i ++) {
            nextEffect = bus.effects[i];
            nodeToConnect.connect(nextEffect.input);
            nodeToConnect = bus.effects[i].output;
          }
        }
        nodeToConnect.connect(self.ctx.destination);
      });

      self.clips.forEach(function(clip) {
        bufferSources[clip.id] = self.ctx.createBufferSource();
        bufferSources[clip.id].buffer = clip.buffer;
        bufferSources[clip.id].startTime = clip.startTime;
        bufferSources[clip.id].offset = clip.offset;
        bufferSources[clip.id].duration = clip.duration;
        bufferSources[clip.id].fadeLeft = clip.fadeLeft;
        bufferSources[clip.id].fadeRight = clip.fadeRight;
        bufferSources[clip.id].clipGain = self.ctx.createGain();
        bufferSources[clip.id].connect(bufferSources[clip.id].clipGain);
        var nodeToConnect = bufferSources[clip.id].clipGain;
        if (clip.effects && clip.effects.length) {
          for (var i = 0; i < clip.effects.length; i ++) {
            nextEffect = clip.effects[i];
            nodeToConnect.connect(nextEffect.input);
            nodeToConnect = clip.effects[i].output;
          }
        }
        nodeToConnect.connect(buses[clip.destination]);
      });

      self.instruments.forEach(function(instrument) {
        instrument.setDestination(buses[instrument.trackId]);
      });

      Object.keys(bufferSources).forEach(function(key) {
        var obj = bufferSources[key];
        obj.clipGain.gain.value = 1;
      
        if (obj.fadeLeft > 0) {
          obj.clipGain.gain.setValueAtTime(0, obj.startTime);
            var waveArray = new Float32Array(19);
            waveArray[0] = 0.0;
            waveArray[1] = 0.00724;
            waveArray[2] = 0.01594;
            waveArray[3] = 0.0268;
            waveArray[4] = 0.04022;
            waveArray[5] = 0.05813;
            waveArray[6] = 0.08227;
            waveArray[7] = 0.11741;
            waveArray[8] = 0.17249;
            waveArray[9] = 0.27165;
            waveArray[10] = 0.5;
            waveArray[11] = 0.7344;
            waveArray[12] = 0.8355;
            waveArray[13] = 0.8885;
            waveArray[14] = 0.9234;
            waveArray[15] = 0.9479;
            waveArray[16] = 0.9657;
            waveArray[17] = 0.9793;
            waveArray[18] = 0.9901;
            waveArray[19] = 0.9988;
            waveArray[20] = 1;
            obj.clipGain.gain.setValueCurveAtTime(waveArray, obj.startTime, obj.fadeLeft);
        } else {
          obj.clipGain.gain.setValueAtTime(1, obj.startTime);
        }
        obj.start(obj.startTime, obj.offset, obj.duration);
        if (obj.fadeRight > 0) {
            var waveArrayBackwards = new Float32Array(19);
            waveArrayBackwards[0] = 1;
            waveArrayBackwards[1] = 0.9988;
            waveArrayBackwards[2] = 0.9901;
            waveArrayBackwards[3] = 0.9793;
            waveArrayBackwards[4] = 0.9657;
            waveArrayBackwards[5] = 0.9479;
            waveArrayBackwards[6] = 0.9234;
            waveArrayBackwards[7] = 0.8885;
            waveArrayBackwards[8] = 0.8355;
            waveArrayBackwards[9] = 0.7344;
            waveArrayBackwards[10] = 0.5;
            waveArrayBackwards[11] = 0.27615;
            waveArrayBackwards[12] = 0.17249;
            waveArrayBackwards[13] = 0.11741;
            waveArrayBackwards[14] = 0.08227;
            waveArrayBackwards[15] = .05813;
            waveArrayBackwards[16] = 0.04022;
            waveArrayBackwards[17] = 0.0268;
            waveArrayBackwards[18] = 0.01594;
            waveArrayBackwards[19] = 0.00724;
            waveArrayBackwards[20] = 0.0;
            obj.clipGain.gain.setValueCurveAtTime(waveArrayBackwards, obj.duration - obj.fadeRight, obj.duration);
        }
      });

      self.instruments.forEach(function(instrument) {
        instrument.trigger();
      });
      // TODO: Move this back a bit:
      self.ctx.startRendering().then(function(renderedBuffer) {
        var event = new CustomEvent(
          "offline-render-ready",
          {
            detail: {message: renderedBuffer},
            bubbles: true,
            cancelable: true
          }
        );
        document.querySelector('audio').dispatchEvent(event);
      })


    }
  };


  var OfflineBus = function(o) {
    this.init(o);
  };

  OfflineBus.prototype = {
    init: function(o) {
      var self = this;
      self.machine = o.machine;
      self.node = self.machine.ctx.createGain();
      self.node.gain.value = o.gain || 1;
      self._effects = o.effects || [];
      var nodeToConnect = self.node;
      var nextEffect;
      if (self._effects && self._effects.length) {
        for (var i = 0; i < self._effects.length; i++) {
          nextEffect = self._effects[i];
          nodeToConnect.connect(nextEffect.input);
          nodeToConnect = self._effects[i].output;
        }
      }
      nodeToConnect.connect(self.machine.ctx.destination);
    }

  };






  /***********************/

  // Add support for CommonJS libraries such as browserify.
  if (typeof exports !== 'undefined') {
    exports.OfflineBus = OfflineBus;
    exports.OfflineTapeMachine = OfflineTapeMachine;
  }

  // Define globally in case AMD is not available or unused.
  if (typeof window !== 'undefined') {
    window.OfflineBus = OfflineBus;
    window.OfflineTapeMachine = OfflineTapeMachine;
  } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
    global.OfflineBus = OfflineBus;
    global.OfflineTapeMachine = OfflineTapeMachine;
  }
})();
