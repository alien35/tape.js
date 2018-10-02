(function() {

    var id = 1000;

    var detuneNoteToCentsDictionary = {
        'a3': -300,
        'a#3': -200,
        'b3': -100,
        'c4': 0,
        'c#4': 100,
        'd4': 200,
        'd#4': 300
    };

    var SamplePlayer = function(o) {
        if (!o.sampleArray) {
            throw 'We need sampleArray here';
        }
        this.init(o);
    };

    SamplePlayer.prototype = {
        init: function(o) {
            var self = this;
            self.id = id++;
            self.name = o.name || 'Sample Player';
            self.pitchShift = o.pitchShift;
            self.type = 'piano';

            self.releaseTime = 0.1;

            self._destination = o.destination ? o.destination.node : TapeMachine.masterGain;

            self.renderingBuffers = {};

            self.voice1 = {
                buffer: null,
                connected: false,
                gain: null
            };

            self.voice2 = {
                buffer: null,
                connected: false,
                gain: null
            };

            self.voice3 = {
                buffer: null,
                connected: false,
                gain: null
            };

            self.voice4 = {
                buffer: null,
                connected: false,
                gain: null
            };

            self.voice5 = {
                buffer: null,
                connected: false,
                gain: null
            };

            self.voice6 = {
                buffer: null,
                connected: false,
                gain: null
            };

            self.voice7 = {
                buffer: null,
                connected: false,
                gain: null
            };

            self.voice8 = {
                buffer: null,
                connected: false,
                gain: null
            };

            self.detuneDictionary = {};


            o.sampleArray.forEach(function(sample) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', sample.url, true);
                xhr.responseType = 'arraybuffer';
                if (sample.detune) {
                    self.detuneDictionary[sample.note] = sample.detune;
                }
                xhr.onload = function() {
                    TapeMachine.ctx.decodeAudioData(xhr.response, function(buffer) {
                        self[sample.note] = { buffer: buffer, connected: false };
                        sample.tagAlongs.forEach(function(tagAlong) {
                            self[tagAlong.note] = { buffer: buffer, connected: false };
                            self.detuneDictionary[tagAlong.note] = tagAlong.detune;
                        })
                    });
                };
                xhr.send();
            });

            return self;
        },

        triggerAttack(note) {
            var self = this;

            var voice = self.nextAvailableVoice();
            if (voice !== 'na') {
                self[voice].connected = true;

                var source = TapeMachine.ctx.createBufferSource();
                source.buffer = self[note].buffer;
                source.detune.value = self.detuneDictionary[note] || 0;

                var gain = TapeMachine.ctx.createGain();
                gain.gain.value = 1;
                gain.connect(self._destination);
                source.connect(gain);
                source.start(0);
                self.renderingBuffers[note] = {voice: voice, source: source, gain: gain};
            }

            return self;
        },

        triggerRelease(note) {
            var self = this;
            try {
                self.renderingBuffers[note].gain.gain.setTargetAtTime(0, TapeMachine.ctx.currentTime, self.releaseTime);
                self[self.renderingBuffers[note].voice].connected = false;
            } catch(err) {
            }

        },

        updateDestination(destination) {
            var self = this;
            self._destination = destination.node;
        },

        update(o) {
            if (o.release) {
                this.releaseTime = o.release;
            }
        },

        nextAvailableVoice: function() {
            if (!this.voice1.connected) {
                return 'voice1';
            }
            if (!this.voice2.connected) {
                return 'voice2';
            }
            if (!this.voice3.connected) {
                return 'voice3';
            }
            if (!this.voice4.connected) {
                return 'voice4';
            }
            if (!this.voice5.connected) {
                return 'voice5';
            }
            if (!this.voice6.connected) {
                return 'voice6';
            }
            if (!this.voice7.connected) {
                return 'voice7';
            }
            if (!this.voice8.connected) {
                return 'voice8';
            }
            return 'na';
        }

    };


    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                SamplePlayer: SamplePlayer
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.SamplePlayer = SamplePlayer;
    }


    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.SamplePlayer = SamplePlayer;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.SamplePlayer = SamplePlayer;
    }
})();

