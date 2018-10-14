/*
* SoundTouch JS audio processing library
* Copyright (c) Olli Parviainen
* Copyright (c) Ryan Berdeen
*
* This library is free software; you can redistribute it and/or
* modify it under the terms of the GNU Lesser General Public
* License as published by the Free Software Foundation; either
* version 2.1 of the License, or (at your option) any later version.
*
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
* Lesser General License for more details.
*
* You should have received a copy of the GNU Lesser General Public
* License along with this library; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
*/

function extend(a,b) {
    for ( var i in b ) {
        var g = b.__lookupGetter__(i), s = b.__lookupSetter__(i);

        if ( g || s ) {
            if ( g )
                a.__defineGetter__(i, g);
            if ( s )
                a.__defineSetter__(i, s);
        } else
            a[i] = b[i];
    }
    return a;
}

function testFloatEqual(a, b) {
    return (a > b ? a - b : b - a) > 1e-10;
}

/////////////

function AbstractFifoSamplePipe(createBuffers) {
    if (createBuffers) {
        this.inputBuffer = new FifoSampleBuffer();
        this.outputBuffer = new FifoSampleBuffer();
    }
    else {
        this.inputBuffer = this.outputBuffer = null;
    }
}

AbstractFifoSamplePipe.prototype = {
    get inputBuffer() {
        return this._inputBuffer;
    },

    set inputBuffer (inputBuffer) {
        this._inputBuffer = inputBuffer;
    },

    get outputBuffer() {
        return this._outputBuffer;
    },

    set outputBuffer(outputBuffer) {
        this._outputBuffer = outputBuffer;
    },

    clear: function () {
        this._inputBuffer.clear();
        this._outputBuffer.clear();
    }
};

/////////////////

function RateTransposer(createBuffers) {
    AbstractFifoSamplePipe.call(this, createBuffers);
    this._reset();
    this.rate = 1;
}

extend(RateTransposer.prototype, AbstractFifoSamplePipe.prototype);
extend(RateTransposer.prototype, {
    set rate(rate) {
        this._rate = rate;
        // TODO aa filter
    },

    _reset: function () {
        this.slopeCount = 0;
        this.prevSampleL = 0;
        this.prevSampleR = 0;
    },

    clone: function () {
        var result = new RateTransposer();
        result.rate = this._rate;
        return result;
    },

    process: function () {
        // TODO aa filter
        var numFrames = this._inputBuffer.frameCount;
        this._outputBuffer.ensureAdditionalCapacity(numFrames / this._rate + 1);
        var numFramesOutput = this._transpose(numFrames);
        this._inputBuffer.receive();
        this._outputBuffer.put(numFramesOutput);
    },

    _transpose: function (numFrames) {
        if (numFrames == 0) {
            // no work
            return 0;
        }

        var src = this._inputBuffer.vector;
        var srcOffset = this._inputBuffer.startIndex;

        var dest = this._outputBuffer.vector;
        var destOffset = this._outputBuffer.endIndex;

        var used = 0;
        var i = 0;

        while(this.slopeCount < 1.0) {
            dest[destOffset + 2 * i] = (1.0 - this.slopeCount) * this.prevSampleL + this.slopeCount * src[srcOffset];
            dest[destOffset + 2 * i + 1] = (1.0 - this.slopeCount) * this.prevSampleR + this.slopeCount * src[srcOffset + 1];
            i++;
            this.slopeCount += this._rate;
        }

        this.slopeCount -= 1.0;

        if (numFrames != 1) {
            out: while (true) {
                while (this.slopeCount > 1.0) {
                    this.slopeCount -= 1.0;
                    used++;
                    if (used >= numFrames - 1) {
                        break out;
                    }
                }

                var srcIndex = srcOffset + 2 * used;
                dest[destOffset + 2 * i] = (1.0 - this.slopeCount) * src[srcIndex] + this.slopeCount * src[srcIndex + 2];
                dest[destOffset + 2 * i + 1] = (1.0 - this.slopeCount) * src[srcIndex + 1] + this.slopeCount * src[srcIndex + 3];

                i++;
                this.slopeCount += this._rate;
            }
        }

        this.prevSampleL = src[srcOffset + 2 * numFrames - 2];
        this.prevSampleR = src[srcOffset + 2 * numFrames - 1];

        return i;
    }
});

////////////////////

function FifoSampleBuffer() {
    this._vector = new Float32Array();
    this._position = 0;
    this._frameCount = 0;
}

FifoSampleBuffer.prototype = {
    get vector() {
        return this._vector;
    },

    get position() {
        return this._position;
    },

    get startIndex() {
        return this._position * 2;
    },

    get frameCount() {
        return this._frameCount;
    },

    get endIndex() {
        return (this._position + this._frameCount) * 2;
    },

    clear: function() {
        this.receive(frameCount);
        this.rewind();
    },

    put: function (numFrames) {
        this._frameCount += numFrames;
    },

    putSamples: function (samples, position, numFrames) {
        position = position || 0;
        var sourceOffset = position * 2;
        if (!(numFrames >= 0)) {
            numFrames = (samples.length - sourceOffset) / 2;
        }
        var numSamples = numFrames * 2;

        this.ensureCapacity(numFrames + this._frameCount);

        var destOffset = this.endIndex;
        this._vector.set(samples.subarray(sourceOffset, sourceOffset + numSamples), destOffset);

        this._frameCount += numFrames;
    },

    putBuffer: function (buffer, position, numFrames) {
        position = position || 0;
        if (!(numFrames >= 0)) {
            numFrames = buffer.frameCount - position;
        }
        this.putSamples(buffer.vector, buffer.position + position, numFrames);
    },

    receive: function (numFrames) {
        if (!(numFrames >= 0) || numFrames > this._frameCount) {
            numFrames = this._frameCount
        }
        this._frameCount -= numFrames;
        this._position += numFrames;
    },

    receiveSamples: function (output, numFrames) {
        var numSamples = numFrames * 2;
        var sourceOffset = this.startIndex;
        output.set(this._vector.subarray(sourceOffset, sourceOffset + numSamples));
        this.receive(numFrames);
    },

    extract: function (output, position, numFrames) {
        var sourceOffset = this.startIndex + position * 2;
        var numSamples = numFrames * 2;
        output.set(this._vector.subarray(sourceOffset, sourceOffset + numSamples));
    },

    ensureCapacity: function (numFrames) {
        var minLength = parseInt(numFrames * 2);
        if (this._vector.length < minLength) {
            var newVector = new Float32Array(minLength);
            newVector.set(this._vector.subarray(this.startIndex, this.endIndex));
            this._vector = newVector;
            this._position = 0;
        }
        else {
            this.rewind();
        }
    },

    ensureAdditionalCapacity: function (numFrames) {
        this.ensureCapacity(this.frameCount + numFrames);
    },

    rewind: function () {
        if (this._position > 0) {
            this._vector.set(this._vector.subarray(this.startIndex, this.endIndex));
            this._position = 0;
        }
    }
};

//////////////////

function FilterSupport(pipe) {
    this._pipe = pipe;
}

FilterSupport.prototype = {
    get pipe() {
        return this._pipe;
    },

    get inputBuffer() {
        return this._pipe.inputBuffer;
    },

    get outputBuffer() {
        return this._pipe.outputBuffer;
    },

    // fillInputBuffer: function(numFrames) {
    //     throw new Error("fillInputBuffer() not overridden");
    // },

    fillOutputBuffer: function(numFrames) {
        while (this.outputBuffer.frameCount < numFrames) {
            // TODO hardcoded buffer size
            var numInputFrames = (8192 * 2) - this.inputBuffer.frameCount;

            this.fillInputBuffer(numInputFrames);

            if (this.inputBuffer.frameCount < (8192 * 2)) {
                break;
                // TODO flush pipe
            }
            this._pipe.process();
        }
    },

    clear: function() {
        this._pipe.clear();
    }
};

function SimpleFilter(sourceSound, pipe) {
    FilterSupport.call(this, pipe);
    this.sourceSound = sourceSound;
    this.historyBufferSize = 22050;
    this._sourcePosition = 0;
    this.outputBufferPosition = 0;
    this._position = 0;
}

extend(SimpleFilter.prototype, FilterSupport.prototype);

extend(SimpleFilter.prototype, {
    get position() {
        return this._position;
    },

    set position(position) {
        // if (position > this._position) {
        //     throw new RangeError('New position may not be greater than current position');
        // }
        var newOutputBufferPosition = this.outputBufferPosition - (this._position - position);
        // if (newOutputBufferPosition < 0) {
        //     throw new RangeError('New position falls outside of history buffer');
        // }
        this.outputBufferPosition = newOutputBufferPosition;
        this._position = position;
    },

    get sourcePosition() {
        return this._sourcePosition;
    },

    set sourcePosition(sourcePosition) {
        this.clear();
        this._sourcePosition = sourcePosition;
    },

    fillInputBuffer: function(numFrames) {
        var samples = new Float32Array(numFrames * 2);
        var numFramesExtracted = this.sourceSound.extract(samples, numFrames, this._sourcePosition);
        this._sourcePosition += numFramesExtracted;
        this.inputBuffer.putSamples(samples, 0, numFramesExtracted);
    },

    extract: function(target, numFrames) {
        this.fillOutputBuffer(this.outputBufferPosition + numFrames);

        var numFramesExtracted = Math.min(numFrames, this.outputBuffer.frameCount - this.outputBufferPosition);
        this.outputBuffer.extract(target, this.outputBufferPosition, numFramesExtracted);

        var currentFrames = this.outputBufferPosition + numFramesExtracted;
        this.outputBufferPosition = Math.min(this.historyBufferSize, currentFrames);
        this.outputBuffer.receive(Math.max(currentFrames - this.historyBufferSize, 0));

        this._position += numFramesExtracted;
        return numFramesExtracted;
    },

    handleSampleData: function(e) {
        this.extract(e.data, 4096);
    },

    clear: function() {
        // TODO yuck
        // FilterSupport.prototype.clear.call(this);
        this.outputBufferPosition = 0;
    }
});

//////////

/**
 * Giving this value for the sequence length sets automatic parameter value
 * according to tempo setting (recommended)
 */
var USE_AUTO_SEQUENCE_LEN = 0;

/**
 * Default length of a single processing sequence, in milliseconds. This determines to how
 * long sequences the original sound is chopped in the time-stretch algorithm.
 *
 * The larger this value is, the lesser sequences are used in processing. In principle
 * a bigger value sounds better when slowing down tempo, but worse when increasing tempo
 * and vice versa.
 *
 * Increasing this value reduces computational burden and vice versa.
 */
//var DEFAULT_SEQUENCE_MS = 130
var DEFAULT_SEQUENCE_MS = USE_AUTO_SEQUENCE_LEN;

/**
 * Giving this value for the seek window length sets automatic parameter value
 * according to tempo setting (recommended)
 */
var USE_AUTO_SEEKWINDOW_LEN = 0;

/**
 * Seeking window default length in milliseconds for algorithm that finds the best possible
 * overlapping location. This determines from how wide window the algorithm may look for an
 * optimal joining location when mixing the sound sequences back together.
 *
 * The bigger this window setting is, the higher the possibility to find a better mixing
 * position will become, but at the same time large values may cause a "drifting" artifact
 * because consequent sequences will be taken at more uneven intervals.
 *
 * If there's a disturbing artifact that sounds as if a constant frequency was drifting
 * around, try reducing this setting.
 *
 * Increasing this value increases computational burden and vice versa.
 */
//var DEFAULT_SEEKWINDOW_MS = 25;
var DEFAULT_SEEKWINDOW_MS = USE_AUTO_SEEKWINDOW_LEN;

/**
 * Overlap length in milliseconds. When the chopped sound sequences are mixed back together,
 * to form a continuous sound stream, this parameter defines over how long period the two
 * consecutive sequences are let to overlap each other.
 *
 * This shouldn't be that critical parameter. If you reduce the DEFAULT_SEQUENCE_MS setting
 * by a large amount, you might wish to try a smaller value on this.
 *
 * Increasing this value increases computational burden and vice versa.
 */
var DEFAULT_OVERLAP_MS = 8;

// Table for the hierarchical mixing position seeking algorithm
var _SCAN_OFFSETS = [
    [ 124,  186,  248,  310,  372,  434,  496,  558,  620,  682,  744, 806,
        868,  930,  992, 1054, 1116, 1178, 1240, 1302, 1364, 1426, 1488,   0],
    [-100,  -75,  -50,  -25,   25,   50,   75,  100,    0,    0,    0,   0,
        0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,   0],
    [ -20,  -15,  -10,   -5,    5,   10,   15,   20,    0,    0,    0,   0,
        0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,   0],
    [  -4,   -3,   -2,   -1,    1,    2,    3,    4,    0,    0,    0,   0,
        0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,   0]];

// Adjust tempo param according to tempo, so that variating processing sequence length is used
// at varius tempo settings, between the given low...top limits
var AUTOSEQ_TEMPO_LOW = 0.5;     // auto setting low tempo range (-50%)
var AUTOSEQ_TEMPO_TOP = 2.0;     // auto setting top tempo range (+100%)

// sequence-ms setting values at above low & top tempo
var AUTOSEQ_AT_MIN = 125.0;
var AUTOSEQ_AT_MAX = 50.0;
var AUTOSEQ_K = ((AUTOSEQ_AT_MAX - AUTOSEQ_AT_MIN) / (AUTOSEQ_TEMPO_TOP - AUTOSEQ_TEMPO_LOW));
var AUTOSEQ_C = (AUTOSEQ_AT_MIN - (AUTOSEQ_K) * (AUTOSEQ_TEMPO_LOW));

// seek-window-ms setting values at above low & top tempo
var AUTOSEEK_AT_MIN = 25.0;
var AUTOSEEK_AT_MAX = 15.0;
var AUTOSEEK_K = ((AUTOSEEK_AT_MAX - AUTOSEEK_AT_MIN) / (AUTOSEQ_TEMPO_TOP - AUTOSEQ_TEMPO_LOW));
var AUTOSEEK_C = (AUTOSEEK_AT_MIN - (AUTOSEEK_K) * (AUTOSEQ_TEMPO_LOW));

function Stretch(createBuffers) {
    AbstractFifoSamplePipe.call(this, createBuffers);
    this.bQuickSeek = true;
    this.bMidBufferDirty = false;

    this.pMidBuffer = null;
    this.overlapLength = 0;

    this.bAutoSeqSetting = true;
    this.bAutoSeekSetting = true;

    this._tempo = 1;
    this.setParameters(44100, DEFAULT_SEQUENCE_MS, DEFAULT_SEEKWINDOW_MS, DEFAULT_OVERLAP_MS);
}

extend(Stretch.prototype, AbstractFifoSamplePipe.prototype);

extend(Stretch.prototype, {
    clear: function () {
        AbstractFifoSamplePipe.prototype.clear.call(this);
        this._clearMidBuffer();
    },

    _clearMidBuffer: function () {
        if (this.bMidBufferDirty) {
            this.bMidBufferDirty = false;
            this.pMidBuffer = null;
        }
    },

    /**
     * Sets routine control parameters. These control are certain time constants
     * defining how the sound is stretched to the desired duration.
     *
     * 'sampleRate' = sample rate of the sound
     * 'sequenceMS' = one processing sequence length in milliseconds (default = 82 ms)
     * 'seekwindowMS' = seeking window length for scanning the best overlapping
     *      position (default = 28 ms)
     * 'overlapMS' = overlapping length (default = 12 ms)
     */
    setParameters: function(aSampleRate, aSequenceMS, aSeekWindowMS, aOverlapMS) {
        // accept only positive parameter values - if zero or negative, use old values instead
        if (aSampleRate > 0) {
            this.sampleRate = aSampleRate;
        }
        if (aOverlapMS > 0) {
            this.overlapMs = aOverlapMS;
        }

        if (aSequenceMS > 0) {
            this.sequenceMs = aSequenceMS;
            this.bAutoSeqSetting = false;
        } else {
            // zero or below, use automatic setting
            this.bAutoSeqSetting = true;
        }

        if (aSeekWindowMS > 0) {
            this.seekWindowMs = aSeekWindowMS;
            this.bAutoSeekSetting = false;
        } else {
            // zero or below, use automatic setting
            this.bAutoSeekSetting = true;
        }

        this.calcSeqParameters();

        this.calculateOverlapLength(this.overlapMs);

        // set tempo to recalculate 'sampleReq'
        this.tempo = this._tempo;
    },

    /**
     * Sets new target tempo. Normal tempo = 'SCALE', smaller values represent slower
     * tempo, larger faster tempo.
     */
    set tempo(newTempo) {
        var intskip;

        this._tempo = newTempo;

        // Calculate new sequence duration
        this.calcSeqParameters();

        // Calculate ideal skip length (according to tempo value)
        this.nominalSkip = this._tempo * (this.seekWindowLength - this.overlapLength);
        this.skipFract = 0;
        intskip = Math.floor(this.nominalSkip + 0.5);

        // Calculate how many samples are needed in the 'inputBuffer' to
        // process another batch of samples
        this.sampleReq = Math.max(intskip + this.overlapLength, this.seekWindowLength) + this.seekLength;
    },


    // get tempo() {
    //   return this._tempo;
    // },

    get inputChunkSize() {
        return this.sampleReq;
    },

    get outputChunkSize() {
        return this.overlapLength + Math.max(0, this.seekWindowLength - 2 * this.overlapLength);
    },

    /**
     * Calculates overlapInMsec period length in samples.
     */
    calculateOverlapLength: function (overlapInMsec) {
        var newOvl;

        // TODO assert(overlapInMsec >= 0);
        newOvl = (this.sampleRate * overlapInMsec) / 1000;
        if (newOvl < 16) newOvl = 16;

        // must be divisible by 8
        newOvl -= newOvl % 8;

        this.overlapLength = newOvl;

        this.pRefMidBuffer = new Float32Array(this.overlapLength * 2);
        this.pMidBuffer = new Float32Array(this.overlapLength * 2);
    },

    checkLimits: function (x, mi, ma) {
        return (x < mi) ? mi : ((x > ma) ? ma : x);
    },

    /**
     * Calculates processing sequence length according to tempo setting
     */
    calcSeqParameters: function() {
        var seq;
        var seek;

        if (this.bAutoSeqSetting) {
            seq = AUTOSEQ_C + AUTOSEQ_K * this._tempo;
            seq = this.checkLimits(seq, AUTOSEQ_AT_MAX, AUTOSEQ_AT_MIN);
            this.sequenceMs = Math.floor(seq + 0.5);
        }

        if (this.bAutoSeekSetting) {
            seek = AUTOSEEK_C + AUTOSEEK_K * this._tempo;
            seek = this.checkLimits(seek, AUTOSEEK_AT_MAX, AUTOSEEK_AT_MIN);
            this.seekWindowMs = Math.floor(seek + 0.5);
        }

        // Update seek window lengths
        this.seekWindowLength = Math.floor((this.sampleRate * this.sequenceMs) / 1000);
        this.seekLength = Math.floor((this.sampleRate * this.seekWindowMs) / 1000);
    },


    /**
     * Enables/disables the quick position seeking algorithm.
     */
    set quickSeek(enable) {
        this.bQuickSeek = enable;
    },

    clone: function () {
        var result = new Stretch();
        result.tempo = this.tempo;
        result.setParameters(this.sampleRate, this.sequenceMs, this.seekWindowMs, this.overlapMs);
        return result;
    },

    /**
     * Seeks for the optimal overlap-mixing position.
     */
    seekBestOverlapPosition: function () {
        if (this.bQuickSeek) {
            return this.seekBestOverlapPositionStereoQuick();
        }
        else {
            return this.seekBestOverlapPositionStereo();
        }
    },

    /**
     * Seeks for the optimal overlap-mixing position. The 'stereo' version of the
     * routine
     *
     * The best position is determined as the position where the two overlapped
     * sample sequences are 'most alike', in terms of the highest cross-correlation
     * value over the overlapping period
     */
    seekBestOverlapPositionStereo: function () {
        var bestOffs;
        var bestCorr
        var corr;
        var i;

        // Slopes the amplitudes of the 'midBuffer' samples
        this.precalcCorrReferenceStereo();

        bestCorr = Number.MIN_VALUE;
        bestOffs = 0;

        // Scans for the best correlation value by testing each possible position
        // over the permitted range.
        for (i = 0; i < this.seekLength; i ++) {
            // Calculates correlation value for the mixing position corresponding
            // to 'i'
            corr = this.calcCrossCorrStereo(2 * i, this.pRefMidBuffer);

            // Checks for the highest correlation value
            if (corr > bestCorr) {
                bestCorr = corr;
                bestOffs = i;
            }
        }

        return bestOffs;
    },

    /**
     * Seeks for the optimal overlap-mixing position. The 'stereo' version of the
     * routine
     *
     * The best position is determined as the position where the two overlapped
     * sample sequences are 'most alike', in terms of the highest cross-correlation
     * value over the overlapping period
     */
    seekBestOverlapPositionStereoQuick: function () {
        var j;
        var bestOffs;
        var bestCorr;
        var corr;
        var scanCount;
        var corrOffset;
        var tempOffset;

        // Slopes the amplitude of the 'midBuffer' samples
        this.precalcCorrReferenceStereo();

        bestCorr = Number.MIN_VALUE;
        bestOffs = 0;
        corrOffset = 0;
        tempOffset = 0;

        // Scans for the best correlation value using four-pass hierarchical search.
        //
        // The look-up table 'scans' has hierarchical position adjusting steps.
        // In first pass the routine searhes for the highest correlation with
        // relatively coarse steps, then rescans the neighbourhood of the highest
        // correlation with better resolution and so on.
        for (scanCount = 0; scanCount < 4; scanCount ++) {
            j = 0;
            while (_SCAN_OFFSETS[scanCount][j]) {
                tempOffset = corrOffset + _SCAN_OFFSETS[scanCount][j];
                if (tempOffset >= this.seekLength) break;

                // Calculates correlation value for the mixing position corresponding
                // to 'tempOffset'
                corr = this.calcCrossCorrStereo(2 * tempOffset, this.pRefMidBuffer);

                // Checks for the highest correlation value
                if (corr > bestCorr) {
                    bestCorr = corr;
                    bestOffs = tempOffset;
                }
                j++;
            }
            corrOffset = bestOffs;
        }

        return bestOffs;
    },

    /**
     * Slopes the amplitude of the 'midBuffer' samples so that cross correlation
     * is faster to calculate
     */
    precalcCorrReferenceStereo: function() {
        var i;
        var cnt2;
        var temp;

        for (i = 0; i < this.overlapLength; i ++) {
            temp = i * (this.overlapLength - i);
            cnt2 = i * 2;
            this.pRefMidBuffer[cnt2] = this.pMidBuffer[cnt2] * temp;
            this.pRefMidBuffer[cnt2 + 1] = this.pMidBuffer[cnt2 + 1] * temp;
        }
    },

    calcCrossCorrStereo: function(mixingPos, compare) {
        var mixing = this._inputBuffer.vector;
        mixingPos += this._inputBuffer.startIndex;

        var corr;
        var i;
        var mixingOffset;

        corr = 0;
        for (i = 2; i < 2 * this.overlapLength; i += 2) {
            mixingOffset = i + mixingPos;
            corr += mixing[mixingOffset] * compare[i] +
                mixing[mixingOffset + 1] * compare[i + 1];
        }

        return corr;
    },

    // TODO inline
    /**
     * Overlaps samples in 'midBuffer' with the samples in 'pInputBuffer' at position
     * of 'ovlPos'.
     */
    overlap: function (ovlPos) {
        this.overlapStereo(2 * ovlPos);
    },

    /**
     * Overlaps samples in 'midBuffer' with the samples in 'pInput'
     */
    overlapStereo: function(pInputPos) {
        var pInput = this._inputBuffer.vector;
        pInputPos += this._inputBuffer.startIndex;

        var pOutput = this._outputBuffer.vector;
        var pOutputPos = this._outputBuffer.endIndex;

        var i;
        var cnt2;
        var fTemp;
        var fScale;
        var fi;
        var pInputOffset;
        var pOutputOffset;

        fScale = 1 / this.overlapLength;

        for (i = 0; i < this.overlapLength; i++) {
            fTemp = (this.overlapLength - i) * fScale;
            fi = i * fScale;
            cnt2 = 2 * i;
            pInputOffset = cnt2 + pInputPos;
            pOutputOffset = cnt2 + pOutputPos;
            pOutput[pOutputOffset + 0] = pInput[pInputOffset + 0] * fi + this.pMidBuffer[cnt2 + 0] * fTemp;
            pOutput[pOutputOffset + 1] = pInput[pInputOffset + 1] * fi + this.pMidBuffer[cnt2 + 1] * fTemp;
        }
    },

    process: function() {
        var ovlSkip;
        var offset;
        var temp;
        var i;

        if (this.pMidBuffer == null) {
            // if midBuffer is empty, move the first samples of the input stream
            // into it
            if (this._inputBuffer.frameCount < this.overlapLength) {
                // wait until we've got overlapLength samples
                return;
            }
            this.pMidBuffer = new Float32Array(this.overlapLength * 2);
            this._inputBuffer.receiveSamples(this.pMidBuffer, this.overlapLength);
        }

        var output;
        // Process samples as long as there are enough samples in 'inputBuffer'
        // to form a processing frame.
        while (this._inputBuffer.frameCount >= this.sampleReq) {
            // If tempo differs from the normal ('SCALE'), scan for the best overlapping
            // position
            offset = this.seekBestOverlapPosition();

            // Mix the samples in the 'inputBuffer' at position of 'offset' with the
            // samples in 'midBuffer' using sliding overlapping
            // ... first partially overlap with the end of the previous sequence
            // (that's in 'midBuffer')
            this._outputBuffer.ensureAdditionalCapacity(this.overlapLength);
            // FIXME unit?
            //overlap(uint(offset));
            this.overlap(Math.floor(offset));
            this._outputBuffer.put(this.overlapLength);

            // ... then copy sequence samples from 'inputBuffer' to output
            temp = (this.seekWindowLength - 2 * this.overlapLength); // & 0xfffffffe;
            if (temp > 0) {
                this._outputBuffer.putBuffer(this._inputBuffer, offset + this.overlapLength, temp);
            }

            // Copies the end of the current sequence from 'inputBuffer' to
            // 'midBuffer' for being mixed with the beginning of the next
            // processing sequence and so on
            //assert(offset + seekWindowLength <= (int)inputBuffer.numSamples());
            var start = this.inputBuffer.startIndex + 2 * (offset + this.seekWindowLength - this.overlapLength);
            this.pMidBuffer.set(this._inputBuffer.vector.subarray(start, start + 2 * this.overlapLength))

            // Remove the processed samples from the input buffer. Update
            // the difference between integer & nominal skip step to 'skipFract'
            // in order to prevent the error from accumulating over time.
            this.skipFract += this.nominalSkip;   // real skip size
            ovlSkip = Math.floor(this.skipFract); // rounded to integer skip
            this.skipFract -= ovlSkip;            // maintain the fraction part, i.e. real vs. integer skip
            this._inputBuffer.receive(ovlSkip);
        }
    }
});

// https://bugs.webkit.org/show_bug.cgi?id=57295
extend(Stretch.prototype, {
    get tempo() {
        return this._tempo;
    }
});

//////////////

function SoundTouch() {
    this.rateTransposer = new RateTransposer(false);
    this.tdStretch = new Stretch(false);

    this._inputBuffer = new FifoSampleBuffer();
    this._intermediateBuffer = new FifoSampleBuffer();
    this._outputBuffer = new FifoSampleBuffer();

    this._rate = 0;
    this.tempo = 0;

    this.virtualPitch = 1.0;
    this.virtualRate = 1.0;
    this.virtualTempo = 1.0;

    this._calculateEffectiveRateAndTempo();
}

extend(SoundTouch.prototype, {
    clear: function () {
        rateTransposer.clear();
        tdStretch.clear();
    },

    clone: function () {
        var result = new SoundTouch();
        result.rate = rate;
        result.tempo = tempo;
        return result;
    },

    get rate() {
        return this._rate;
    },

    set rate(rate) {
        this.virtualRate = rate;
        this._calculateEffectiveRateAndTempo();
    },

    set rateChange(rateChange) {
        this.rate = 1.0 + 0.01 * rateChange;
    },

    get tempo() {
        return this._tempo;
    },

    set tempo(tempo) {
        this.virtualTempo = tempo;
        this._calculateEffectiveRateAndTempo();
    },

    set tempoChange(tempoChange) {
        this.tempo = 1.0 + 0.01 * tempoChange;
    },

    set pitch(pitch) {
        this.virtualPitch = pitch;
        this._calculateEffectiveRateAndTempo();
    },

    set pitchOctaves(pitchOctaves) {
        this.pitch = Math.exp(0.69314718056 * pitchOctaves);
        this._calculateEffectiveRateAndTempo();
    },

    set pitchSemitones(pitchSemitones) {
        this.pitchOctaves = pitchSemitones / 12.0;
    },

    get inputBuffer() {
        return this._inputBuffer;
    },

    get outputBuffer() {
        return this._outputBuffer;
    },

    _calculateEffectiveRateAndTempo: function () {
        var previousTempo = this._tempo;
        var previousRate = this._rate;

        this._tempo = this.virtualTempo / this.virtualPitch;
        this._rate = this.virtualRate * this.virtualPitch;

        if (testFloatEqual(this._tempo, previousTempo)) {
            this.tdStretch.tempo = this._tempo;
        }
        if (testFloatEqual(this._rate, previousRate)) {
            this.rateTransposer.rate = this._rate;
        }

        if (this._rate > 1.0) {
            if (this._outputBuffer != this.rateTransposer.outputBuffer) {
                this.tdStretch.inputBuffer = this._inputBuffer;
                this.tdStretch.outputBuffer = this._intermediateBuffer;

                this.rateTransposer.inputBuffer = this._intermediateBuffer;
                this.rateTransposer.outputBuffer = this._outputBuffer;
            }
        }
        else {
            if (this._outputBuffer != this.tdStretch.outputBuffer) {
                this.rateTransposer.inputBuffer = this._inputBuffer;
                this.rateTransposer.outputBuffer = this._intermediateBuffer;

                this.tdStretch.inputBuffer = this._intermediateBuffer;
                this.tdStretch.outputBuffer = this._outputBuffer;
            }
        }
    },

    process: function () {
        if (this._rate > 1.0) {
            this.tdStretch.process();
            this.rateTransposer.process();
        }
        else {
            this.rateTransposer.process();
            this.tdStretch.process();
        }
    }
});

/////////////


var t = new RateTransposer(true);
var s = new Stretch(true);
var st = new SoundTouch();
st.pitch = 1.0;
s.tempo = .5;
st.rate = 1.0;

var contextClass = (window.AudioContext ||
    window.webkitAudioContext ||
    window.mozAudioContext ||
    window.oAudioContext ||
    window.msAudioContext);

if (contextClass) {
    // Web Audio API is available.
    var context = new contextClass();

}

var buffer = {};
var bufferDuration;

loadSample = function(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
        var start = new Date();
        context.decodeAudioData(request.response, function(theBuffer){
            buffer = theBuffer;
            bufferDuration = theBuffer.duration;
        })
        // createBuffer(request.response);
    }

    // console.log('reading url');
    request.send();
}

// function createBuffer(arrayBuffer) {
//     offset = 0;
//     startTime = 1000;
//     // NOTE the second parameter is required, or a TypeError is thrown
//     // console.log(context.sampleRate)
//     // buffer = context.createBuffer(arrayBuffer, false, context.sampleRate);
// }


var BUFFER_SIZE = 4096;


var node = context.createScriptProcessor ? context.createScriptProcessor(BUFFER_SIZE, 2, 2) : context.createJavaScriptNode(BUFFER_SIZE, 2, 2);

var samples = new Float32Array(BUFFER_SIZE * 2);

var pos = 0;

var leftchannel = [];
var rightchannel = [];
var recordingLength = 0;

function interleave(leftChannel, rightChannel){
    var length = leftChannel.length + rightChannel.length;
    var result = new Float32Array(length);

    var inputIndex = 0;

    for (var index = 0; index < length; ){
        result[index++] = leftChannel[inputIndex];
        result[index++] = rightChannel[inputIndex];
        inputIndex++;
    }
    return result;
}

function mergeBuffers(channelBuffer, recordingLength){
    var result = new Float32Array(recordingLength);
    var offset = 0;
    var lng = channelBuffer.length;
    for (var i = 0; i < lng; i++){
        var buffer = channelBuffer[i];
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
}

function writeUTFBytes(view, offset, string){
    var lng = string.length;
    for (var i = 0; i < lng; i++){
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}


node.onaudioprocess = function (e) {
    if (buffer.getChannelData){
        pos+=BUFFER_SIZE / context.sampleRate;
        var l = e.outputBuffer.getChannelData(0);
        var r = e.outputBuffer.getChannelData(1);
        var framesExtracted = f.extract(samples, BUFFER_SIZE);
        if (framesExtracted == 0) {
            pause();
        }
        for (var i = 0; i < framesExtracted; i++) {
            l[i] = samples[i * 2];
            r[i] = samples[i * 2 + 1];
        }

        leftchannel.push (new Float32Array (l));
        rightchannel.push (new Float32Array (r));
        recordingLength += BUFFER_SIZE;
    }
};

function play() {
    node.connect(context.destination);
    //ga('send', 'event', 'Pitch shift playback', "Play");

    // window.setInterval(function(){
    // console.log(pos);
    // console.log("Percentage complete: ",100*pos/bufferDuration);
    // },
    // 1000);
}

function pause() {
    node.disconnect();
    //ga('send', 'event', 'Pitch shift playback', "Pause");
}

var source = {
    extract: function (target, numFrames, position) {
        $("#current-time").html(minsSecs(position/(context.sampleRate)));
        $("#progress").width(100*position/(bufferDuration*context.sampleRate) + "%");
        if (Math.round(100 *position/(bufferDuration*context.sampleRate)) == 100 && is_playing){
            //stop recorder
            recorder && recorder.stop();
            __log('Recording complete.');

            // create WAV download link using audio data blob
            createDownloadLink();

            if (typeof recorder != "undefined"){
                recorder.clear();
            }
            is_playing = false;
        }
        var l = buffer.getChannelData(0);
        if (buffer.numberofChannels > 1){
            var r = buffer.getChannelData(1);
        } else {
            var r = buffer.getChannelData(0);
        }
        for (var i = 0; i < numFrames; i++) {
            target[i * 2] = l[i + position];
            target[i * 2 + 1] = r[i + position];
        }
        return Math.min(numFrames, l.length - position);
    }
};


//Stretch (s) or Rate (t) object goes in this filter function!
f = new SimpleFilter(source, st);



//////////////////////////////////

$("#play-pitchshifter").click(function(e){
    if (fileInput.val()==""){
        alert("Please choose a file to play");
    } else if ($(this).hasClass("disabled")) {
        // alert("Currently loading audio, please wait a few seconds...");
    } else{
        play();
        is_playing = true;
        if ($("#save-output").prop("checked") == true){
            recorder = new Recorder(node, {workerPath: 'recorderWorkerMP3.js'});
            startRecording();
        }
    }
});

$("#pause-pitchshifter").click(function(e){
    pause();
    is_playing = false;
});

function minsSecs(secs){
    mins = Math.floor(secs / 60);
    seconds = secs - mins * 60;
    return mins + ":" + pad(parseInt(seconds),2);
}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

if (!navigator.getUserMedia) {

    alert('Your browser does not support the Media Stream API');

} else {

    navigator.getUserMedia(

        {audio: true, video: false},

        function (stream) {
            //audioSources[1] = audioContext.createMediaStreamSource(stream);
            //node.connect(context.destination);


            st = new SoundTouch(stream);
            st.pitch = ($(".pitch-slider").val() / 100);
            st.tempo = !$("#maintain-tempo").prop("checked") ? ($(".pitch-slider").val() / 100) : 1;



            f = new SimpleFilter(source, st);
            var BUFFER_SIZE = 2048;

            var node = context.createScriptProcessor ? context.createScriptProcessor(BUFFER_SIZE, 2, 2) : context.createJavaScriptNode(BUFFER_SIZE, 2, 2);

            var samples = new Float32Array(BUFFER_SIZE * 2);

            var pos = 0;
            f.sourcePosition = 0;

            node.connect(context.destination);
        },

        function (error) {
            alert('Unable to get the user media');
        }
    );
}


var fileInput = $("#audio-file");
// bufferSource.gain.value = 1;
// bufferSource.loop = true;
// bufferSource.connect(oscillatorGain);

fileInput.on("change", function() {

    $(".timing").hide();
    $("#loading").show();
    $("#play-pitchshifter").addClass("disabled");

    if (is_playing) pause();
    var reader = new FileReader();
    reader.onload = function(ev) {
        context.decodeAudioData(ev.target.result, function(theBuffer){
            pause();
            //ga('send', 'event', 'File Upload', "Success");

            buffer = theBuffer;
            bufferDuration = theBuffer.duration;
            $("#play-pitchshifter").removeClass("disabled");

            $("#total-time").html(minsSecs(bufferDuration));

            $("#progress").width("0%");
            $("#current-time").html("0:00");


            st = new SoundTouch();
            st.pitch = ($(".pitch-slider").val() / 100);
            st.tempo = !$("#maintain-tempo").prop("checked") ? ($(".pitch-slider").val() / 100) : 1;



            f = new SimpleFilter(source, st);
            var BUFFER_SIZE = 2048;

            var node = context.createScriptProcessor ? context.createScriptProcessor(BUFFER_SIZE, 2, 2) : context.createJavaScriptNode(BUFFER_SIZE, 2, 2);

            var samples = new Float32Array(BUFFER_SIZE * 2);

            var pos = 0;
            f.sourcePosition = 0;

            $("#play-pitchshifter").addClass("beginTuning");
            $(".timing").show();
            $("#loading").hide();




        }, function(){ //error function
            $("#loading").html("Sorry, we could not process this audio file.");
            //ga('send', 'event', 'File Upload', "Failure");

        })
    };
    reader.readAsArrayBuffer(this.files[0]);
});


$(".pitch-slider").noUiSlider({
    start: 80,
    range: {
        'min': 50,
        'max': 150
    },
});

twelth_root = 1.05946309436;
st.pitch = 1;

$(".pitch-slider").on("slide", function(){
    st.pitch = ($(this).val() / 100);
    st.tempo = !$("#maintain-tempo").prop("checked") ? ($(".pitch-slider").val() / 100) : 1;
    var pitch = Math.pow(twelth_root, parseFloat($(this).val()))
    var pitchFormatted = (100 * pitch).toFixed(2);
    // console.log($(this).val() / 100);
    // $("#semitones").val(parseFloat(($(this).val() / 100 - 1) / 0.05946309436).toFixed(2));
    $("#semitones").val(Math.log($(this).val() / 100)/Math.log(twelth_root));
    $("#pitch-shift-value").html($(this).val());


});

$("#maintain-tempo").change(function(){
    st.tempo = !$("#maintain-tempo").prop("checked") ? ($(".pitch-slider").val() / 100) : 1;
})

$(".pitch-slider").on("change", function(){
    //ga('send', 'event', 'Pitch shift', "Slider", $(this).val());
})

$("#semitones").change(function(){

    //ga('send', 'event', 'Pitch shift', "Semitone", $(this).val());


    if ($(this).val() <= 12 && $(this).val() >= - 12){

        // $(".pitch-slider").val(100.0 + 1*parseFloat(( parseFloat($(this).val())) * parseFloat(twelth_root-1) * 100).toFixed(2));
        // $("#pitch-shift-value").html((100.0 + 1*parseFloat($(this).val() * parseFloat(twelth_root-1) * 100)).toFixed(2));


        // console.log(100 + (1+ parseFloat($(this).val()) * parseFloat(twelth_root-1) * 100));
        // st.pitch = st.pitch + parseFloat($(this).val()) * parseFloat(twelth_root-1);
        // st.pitch = (1+ parseFloat($(this).val()) * parseFloat(twelth_root-1));

        var pitch = Math.pow(twelth_root, parseFloat($(this).val()))
        var pitchFormatted = (100 * pitch).toFixed(2);

        st.pitch = pitch;

        $(".pitch-slider").val(pitchFormatted);
        $("#pitch-shift-value").html(pitchFormatted);

        st.tempo = !$("#maintain-tempo").prop("checked") ? ($(".pitch-slider").val() / 100) : 1;

        // st.pitch = $(this).val() + 1
    } else {
        alert("Please enter a number between -12 and +12");
    }
});




$("#progress-wrapper").click(function(e){
    var parentOffset = $(this).offset();
    //or $(this).offset(); if you really just want the current element's offset
    var relX = e.pageX - parentOffset.left;
    // var relY = e.pageY - parentOffset.top;
    $("#progress").width(100*(relX / $(this).width())+"%");
    pause();
    st = new SoundTouch();
    st.pitch = $(".pitch-slider").val() /100;
    st.tempo = !$("#maintain-tempo").prop("checked") ? ($(".pitch-slider").val() / 100) : 1;
    f = new SimpleFilter(source, st);
    var BUFFER_SIZE = 2048;

    var node = context.createScriptProcessor ? context.createScriptProcessor(BUFFER_SIZE, 2, 2) : context.createJavaScriptNode(BUFFER_SIZE, 2, 2);

    var samples = new Float32Array(BUFFER_SIZE * 2);

    var pos = 0;
    f.sourcePosition = parseInt((relX / $(this).width()) * bufferDuration * context.sampleRate);
    if (is_playing){
        play();
    }




    // f.position = 0;
    // var node = context.createScriptProcessor ? context.createScriptProcessor(BUFFER_SIZE, 2, 2) : context.createJavaScriptNode(BUFFER_SIZE, 2, 2);

    // var samples = new Float32Array(BUFFER_SIZE * 2);   play();
});
