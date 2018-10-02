/*!
 *  tape.js v2.0.9
 *  TapeMachinejs.com
 *  tape.js v2.0.9
 *  (c) 2018, ALexander Leon
 *  alexjleon.com
 *
 *  MIT License
 */

(function() {

    var id = 1000;

    var GutterDistortion = function(o) {
        this.init(o);
    };

    GutterDistortion.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Gutter Distortion';
            self.id = 'distortion-' + id ++;
            self.type = 'distortion';
            self.input = o.ctx.createGain();
            self.wet = o.wet >= 0 ? o.wet : 0;
            self.distortionNode = o.ctx.createWaveShaper();
            self._maxValue = 30;
            self._amount = o.amount >= 0 ? o.amount : defaultAmount;
            self._sampleRate = defaultSampleRate;
            self._exponentizedValue = exponentizedValue.bind(self);
            self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
            self._makeDistortionCurve = makeDistortionCurve.bind(self);
            self.distortionNode.curve = self._makeDistortionCurve();
            self.input.connect(self.distortionNode);
            self._getWetLevel = getWetLevel.bind(self);
            self._getDryLevel = getDryLevel.bind(self);
            self.wetNode = o.ctx.createGain();
            self.wetNode.gain.value = self._getWetLevel();
            self.dryNode = o.ctx.createGain();
            self.dryNode.gain.value = self._getDryLevel();
            self.input.connect(self.dryNode);
            self.distortionNode.connect(self.wetNode);
            self.output = o.ctx.createGain();
            self.wetNode.connect(self.output);
            self.dryNode.connect(self.output);
        },

        update: function(o) {
            var self = this;
            if (o.amount) {
                self._amount = o.amount >= 0 ? o.amount : self._amount;
                self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
                self.distortionNode.curve = self._makeDistortionCurve();
            }
            if (o.wet) {
                self.wet = o.wet;
                self.wetNode.gain.value = self._getWetLevel();
                self.dryNode.gain.value = self._getDryLevel();
            }
            return self;
        },

        _equation: function(deg, k, x) {
            return (3 + k)*Math.atan(Math.sinh(x*0.25)*5) / (Math.PI + k * Math.abs(x));
        }
    };

    /***********************************************************/

    var OddballDistortion = function(o) {
        this.init(o);
    };

    OddballDistortion.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Oddball Distortion';
            self.id = 'distortion-' + id ++;
            self.type = 'distortion';
            self.input = o.ctx.createGain();
            self.wet = o.wet >= 0 ? o.wet : 0;
            self.distortionNode = o.ctx.createWaveShaper();
            self._maxValue = 80;
            self._amount = o.amount >= 0 ? o.amount : defaultAmount;
            self._sampleRate = defaultSampleRate;
            self._exponentizedValue = exponentizedValue.bind(self);
            self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
            self._makeDistortionCurve = makeDistortionCurve.bind(self);
            self.distortionNode.curve = self._makeDistortionCurve();
            self.input.connect(self.distortionNode);
            self._getWetLevel = getWetLevel.bind(self);
            self._getDryLevel = getDryLevel.bind(self);
            self.wetNode = o.ctx.createGain();
            self.wetNode.gain.value = self._getWetLevel();
            self.dryNode = o.ctx.createGain();
            self.dryNode.gain.value = self._getDryLevel();
            self.input.connect(self.dryNode);
            self.distortionNode.connect(self.wetNode);
            self.output = o.ctx.createGain();
            self.wetNode.connect(self.output);
            self.dryNode.connect(self.output);
        },

        update: function(o) {
            var self = this;
            if (o.amount) {
                self._amount = o.amount >= 0 ? o.amount : self._amount;
                self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
                self.distortionNode.curve = self._makeDistortionCurve();
            }
            if (o.wet) {
                self.wet = o.wet;
                self.wetNode.gain.value = self._getWetLevel();
                self.dryNode.gain.value = self._getDryLevel();
            }
            return self;
        },

        _equation: function(deg, k, x) {
            return ( 3 + k ) * Math.tan(x) * 37 * deg / ( Math.PI + k * Math.abs(x) );
        }
    };

    /***********************************************************/

    var SimpleDistortion = function(o) {
        this.init(o);
    };

    SimpleDistortion.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Simple Distortion';
            self.id = 'distortion-' + id ++;
            self.type = 'distortion';
            self.input = o.ctx.createGain();
            self.wet = o.wet >= 0 ? o.wet : 0;
            self.distortionNode = o.ctx.createWaveShaper();
            self._maxValue = 50;
            self._amount = o.amount >= 0 ? o.amount : defaultAmount;
            self._sampleRate = defaultSampleRate;
            self._exponentizedValue = exponentizedValue.bind(self);
            self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
            self._makeDistortionCurve = makeDistortionCurve.bind(self);
            self.distortionNode.curve = self._makeDistortionCurve();
            self.input.connect(self.distortionNode);
            self._getWetLevel = getWetLevel.bind(self);
            self._getDryLevel = getDryLevel.bind(self);
            self.wetNode = o.ctx.createGain();
            self.wetNode.gain.value = self._getWetLevel();
            self.dryNode = o.ctx.createGain();
            self.dryNode.gain.value = self._getDryLevel();
            self.input.connect(self.dryNode);
            self.distortionNode.connect(self.wetNode);
            self.output = o.ctx.createGain();
            self.wetNode.connect(self.output);
            self.dryNode.connect(self.output);
        },

        update: function(o) {
            var self = this;
            if (o.amount) {
                self._amount = o.amount >= 0 ? o.amount : self._amount;
                self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
                self.distortionNode.curve = self._makeDistortionCurve();
            }
            if (o.wet) {
                self.wet = o.wet;
                self.wetNode.gain.value = self._getWetLevel();
                self.dryNode.gain.value = self._getDryLevel();
            }
            return self;
        },

        _equation: function(deg, k, x) {
            return ( 3 + k ) * Math.sin(x / 2) * 120 * deg / ( Math.PI + (k * 2.41) * Math.abs(Math.sin(x / 3.45)) );
        }
    };

    /***********************************************************/

    var SmoothDistortion = function(o) {
        this.init(o);
    };

    SmoothDistortion.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Smooth Distortion';
            self.id = 'distortion-' + id ++;
            self.type = 'distortion';
            self.input = o.ctx.createGain();
            self.wet = o.wet >= 0 ? o.wet : 0;
            self.distortionNode = o.ctx.createWaveShaper();
            self._maxValue = 100;
            self._amount = o.amount >= 0 ? o.amount : defaultAmount;
            self._sampleRate = defaultSampleRate;
            self._exponentizedValue = exponentizedValue.bind(self);
            self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
            self._makeDistortionCurve = makeDistortionCurve.bind(self);
            self.distortionNode.curve = self._makeDistortionCurve();
            self.input.connect(self.distortionNode);
            self._getWetLevel = getWetLevel.bind(self);
            self._getDryLevel = getDryLevel.bind(self);
            self.wetNode = o.ctx.createGain();
            self.wetNode.gain.value = self._getWetLevel();
            self.dryNode = o.ctx.createGain();
            self.dryNode.gain.value = self._getDryLevel();
            self.input.connect(self.dryNode);
            self.distortionNode.connect(self.wetNode);
            self.output = o.ctx.createGain();
            self.wetNode.connect(self.output);
            self.dryNode.connect(self.output);
        },

        update: function(o) {
            var self = this;
            if (o.amount) {
                self._amount = o.amount >= 0 ? o.amount : self._amount;
                self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
                self.distortionNode.curve = self._makeDistortionCurve();
            }
            if (o.wet) {
                self.wet = o.wet;
                self.wetNode.gain.value = self._getWetLevel();
                self.dryNode.gain.value = self._getDryLevel();
            }
            return self;
        },

        _equation: function(deg, k, x) {
            return ( 3 + k ) * Math.sin(x / 5) * 120 * deg / ( Math.PI + (k * 2.41) * Math.abs(Math.sin(x / 9)) );
        }
    };

    /***********************************************************/

    var UltraMetalDistortion = function(o) {
        this.init(o);
    };

    UltraMetalDistortion.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Ultra Metal Distortion';
            self.id = 'distortion-' + id ++;
            self.type = 'distortion';
            self.input = o.ctx.createGain();
            self.wet = o.wet >= 0 ? o.wet : 0;
            self.distortionNode = o.ctx.createWaveShaper();
            self._maxValue = 30;
            self._amount = o.amount >= 0 ? o.amount : defaultAmount;
            self._sampleRate = defaultSampleRate;
            self._exponentizedValue = exponentizedValue.bind(self);
            self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
            self._makeDistortionCurve = makeDistortionCurve.bind(self);
            self.distortionNode.curve = self._makeDistortionCurve();
            self.input.connect(self.distortionNode);
            self._getWetLevel = getWetLevel.bind(self);
            self._getDryLevel = getDryLevel.bind(self);
            self.wetNode = o.ctx.createGain();
            self.wetNode.gain.value = self._getWetLevel();
            self.dryNode = o.ctx.createGain();
            self.dryNode.gain.value = self._getDryLevel();
            self.input.connect(self.dryNode);
            self.distortionNode.connect(self.wetNode);
            self.output = o.ctx.createGain();
            self.wetNode.connect(self.output);
            self.dryNode.connect(self.output);
        },

        update: function(o) {
            var self = this;
            if (o.amount) {
                self._amount = o.amount >= 0 ? o.amount : self._amount;
                self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
                self.distortionNode.curve = self._makeDistortionCurve();
            }
            if (o.wet) {
                self.wet = o.wet;
                self.wetNode.gain.value = self._getWetLevel();
                self.dryNode.gain.value = self._getDryLevel();
            }
            return self;
        },

        _equation: function(deg, k, x) {
            return ( 3 + k ) * Math.pow(x, 0.6) * 20 * deg / ( Math.PI + k * Math.abs(Math.pow(x, 0.6)) );
        }
    };

    /***********************************************************/

    var VintageDistortion = function(o) {
        this.init(o);
    };

    VintageDistortion.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Vintage Distortion';
            self.id = 'distortion-' + id ++;
            self.type = 'distortion';
            self.input = o.ctx.createGain();
            self.wet = o.wet >= 0 ? o.wet : 0;
            self.distortionNode = o.ctx.createWaveShaper();
            self._maxValue = 25;
            self._amount = o.amount >= 0 ? o.amount : defaultAmount;
            self._sampleRate = defaultSampleRate;
            self._exponentizedValue = exponentizedValue.bind(self);
            self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
            self._makeDistortionCurve = makeDistortionCurve.bind(self);
            self.distortionNode.curve = self._makeDistortionCurve();
            self.input.connect(self.distortionNode);
            self._getWetLevel = getWetLevel.bind(self);
            self._getDryLevel = getDryLevel.bind(self);
            self.wetNode = o.ctx.createGain();
            self.wetNode.gain.value = self._getWetLevel();
            self.dryNode = o.ctx.createGain();
            self.dryNode.gain.value = self._getDryLevel();
            self.input.connect(self.dryNode);
            self.distortionNode.connect(self.wetNode);
            self.output = o.ctx.createGain();
            self.wetNode.connect(self.output);
            self.dryNode.connect(self.output);
        },

        update: function(o) {
            var self = this;
            if (o.amount) {
                self._amount = o.amount >= 0 ? o.amount : self._amount;
                self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
                self.distortionNode.curve = self._makeDistortionCurve();
            }
            if (o.wet) {
                self.wet = o.wet;
                self.wetNode.gain.value = self._getWetLevel();
                self.dryNode.gain.value = self._getDryLevel();
            }
            return self;
        },

        _equation: function(deg, k, x) {
            return ( 3 + k ) * Math.sin(x) * 68 * deg / ( Math.PI + (k * 0.9) * Math.abs(x) );
        }
    };

    var CompositeSimpleDistortion = function(o) {
        this.init(o);
    };

    CompositeSimpleDistortion.prototype = {
        init: function(o) {
            var self = this;
            self.name = 'Composite Simple Distortion';
            self.id = 'distortion-' + id ++;
            self.type = 'distortion';
            self.input = o.ctx.createGain();
            if (o.wet === undefined) {
                self.wet = 0.5
            } else {
                self.wet = o.wet;
            }
            self.distortionNode = o.ctx.createWaveShaper();
            self._maxValue = 50;
            self._amount = o.amount >= 0 ? o.amount : defaultAmount;
            self._sampleRate = defaultSampleRate;
            self._exponentizedValue = exponentizedValue.bind(self);
            self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
            self._makeDistortionCurve = makeDistortionCurve.bind(self);
            self.distortionNode.curve = self._makeDistortionCurve();
            self.input.connect(self.distortionNode);
            self._getWetLevel = getWetLevel.bind(self);
            self._getDryLevel = getDryLevel.bind(self);
            self.wetNode = o.ctx.createGain();
            self.wetNode.gain.value = self._getWetLevel();
            self.dryNode = o.ctx.createGain();
            self.dryNode.gain.value = self._getDryLevel();

            // EQ
            self.filterNode = o.ctx.createBiquadFilter();
            // Should range 0 - 1

            if (o.frequency === undefined) {
                self.frequency = 0.5;
            } else {
                self.frequency = (1 - o.frequency);
            }

            self.filterNode.frequency.value = self.frequency * 16000;
            self.filterNode.Q.value = 5;
            self.filterNode.gain.value = 3;
            self.filterNode.type = 'highpass';
            self.distortionNode.connect(self.filterNode);

            self.input.connect(self.dryNode);
            self.filterNode.connect(self.wetNode);
            self.output = o.ctx.createGain();
            self.wetNode.connect(self.output);
            self.dryNode.connect(self.output);
        },

        update: function(o) {
            var self = this;
            if (o.amount) {
                self._amount = o.amount;
                self._exponentizedAmount = self._exponentizedValue(self._amount, self._maxValue);
                self.distortionNode.curve = self._makeDistortionCurve();
            }
            if (o.wet) {
                self.wet = o.wet;
                self.wetNode.gain.value = self._getWetLevel();
                self.dryNode.gain.value = self._getDryLevel();
            }
            if (o.frequency) {
                self.frequency = o.frequency;
                self.filterNode.frequency.value = (1 - self.frequency) * 16000;
            }
            if (o.bypass !== undefined) {
                self.bypass = o.bypass;
            }
            return self;
        },

        _equation: function(deg, k, x) {
            return ( 3 + k ) * Math.sin(x / 2) * 120 * deg / ( Math.PI + (k * 2.41) * Math.abs(Math.sin(x / 3.45)) );
        }

    };

    /***********************************************************/

    var makeDistortionCurve = function() {
        var self = this;
        var k = self._exponentizedAmount,
            n_samples = self._sampleRate,
            curve = new Float32Array(n_samples),
            deg = Math.PI / 270,
            i = 0,
            x,
            result;
        for ( ; i < n_samples; ++i ) {
            x = i * 2 / n_samples - 1;
            if (x < 0) {
                result = self._equation(deg, k, Math.abs(x)) * -1;
            } else {
                result = self._equation(deg, k, x);
            }
            curve[i] = result;
        }
        return curve;
    };

    var exponentizedValue = function (val, maxValue) {
        return Math.pow(val, 2) * maxValue;
    };

    var defaultAmount = 0.5;
    var defaultSampleRate = 44100;


    // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return {
                UltraMetalDistortion: UltraMetalDistortion
            };
        });
    }

    var getWetLevel = function () {
        var self = this;
        if (self.wet > 1 || self.wet < 0) {
            return 0;
        }
        if (self.wet >= 0.5) {
            return 1;
        }
        return 1 - ((0.5 - self.wet) * 2);
    };

    var getDryLevel = function () {
        var self = this;
        if (self.wet > 1 || self.wet < 0) {
            return 0;
        }
        if (self.wet <= 0.5) {
            return 1;
        }
        return 1 - ((self.wet - 0.5) * 2);
    };

    // Add support for CommonJS libraries such as browserify.
    if (typeof exports !== 'undefined') {
        exports.GutterDistortion = GutterDistortion;
        exports.OddballDistortion = OddballDistortion;
        exports.SimpleDistortion = SimpleDistortion;
        exports.SmoothDistortion = SmoothDistortion;
        exports.UltraMetalDistortion = UltraMetalDistortion;
        exports.VintageDistortion = VintageDistortion;
        exports.CompositeSimpleDistortion = CompositeSimpleDistortion;
    }


    // Define globally in case AMD is not available or unused.
    if (typeof window !== 'undefined') {
        window.GutterDistortion = GutterDistortion;
        window.OddballDistortion = OddballDistortion;
        window.SimpleDistortion = SimpleDistortion;
        window.SmoothDistortion = SmoothDistortion;
        window.UltraMetalDistortion = UltraMetalDistortion;
        window.VintageDistortion = VintageDistortion;
        window.CompositeSimpleDistortion = CompositeSimpleDistortion;
    } else if (typeof global !== 'undefined') { // Add to global in Node.js (for testing, etc).
        global.GutterDistortion = GutterDistortion;
        global.OddballDistortion = OddballDistortion;
        global.SimpleDistortion = SimpleDistortion;
        global.SmoothDistortion = SmoothDistortion;
        global.UltraMetalDistortion = UltraMetalDistortion;
        global.VintageDistortion = VintageDistortion;
        global.CompositeSimpleDistortion = CompositeSimpleDistortion;
    }
})();

