/* globals EqThree */

async function WAAPlayer(audioBuffer, frameSize, bufferSize, speed) {

    console.log('speedd', speed, audioBuffer);

    var _pv = new BufferedPV(frameSize);

    return new Promise((resolve) => {

        const originalDuration = audioBuffer.duration * speed;

        var offlineCtx = new OfflineAudioContext(2,44100*originalDuration,44100);
        var offlineCtx2 = new OfflineAudioContext(2,44100*originalDuration,44100);


        var buffer2 = offlineCtx2.createBufferSource();


        var originalBuffer = offlineCtx2.createBufferSource();
        originalBuffer.buffer = audioBuffer;


        var _node = offlineCtx.createScriptProcessor(bufferSize, 2);

        _pv.set_audio_buffer(audioBuffer);

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

        gainNode.gain.setValueAtTime(0, 0);
        gainNode.gain.linearRampToValueAtTime(1, 0.3);

        var _eq = new EqThree({
            hi: 1,
            lo: 1,
            mid: 1,
            ctx: offlineCtx2
        });

        gainNode.connect(_eq.input);
        _eq.output.connect(offlineCtx2.destination);


        _node.connect(offlineCtx.destination);

        gainNode.connect(_eq.input);
        _eq.output.connect(offlineCtx2.destination);

        var gainNode2 = offlineCtx2.createGain();
        gainNode2.gain.setValueAtTime(1, 0);
        gainNode2.gain.linearRampToValueAtTime(0, 0.3);


        originalBuffer.connect(gainNode2);
        gainNode2.connect(offlineCtx2.destination);


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

            // resolve(modifiedBuffer);


            buffer2.buffer = renderedBuffer;
            buffer2.connect(gainNode);

            buffer2.start(0, zerosFound / 44100);
            originalBuffer.start(0, 0, 0.3);

            offlineCtx2.startRendering().then(renderedBuffer2 => {
                resolve(renderedBuffer2)
            })
        });
    })

}

/*
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
 */
