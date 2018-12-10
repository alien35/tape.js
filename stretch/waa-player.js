/*
 * STEPS:
 * 1: Pitch shift
 * 2: Time Shift
 * 3: Remove zeroes
 * 4: Export
 */

/* globals EqThree */

async function WAAPlayer(audioBuffer, frameSize, bufferSize, speed, pitchShift, beats) {

    return new Promise((resolve) => {

        if (pitchShift === 1) {
            return processSpeed(audioBuffer, speed, resolve, bufferSize, beats);
        } else if (speed === 1) {
            return processPitch(audioBuffer, speed, resolve, bufferSize, pitchShift, beats);
        } else {
            return processAll(audioBuffer, speed, resolve, bufferSize, pitchShift, beats);
        }
    })

}

function processSpeed(audioBuffer, speed, resolve, bufferSize, beats) {
    let durationWithSpeedFactor = beats / speed;
    durationWithSpeedFactor -= (durationWithSpeedFactor / 3.4224598930481283);

    var pitchOfflineCtx = new OfflineAudioContext(2,44100*(durationWithSpeedFactor),44100);

    var pitchShifter = new PitchShifter(pitchOfflineCtx, audioBuffer, 1024);
    const t = speed >= 1 ? 1.1305 - (speed - 1) : 1.1305 + (1 - speed); // 1.5
    const flippedSpeed = t; // speed >= 1 ? 1.03 - (speed - 1) : 1.03 + (1 - speed); // 1.51
    pitchShifter.tempo = flippedSpeed;

    pitchShifter.connect(pitchOfflineCtx.destination);

    pitchOfflineCtx.startRendering().then(renderedBuffer => {

        var zeroedOfflineCtx = new OfflineAudioContext(2,44100*(durationWithSpeedFactor),44100);

        const thisDuration = renderedBuffer.duration;

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
    })

}

function processPitch(audioBuffer, speed, resolve, bufferSize, pitchShift) {
    let durationWithSpeedFactor = audioBuffer.duration * speed;
    durationWithSpeedFactor += 1;

    var pitchOfflineCtx = new OfflineAudioContext(2,44100*durationWithSpeedFactor,44100);

    var pitchShifter = new PitchShifter(pitchOfflineCtx, audioBuffer, 1024);
    pitchShifter.pitch = pitchShift || 1;

    pitchShifter.connect(pitchOfflineCtx.destination);

    pitchOfflineCtx.startRendering().then(renderedBuffer => {


        var zeroedOfflineCtx = new OfflineAudioContext(2,44100*durationWithSpeedFactor,44100);

        const thisDuration = renderedBuffer.duration;

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
    })
}

function processAll(audioBuffer, speed, resolve, bufferSize, pitchShift) {
    let durationWithSpeedFactor = audioBuffer.duration * speed;
    durationWithSpeedFactor += 1;

    var pitchOfflineCtx = new OfflineAudioContext(2,44100*durationWithSpeedFactor,44100);

    var pitchShifter = new PitchShifter(pitchOfflineCtx, audioBuffer, 1024);
    pitchShifter.pitch = pitchShift || 1;
    const flippedSpeed = speed >= 1 ? 1.03 - (speed - 1) : 1.03 + (1 - speed);
    pitchShifter.tempo = flippedSpeed;

    pitchShifter.connect(pitchOfflineCtx.destination);

    pitchOfflineCtx.startRendering().then(renderedBuffer => {


        var zeroedOfflineCtx = new OfflineAudioContext(2,44100*durationWithSpeedFactor,44100);

        const thisDuration = renderedBuffer.duration;

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
    })
}
