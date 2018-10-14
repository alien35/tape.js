class GainProcessor extends AudioWorkletProcessor {

    // Custom AudioParams can be defined with this static getter.
    static get parameterDescriptors() {
        return [{ name: 'gain', defaultValue: 1 }];
    }

    constructor() {
        // The super constructor call is required.
        super();
    }

    process(inputs, outputs, parameters) {
        let input = inputs[0];
        let output = outputs[0];
        for (let channel = 0; channel < output.length; ++channel) {
            output[channel].set(input[channel]);
        }

        return true;
    }
}

registerProcessor('gain-processor', GainProcessor);
