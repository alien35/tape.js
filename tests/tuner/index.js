var ac = new AudioContext();

var source = ac.createBufferSource();
var analyser = ac.createAnalyser();
analyser.fftSize = 2048;
var bufferLength = analyser.fftSize;


var request = new XMLHttpRequest();

request.open('GET', '../audio/craig_hit_song.mp3', true);

request.responseType = 'arraybuffer';

request.onload = function() {
    var audioData = request.response;

    let analyser = ac.createAnalyser();

    ac.decodeAudioData(audioData, function(buffer) {
            source.buffer = buffer;
            source.loop = false;
            ac.audioWorklet.addModule('gain-processor.js').then(() => {

                // After the resolution of module loading, an AudioWorkletNode can be
                // constructed.
                let gainWorkletNode = new AudioWorkletNode(ac, 'gain-processor');

                // AudioWorkletNode can be interoperable with other native AudioNodes.
                source.connect(analyser);
                analyser.connect(gainWorkletNode).connect(ac.destination);
                source.start();
            });

        },

        function(e){ console.log("Error with decoding audio data" + e.err); });

}

request.send();
