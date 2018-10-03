/* globals EqThree */

async function WAAPlayer(audioBuffer, frameSize, bufferSize, speed, _pv) {
    console.log('wainggg')
    return new Promise((resolve) => {

        var inputBufferDuration = audioBuffer.duration * speed;

        var offlineCtx = new OfflineAudioContext(2,44100*inputBufferDuration,44100);
        var offlineCtx2 = new OfflineAudioContext(2,44100*inputBufferDuration,44100);


        var buffer2 = offlineCtx2.createBufferSource();


        var originalBuffer = offlineCtx2.createBufferSource();
        originalBuffer.buffer = audioBuffer;


        var scriptProcessorNode = offlineCtx.createScriptProcessor(bufferSize, 2);

        _pv.set_audio_buffer(audioBuffer);

        // speed is 0.8333
        var _newAlpha = speed // * (detuneValue * 0.0056); // target is detune = 200, speed = 0.93333

        var _newPosition = 0;

        var _canPlay = true;

        this.play = function() {
            _canPlay = true;
        }

        this.stop = function() {
            _canPlay = false;
        }

        scriptProcessorNode.onaudioprocess = function(e) {
            if (_canPlay) {
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

        gainNode.gain.setValueAtTime(0, 0);
        gainNode.gain.linearRampToValueAtTime(1, 0.3);

        var _eq = new EqThree({
            hi: 0,
            lo: 1,
            mid: 1,
            ctx: offlineCtx2
        });

        gainNode.connect(_eq.input);
        _eq.output.connect(offlineCtx2.destination);


        scriptProcessorNode.connect(offlineCtx.destination);

        gainNode.connect(_eq.input);
        _eq.output.connect(offlineCtx2.destination);

        var gainNode2 = offlineCtx2.createGain();
        gainNode2.gain.setValueAtTime(1, 0);
        // TODO: UNDO COMMNET gainNode2.gain.linearRampToValueAtTime(0, 3);


        originalBuffer.connect(gainNode2);
        gainNode2.connect(offlineCtx2.destination);

        this.play();

        offlineCtx.startRendering().then((renderedBuffer) => {
            const thisDuration = renderedBuffer.duration;
            _canPlay = false;
            var modifiedBuffer = offlineCtx.createBuffer(2, 44100 * (thisDuration), 44100);

            /* removing empty space
            var pL = modifiedBuffer.getChannelData(0);
            var pR = modifiedBuffer.getChannelData(1);
            var zerosFound = 0;
            var channelDataL = renderedBuffer.getChannelData(0);
            var channelDataR = renderedBuffer.getChannelData(1);
            for (var i = 0; i < 44100 * thisDuration; ++i) {
                if (channelDataL[i] === 0 ) {
                    zerosFound ++;
                    continue;
                }
                pL[i - zerosFound] = channelDataL[i];
                pR[i - zerosFound] = channelDataR[i];
            }
            */

            // resolve(modifiedBuffer);

            buffer2.buffer = modifiedBuffer;
            buffer2.connect(gainNode);

            buffer2.start(0, 0);
            originalBuffer.start(0, 0, 1);
            offlineCtx2.startRendering().then(renderedBuffer2 => {
                resolve(renderedBuffer2)
            })
        });

    })
}
