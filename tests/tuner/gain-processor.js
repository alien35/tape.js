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
        this.port.postMessage('');

        return true;
    }
}

registerProcessor('gain-processor', GainProcessor);
