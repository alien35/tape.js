/*
 * STEPS:
 * 1: Pitch shift
 * 2: Time Shift
 * 3: Remove zeroes
 * 4: Export
 */

/* globals EqThree */

async function WAAPlayer(audioBuffer, frameSize, bufferSize, speed, pitchShift) {

    var _pv = new BufferedPV(frameSize);

    return new Promise((resolve) => {

        let durationWithSpeedFactor = audioBuffer.duration * speed;
        durationWithSpeedFactor += 1;

        var pitchOfflineCtx = new OfflineAudioContext(2,44100*durationWithSpeedFactor,44100);

        var pitchShifter = new PitchShifter(pitchOfflineCtx, audioBuffer, 1024);
        pitchShifter.pitch = pitchShift || 1;

        pitchShifter.connect(pitchOfflineCtx.destination);

        pitchOfflineCtx.startRendering().then(pitchedAudioBuffer => {

            var timeShiftOfflineCtx = new OfflineAudioContext(2,44100*durationWithSpeedFactor,44100);

            var timeShiftScriptProcessorNode = timeShiftOfflineCtx.createScriptProcessor(bufferSize, 2);

            _pv.set_audio_buffer(pitchedAudioBuffer);


            var _newAlpha = speed;

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

            timeShiftScriptProcessorNode.onaudioprocess = function(e) {
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

            timeShiftScriptProcessorNode.connect(timeShiftOfflineCtx.destination);

            this.play();
            timeShiftOfflineCtx.startRendering().then(renderedBuffer => {

                var zeroedOfflineCtx = new OfflineAudioContext(2,44100*durationWithSpeedFactor,44100);

                const thisDuration = renderedBuffer.duration;
                _canPlay = false;

                const zeroedBuffer = zeroedOfflineCtx.createBufferSource();
                zeroedBuffer.buffer = renderedBuffer;

                zeroedBuffer.connect(zeroedOfflineCtx.destination);

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

                zeroedBuffer.start(0, zerosFoundWithHzScale);

                zeroedOfflineCtx.startRendering().then(renderedZeroedBuffer => {
                    resolve(renderedZeroedBuffer)
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
