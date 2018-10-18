/*!
 *  TapeMachine.js v2.0.15
 *  TapeMachinejs.com
 *
 *  (c) 2013-2018, James Simpson of GoldFire Studios
 *  goldfirestudios.com
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

    var TapeMachineGlobal = function() {
        this.init();
    };
    TapeMachineGlobal.prototype = {
        /**
         * Initialize the global TapeMachine object.
         * @return {TapeMachine}
         */
        init: function() {
            var self = this || TapeMachine;

            // Create a global ID counter.
            self._counter = 1000;

            // Internal properties.
            self._codecs = {};
            self._reels = [];
            self._muted = false;
            self._volume = 1;
            self._canPlayEvent = 'canplaythrough';
            self._navigator = (typeof window !== 'undefined' && window.navigator) ? window.navigator : null;

            // Public properties.
            self.masterGain = null;
            self.noAudio = false;
            self.usingWebAudio = true;
            self.autoSuspend = true;
            self.ctx = null;

            // Set to false to disable the auto iOS enabler.
            self.mobileAutoEnable = true;

            // Setup the various state values for global tracking.
            self._setup();

            return self;
        },

        /**
         * Get/set the global volume for all sounds.
         * @param  {Float} vol Volume from 0.0 to 1.0.
         * @return {TapeMachine/Float}     Returns self or current volume.
         */
        // TODO: Refer to original source code if issue here
        volume: function(vol) {
            var self = this;
            vol = parseFloat(vol);

            // If we don't have an AudioContext created yet, run the setup.
            if (!self.ctx) {
                setupAudioContext();
            }

            if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
                self._volume = vol;

                // Don't update any of the nodes if we are muted.
                if (self._muted) {
                    return self;
                }

                // When using Web Audio, we just need to adjust the master gain.
                if (self.usingWebAudio) {
                    self.masterGain.gain.setValueAtTime(vol, self.ctx.currentTime);
                }

                // Loop through and change volume for all HTML5 audio nodes.
                for (var i=0; i<self._reels.length; i++) {
                    if (!self._reels[i]._webAudio) {
                        // Get all of the sounds in this Reel group.
                        var ids = self._reels[i]._getSoundIds();

                        // Loop through all sounds and change the volumes.
                        for (var j=0; j<ids.length; j++) {
                            var sound = self._reels[i]._soundById(ids[j]);

                            if (sound && sound._node) {
                                sound._node.volume = sound._volume * vol;
                            }
                        }
                    }
                }

                return self;
            }

            return self._volume;
        },

        /**
         * Handle muting and unmuting globally.
         * @param  {Boolean} muted Is muted or not.
         */
        mute: function(muted) {
            var self = this;

            // If we don't have an AudioContext created yet, run the setup.
            if (!self.ctx) {
                setupAudioContext();
            }

            self._muted = muted;

            // With Web Audio, we just need to mute the master gain.
            if (self.usingWebAudio) {
                self.masterGain.gain.setValueAtTime(muted ? 0 : self._volume, self.ctx.currentTime);
            }

            // Loop through and mute all HTML5 Audio nodes.
            for (var i=0; i<self._reels.length; i++) {
                if (!self._reels[i]._webAudio) {
                    // Get all of the sounds in this Reel group.
                    var ids = self._reels[i]._getSoundIds();

                    // Loop through all sounds and mark the audio node as muted.
                    for (var j=0; j<ids.length; j++) {
                        var sound = self._reels[i]._soundById(ids[j]);

                        if (sound && sound._node) {
                            sound._node.muted = (muted) ? true : sound._muted;
                        }
                    }
                }
            }

            return self;
        },

        /**
         * Unload and destroy all currently loaded Reel objects.
         * @return {TapeMachine}
         */
        unload: function() {
            var self = this || TapeMachine;

            for (var i=self._reels.length-1; i>=0; i--) {
                self._reels[i].unload();
            }

            // Create a new AudioContext to make sure it is fully reset.
            if (self.usingWebAudio && self.ctx && typeof self.ctx.close !== 'undefined') {
                self.ctx.close();
                self.ctx = null;
                setupAudioContext();
            }

            return self;
        },

        /**
         * Check for codec support of specific extension.
         * @param  {String} ext Audio file extention.
         * @return {Boolean}
         */
        codecs: function(ext) {
            return (this || TapeMachine)._codecs[ext.replace(/^x-/, '')];
        },

        /**
         * Setup various state values for global tracking.
         * @return {TapeMachine}
         */
        _setup: function() {
            var self = this;

            // Keeps track of the suspend/resume state of the AudioContext.
            self.state = self.ctx ? self.ctx.state || 'running' : 'running';

            // Automatically begin the 30-second suspend process
            self._autoSuspend();

            // Check if audio is available.
            if (!self.usingWebAudio) {
                // No audio is available on this system if noAudio is set to true.
                if (typeof Audio !== 'undefined') {
                    try {
                        var test = new Audio();

                        // Check if the canplaythrough event is available.
                        if (typeof test.oncanplaythrough === 'undefined') {
                            self._canPlayEvent = 'canplay';
                        }
                    } catch(e) {
                        self.noAudio = true;
                    }
                } else {
                    self.noAudio = true;
                }
            }
            // Test to make sure audio isn't disabled in Internet Explorer.
            try {
                var test = new Audio();
                if (test.muted) {
                    self.noAudio = true;
                }
            } catch (e) {}

            // Check for supported codecs.
            if (!self.noAudio) {
                self._setupCodecs();
            }


            return self;
        },

        /**
         * Check for browser support for various codecs and cache the results.
         * @return {TapeMachine}
         */
        _setupCodecs: function() {
            var self = this || TapeMachine;
            var audioTest = null;

            // Must wrap in a try/catch because IE11 in server mode throws an error.
            try {
                audioTest = (typeof Audio !== 'undefined') ? new Audio() : null;
            } catch (err) {
                return self;
            }

            if (!audioTest || typeof audioTest.canPlayType !== 'function') {
                return self;
            }

            var mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');

            // Opera version <33 has mixed MP3 support, so we need to check for and block it.
            var checkOpera = self._navigator && self._navigator.userAgent.match(/OPR\/([0-6].)/g);
            var isOldOpera = (checkOpera && parseInt(checkOpera[0].split('/')[1], 10) < 33);

            self._codecs = {
                mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))),
                mpeg: !!mpegTest,
                opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
                ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
                oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
                wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
                aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
                caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
                m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
                mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
                weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
                webm: !!audioTest.canPlayType('video/webm; codecs="vorbis"') || audioTest.canPlayType('audio/webm; codecs="opus"') .replace(/^no$/, ''),
                dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ''),
                flac: !!(audioTest.canPlayType('audio/x-flac;') || audioTest.canPlayType('audio/flac;')).replace(/^no$/, '')
            };

            return self;
        },

        /**
         * Mobile browsers will only allow audio to be played after a user interaction.
         * Attempt to automatically unlock audio on the first user interaction.
         * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
         * @return {TapeMachine}
         */
        _enableMobileAudio: function() {
            var self = this || TapeMachine;

            // Only run this on mobile devices if audio isn't already eanbled.
            var isMobile = /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk|Mobi|Chrome/i.test(self._navigator && self._navigator.userAgent);
            if (self._mobileEnabled || !self.ctx || !isMobile) {
                return;
            }

            self._mobileEnabled = false;
            self.mobileAutoEnable = false;

            // Some mobile devices/platforms have distortion issues when opening/closing tabs and/or web views.
            // Bugs in the browser (especially Mobile Safari) can cause the sampleRate to change from 44100 to 48000.
            // By calling TapeMachine.unload(), we create a new AudioContext with the correct sampleRate.
            if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
                self._mobileUnloaded = true;
                self.unload();
            }

            // Scratch buffer for enabling iOS to dispose of web audio buffers correctly, as per:
            // http://stackoverflow.com/questions/24119684
            self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);

            // Call this method on touch start to create and play a buffer,
            // then check if the audio actually played to determine if
            // audio has now been unlocked on iOS, Android, etc.
            var unlock = function(e) {
                // Fix Android can not play in suspend state.
                TapeMachine0._autoResume();
                TapeMachine1._autoResume();
                TapeMachine2._autoResume();
                TapeMachine3._autoResume();
                TapeMachine4._autoResume();
                TapeMachine5._autoResume();

                // Create an empty buffer.
                var source = self.ctx.createBufferSource();
                source.buffer = self._scratchBuffer;
                source.connect(self.ctx.destination);

                // Play the empty buffer.
                if (typeof source.start === 'undefined') {
                    source.noteOn(0);
                } else {
                    source.start(0);
                }

                // Calling resume() on a stack initiated by user gesture is what actually unlocks the audio on Android Chrome >= 55.
                if (typeof self.ctx.resume === 'function') {
                    self.ctx.resume();
                }

                // Setup a timeout to check that we are unlocked on the next event loop.
                source.onended = function() {
                    source.disconnect(0);

                    // Update the unlocked state and prevent this check from happening again.
                    self._mobileEnabled = true;

                    // Remove the touch start listener.
                    document.removeEventListener('touchstart', unlock, true);
                    document.removeEventListener('touchend', unlock, true);
                    document.removeEventListener('click', unlock, true);

                    // Let all sounds know that audio has been unlocked.
                    for (var i=0; i<self._reels.length; i++) {
                        self._reels[i]._emit('unlock');
                    }
                };
            };

            // Setup a touch start listener to attempt an unlock in.
            document.addEventListener('touchstart', unlock, true);
            document.addEventListener('touchend', unlock, true);
            document.addEventListener('click', unlock, true);

            return self;
        },

        /**
         * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
         * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
         * @return {TapeMachine}
         */
        _autoSuspend: function() {
            var self = this;

            if (!self.autoSuspend || !self.ctx || typeof self.ctx.suspend === 'undefined' || !TapeMachine0.usingWebAudio) {
                return;
            }

            // Check if any sounds are playing.
            for (var i=0; i<self._reels.length; i++) {
                if (self._reels[i]._webAudio) {
                    for (var j=0; j<self._reels[i]._sounds.length; j++) {
                        if (!self._reels[i]._sounds[j]._paused) {
                            return self;
                        }
                    }
                }
            }

            if (self._suspendTimer) {
                clearTimeout(self._suspendTimer);
            }

            // If no sound has played after 30 seconds, suspend the context.
            self._suspendTimer = setTimeout(function() {
                if (!self.autoSuspend) {
                    return;
                }

                self._suspendTimer = null;
                self.state = 'suspending';
                self.ctx.suspend().then(function() {
                    self.state = 'suspended';

                    if (self._resumeAfterSuspend) {
                        delete self._resumeAfterSuspend;
                        self._autoResume();
                    }
                });
            }, 30000);

            return self;
        },

        /**
         * Automatically resume the Web Audio AudioContext when a new sound is played.
         * @return {TapeMachine}
         */
        _autoResume: function() {
            var self = this;

            if (!self.ctx || typeof self.ctx.resume === 'undefined' || !TapeMachine0.usingWebAudio) {
                return;
            }

            if (self.state === 'running' && self._suspendTimer) {
                clearTimeout(self._suspendTimer);
                self._suspendTimer = null;
            } else if (self.state === 'suspended') {
                self.ctx.resume().then(function() {
                    self.state = 'running';

                    // Emit to all Reels that the audio has resumed.
                    for (var i=0; i<self._reels.length; i++) {
                        self._reels[i]._emit('resume');
                    }
                });

                if (self._suspendTimer) {
                    clearTimeout(self._suspendTimer);
                    self._suspendTimer = null;
                }
            } else if (self.state === 'suspending') {
                self._resumeAfterSuspend = true;
            }

            return self;
        },

        stopAll: function() {
            var self = this;

            self._reels.forEach(function(reel) {
                reel.stop();
            })
        }
    };

    // Setup the global audio controller.
    var TapeMachine0 = new TapeMachineGlobal();
    var TapeMachine1 = new TapeMachineGlobal();
    var TapeMachine2 = new TapeMachineGlobal();
    var TapeMachine3 = new TapeMachineGlobal();
    var TapeMachine4 = new TapeMachineGlobal();
    var TapeMachine5 = new TapeMachineGlobal();

    /** Group Methods **/
    /***************************************************************************/

    /**
     * Create an audio group controller.
     * @param {Object} o Passed in properties for this group.
     */
    var Reel = function(o) {
        var self = this;

        // Throw an error if no source is provided.
        if (!o.src || o.src.length === 0) {
            console.error('An array of source files must be passed with any new Reel.');
            return;
        }

        self.init(o);
    };
    Reel.prototype = {
        /**
         * Initialize a new Reel group object.
         * @param  {Object} o Passed in properties for this group.
         * @return {Reel}
         */
        init: function(o) {
            var self = this;

            self.machine = o.machine;

            // If we don't have an AudioContext created yet, run the setup.
            if (!TapeMachine0.ctx) {
                setupAudioContext();
            }

            // Setup user-defined default properties.
            self._autoplay = o.autoplay || false;
            self._format = (typeof o.format !== 'string') ? o.format : [o.format];
            self._html5 = o.html5 || false;
            self._muted = o.mute || false;
            self._loop = o.loop || false;
            self._pool = o.pool || 5;
            self._preload = (typeof o.preload === 'boolean') ? o.preload : true;
            self._rate = o.rate || 1;
            self._vocode = o.vocode;
            self._sprite = o.sprite || {};
            self._pitchShift = o.pitchShift || 1;
            self._src = (typeof o.src !== 'string') ? o.src : [o.src];
            self._volume = o.volume !== undefined ? o.volume : 1;
            self._xhrWithCredentials = o.xhrWithCredentials || false;
            self.effects = o.effects || [];
            self._destination = o.destination ? o.destination.node : self.machine.masterGain;

            // Setup all other default properties.
            self._duration = 0;
            self._state = 'unloaded';
            self._sounds = [];
            self._endTimers = {};
            self._queue = [];
            self._playLock = false;
            self._cachedBuffer = null;
            self._cachedPreVocodedBuffer = null;

            // Setup event listeners.
            self._onend = o.onend ? [{fn: o.onend}] : [];
            self._onfade = o.onfade ? [{fn: o.onfade}] : [];
            self._onload = o.onload ? [{fn: o.onload}] : [];
            self._onloaderror = o.onloaderror ? [{fn: o.onloaderror}] : [];
            self._onplayerror = o.onplayerror ? [{fn: o.onplayerror}] : [];
            self._onpause = o.onpause ? [{fn: o.onpause}] : [];
            self._onplay = o.onplay ? [{fn: o.onplay}] : [];
            self._onstop = o.onstop ? [{fn: o.onstop}] : [];
            self._onmute = o.onmute ? [{fn: o.onmute}] : [];
            self._onvolume = o.onvolume ? [{fn: o.onvolume}] : [];
            self._onrate = o.onrate ? [{fn: o.onrate}] : [];
            self._onseek = o.onseek ? [{fn: o.onseek}] : [];
            self._onunlock = o.onunlock ? [{fn: o.onunlock}] : [];
            self._onresume = [];

            // Web Audio or HTML5 Audio?
            self._webAudio = TapeMachine0.usingWebAudio && !self._html5;

            // Automatically try to enable audio on iOS.
            if (typeof self.machine.ctx !== 'undefined' && self.machine.ctx && self.machine.mobileAutoEnable) {
                self.machine._enableMobileAudio();
            }

            // Keep track of this Reel group in the global controller.
            self.machine._reels.push(self);

            // If they selected autoplay, add a play event to the load queue.
            if (self._autoplay) {
                self._queue.push({
                    event: 'play',
                    action: function() {
                        self.play();
                    }
                });
            }

            // Load the source file unless otherwise specified.
            if (self._preload) {
                self.load();
            }

            if (cache[self._src]) {
                self._cachedBuffer = cache[self._src].main;
                self._cachedPreVocodedBuffer = cache[self._src].vocoder;
            }

            return self;
        },

        /**
         * Load the audio file.
         * @return {TapeMachine}
         */
        load: function() {
            var self = this;
            var url = null;

            // If no audio is available, quit immediately.
            if (self.machine.noAudio) {
                self._emit('loaderror', null, 'No audio support.');
                return;
            }

            // Make sure our source is in an array.
            if (typeof self._src === 'string') {
                self._src = [self._src];
            }

            // Loop through the sources and pick the first one that is compatible.
            for (var i=0; i<self._src.length; i++) {
                var ext, str;

                if (self._format && self._format[i]) {
                    // If an extension was specified, use that instead.
                    ext = self._format[i];
                } else {
                    // Make sure the source is a string.
                    str = self._src[i];
                    if (typeof str !== 'string') {
                        self._emit('loaderror', null, 'Non-string found in selected audio sources - ignoring.');
                        continue;
                    }

                    // Extract the file extension from the URL or base64 data URI.
                    ext = /^data:audio\/([^;,]+);/i.exec(str);
                    if (!ext) {
                        ext = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
                    }

                    if (ext) {
                        ext = ext[1].toLowerCase();
                    }
                }

                // Log a warning if no extension was found.
                if (!ext) {
                    console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
                }

                // Check if this extension is available.
                if (ext && self.machine.codecs(ext)) {
                    url = self._src[i];
                    break;
                }
            }

            if (!url) {
                self._emit('loaderror', null, 'No codec support for selected audio sources.');
                return;
            }

            self._src = url;
            self._state = 'loading';

            // If the hosting page is HTTPS and the source isn't,
            // drop down to HTML5 Audio to avoid Mixed Content errors.
            if (window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
                self._html5 = true;
                self._webAudio = false;
            }

            // Create a new sound object and add it to the pool.
            new Sound(self);

            // Load and decode the audio data for playback.
            if (self._webAudio) {
                loadBuffer(self);
            }

            return self;
        },

        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(sprite, internal, input) {
            var self = this;
            var id = null;

            var startTime, clipOffset, clipDuration;
            if (!input) {
                startTime = 0;
                clipOffset = 0;
                clipDuration = self._duration;
            } else {
                startTime = input.startTime;
                clipOffset = input.clipOffset;
                clipDuration = input.clipDuration;
                var fadeIn = input.fadeIn;
                var fadeOut = input.fadeRight;

            }


            // Determine if a sprite, sound id or nothing was passed
            if (typeof sprite === 'number') {
                id = sprite;
                sprite = null;
            } else if (typeof sprite === 'string' && self._state === 'loaded' && !self._sprite[sprite]) {
                // If the passed sprite doesn't exist, do nothing.
                return null;
            } else if (typeof sprite === 'undefined') {
                // Use the default sound sprite (plays the full audio length).
                sprite = '__default';

                // Check if there is a single paused sound that isn't ended.
                // If there is, play that sound. If not, continue as usual.
                var num = 0;
                for (var i=0; i<self._sounds.length; i++) {
                    if (self._sounds[i]._paused && !self._sounds[i]._ended) {
                        num++;
                        id = self._sounds[i]._id;
                    }
                }

                if (num === 1) {
                    sprite = null;
                } else {
                    id = null;
                }
            }

            // Get the selected node, or get one from the pool.
            var sound = id ? self._soundById(id) : self._inactiveSound();

            // If the sound doesn't exist, do nothing.
            if (!sound) {
                return null;
            }

            // Select the sprite definition.
            /* TODO: Figure out what happened with our sprite
            if (id && !sprite) {
                sprite = sound._sprite || '__default';
            }
            */
            sprite = '__default';

            // If the sound hasn't loaded, we must wait to get the audio's duration.
            // We also need to wait to make sure we don't run into race conditions with
            // the order of function calls.
            if (self._state !== 'loaded') {
                // Set the sprite value on this sound.
                sound._sprite = sprite;

                // Makr this sounded as not ended in case another sound is played before this one loads.
                sound._ended = false;

                // Add the sound to the queue to be played on load.
                var soundId = sound._id;
                self._queue.push({
                    event: 'play',
                    action: function() {
                        self.play(soundId);
                    }
                });

                return soundId;
            }

            // Don't play the sound if an id was passed and it is already playing.
            if (id && !sound._paused) {
                // Trigger the play event, in order to keep iterating through queue.
                if (!internal) {
                    self._loadQueue('play');
                }

                return sound._id;
            }

            // Make sure the AudioContext isn't suspended, and resume it if it is.
            if (self._webAudio) {
                TapeMachine0._autoResume();
                TapeMachine1._autoResume();
                TapeMachine2._autoResume();
                TapeMachine3._autoResume();
                TapeMachine4._autoResume();
                TapeMachine5._autoResume();
            }

            // Determine how long to play for and where to start playing.
            var seek = Math.max(0, sound._seek > 0 ? sound._seek : self._sprite[sprite][0] / 1000);
            var duration = Math.max(0, ((self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000) - seek);

            var timeout = clipDuration * 1000;

            // Update the parameters of the sound
            sound._paused = false;
            sound._ended = false;
            sound._sprite = sprite;
            sound._seek = seek;
            sound._start = self._sprite[sprite][0] / 1000;
            sound._stop = (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000;
            sound._loop = !!(sound._loop || self._sprite[sprite][2]);

            // End the sound instantly if seek is at the end.
            if (sound._seek >= sound._stop) {
                self._ended(sound);
                return;
            }

            // Begin the actual playback.
            var node = sound._node;
            if (self._webAudio) {
                // Fire this when the sound is ready to play to begin Web Audio playback.
                var playWebAudio = function() {
                    self._refreshBuffer(sound);

                    // Setup the playback params.
                    var vol = (sound._muted || self._muted) ? 0 : sound._volume;
                    node.gain.setValueAtTime(vol, self.machine.ctx.currentTime);
                    sound._playStart = self.machine.ctx.currentTime;


                    // Play the sound using the supported method.
                    if (typeof node.bufferSource.start === 'undefined') {
                        sound._loop ? node.bufferSource.noteGrainOn(self.machine.ctx.currentTime + startTime, clipOffset) : node.bufferSource.noteGrainOn(self.machine.ctx.currentTime + startTime, clipOffset);
                    } else {
                        sound._loop ? node.bufferSource.start(self.machine.ctx.currentTime + startTime, clipOffset) : node.bufferSource.start(self.machine.ctx.currentTime + startTime, clipOffset);
                    }

                    // Start a new timer if none is present.
                    if (timeout !== Infinity) {
                        self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
                    }

                    if (!internal) {
                        setTimeout(function() {
                            self._emit('play', sound._id);
                        }, 0);
                    }
                };

                if (self.machine.state === 'running') {
                    playWebAudio();
                } else {
                    self.once('resume', playWebAudio);

                    // Cancel the end timer.
                    self._clearTimer(sound._id);
                }
            } else {
                // Fire this when the sound is ready to play to begin HTML5 Audio playback.
                var playHtml5 = function() {
                    node.currentTime = seek;
                    node.muted = sound._muted || self._muted || self.machine._muted || node.muted;
                    node.volume = sound._volume * self.machine.volume();
                    node.playbackRate = sound._rate;

                    // Mobile browsers will throw an error if this is called without user interaction.
                    try {
                        var play = node.play();

                        // Support older browsers that don't support promises, and thus don't have this issue.
                        if (play && typeof Promise !== 'undefined' && (play instanceof Promise || typeof play.then === 'function')) {
                            // Implements a lock to prevent DOMException: The play() request was interrupted by a call to pause().
                            self._playLock = true;

                            // Releases the lock and executes queued actions.
                            play
                                .then(function() {
                                    self._playLock = false;
                                    if (!internal) {
                                        self._emit('play', sound._id);
                                    }
                                })
                                .catch(function() {
                                    self._playLock = false;
                                    self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                                        'on mobile devices and Chrome where playback was not within a user interaction.');
                                });
                        } else if (!internal) {
                            self._emit('play', sound._id);
                        }

                        // Setting rate before playing won't work in IE, so we set it again here.
                        node.playbackRate = sound._rate;

                        // If the node is still paused, then we can assume there was a playback issue.
                        if (node.paused) {
                            self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                                'on mobile devices and Chrome where playback was not within a user interaction.');
                            return;
                        }

                        // Setup the end timer on sprites or listen for the ended event.
                        if (sprite !== '__default' || sound._loop) {
                            self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
                        } else {
                            self._endTimers[sound._id] = function() {
                                // Fire ended on this audio node.
                                self._ended(sound);

                                // Clear this listener.
                                node.removeEventListener('ended', self._endTimers[sound._id], false);
                            };
                            node.addEventListener('ended', self._endTimers[sound._id], false);
                        }
                    } catch (err) {
                        self._emit('playerror', sound._id, err);
                    }
                };

                // Play immediately if ready, or wait for the 'canplaythrough'e vent.
                var loadedNoReadyState = (window && window.ejecta) || (!node.readyState && TapeMachine0._navigator.isCocoonJS);
                if (node.readyState >= 3 || loadedNoReadyState) {
                    playHtml5();
                } else {
                    var listener = function() {
                        // Begin playback.
                        playHtml5();

                        // Clear this listener.
                        node.removeEventListener(self.machine._canPlayEvent, listener, false);
                    };
                    node.addEventListener(self.machine._canPlayEvent, listener, false);

                    // Cancel the end timer.
                    self._clearTimer(sound._id);
                }
            }

            return sound._id;
        },

        updateDestination: function(destination) {
            var self = this;
            self._destination = destination.node;
        },

        update: function(o) {
            var self = this;
            if (o.rate) {
                self._rate = o.rate;
            }
            if (o.destination) {
                self._destination = o.destination.node;
            }
            if (o.pitchShift) {
                self._pitchShift = o.pitchShift;
            }
        },

        /**
         * Pause playback and save current position.
         * @param  {Number} id The sound ID (empty to pause all in group).
         * @return {Reel}
         */
        pause: function(id) {
            var self = this;

            // If the sound hasn't loaded or a play() promise is pending, add it to the load queue to pause when capable.
            if (self._state !== 'loaded' || self._playLock) {
                self._queue.push({
                    event: 'pause',
                    action: function() {
                        self.pause(id);
                    }
                });

                return self;
            }

            // If no id is passed, get all ID's to be paused.
            var ids = self._getSoundIds(id);

            for (var i=0; i<ids.length; i++) {
                // Clear the end timer.
                self._clearTimer(ids[i]);

                // Get the sound.
                var sound = self._soundById(ids[i]);

                if (sound && !sound._paused) {
                    // Reset the seek position.
                    sound._seek = self.seek(ids[i]);
                    sound._rateSeek = 0;
                    sound._paused = true;

                    // Stop currently running fades.
                    self._stopFade(ids[i]);

                    if (sound._node) {
                        if (self._webAudio) {
                            // Make sure the sound has been created.
                            if (!sound._node.bufferSource) {
                                continue;
                            }

                            if (typeof sound._node.bufferSource.stop === 'undefined') {
                                sound._node.bufferSource.noteOff(0);
                            } else {
                                sound._node.bufferSource.stop(0);
                            }

                            // Clean up the buffer source.
                            self._cleanBuffer(sound._node);
                        } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
                            sound._node.pause();
                        }
                    }
                }

                // Fire the pause event, unless `true` is passed as the 2nd argument.
                if (!arguments[1]) {
                    self._emit('pause', sound ? sound._id : null);
                }
            }

            return self;
        },

        /**
         * Stop playback and reset to start.
         * @param  {Number} id The sound ID (empty to stop all in group).
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Reel}
         */
        stop: function(id, internal) {
            var self = this;

            // If the sound hasn't loaded, add it to the load queue to stop when capable.
            if (self._state !== 'loaded' || self._playLock) {
                self._queue.push({
                    event: 'stop',
                    action: function() {
                        self.stop(id);
                    }
                });

                return self;
            }

            // If no id is passed, get all ID's to be stopped.
            var ids = self._getSoundIds(id);

            for (var i=0; i<ids.length; i++) {
                // Clear the end timer.
                self._clearTimer(ids[i]);

                // Get the sound.
                var sound = self._soundById(ids[i]);

                if (sound) {
                    // Reset the seek position.
                    sound._seek = sound._start || 0;
                    sound._rateSeek = 0;
                    sound._paused = true;
                    sound._ended = true;

                    // Stop currently running fades.
                    self._stopFade(ids[i]);

                    if (sound._node) {
                        if (self._webAudio) {
                            // Make sure the sound's AudioBufferSourceNode has been created.
                            if (sound._node.bufferSource) {
                                if (typeof sound._node.bufferSource.stop === 'undefined') {
                                    sound._node.bufferSource.noteOff(0);
                                } else {
                                    sound._node.bufferSource.stop(0);
                                }
                                var attemptsGiven = 200;
                                var interval = setInterval(function() {
                                    try {
                                        if (typeof sound._node.bufferSource.stop === 'undefined') {
                                            sound._node.bufferSource.noteOff(0);
                                        } else {
                                            sound._node.bufferSource.stop(0);
                                        }
                                        attemptsGiven --;
                                    } catch(e) {
                                        attemptsGiven = 0;
                                    }
                                    if (attemptsGiven <= 0) {
                                        clearInterval(interval);
                                    }
                                }, 10);

                                // Clean up the buffer source.
                                self._cleanBuffer(sound._node);
                            }
                        } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
                            sound._node.currentTime = sound._start || 0;
                            sound._node.pause();
                        }
                    }

                    if (!internal) {
                        self._emit('stop', sound._id);
                    }
                }
            }

            return self;
        },

        /**
         * Mute/unmute a single sound or all sounds in this Reel group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Reel}
         */
        mute: function(muted, id) {
            var self = this;

            // If the sound hasn't loaded, add it to the load queue to mute when capable.
            if (self._state !== 'loaded'|| self._playLock) {
                self._queue.push({
                    event: 'mute',
                    action: function() {
                        self.mute(muted, id);
                    }
                });

                return self;
            }

            // If applying mute/unmute to all sounds, update the group's value.
            if (typeof id === 'undefined') {
                if (typeof muted === 'boolean') {
                    self._muted = muted;
                } else {
                    return self._muted;
                }
            }

            // If no id is passed, get all ID's to be muted.
            var ids = self._getSoundIds(id);

            for (var i=0; i<ids.length; i++) {
                // Get the sound.
                var sound = self._soundById(ids[i]);

                if (sound) {
                    sound._muted = muted;

                    // Cancel active fade and set the volume to the end value.
                    if (sound._interval) {
                        self._stopFade(sound._id);
                    }

                    if (self._webAudio && sound._node) {
                        sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, self._parent.machine.ctx.currentTime);
                    } else if (sound._node) {
                        sound._node.muted = self._parent.machine._muted ? true : muted;
                    }

                    self._emit('mute', sound._id);
                }
            }

            return self;
        },

        /**
         * Get/set the volume of this sound or of the Reel group. This method can optionally take 0, 1 or 2 arguments.
         *   volume() -> Returns the group's volume value.
         *   volume(id) -> Returns the sound id's current volume.
         *   volume(vol) -> Sets the volume of all sounds in this Reel group.
         *   volume(vol, id) -> Sets the volume of passed sound id.
         * @return {Reel/Number} Returns self or current volume.
         */
        volume: function() {
            var self = this;
            var args = arguments;
            var vol, id;

            // Determine the values based on arguments.
            if (args.length === 0) {
                // Return the value of the groups' volume.
                return self._volume;
            } else if (args.length === 1 || args.length === 2 && typeof args[1] === 'undefined') {
                // First check if this is an ID, and if not, assume it is a new volume.
                var ids = self._getSoundIds();
                var index = ids.indexOf(args[0]);
                if (index >= 0) {
                    id = parseInt(args[0], 10);
                } else {
                    vol = parseFloat(args[0]);
                }
            } else if (args.length >= 2) {
                vol = parseFloat(args[0]);
                id = parseInt(args[1], 10);
            }

            // Update the volume or return the current volume.
            var sound;
            if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
                // If the sound hasn't loaded, add it to the load queue to change volume when capable.
                if (self._state !== 'loaded'|| self._playLock) {
                    self._queue.push({
                        event: 'volume',
                        action: function() {
                            self.volume.apply(self, args);
                        }
                    });

                    return self;
                }

                // Set the group volume.
                if (typeof id === 'undefined') {
                    self._volume = vol;
                }

                // Update one or all volumes.
                id = self._getSoundIds(id);
                for (var i=0; i<id.length; i++) {
                    // Get the sound.
                    sound = self._soundById(id[i]);

                    if (sound) {
                        sound._volume = vol;

                        // Stop currently running fades.
                        if (!args[2]) {
                            self._stopFade(id[i]);
                        }

                        if (self._webAudio && sound._node && !sound._muted) {
                            sound._node.gain.setValueAtTime(vol, self._parent.machine.ctx.currentTime);
                        } else if (sound._node && !sound._muted) {
                            sound._node.volume = vol * self._parent.machine.volume();
                        }

                        self._emit('volume', sound._id);
                    }
                }
            } else {
                sound = id ? self._soundById(id) : self._sounds[0];
                return sound ? sound._volume : 0;
            }

            return self;
        },

        /**
         * Fade a currently playing sound between two volumes (if no id is passsed, all sounds will fade).
         * @param  {Number} from The value to fade from (0.0 to 1.0).
         * @param  {Number} to   The volume to fade to (0.0 to 1.0).
         * @param  {Number} len  Time in milliseconds to fade.
         * @param  {Number} id   The sound id (omit to fade all sounds).
         * @return {Reel}
         */
        fade: function(from, to, len, id) {
            var self = this;

            // If the sound hasn't loaded, add it to the load queue to fade when capable.
            if (self._state !== 'loaded' || self._playLock) {
                self._queue.push({
                    event: 'fade',
                    action: function() {
                        self.fade(from, to, len, id);
                    }
                });

                return self;
            }

            // Make sure the to/from/len values are numbers.
            from = parseFloat(from);
            to = parseFloat(to);
            len = parseFloat(len);

            // Set the volume to the start position.
            self.volume(from, id);

            // Fade the volume of one or all sounds.
            var ids = self._getSoundIds(id);
            for (var i=0; i<ids.length; i++) {
                // Get the sound.
                var sound = self._soundById(ids[i]);

                // Create a linear fade or fall back to timeouts with HTML5 Audio.
                if (sound) {
                    // Stop the previous fade if no sprite is being used (otherwise, volume handles this).
                    if (!id) {
                        self._stopFade(ids[i]);
                    }

                    // If we are using Web Audio, let the native methods do the actual fade.
                    if (self._webAudio && !sound._muted) {
                        var currentTime = self._parent.machine.ctx.currentTime;
                        var end = currentTime + (len / 1000);
                        sound._volume = from;
                        sound._node.gain.setValueAtTime(from, currentTime);
                        sound._node.gain.linearRampToValueAtTime(to, end);
                    }

                    self._startFadeInterval(sound, from, to, len, ids[i], typeof id === 'undefined');
                }
            }

            return self;
        },

        /**
         * Starts the internal interval to fade a sound.
         * @param  {Object} sound Reference to sound to fade.
         * @param  {Number} from The value to fade from (0.0 to 1.0).
         * @param  {Number} to   The volume to fade to (0.0 to 1.0).
         * @param  {Number} len  Time in milliseconds to fade.
         * @param  {Number} id   The sound id to fade.
         * @param  {Boolean} isGroup   If true, set the volume on the group.
         */
        _startFadeInterval: function(sound, from, to, len, id, isGroup) {
            var self = this;
            var vol = from;
            var diff = to - from;
            var steps = Math.abs(diff / 0.01);
            var stepLen = Math.max(4, (steps > 0) ? len / steps : len);
            var lastTick = Date.now();

            // Store the value being faded to.
            sound._fadeTo = to;

            // Update the volume value on each interval tick.
            sound._interval = setInterval(function() {
                // Update the volume based on the time since the last tick.
                var tick = (Date.now() - lastTick) / len;
                lastTick = Date.now();
                vol += diff * tick;

                // Make sure the volume is in the right bounds.
                vol = Math.max(0, vol);
                vol = Math.min(1, vol);

                // Round to within 2 decimal points.
                vol = Math.round(vol * 100) / 100;

                // Change the volume.
                if (self._webAudio) {
                    sound._volume = vol;
                } else {
                    self.volume(vol, sound._id, true);
                }

                // Set the group's volume.
                if (isGroup) {
                    self._volume = vol;
                }

                // When the fade is complete, stop it and fire event.
                if ((to < from && vol <= to) || (to > from && vol >= to)) {
                    clearInterval(sound._interval);
                    sound._interval = null;
                    sound._fadeTo = null;
                    self.volume(to, sound._id);
                    self._emit('fade', sound._id);
                }
            }, stepLen);
        },

        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Reel}
         */
        _stopFade: function(id) {
            var self = this;
            var sound = self._soundById(id);

            if (sound && sound._interval) {
                if (self._webAudio) {
                    sound._node.gain.cancelScheduledValues(self._parent.machine.ctx.currentTime);
                }

                clearInterval(sound._interval);
                sound._interval = null;
                self.volume(sound._fadeTo, id);
                sound._fadeTo = null;
                self._emit('fade', id);
            }

            return self;
        },

        /**
         * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
         *   loop() -> Returns the group's loop value.
         *   loop(id) -> Returns the sound id's loop value.
         *   loop(loop) -> Sets the loop value for all sounds in this Reel group.
         *   loop(loop, id) -> Sets the loop value of passed sound id.
         * @return {Reel/Boolean} Returns self or current loop value.
         */
        loop: function() {
            var self = this;
            var args = arguments;
            var loop, id, sound;

            // Determine the values for loop and id.
            if (args.length === 0) {
                // Return the grou's loop value.
                return self._loop;
            } else if (args.length === 1) {
                if (typeof args[0] === 'boolean') {
                    loop = args[0];
                    self._loop = loop;
                } else {
                    // Return this sound's loop value.
                    sound = self._soundById(parseInt(args[0], 10));
                    return sound ? sound._loop : false;
                }
            } else if (args.length === 2) {
                loop = args[0];
                id = parseInt(args[1], 10);
            }

            // If no id is passed, get all ID's to be looped.
            var ids = self._getSoundIds(id);
            for (var i=0; i<ids.length; i++) {
                sound = self._soundById(ids[i]);

                if (sound) {
                    sound._loop = loop;
                    if (self._webAudio && sound._node && sound._node.bufferSource) {
                        sound._node.bufferSource.loop = loop;
                        if (loop) {
                            sound._node.bufferSource.loopStart = sound._start || 0;
                            sound._node.bufferSource.loopEnd = sound._stop;
                        }
                    }
                }
            }

            return self;
        },

        /**
         * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
         *   rate() -> Returns the first sound node's current playback rate.
         *   rate(id) -> Returns the sound id's current playback rate.
         *   rate(rate) -> Sets the playback rate of all sounds in this Reel group.
         *   rate(rate, id) -> Sets the playback rate of passed sound id.
         * @return {Reel/Number} Returns self or the current playback rate.
         */
        rate: function() {
            var self = this;
            var args = arguments;
            var rate, id;

            // Determine the values based on arguments.
            if (args.length === 0) {
                // We will simply return the current rate of the first node.
                id = self._sounds[0]._id;
            } else if (args.length === 1) {
                // First check if this is an ID, and if not, assume it is a new rate value.
                var ids = self._getSoundIds();
                var index = ids.indexOf(args[0]);
                if (index >= 0) {
                    id = parseInt(args[0], 10);
                } else {
                    rate = parseFloat(args[0]);
                }
            } else if (args.length === 2) {
                rate = parseFloat(args[0]);
                id = parseInt(args[1], 10);
            }

            // Update the playback rate or return the current value.
            var sound;
            if (typeof rate === 'number') {
                // If the sound hasn't loaded, add it to the load queue to change playback rate when capable.
                if (self._state !== 'loaded' || self._playLock) {
                    self._queue.push({
                        event: 'rate',
                        action: function() {
                            self.rate.apply(self, args);
                        }
                    });

                    return self;
                }

                // Set the group rate.
                if (typeof id === 'undefined') {
                    self._rate = rate;
                }

                // Update one or all volumes.
                id = self._getSoundIds(id);
                for (var i=0; i<id.length; i++) {
                    // Get the sound.
                    sound = self._soundById(id[i]);

                    if (sound) {
                        // Keep track of our position when the rate changed and update the playback
                        // start position so we can properly adjust the seek position for time elapsed.
                        sound._rateSeek = self.seek(id[i]);
                        sound._playStart = self._webAudio ? self._parent.machine.ctx.currentTime : sound._playStart;
                        sound._rate = rate;

                        // Change the playback rate.
                        if (self._webAudio && sound._node && sound._node.bufferSource) {
                            sound._node.bufferSource.playbackRate.setValueAtTime(rate, self._parent.machine.ctx.currentTime);
                        } else if (sound._node) {
                            sound._node.playbackRate = rate;
                        }

                        // Reset the timers.
                        var seek = self.seek(id[i]);
                        var duration = ((self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1000) - seek;
                        var timeout = (duration * 1000) / Math.abs(sound._rate);

                        // Start a new end timer if sound is already playing.
                        if (self._endTimers[id[i]] || !sound._paused) {
                            self._clearTimer(id[i]);
                            self._endTimers[id[i]] = setTimeout(self._ended.bind(self, sound), timeout);
                        }

                        self._emit('rate', sound._id);
                    }
                }
            } else {
                sound = self._soundById(id);
                return sound ? sound._rate : self._rate;
            }

            return self;
        },

        /**
         * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
         *   seek() -> Returns the first sound node's current seek position.
         *   seek(id) -> Returns the sound id's current seek position.
         *   seek(seek) -> Sets the seek position of the first sound node.
         *   seek(seek, id) -> Sets the seek position of passed sound id.
         * @return {Reel/Number} Returns self or the current seek position.
         */
        seek: function() {
            var self = this;
            var args = arguments;
            var seek, id;

            // Determine the values based on arguments.
            if (args.length === 0) {
                // We will simply return the current position of the first node.
                id = self._sounds[0]._id;
            } else if (args.length === 1) {
                // First check if this is an ID, and if not, assume it is a new seek position.
                var ids = self._getSoundIds();
                var index = ids.indexOf(args[0]);
                if (index >= 0) {
                    id = parseInt(args[0], 10);
                } else if (self._sounds.length) {
                    id = self._sounds[0]._id;
                    seek = parseFloat(args[0]);
                }
            } else if (args.length === 2) {
                seek = parseFloat(args[0]);
                id = parseInt(args[1], 10);
            }

            // If there is no ID, bail out.
            if (typeof id === 'undefined') {
                return self;
            }

            // If the sound hasn't loaded, add it to the load queue to seek when capable.
            if (self._state !== 'loaded' || self._playLock) {
                self._queue.push({
                    event: 'seek',
                    action: function() {
                        self.seek.apply(self, args);
                    }
                });

                return self;
            }

            // Get the sound.
            var sound = self._soundById(id);

            if (sound) {
                if (typeof seek === 'number' && seek >= 0) {
                    // Pause the sound and update position for restarting playback.
                    var playing = self.playing(id);
                    if (playing) {
                        self.pause(id, true);
                    }

                    // Move the position of the track and cancel timer.
                    sound._seek = seek;
                    sound._ended = false;
                    self._clearTimer(id);

                    // Update the seek position for HTML5 Audio.
                    if (!self._webAudio && sound._node) {
                        sound._node.currentTime = seek;
                    }

                    // Seek and emit when ready.
                    var seekAndEmit = function() {
                        self._emit('seek', id);

                        // Restart the playback if the sound was playing.
                        if (playing) {
                            self.play(id, true);
                        }
                    };

                    // Wait for the play lock to be unset before emitting (HTML5 Audio).
                    if (playing && !self._webAudio) {
                        var emitSeek = function() {
                            if (!self._playLock) {
                                seekAndEmit();
                            } else {
                                setTimeout(emitSeek, 0);
                            }
                        };
                        setTimeout(emitSeek, 0);
                    } else {
                        seekAndEmit();
                    }
                } else {
                    if (self._webAudio) {
                        var realTime = self.playing(id) ? self._parent.machine.ctx.currentTime - sound._playStart : 0;
                        var rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
                        return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
                    } else {
                        return sound._node.currentTime;
                    }
                }
            }

            return self;
        },

        /**
         * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
         * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
         * @return {Boolean} True if playing and false if not.
         */
        playing: function(id) {
            var self = this;

            // Check the passed sound ID (if any).
            if (typeof id === 'number') {
                var sound = self._soundById(id);
                return sound ? !sound._paused : false;
            }

            // Otherwise, loop through all sounds and check if any are playing.
            for (var i=0; i<self._sounds.length; i++) {
                if (!self._sounds[i]._paused) {
                    return true;
                }
            }

            return false;
        },

        /**
         * Get the duration of this sound. Passing a sound id will return the sprite duration.
         * @param  {Number} id The sound id to check. If none is passed, return full source duration.
         * @return {Number} Audio duration in seconds.
         */
        duration: function(id) {
            var self = this;
            var duration = self._duration;

            // If we pass an ID, get the sound and return the sprite length.
            var sound = self._soundById(id);
            if (sound) {
                duration = self._sprite[sound._sprite][1] / 1000;
            }

            return duration;
        },

        /**
         * Returns the current loaded state of this Reel.
         * @return {String} 'unloaded', 'loading', 'loaded'
         */
        state: function() {
            return this._state;
        },

        /**
         * Unload and destroy the current Reel object.
         * This will immediately stop all sound instances attached to this group.
         */
        unload: function() {
            var self = this;

            // Stop playing any active sounds.
            var sounds = self._sounds;
            for (var i=0; i<sounds.length; i++) {
                // Stop the sound if it is currently playing.
                if (!sounds[i]._paused) {
                    self.stop(sounds[i]._id);
                }

                // Remove the source or disconnect.
                if (!self._webAudio) {
                    // Set the source to 0-second silence to stop any downloading (except in IE).
                    var checkIE = /MSIE |Trident\//.test(self._parent.machine._navigator && self._parent.machine._navigator.userAgent);
                    if (!checkIE) {
                        sounds[i]._node.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
                    }

                    // Remove any event listeners.
                    sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
                    sounds[i]._node.removeEventListener(self._parent.machine._canPlayEvent, sounds[i]._loadFn, false);
                }

                // Empty out all of the nodes.
                delete sounds[i]._node;

                // Make sure all timers are cleared out.
                self._clearTimer(sounds[i]._id);
            }

            // Remove the references in the global TapeMachine object.
            var index = self._parent.machine._reels.indexOf(self);
            if (index >= 0) {
                self._parent.machine._reels.splice(index, 1);
            }

            // Delete this sound from the cache (if no other Reel is using it).
            var remCache = true;
            for (i=0; i<self._parent.machine._reels.length; i++) {
                if (self._parent.machine._reels[i]._src === self._src) {
                    remCache = false;
                    break;
                }
            }

            if (cache && remCache) {
                delete cache[self._src];
            }

            // Clear global errors.
            self._parent.machine.noAudio = false;

            // Clear out `self`.
            self._state = 'unloaded';
            self._sounds = [];
            self = null;

            return null;
        },

        /**
         * Listen to a custom event.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
         * @return {Reel}
         */
        on: function(event, fn, id, once) {
            var self = this;
            var events = self['_on' + event];

            if (typeof fn === 'function') {
                events.push(once ? {id: id, fn: fn, once: once} : {id: id, fn: fn});
            }

            return self;
        },

        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Reel}
         */
        off: function(event, fn, id) {
            var self = this;
            var events = self['_on' + event];
            var i = 0;

            // Allow passing just an event and ID.
            if (typeof fn === 'number') {
                id = fn;
                fn = null;
            }

            if (fn || id) {
                // Loop through event store and remove the passed function.
                for (i=0; i<events.length; i++) {
                    var isId = (id === events[i].id);
                    if (fn === events[i].fn && isId || !fn && isId) {
                        events.splice(i, 1);
                        break;
                    }
                }
            } else if (event) {
                // Clear out all events of this type.
                self['_on' + event] = [];
            } else {
                // Clear out all events of every type.
                var keys = Object.keys(self);
                for (i=0; i<keys.length; i++) {
                    if ((keys[i].indexOf('_on') === 0) && Array.isArray(self[keys[i]])) {
                        self[keys[i]] = [];
                    }
                }
            }

            return self;
        },

        /**
         * Listen to a custom event and remove it once fired.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @return {Reel}
         */
        once: function(event, fn, id) {
            var self = this;

            // Setup the event listener.
            self.on(event, fn, id, 1);

            return self;
        },

        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Reel}
         */
        _emit: function(event, id, msg) {
            var self = this;
            var events = self['_on' + event];

            // Loop through event store and fire all functions.
            for (var i=events.length-1; i>=0; i--) {
                // Only fire the listener if the correct ID is used.
                if (!events[i].id || events[i].id === id || event === 'load') {
                    setTimeout(function(fn) {
                        fn.call(this, id, msg);
                    }.bind(self, events[i].fn), 0);

                    // If this event was setup with `once`, remove it.
                    if (events[i].once) {
                        self.off(event, events[i].fn, events[i].id);
                    }
                }
            }

            // Pass the event type into load queue so that it can continue stepping.
            self._loadQueue(event);

            return self;
        },

        /**
         * Queue of actions initiated before the sound has loaded.
         * These will be called in sequence, with the next only firing
         * after the previous has finished executing (even if async like play).
         * @return {Reel}
         */
        _loadQueue: function(event) {
            var self = this;

            if (self._queue.length > 0) {
                var task = self._queue[0];

                // Remove this task if a matching event was passed.
                if (task.event === event) {
                    self._queue.shift();
                    self._loadQueue();
                }

                // Run the task if no event type is passed.
                if (!event) {
                    task.action();
                }
            }

            return self;
        },

        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Reel}
         */
        _ended: function(sound) {
            var self = this;
            var sprite = sound._sprite;

            // If we are using IE and there was network latency we may be clipping
            // audio before it completes playing. Lets check the node to make sure it
            // believes it has completed, before ending the playback.
            if (!self._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop) {
                setTimeout(self._ended.bind(self, sound), 100);
                return self;
            }

            // Should this sound loop?
            var loop = !!(sound._loop || self._sprite[sprite][2]);

            // Fire the ended event.
            self._emit('end', sound._id);

            // Restart the playback for HTML5 Audio loop.
            if (!self._webAudio && loop) {
                self.stop(sound._id, true).play(sound._id);
            }

            // Restart this timer if on a Web Audio loop.
            if (self._webAudio && loop) {
                self._emit('play', sound._id);
                sound._seek = sound._start || 0;
                sound._rateSeek = 0;
                sound._playStart = self._parent.machine.ctx.currentTime;

                var timeout = ((sound._stop - sound._start) * 1000) / Math.abs(sound._rate);
                self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
            }

            // Mark the node as paused.
            if (self._webAudio && !loop) {
                sound._paused = true;
                sound._ended = true;
                sound._seek = sound._start || 0;
                sound._rateSeek = 0;
                self._clearTimer(sound._id);

                // Clean up the buffer source.
                self._cleanBuffer(sound._node);

                // Attempt to auto-suspend AudioContext if no sounds are still playing.
                self.machine._autoSuspend();
            }

            // When using a sprite, end the track.
            if (!self._webAudio && !loop) {
                self.stop(sound._id, true);
            }

            return self;
        },

        /**
         * Clear the end timer for a sound playback.
         * @param  {Number} id The sound ID.
         * @return {Reel}
         */
        _clearTimer: function(id) {
            var self = this;

            if (self._endTimers[id]) {
                // Clear the timeout or remove the ended listener.
                if (typeof self._endTimers[id] !== 'function') {
                    clearTimeout(self._endTimers[id]);
                } else {
                    var sound = self._soundById(id);
                    if (sound && sound._node) {
                        sound._node.removeEventListener('ended', self._endTimers[id], false);
                    }
                }

                delete self._endTimers[id];
            }

            return self;
        },

        /**
         * Return the sound identified by this ID, or return null.
         * @param  {Number} id Sound ID
         * @return {Object}    Sound object or null.
         */
        _soundById: function(id) {
            var self = this;

            // Loop through all sounds and find the one with this ID.
            for (var i=0; i<self._sounds.length; i++) {
                if (id === self._sounds[i]._id) {
                    return self._sounds[i];
                }
            }

            return null;
        },

        /**
         * Return an inactive sound from the pool or create a new one.
         * @return {Sound} Sound playback object.
         */
        _inactiveSound: function() {
            var self = this;

            self._drain();

            // Find the first inactive node to recycle.
            for (var i=0; i<self._sounds.length; i++) {
                if (self._sounds[i]._ended) {
                    return self._sounds[i].reset();
                }
            }

            // If no inactive node was found, create a new one.
            return new Sound(self);
        },

        /**
         * Drain excess inactive sounds from the pool.
         */
        _drain: function() {
            var self = this;
            var limit = self._pool;
            var cnt = 0;
            var i = 0;

            // If there are less sounds than the max pool size, we are done.
            if (self._sounds.length < limit) {
                return;
            }

            // Count the number of inactive sounds.
            for (i=0; i<self._sounds.length; i++) {
                if (self._sounds[i]._ended) {
                    cnt++;
                }
            }

            // Remove excess inactive sounds, going in reverse order.
            for (i=self._sounds.length - 1; i>=0; i--) {
                if (cnt <= limit) {
                    return;
                }

                if (self._sounds[i]._ended) {
                    // Disconnect the audio source when using Web Audio.
                    if (self._webAudio && self._sounds[i]._node) {
                        self._sounds[i]._node.disconnect(0);
                    }

                    // Remove sounds until we have the pool size.
                    self._sounds.splice(i, 1);
                    cnt--;
                }
            }
        },

        /**
         * Get all ID's from the sounds pool.
         * @param  {Number} id Only return one ID if one is passed.
         * @return {Array}    Array of IDs.
         */
        _getSoundIds: function(id) {
            var self = this;

            if (typeof id === 'undefined') {
                var ids = [];
                for (var i=0; i<self._sounds.length; i++) {
                    ids.push(self._sounds[i]._id);
                }

                return ids;
            } else {
                return [id];
            }
        },

        /**
         * Load the sound back into the buffer source.
         * @param  {Sound} sound The sound object to work with.
         * @return {Reel}
         */
        _refreshBuffer: function(sound) {
            var self = this;

            // Setup the buffer source for playback.
            sound._node.bufferSource = self.machine.ctx.createBufferSource();
            sound._node.bufferSource.buffer = cache[self._src].vocoder || cache[self._src].main;

            // Connect to the correct node.
            if (sound._panner) {
                sound._node.bufferSource.connect(sound._panner);
            } else {
                sound._node.bufferSource.connect(sound._node);
            }

            // Setup looping and playback rate.
            sound._node.bufferSource.loop = sound._loop;
            if (sound._loop) {
                sound._node.bufferSource.loopStart = sound._start || 0;
                sound._node.bufferSource.loopEnd = sound._stop || 0;
            }
            sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, self.machine.ctx.currentTime);

            return self;
        },

        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Reel}
         */
        _cleanBuffer: function(node) {
            var self = this;

            if (self.machine._scratchBuffer && node.bufferSource) {
                node.bufferSource.onended = null;
                node.bufferSource.disconnect(0);
                try { node.bufferSource.buffer = self.machine._scratchBuffer; } catch(e) {}
                var attemptsGiven = 200;
                var interval = setInterval(function() {
                    try {
                        node.bufferSource.onended = null;
                        node.bufferSource.disconnect(0);
                    } catch(e) {
                        attemptsGiven = 0;
                    }
                    if (attemptsGiven <= 0) {
                        clearInterval(interval);
                    }
                }, 10);
            }
            node.bufferSource = null;

            return self;
        }
    };

    /** Single Sound Methods **/
    /***************************************************************************/

    /**
     * Setup the sound object, which each node attached to a Reel group is contained in.
     * @param {Object} reel The Reel parent group.
     */
    var Sound = function(reel) {
        this._parent = reel;
        this.init();
    };
    Sound.prototype = {
        /**
         * Initialize a new Sound object.
         * @return {Sound}
         */
        init: function() {
            var self = this;
            var parent = self._parent;

            // Setup the default parameters.
            self._muted = parent._muted;
            self._loop = parent._loop;
            self._volume = parent._volume;
            self._rate = parent._rate;
            self._seek = 0;
            self._paused = true;
            self._ended = true;
            self._sprite = '__default';

            // Generate a unique ID for this sound.
            self._id = ++parent.machine._counter;

            // Add itself to the parent's pool.
            parent._sounds.push(self);

            // Create the new node.
            self.create();

            return self;
        },

        /**
         * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
         * @return {Sound}
         */
        create: function() {
            var self = this;
            var parent = self._parent;
            var volume = (parent.machine._muted || self._muted || self._parent._muted) ? 0 : self._volume;

            if (parent._webAudio) {
                // Create the gain node for controlling volume (the source will connect to this).
                self._node = (typeof parent.machine.ctx.createGain === 'undefined') ? parent.machine.ctx.createGainNode() : parent.machine.ctx.createGain();
                self._node.gain.setValueAtTime(volume, parent.machine.ctx.currentTime);
                self._node.paused = true;
                // manage connections
                var nodeToConnect = self._node;
                var nextEffect;
                if (parent.effects && parent.effects.length) {
                    for (var i = 0; i < parent.effects.length; i++) {
                        nextEffect = parent.effects[i];
                        nodeToConnect.connect(nextEffect.input);
                        nodeToConnect = parent.effects[i].output;
                    }
                }
                nodeToConnect.connect(parent._destination);

            } else {
                self._node = new Audio();

                // Listen for errors (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).
                self._errorFn = self._errorListener.bind(self);
                self._node.addEventListener('error', self._errorFn, false);

                // Listen for 'canplaythrough' event to let us know the sound is ready.
                self._loadFn = self._loadListener.bind(self);
                self._node.addEventListener(parent.machine._canPlayEvent, self._loadFn, false);

                // Setup the new audio node.
                self._node.src = parent._src;
                self._node.preload = 'auto';
                self._node.volume = volume * parent.machine.volume();

                // Begin loading the source.
                self._node.load();
            }

            return self;
        },

        /**
         * Reset the parameters of this sound to the original state (for recycle).
         * @return {Sound}
         */
        reset: function() {
            var self = this;
            var parent = self._parent;

            // Reset all of the parameters of this sound.
            self._muted = parent._muted;
            self._loop = parent._loop;
            self._volume = parent._volume;
            self._rate = parent._rate;
            self._seek = 0;
            self._rateSeek = 0;
            self._paused = true;
            self._ended = true;
            self._sprite = '__default';

            // Generate a new ID so that it isn't confused with the previous sound.
            self._id = ++parent.machine._counter;

            return self;
        },

        /**
         * HTML5 Audio error listener callback.
         */
        _errorListener: function() {
            var self = this;

            // Fire an error event and pass back the code.
            self._parent._emit('loaderror', self._id, self._node.error ? self._node.error.code : 0);

            // Clear the event listener.
            self._node.removeEventListener('error', self._errorFn, false);
        },

        /**
         * HTML5 Audio canplaythrough listener callback.
         */
        _loadListener: function() {
            var self = this;
            var parent = self._parent;

            // Round up the duration to account for the lower precision in HTML5 Audio.
            parent._duration = Math.ceil(self._node.duration * 10) / 10;

            // Setup a sprite if none is defined.
            if (Object.keys(parent._sprite).length === 0) {
                parent._sprite = {__default: [0, parent._duration * 1000]};
            }

            if (parent._state !== 'loaded') {
                parent._state = 'loaded';
                parent._emit('load');
                parent._loadQueue();
            }

            // Clear the event listener.
            self._node.removeEventListener(parent.machine._canPlayEvent, self._loadFn, false);
        }
    };

    /** Helper Methods **/
    /***************************************************************************/

    var cache = {};

    /**
     * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
     * @param  {Reel} self
     */
    var loadBuffer = function(self) {
        var url = self._src;

        // Check if the buffer has already been cached and use it instead.
        if (cache[url] && !self._vocode) {
            if (self._vocode) {
                // self._duration = cache[url].vocoder.duration;
                // loadSound(self, cache[url].vocoder);
                decodeAudioData(cache[url].main, self);
            } else {
                // Set the duration from the cache.
                self._duration = cache[url].main.duration;

                // Load the sound into this Reel.
                loadSound(self, cache[url].main);

                return;
            }

        }

        if (/^data:[^;]+;base64,/.test(url)) {
            // Decode the base64 data URI without XHR, since some browsers don't support it.
            var data = atob(url.split(',')[1]);
            var dataView = new Uint8Array(data.length);
            for (var i=0; i<data.length; ++i) {
                dataView[i] = data.charCodeAt(i);
            }

            decodeAudioData(dataView.buffer, self);
        } else {
            // Load the buffer from the URL.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.withCredentials = self._xhrWithCredentials;
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                // Make sure we get a successful response back.
                var code = (xhr.status + '')[0];
                if (code !== '0' && code !== '2' && code !== '3') {
                    self._emit('loaderror', null, 'Failed loading audio file with status: ' + xhr.status + '.');
                    return;
                }

                decodeAudioData(xhr.response, self);
            };
            xhr.onerror = function() {
                // If there is an error, switch to HTML5 Audio.
                if (self._webAudio) {
                    self._html5 = true;
                    self._webAudio = false;
                    self._sounds = [];
                    delete cache[url];
                    self.load();
                }
            };
            safeXhrSend(xhr);
        }
    };

    /**
     * Send the XHR request wrapped in a try/catch.
     * @param  {Object} xhr XHR to send.
     */
    var safeXhrSend = function(xhr) {
        try {
            xhr.send();
        } catch (e) {
            xhr.onerror();
        }
    };

    /**
     * Decode audio data from an array buffer.
     * @param  {ArrayBuffer} arraybuffer The audio data.
     * @param  {Reel}        self
     */
    var decodeAudioData = function(arraybuffer, self) {
        // Fire a load error if something broke.
        var error = function() {
            self._emit('loaderror', null, 'Decoding audio data failed.');
        };

        // Load the sound on success.
        var success = function(buffer) {
            if (buffer && self._sounds.length > 0) {
                if (self._vocode) {
                    WAAPlayer(buffer, 2048, 4096, self._rate, self._pitchShift).then(function(waaBuffer) {
                        cache[self._src] = {main: buffer, vocoder: waaBuffer};
                        self._cachedBuffer = buffer;
                        self._cachedPreVocodedBuffer = waaBuffer;
                        loadSound(self, waaBuffer);
                    })
                } else {
                    cache[self._src] = {main: buffer, vocoder: null};
                    self._cachedBuffer = buffer;
                    self._cachedPreVocodedBuffer = null;
                    loadSound(self, buffer);
                }
            } else {
                error();
            }
        };

        // Decode the buffer into an audio source.
        if (typeof Promise !== 'undefined' && self.machine.ctx.decodeAudioData.length === 1) {
            self.machine.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
        } else {
            self.machine.ctx.decodeAudioData(arraybuffer, success, error);
        }
    }

    /**
     * Sound is now loaded, so finish setting everything up and fire the loaded event.
     * @param  {Reel} self
     * @param  {Object} buffer The decoded buffer sound source.
     */
    var loadSound = function(self, buffer) {
        // Set the duration.
        if (buffer && !self._duration) {
            self._duration = buffer.duration;
        }

        // Setup a sprite if none is defined.
        if (Object.keys(self._sprite).length === 0) {
            self._sprite = {__default: [0, self._duration * 1000]};
        }


        // Fire the loaded event.
        if (self._state !== 'loaded') {
            self._state = 'loaded';
            self._emit('load');
            self._loadQueue();
        }
    };

    /**
     * Setup the audio context when available, or switch to HTML5 Audio mode.
     */
    var setupAudioContext = function() {
        // Check if we are using Web Audio and setup the AudioContext if we are.
        try {
            if (typeof AudioContext !== 'undefined') {
                TapeMachine0.ctx = new AudioContext();
                TapeMachine1.ctx = new AudioContext();
                TapeMachine2.ctx = new AudioContext();
                TapeMachine3.ctx = new AudioContext();
                TapeMachine4.ctx = new AudioContext();
                TapeMachine5.ctx = new AudioContext();
            } else if (typeof webkitAudioContext !== 'undefined') {
                TapeMachine0.ctx = new webkitAudioContext();
                TapeMachine1.ctx = new webkitAudioContext();
                TapeMachine2.ctx = new webkitAudioContext();
                TapeMachine3.ctx = new webkitAudioContext();
                TapeMachine4.ctx = new webkitAudioContext();
                TapeMachine5.ctx = new webkitAudioContext();
            } else {
                TapeMachine0.usingWebAudio = false;
                TapeMachine1.usingWebAudio = false;
                TapeMachine2.usingWebAudio = false;
                TapeMachine3.usingWebAudio = false;
                TapeMachine4.usingWebAudio = false;
                TapeMachine5.usingWebAudio = false;
            }
            /*
            TapeMachine0.ctx.audioWorklet.addModule('gain-processor.js');
            TapeMachine1.ctx.audioWorklet.addModule('gain-processor.js');
            TapeMachine2.ctx.audioWorklet.addModule('gain-processor.js');
            TapeMachine3.ctx.audioWorklet.addModule('gain-processor.js');
            TapeMachine4.ctx.audioWorklet.addModule('gain-processor.js');
            TapeMachine5.ctx.audioWorklet.addModule('gain-processor.js');
            */
        } catch(e) {
            TapeMachine0.usingWebAudio = false;
            TapeMachine1.usingWebAudio = false;
            TapeMachine2.usingWebAudio = false;
            TapeMachine3.usingWebAudio = false;
            TapeMachine4.usingWebAudio = false;
            TapeMachine5.usingWebAudio = false;
        }

        // Check if a webview is being used on iOS8 or earlier (rather than the browser).
        // If it is, disable Web Audio as it causes crashing.
        var iOS = (/iP(hone|od|ad)/.test(TapeMachine0._navigator && TapeMachine0._navigator.platform));
        var appVersion = TapeMachine0._navigator && TapeMachine0._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
        var version = appVersion ? parseInt(appVersion[1], 10) : null;
        if (iOS && version && version < 9) {
            var safari = /safari/.test(TapeMachine0._navigator && TapeMachine0._navigator.userAgent.toLowerCase());
            if (TapeMachine0._navigator && TapeMachine0._navigator.standalone && !safari || TapeMachine0._navigator && !TapeMachine0._navigator.standalone && !safari) {
                TapeMachine0.usingWebAudio = false;
                TapeMachine1.usingWebAudio = false;
                TapeMachine2.usingWebAudio = false;
                TapeMachine3.usingWebAudio = false;
                TapeMachine4.usingWebAudio = false;
                TapeMachine5.usingWebAudio = false;
            }
        }

        // Create and expose the master GainNode when using Web Audio (useful for plugins or advanced usage).
        if (TapeMachine0.usingWebAudio) {
            TapeMachine0.masterGain = (typeof TapeMachine0.ctx.createGain === 'undefined') ? TapeMachine0.ctx.createGainNode() : TapeMachine0.ctx.createGain();
            TapeMachine0.masterGain.gain.setValueAtTime(TapeMachine0._muted ? 0 : 1, TapeMachine0.ctx.currentTime);
            TapeMachine0.masterGain.connect(TapeMachine0.ctx.destination);

            TapeMachine1.masterGain = (typeof TapeMachine1.ctx.createGain === 'undefined') ? TapeMachine1.ctx.createGainNode() : TapeMachine1.ctx.createGain();
            TapeMachine1.masterGain.gain.setValueAtTime(TapeMachine1._muted ? 0 : 1, TapeMachine1.ctx.currentTime);
            TapeMachine1.masterGain.connect(TapeMachine1.ctx.destination);

            TapeMachine2.masterGain = (typeof TapeMachine2.ctx.createGain === 'undefined') ? TapeMachine2.ctx.createGainNode() : TapeMachine2.ctx.createGain();
            TapeMachine2.masterGain.gain.setValueAtTime(TapeMachine2._muted ? 0 : 1, TapeMachine2.ctx.currentTime);
            TapeMachine2.masterGain.connect(TapeMachine2.ctx.destination);

            TapeMachine3.masterGain = (typeof TapeMachine3.ctx.createGain === 'undefined') ? TapeMachine3.ctx.createGainNode() : TapeMachine3.ctx.createGain();
            TapeMachine3.masterGain.gain.setValueAtTime(TapeMachine3._muted ? 0 : 1, TapeMachine3.ctx.currentTime);
            TapeMachine3.masterGain.connect(TapeMachine3.ctx.destination);

            TapeMachine4.masterGain = (typeof TapeMachine4.ctx.createGain === 'undefined') ? TapeMachine4.ctx.createGainNode() : TapeMachine4.ctx.createGain();
            TapeMachine4.masterGain.gain.setValueAtTime(TapeMachine4._muted ? 0 : 1, TapeMachine4.ctx.currentTime);
            TapeMachine4.masterGain.connect(TapeMachine4.ctx.destination);

            TapeMachine5.masterGain = (typeof TapeMachine5.ctx.createGain === 'undefined') ? TapeMachine5.ctx.createGainNode() : TapeMachine5.ctx.createGain();
            TapeMachine5.masterGain.gain.setValueAtTime(TapeMachine5._muted ? 0 : 1, TapeMachine5.ctx.currentTime);
            TapeMachine5.masterGain.connect(TapeMachine5.ctx.destination);
        }

        // Re-run the setup on TapeMachine.
        TapeMachine0._setup();
        TapeMachine1._setup();
        TapeMachine2._setup();
        TapeMachine3._setup();
        TapeMachine4._setup();
        TapeMachine5._setup();
    };

    /****************************************************************************************/

    var Bus = function(o) {
        this.init(o);
    };

    Bus.prototype = {
        init: function(o) {
            var self = this;

            self.machine = o.machine;

            self.node = self.machine.ctx.createGain();
            self.node.gain.value = 1;
            self.effects = o.effects || [];
            var nodeToConnect = self.node;
            var nextEffect;
            if (self.effects && self.effects.length) {
                for (var i = 0; i < self.effects.length; i++) {
                    nextEffect = self.effects[i];
                    nodeToConnect.connect(nextEffect.input);
                    nodeToConnect = self.effects[i].output;
                }
            }
            nodeToConnect.connect(self.machine.masterGain);
        },

        // TODO: this function should be just for effects
        update: function(o) {
            var self = this;
            if (o.effects) {
                var prevEffects = self.effects;
                self.effects = o.effects;
                var nextEffect;
                // Triggered when undo is called (only works with one effect...)
                if (prevEffects && prevEffects.length > self.effects.length && prevEffects.length === 2) {
                    prevEffects[1].output.disconnect();
                }
                var nodeToDisconnect = self.node;
                for (var h = 0; h < prevEffects.length; h++) {
                    nodeToDisconnect.disconnect();
                    nodeToDisconnect = prevEffects[h].output;
                }
                var nodeToConnect = self.node;
                for (var i = 0; i < self.effects.length; i++) {
                    nextEffect = self.effects[i];
                    nodeToConnect.disconnect();
                    nodeToConnect.connect(nextEffect.input);
                    nodeToConnect = self.effects[i].output;
                }
                nodeToConnect.connect(self.machine.masterGain);
            }

        },

        mute: function() {
            var self = this;
            self.node.gain.value = 0;
        },

        unmute: function() {
            var self = this;
            self.node.gain.value = 1;
        }
    };

    /***********************/

    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                TapeMachine0: TapeMachine0,
                TapeMachine1: TapeMachine1,
                TapeMachine2: TapeMachine2,
                TapeMachine3: TapeMachine3,
                TapeMachine4: TapeMachine4,
                TapeMachine5: TapeMachine5,
                Reel: Reel,
                Bus: Bus
            };
        });
    }

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.TapeMachine0 = TapeMachine0;
        exports.TapeMachine1 = TapeMachine1;
        exports.TapeMachine2 = TapeMachine2;
        exports.TapeMachine3 = TapeMachine3;
        exports.TapeMachine4 = TapeMachine4;
        exports.TapeMachine5 = TapeMachine5;
        exports.Reel = Reel;
        exports.Bus = Bus;
    }

    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.TapeMachineGlobal = TapeMachineGlobal;
        window.TapeMachine0 = TapeMachine0;
        window.TapeMachine1 = TapeMachine1;
        window.TapeMachine2 = TapeMachine2;
        window.TapeMachine3 = TapeMachine3;
        window.TapeMachine4 = TapeMachine4;
        window.TapeMachine5 = TapeMachine5;
        window.Reel = Reel;
        window.Bus = Bus;
        window.Sound = Sound;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.TapeMachineGlobal = TapeMachineGlobal;
        global.TapeMachine0 = TapeMachine0;
        global.TapeMachine1 = TapeMachine1;
        global.TapeMachine2 = TapeMachine2;
        global.TapeMachine3 = TapeMachine3;
        global.TapeMachine4 = TapeMachine4;
        global.TapeMachine5 = TapeMachine5;
        global.Bus = Bus;
        global.Reel = Reel;
        global.Sound = Sound;
    }
})();
