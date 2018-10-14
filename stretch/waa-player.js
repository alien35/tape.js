/* globals EqThree */

async function WAAPlayer(audioBuffer, frameSize, bufferSize, speed) {

    var _pv = new BufferedPV(frameSize);

    return new Promise((resolve) => {

        let originalDuration = audioBuffer.duration * speed;
        originalDuration += 1;

        var offlineCtx = new OfflineAudioContext(2,44100*originalDuration,44100);
        var offlineCtx2 = new OfflineAudioContext(2,44100*originalDuration,44100);
        var pitchOfflineCtx = new OfflineAudioContext(2,44100*originalDuration,44100);
        console.log(originalDuration, 'orig durationnn');

        var pitchShifter = new PitchShifter(pitchOfflineCtx, audioBuffer, 1024);
        pitchShifter.pitch = 1.3;
        var pitchShiftGain = pitchOfflineCtx.createGain();
        pitchShiftGain.connect(pitchOfflineCtx.destination);
        pitchShifter.connect(pitchShiftGain);
        // pitchShiftGain.gain.setValueAtTime(0, originalDuration - 0.3);
        // pitchShiftGain.gain.setTargetAtTime(0, originalDuration - 1.051, 0.1);

        pitchOfflineCtx.startRendering().then(pitchedAudioBuffer => {
            var buffer2 = offlineCtx2.createBufferSource();


            var originalBuffer = offlineCtx2.createBufferSource();
            originalBuffer.buffer = pitchedAudioBuffer;


            var _node = offlineCtx.createScriptProcessor(bufferSize, 2);

            _pv.set_audio_buffer(pitchedAudioBuffer);

            // speed is 0.8333
            var _newAlpha = speed; // * (detuneValue * 0.0056); // target is detune = 200, speed = 0.93333

            _pv.alpha = speed;

            var _newPosition = 50;

            _pv.position = 50;

            var _canPlay = false;
            var isProcessing = false;

            this.play = function() {
                _canPlay = true;
            }

            this.stop = function() {
                _canPlay = false;
            }

            _node.onaudioprocess = function(e) {
                if (_canPlay) {
                    isProcessing ++;
                    if (_newAlpha != undefined) {
                        _pv.alpha = _newAlpha;
                        _newAlpha = undefined;
                    }

                    if (_newPosition != undefined) {
                        _pv.position = _newPosition;
                        _newPosition = undefined;
                    }

                    _pv.process(e.outputBuffer);
                }
            };

            var gainNode = offlineCtx2.createGain();


            gainNode.connect(offlineCtx2.destination);

            _node.connect(offlineCtx.destination);

            gainNode.connect(offlineCtx2.destination);

            var crossFadeHelperGainNode = offlineCtx2.createGain();
            crossFadeHelperGainNode.gain.setValueAtTime(1, 0);


            originalBuffer.connect(crossFadeHelperGainNode);
            // TODO: DO WE NEED THIS??? crossFadeHelperGainNode.connect(offlineCtx2.destination);


            this.play();
            offlineCtx.startRendering().then(renderedBuffer => {

                const thisDuration = renderedBuffer.duration;
                _canPlay = false;
                // _node.disconnect();

                // Let's just count the zeroes
                var zerosFound = 0;
                var channelDataL = renderedBuffer.getChannelData(0);
                var channelDataR = renderedBuffer.getChannelData(1);
                for (var i = 0; i < 44100 * thisDuration; ++i) {
                    if (channelDataL[i] === 0 && channelDataR[i] === 0) {
                        zerosFound ++;
                        continue;
                    } else {
                        break;
                    }
                    // once zeros calculated, let's fill the rest of the buffer
                }

                const zerosFoundWithHzScale = zerosFound / 44100;

                // crossFadeHelperGainNode.gain.linearRampToValueAtTime(0, 0.3);

                gainNode.gain.value = 1;
                // gainNode.gain.setValueAtTime(1, originalDuration - 0.5);
                // gainNode.gain.setTargetAtTime(0, 3, 0.5);
                // gainNode.gain.linearRampToValueAtTime(1, zerosFoundWithHzScale);


                // resolve(modifiedBuffer);


                buffer2.buffer = renderedBuffer;
                buffer2.connect(gainNode);

                buffer2.start(0, zerosFoundWithHzScale);
                originalBuffer.start(0, 0, zerosFoundWithHzScale);

                offlineCtx2.startRendering().then(renderedBuffer2 => {
                    resolve(renderedBuffer2)
                })

            });
        })



    })

}

/*

            let pitchShifter = new PitchShifter(pitchOfflineCtx, _renderedBuffer, 1024);
            pitchShifter.pitch = 1.3;
            pitchShifter.connect(pitchOfflineCtx.destination);

 */
