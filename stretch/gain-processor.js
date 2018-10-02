class GainProcessor extends AudioWorkletProcessor {

    // Custom AudioParams can be defined with this static getter.
    static get parameterDescriptors() {
        return [{ name: 'gain', defaultValue: 1 }];
    }



    constructor() {
        // The super constructor call is required.
        super();
        var _pv = new BufferedPV(frameSize);
        console.log('in constructor??')
    }

    process(inputs, outputs, parameters) {
        console.log('in process??', parameters)
        let input = inputs[0];
        let output = outputs[0];
        let gain = parameters.gain;
        for (let channel = 0; channel < input.length; ++channel) {
            let inputChannel = input[channel];
            let outputChannel = output[channel];
            for (let i = 0; i < inputChannel.length; ++i)
                outputChannel[i] = inputChannel[i] * gain[i];
        }

        return true;
    }
}

registerProcessor('gain-processor', GainProcessor);
