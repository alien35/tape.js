/*!
 *  tape.js v2.0.9
 *  TapeMachinejs.com
 *  tape.js v2.0.9
 *  (c) 2018, ALexander Leon
 *  alexjleon.com
 *
 *  MIT License
 */

noteToFrequencyDictionary = {
    c0: 16.351,
    'c#0': 17.324,
    d0: 18.354,
    'd#o': 19.445,
    e0: 20.601,
    f0: 21.827,
    'f#0': 23.124,
    g0: 24.499,
    'g#0': 25.956,
    a0: 27.5,
    'a#0': 29.135,
    b0: 30.868,
    c1: 32.703,
    'c#1': 34.648,
    d1: 36.708,
    'd#1': 38.891,
    e1: 41.203,
    f1: 43.654,
    'f#1': 46.249,
    g1: 48.999,
    'g#1': 51.913,
    a1: 55,
    'a#1': 58.27,
    b1: 61.735,
    c2: 65.406,
    'c#2': 69.296,
    d2: 73.416,
    'd#2': 77.782,
    e2: 82.407,
    f2: 87.307,
    'f#2': 92.499,
    g2: 97.999,
    'g#2': 103.826,
    a2: 110,
    'a#2': 116.541,
    b2: 123.471,
    c3: 130.813,
    'c#3': 138.591,
    d3: 146.832,
    'd#3': 155.563,
    e3: 164.814,
    f3: 174.614,
    'f#3': 184.997,
    g3: 195.998,
    'g#3': 207.652,
    a3: 220,
    'a#3': 233.082,
    b3: 246.942,
    c4: 261.626,
    'c#4': 277.183,
    d4: 293.665,
    'd#4': 311.127,
    e4: 329.628,
    f4: 349.228,
    'f#4': 369.994,
    g4: 391.995,
    'g#4': 415.305,
    a4: 440,
    'a#4': 466.164,
    b4: 493.883,
    c5: 523.251,
    'c#5': 554.365,
    d5: 587.33,
    'd#5': 622.254,
    e5: 659.255,
    f5: 698.456,
    'f#5': 739.989,
    g5: 783.991,
    'g#5': 830.609,
    a5: 880,
    'a#5': 932.328,
    b5: 987.767,
    c6: 1046.502,
    'c#6': 1108.731,
    d6: 1174.659,
    'd#6': 1244.508,
    e6: 1318.51,
    f6: 1396.913,
    'f#6': 1479.978,
    g6: 1567.982,
    'g#6': 1661.219,
    a6: 1760,
    'a#6': 1864.655,
    b6: 1975.533,
    c7: 2093.005,
    'c#7': 2217.461,
    d7: 2349.318,
    'd#7': 2489.016,
    e7: 2637.021,
    f7: 2793.826,
    'f#7': 2959.955,
    g7: 3135.964,
    'g#7': 3322.438,
    a7: 3520,
    'a#7': 3729.31,
    b7: 3951.066,
    c8: 4186.009,
    'c#8': 4434.922,
    d8: 4698.636,
    'd#8': 4978.032,
    e8: 5274.042,
    f8: 5587.652,
    'f#8': 5919.91,
    g8: 6271.928,
    'g#8': 6644.876,
    a8: 7040,
    'a#8': 7458.62,
    b8: 7902.132
};

xCoefficient = 39.85;

(function() {

    var OfflineSynthOne = function(o) {
        this.init(o);
    };

    OfflineSynthOne.prototype = {
        init: function(o) {
            var self = this;

            self.machine = o.machine;

            self.trackId = o.trackId;

            self.attackTime = o.attackTime;
            self.decayTime = o.decayTime;
            self.releaseTime = o.releaseTime;

            // use to store currently playing frequencies
            self.oscillators = {};

            self.trackerDistanceFromLeft = o.trackerDistanceFromLeft;
            self.recording = o.recording;

            self.noteEvents = o.noteEvents;
            self.recordingStartTime = o.recordingStartTime;

        },

        trigger: function() {
            var self = this;
            if (Array.isArray(self.noteEvents)) {
                self.noteEvents.forEach(function(noteEvent) {
                   var startTime = noteEvent.startTime + ((self.recordingStartTime - self.trackerDistanceFromLeft) / xCoefficient);
                    var endTime = startTime + noteEvent.duration;
                    self.triggerAttack({note: noteEvent.note, start: startTime, end: endTime});
                })
            }
        },

        triggerAttack({ note: note, start: start, end: end }) {
            var self = this;

            var gainNode = self.machine.ctx.createGain();
            gainNode.connect(self.destination);

            var osc1 = self.machine.ctx.createOscillator();
            var osc2 = self.machine.ctx.createOscillator();

            osc1.connect(gainNode);
            osc2.connect(gainNode);

            osc1.type = 'sawtooth';
            osc2.type = 'triangle';

            var frequency = noteToFrequencyDictionary[note];

            osc1.frequency.value = frequency;
            osc1.detune.value = -5;
            osc2.frequency.value = frequency;
            osc2.detune.value = 5;

            try {
                osc1.start(start);
                osc2.start(start);

                gainNode.gain.setValueAtTime(0, start);
                gainNode.gain.setTargetAtTime(1, start + 0.01, self.attackTime);
                gainNode.gain.setTargetAtTime(0.05, start + self.decayTime + self.attackTime, 1);

                gainNode.gain.cancelScheduledValues(end);
                gainNode.gain.setTargetAtTime(0, end + self.releaseTime, 0.5);
            } catch(err) {}

        },

        setDestination: function(destination) {
            this.destination = destination;
        }

    };


    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                OfflineSynthOne: OfflineSynthOne
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.OfflineSynthOne = OfflineSynthOne;
    }


    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.OfflineSynthOne = OfflineSynthOne;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.OfflineSynthOne = OfflineSynthOne;
    }
})();

