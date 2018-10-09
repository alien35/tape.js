var createAudioParam = function(audioContext, name, options){
    // options: provider, target(s)

    options = options || {}

    var targets = options.targets

    if (!targets && options.target){
        targets = [options.target]
    } else if (!targets){
        targets = []
    }

    var param = Object.create(AudioParam.prototype, {
        value: {
            get: function(){
                return param._lastValue
            },
            set: function(value){
                value = param.fence(value)
                param._lastValue = value
                for (var i=0,l=targets.length;i<l;i++){
                    var target = targets[i]
                    target.value = value
                }
            }
        },
        defaultValue: {
            get: function(){
                return options.defaultValue
            }
        },
        name: {
            value: name,
            writable: false
        },
        min: {
            value: options.min,
            writable: false
        },
        max: {
            value: options.max,
            writable: false
        }
    })



    param._targets = targets
    param._lastValue = options.defaultValue

    // override proto-methods
    param.setValueAtTime = setValueAtTime
    param.linearRampToValueAtTime = linearRampToValueAtTime
    param.exponentialRampToValueAtTime = exponentialRampToValueAtTime
    param.setTargetAtTime = setTargetAtTime
    param.setValueCurveAtTime = setValueCurveAtTime
    param.cancelScheduledValues = cancelScheduledValues
    param.addTarget = addTarget
    param.clearTargets = clearTargets
    param.context = audioContext

    // get value between min and max
    param.fence = fence

    // set initial value
    if (options.defaultValue != null){
        param.value = options.defaultValue
    }

    return param
}

function fence(value){
    if (this.min != null){
        value = Math.max(this.min, value)
    }

    if (this.max != null){
        value = Math.min(this.max, value)

    }
    return value
}

function setValueAtTime(value, startTime){
    var targets = this._targets
    value = this.fence(value)

    this._lastValue = value

    for (var i=0,l=targets.length;i<l;i++){
        targets[i].setValueAtTime(value, startTime)
    }
}

function setTargetAtTime(value, startTime, timeConstant){
    // this needs to be rewritten to use custom curve
    var targets = this._targets
    value = this.fence(value)
    for (var i=0,l=targets.length;i<l;i++){
        if (targets[i].setTargetAtTime){
            targets[i].setTargetAtTime(value, startTime, timeConstant)
        }
    }
}

function linearRampToValueAtTime(value, endTime){
    var targets = this._targets
    value = this.fence(value)

    this._lastValue = value

    for (var i=0,l=targets.length;i<l;i++){
        targets[i].linearRampToValueAtTime(value, endTime)
    }
}

function exponentialRampToValueAtTime(value, endTime){
    var targets = this._targets
    value = this.fence(value)

    this._lastValue = value

    for (var i=0,l=targets.length;i<l;i++){
        targets[i].exponentialRampToValueAtTime(value, endTime)
    }
}

function setValueCurveAtTime(curve, startTime, duration){
    var targets = this._targets
    this._lastValue = curve[curve.length-1]

    for (var i=0,l=targets.length;i<l;i++){
        targets[i].setValueCurveAtTime(curve, startTime, duration)
    }
}

function cancelScheduledValues(startTime){
    var targets = this._targets
    for (var i=0,l=targets.length;i<l;i++){
        targets[i].cancelScheduledValues(startTime)
    }
}

function clearTargets(){
    this._targets = []
}

function addTarget(target){
    this._targets.push(target)
    if (this._lastValue != null){
        target.value = this._lastValue
    }
}

/// AUDIO PARAM END

var createAudioNode = function(input, output, params, onDestinationChange){
    var audioContext = (input || output).context

    var node = audioContext.createGain()
    node._onDestinationChange = onDestinationChange

    if (input){
        node.connect(input)
    }

    node._output = output
    node._targetCount = 0

    if (output){
        node.connect = connect
        node.disconnect = disconnect
    }

    addAudioParams(node, params)

    return node
}

function connect(destination, channel){
    this._targetCount += 1
    this._output.connect(destination, channel)
    if (typeof this._onDestinationChange === 'function'){
        this._onDestinationChange(this._targetCount)
    }
}

function disconnect(param){
    this._targetCount = 0
    this._output.disconnect(param)
    if (typeof this._onDestinationChange === 'function'){
        this._onDestinationChange(this._targetCount)
    }
}

function addAudioParams(node, params){
    if (params){
        var keys = Object.keys(params)
        for (var i=0,l=keys.length;i<l;i++){
            var key = keys[i]
            node[key] = createAudioParam(node.context, key, params[key])
        }
    }
}

/// CREATE AUDIO NODE END



var PitchShift = (audioContext) => {
    var instance = new Jungle(audioContext)
    var input = audioContext.createGain()
    var wet = audioContext.createGain()
    var dry = audioContext.createGain()
    var output = audioContext.createGain()

    dry.gain.value = 0

    input.connect(wet)
    input.connect(dry)

    wet.connect(instance.input)
    instance.output.connect(output)

    dry.connect(output)

    var node = createAudioNode(input, output, {
        dry: {
            min: 0,
            defaultValue: 0,
            target: dry.gain
        },
        wet: {
            min: 0,
            defaultValue: 1,
            target: wet.gain
        }
    })

    instance.setPitchOffset(getMultiplier(12))

    var transpose = 0
    Object.defineProperty(node, 'transpose', {
        set: function(value){
            transpose = getMultiplier(value)
            instance.setPitchOffset(transpose)
        },
        get: function(){
            return transpose
        }
    });

    Object.defineProperty(node, 'input', {
        value: input,
        writable: false
    });

    Object.defineProperty(node, 'output', {
        value: output,
        writable: false
    });

    return node
}

function getMultiplier(x){

    // don't ask...
    if (x<0){
        return x/12
    } else {
        var a5 = 1.8149080040913423e-7
        var a4 = -0.000019413043101157434
        var a3 = 0.0009795096626987743
        var a2 = -0.014147877819596033
        var a1 = 0.23005591195033048
        var a0 = 0.02278153473118749

        var x1 = x
        var x2 = x*x
        var x3 = x*x*x
        var x4 = x*x*x*x
        var x5 = x*x*x*x*x

        return a0 + x1*a1 + x2*a2 + x3*a3 + x4*a4 + x5*a5
    }

}

// include https://github.com/cwilso/Audio-Input-Effects/blob/master/js/jungle.js

// Copyright 2012, Google Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

function createFadeBuffer(context, activeTime, fadeTime) {
    var length1 = activeTime * context.sampleRate;
    var length2 = (activeTime - 2*fadeTime) * context.sampleRate;
    var length = length1 + length2;
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var p = buffer.getChannelData(0);

    var fadeLength = fadeTime * context.sampleRate;

    var fadeIndex1 = fadeLength;
    var fadeIndex2 = length1 - fadeLength;

    // 1st part of cycle
    for (var i = 0; i < length1; ++i) {
        var value;

        if (i < fadeIndex1) {
            value = Math.sqrt(i / fadeLength);
        } else if (i >= fadeIndex2) {
            value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
        } else {
            value = 1;
        }

        p[i] = value;
    }

    // 2nd part
    for (var i = length1; i < length; ++i) {
        p[i] = 0;
    }


    return buffer;
}

function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
    var length1 = activeTime * context.sampleRate;
    var length2 = (activeTime - 2*fadeTime) * context.sampleRate;
    var length = length1 + length2;
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var p = buffer.getChannelData(0);

    // 1st part of cycle
    for (var i = 0; i < length1; ++i) {
        if (shiftUp)
        // This line does shift-up transpose
            p[i] = (length1-i)/length;
        else
        // This line does shift-down transpose
            p[i] = i / length1;
    }

    // 2nd part
    for (var i = length1; i < length; ++i) {
        p[i] = 0;
    }

    return buffer;
}

var delayTime = 0.100;
var fadeTime = 0.050;
var bufferTime = 0.100;

function Jungle(context) {
    this.context = context;
    // Create nodes for the input and output of this "module".
    var input = context.createGain();
    var output = context.createGain();
    this.input = input;
    this.output = output;

    // Delay modulation.
    var mod1 = context.createBufferSource();
    var mod2 = context.createBufferSource();
    var mod3 = context.createBufferSource();
    var mod4 = context.createBufferSource();
    this.shiftDownBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, false);
    this.shiftUpBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, true);
    mod1.buffer = this.shiftDownBuffer;
    mod2.buffer = this.shiftDownBuffer;
    mod3.buffer = this.shiftUpBuffer;
    mod4.buffer = this.shiftUpBuffer;
    mod1.loop = true;
    mod2.loop = true;
    mod3.loop = true;
    mod4.loop = true;

    // for switching between oct-up and oct-down
    var mod1Gain = context.createGain();
    var mod2Gain = context.createGain();
    var mod3Gain = context.createGain();
    mod3Gain.gain.value = 0;
    var mod4Gain = context.createGain();
    mod4Gain.gain.value = 0;

    mod1.connect(mod1Gain);
    mod2.connect(mod2Gain);
    mod3.connect(mod3Gain);
    mod4.connect(mod4Gain);

    // Delay amount for changing pitch.
    var modGain1 = context.createGain();
    var modGain2 = context.createGain();

    var delay1 = context.createDelay();
    var delay2 = context.createDelay();
    mod1Gain.connect(modGain1);
    mod2Gain.connect(modGain2);
    mod3Gain.connect(modGain1);
    mod4Gain.connect(modGain2);
    modGain1.connect(delay1.delayTime);
    modGain2.connect(delay2.delayTime);

    // Crossfading.
    var fade1 = context.createBufferSource();
    var fade2 = context.createBufferSource();
    var fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
    fade1.buffer = fadeBuffer
    fade2.buffer = fadeBuffer;
    fade1.loop = true;
    fade2.loop = true;

    var mix1 = context.createGain();
    var mix2 = context.createGain();
    mix1.gain.value = 0;
    mix2.gain.value = 0;

    fade1.connect(mix1.gain);
    fade2.connect(mix2.gain);

    // Connect processing graph.
    input.connect(delay1);
    input.connect(delay2);
    delay1.connect(mix1);
    delay2.connect(mix2);
    mix1.connect(output);
    mix2.connect(output);

    // Start
    var t = context.currentTime + 0.050;
    var t2 = t + bufferTime - fadeTime;
    mod1.start(t);
    mod2.start(t2);
    mod3.start(t);
    mod4.start(t2);
    fade1.start(t);
    fade2.start(t2);

    this.mod1 = mod1;
    this.mod2 = mod2;
    this.mod1Gain = mod1Gain;
    this.mod2Gain = mod2Gain;
    this.mod3Gain = mod3Gain;
    this.mod4Gain = mod4Gain;
    this.modGain1 = modGain1;
    this.modGain2 = modGain2;
    this.fade1 = fade1;
    this.fade2 = fade2;
    this.mix1 = mix1;
    this.mix2 = mix2;
    this.delay1 = delay1;
    this.delay2 = delay2;

    this.setDelay(delayTime);
}

Jungle.prototype.setDelay = function(delayTime) {
    this.modGain1.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
    this.modGain2.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
}

Jungle.prototype.setPitchOffset = function(mult) {
    if (mult>0) { // pitch up
        this.mod1Gain.gain.value = 0;
        this.mod2Gain.gain.value = 0;
        this.mod3Gain.gain.value = 1;
        this.mod4Gain.gain.value = 1;
    } else { // pitch down
        this.mod1Gain.gain.value = 1;
        this.mod2Gain.gain.value = 1;
        this.mod3Gain.gain.value = 0;
        this.mod4Gain.gain.value = 0;
    }
    this.setDelay(delayTime*Math.abs(mult));
}


/* global $, Gauge */
$(document).ready(function () {
    'use strict';

    var baseFreq = 440;
    var currentNoteIndex = 57; // A4
    var isRefSoundPlaying = false;
    var isMicrophoneInUse = false;
    var frameId,
        freqTable,
        gauge,
        micStream,
        notesArray,
        audioContext,
        sourceAudioNode,
        analyserAudioNode,
        centsOff;

    var isAudioContextSupported = function () {
        // This feature is still prefixed in Safari
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (window.AudioContext) {
            return true;
        }
        else {
            return false;
        }
    };

    var reportError = function (message) {
        $('#errorMessage').html(message).show();
    };

    var init = function () {
        $.getJSON('notes.json', function (data) {
            freqTable = data;
        });

        $('.tuner__options').toggle(false);

        var gaugeCanvas = $('#gaugeCanvas')[0];
        gauge = new Gauge(gaugeCanvas).setOptions({
            strokeColor: '#dedede',
            pointer: {
                length: 0.8,
                strokeWidth: 0.035
            },
            angle: 0,
            lineWidth: 0.30,
            fontSize: 30,
            limitMax: true
        });
        gauge.maxValue = 100;

        // This gauge control does not look good in all browsers if set to 0 from the beginning.
        // Setting it to 1 and then to 0 solves this.
        gauge.set(1);
        gauge.set(0);

        if (isAudioContextSupported()) {
            audioContext = new window.AudioContext();
        }
        else {
            reportError('AudioContext is not supported in this browser');
        }
    };

    var updatePitch = function (pitch) {
        $('#pitch').text(pitch + ' Hz');
    };

    var updateNote = function (note) {
        $('#note').text(note);
    };

    var updateCents = function (cents) {
        // We may get negative values here.
        // Add 50 cents to what we get
        centsOff = cents + 50;
        gauge.set(cents + 50);
        $('#cents').text(cents);
    };

    var isGetUserMediaSupported = function () {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia) {
            return true;
        }

        return false;
    };

    var findFundamentalFreq = function (buffer, sampleRate) {
        // We use Autocorrelation to find the fundamental frequency.

        // In order to correlate the signal with itself (hence the name of the algorithm), we will check two points 'k' frames away.
        // The autocorrelation index will be the average of these products. At the same time, we normalize the values.
        // Source: http://www.phy.mty.edu/~suits/autocorrelation.html
        // Assuming the sample rate is 48000Hz, a 'k' equal to 1000 would correspond to a 48Hz signal (48000/1000 = 48),
        // while a 'k' equal to 8 would correspond to a 6000Hz one, which is enough to cover most (if not all)
        // the notes we have in the notes.json file.
        var n = 1024;
        var bestK = -1;
        var bestR = 0;
        for (var k = 8; k <= 1000; k++) {
            var sum = 0;

            for (var i = 0; i < n; i++) {
                sum += ((buffer[i] - 128) / 128) * ((buffer[i + k] - 128) / 128);
            }

            var r = sum / (n + k);

            if (r > bestR) {
                bestR = r;
                bestK = k;
            }

            if (r > 0.9) {
                // Let's assume that this is good enough and stop right here
                break;
            }
        }

        if (bestR > 0.0025) {
            // The period (in frames) of the fundamental frequency is 'bestK'. Getting the frequency from there is trivial.
            var fundamentalFreq = sampleRate / bestK;
            return fundamentalFreq;
        }
        else {
            // We haven't found a good correlation
            return -1;
        }
    };

    var findClosestNote = function (freq, notes) {
        // Use binary search to find the closest note
        var low = -1;
        var high = notes.length;
        while (high - low > 1) {
            var pivot = Math.round((low + high) / 2);
            if (notes[pivot].frequency <= freq) {
                low = pivot;
            } else {
                high = pivot;
            }
        }

        if (Math.abs(notes[high].frequency - freq) <= Math.abs(notes[low].frequency - freq)) {
            // notes[high] is closer to the frequency we found
            return notes[high];
        }

        return notes[low];
    };

    var findCentsOffPitch = function (freq, refFreq) {
        // We need to find how far freq is from baseFreq in cents
        var log2 = 0.6931471805599453; // Math.log(2)
        var multiplicativeFactor = freq / refFreq;

        // We use Math.floor to get the integer part and ignore decimals
        var cents = Math.floor(1200 * (Math.log(multiplicativeFactor) / log2));
        return cents;
    };

    var detectPitch = function () {
        var buffer = new Uint8Array(analyserAudioNode.fftSize);
        analyserAudioNode.getByteTimeDomainData(buffer);

        var fundalmentalFreq = findFundamentalFreq(buffer, audioContext.sampleRate);

        if (fundalmentalFreq !== -1) {
            var note = findClosestNote(fundalmentalFreq, notesArray);
            var cents = findCentsOffPitch(fundalmentalFreq, note.frequency);
            updateNote(note.note);
            updateCents(cents);
            return cents;
        }
        else {
            // no note, 50 will resolve to 0 detune
            updateNote('--');
            updateCents(50);
            return 50;
        }

        // frameId = window.requestAnimationFrame(detectPitch);
    };

    var streamReceived = function (stream) {
        micStream = stream;

        analyserAudioNode = audioContext.createAnalyser();
        analyserAudioNode.fftSize = 2048;

        sourceAudioNode = audioContext.createMediaStreamSource(micStream);
        sourceAudioNode.connect(analyserAudioNode);

        detectPitch();
    };

    var turnOffReferenceSound = function () {
        sourceAudioNode.stop();
        sourceAudioNode = null;
        updatePitch('--');
        updateNote('--');
        $('#referenceOptions').toggle(false);
        isRefSoundPlaying = false;
    };

    var turnOffMicrophone = function () {
        if (sourceAudioNode && sourceAudioNode.mediaStream && sourceAudioNode.mediaStream.stop) {
            sourceAudioNode.mediaStream.stop();
        }
        sourceAudioNode = null;
        updatePitch('--');
        updateNote('--');
        updateCents(-50);
        $('#microphoneOptions').toggle(false);
        analyserAudioNode = null;
        window.cancelAnimationFrame(frameId);
        isMicrophoneInUse = false;
    };

    var toggleMicrophone = function () {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        if (isRefSoundPlaying) {
            turnOffReferenceSound();
        }

        if (!isMicrophoneInUse) {
            $('#microphoneOptions').toggle(true);


            var request = new XMLHttpRequest();

            request.open('GET', './audio/wath-pea.m4a', true);

            request.responseType = 'arraybuffer';

            request.onload = function() {
                var audioData = request.response;

                let analyser = audioContext.createAnalyser();

                var bufferSource = audioContext.createBufferSource();

                audioContext.decodeAudioData(audioData, function(buffer) {
                        bufferSource.buffer = buffer;
                        bufferSource.loop = false;

                        analyserAudioNode = audioContext.createAnalyser();
                        analyserAudioNode.fftSize = 2048;

                        bufferSource.connect(analyserAudioNode);

                        var scriptProcessor = audioContext.createScriptProcessor(4096, 2);

                        let pitchShifter = PitchShift(audioContext);
                        // pitchShifter.transpose = 10;

                        analyserAudioNode.connect(pitchShifter);

                        pitchShifter.connect(audioContext.destination);
                        scriptProcessor.connect(audioContext.destination);

                        var centsTwoBefore = 0;
                        var _centsOff = 0;
                        scriptProcessor.onaudioprocess = function(e) {
                            _centsOff = detectPitch();
                            console.log((_centsOff - 50) / 100)
                            pitchShifter.transpose = (_centsOff - 50) / 100;
                            /*
                            if (centsOff - lastCentsOff > 100) {
                                pitchShifter.transpose = (centsOff - 50) / 100;
                                lastCentsOff = centsOff;
                            } else if (lastCentsOff - centsOff > 100) {
                                pitchShifter.transpose = (centsOff - 50) / 100;
                                lastCentsOff = centsOff;
                            } else if ((centsOff - lastCentsOff) > 1) {
                                // 80 - 20. So we want to move up.
                                console.log((lastCentsOff + 1) / 100)
                                pitchShifter.transpose = (lastCentsOff + 1) / 100;
                                lastCentsOff = lastCentsOff + 10;
                            } else if ((lastCentsOff - centsOff) > 1) {
                                // 20 - 80. So we want to move down.
                                console.log((lastCentsOff - 1) / 100)
                                pitchShifter.transpose = (lastCentsOff - 1) / 100;
                                lastCentsOff = lastCentsOff - 1;
                            } else {
                                console.log(0)
                                pitchShifter.transpose = 0;
                                lastCentsOff = 0;
                            }

                            /*
                             else if (centsOff - lastCentsOff < -50) {
                                pitchShifter.transpose = (centsOff) / 100;
                                lastCentsOff = centsOff;
                            }
                             */
                            // console.log(centsOff, 'centsofff')
                            // pitchShifter.transpose = (centsOff - 50) / 100;
                            // console.log(centsOff, 'cents offf')

                        };

                        bufferSource.start();

                        detectPitch();

                    },

                    function(e){ console.log("Error with decoding audio data" + e.err); });

            };

            request.send();

            notesArray = freqTable[baseFreq.toString()];

            updatePitch(baseFreq);
        }
        else {
            turnOffMicrophone();
        }
    };

    var toggleReferenceSound = function () {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        if (isMicrophoneInUse) {
            toggleMicrophone();
        }

        if (!isRefSoundPlaying) {
            $('#referenceOptions').toggle(true);
            notesArray = freqTable[baseFreq];
            sourceAudioNode = audioContext.createOscillator();
            sourceAudioNode.frequency.value = notesArray[currentNoteIndex].frequency;
            sourceAudioNode.connect(audioContext.destination);
            sourceAudioNode.start();
            updatePitch(notesArray[currentNoteIndex].frequency);
            updateNote(notesArray[currentNoteIndex].note);
            isRefSoundPlaying = true;
        } else {
            turnOffReferenceSound();
        }
    };

    var changeBaseFreq = function (delta) {
        var newBaseFreq = baseFreq + delta;
        if (newBaseFreq >= 432 && newBaseFreq <= 446) {
            baseFreq = newBaseFreq;
            notesArray = freqTable[baseFreq.toString()];
            updatePitch(baseFreq);

            if (isRefSoundPlaying) {
                // Only change the frequency if we are playing a reference sound, since
                // sourceAudioNode will be an instance of OscillatorNode
                var newNoteFreq = notesArray[currentNoteIndex].frequency;
                sourceAudioNode.frequency.value = newNoteFreq;
            }
        }
    };

    var changeReferenceSoundNote = function (delta) {
        if (isRefSoundPlaying) {
            var newNoteIndex = currentNoteIndex + delta;
            if (newNoteIndex >= 0 && newNoteIndex < notesArray.length) {
                currentNoteIndex = newNoteIndex;
                var newNoteFreq = notesArray[currentNoteIndex].frequency;
                sourceAudioNode.frequency.value = newNoteFreq;
                // In this case we haven't changed the base frequency, so we just need to update the note on screen
                updateNote(notesArray[currentNoteIndex].note);
            }
        }
    };

    var baseFreqChangeHandler = function (event) {
        changeBaseFreq(event.data);
    };

    var referenceSoundNoteHandler = function (event) {
        changeReferenceSoundNote(event.data);
    };

    $('#refButton').click(toggleReferenceSound);
    $('#micButton').click(toggleMicrophone);
    $('.minusFreq').click(-2, baseFreqChangeHandler);
    $('.plusFreq').click(2, baseFreqChangeHandler);
    $('#refDecreaseNoteButton').click(-1, referenceSoundNoteHandler);
    $('#refIncreaseNoteButton').click(1, referenceSoundNoteHandler);

    init();
});
