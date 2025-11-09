class TwinPeaksFX {
    constructor() {
        // Audio elements
        this.audioContext = null;
        this.audioElement = new Audio();
        this.source = null;

        // Effect nodes
        this.bassFilter = null;
        this.midFilter = null;
        this.trebleFilter = null;
        this.tubeDistortion = null;
        this.lowpassFilter = null;
        this.highpassFilter = null;

        // Reverb
        this.reverbNode = null;
        this.reverbGain = null;
        this.dryGain = null;

        // Delay
        this.delayNode = null;
        this.delayFeedback = null;
        this.delayGain = null;

        // Noise
        this.noiseBuffer = null;
        this.noiseSource = null;
        this.noiseGain = null;

        // Wow & Flutter
        this.wowFlutterAmount = 0.35;
        this.wowFlutterInterval = null;

        // Main gain
        this.mainGain = null;

        // Bypass states
        this.reverbEnabled = true;
        this.delayEnabled = true;
        this.tubeEnabled = true;
        this.eqEnabled = true;
        this.atmosphereEnabled = true;

        // Slowdown effect (45 RPM -> 33 RPM = 0.733x)
        this.slowdownRate = 33 / 45; // 0.733

        // Get DOM elements
        this.audioFileInput = document.getElementById('audioFile');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');

        // Reverb controls
        this.reverbMix = document.getElementById('reverbMix');
        this.reverbMixValue = document.getElementById('reverbMixValue');
        this.reverbDecay = document.getElementById('reverbDecay');
        this.reverbDecayValue = document.getElementById('reverbDecayValue');
        this.reverbBypass = document.getElementById('reverbBypass');

        // Delay controls
        this.delayTime = document.getElementById('delayTime');
        this.delayTimeValue = document.getElementById('delayTimeValue');
        this.delayFeedbackCtrl = document.getElementById('delayFeedback');
        this.delayFeedbackValue = document.getElementById('delayFeedbackValue');
        this.delayMix = document.getElementById('delayMix');
        this.delayMixValue = document.getElementById('delayMixValue');
        this.delayBypass = document.getElementById('delayBypass');

        // Tube controls
        this.tubeWarmth = document.getElementById('tubeWarmth');
        this.tubeValue = document.getElementById('tubeValue');
        this.tubeBypass = document.getElementById('tubeBypass');

        // EQ controls
        this.bassEQ = document.getElementById('bassEQ');
        this.bassValue = document.getElementById('bassValue');
        this.midEQ = document.getElementById('midEQ');
        this.midValue = document.getElementById('midValue');
        this.trebleEQ = document.getElementById('trebleEQ');
        this.trebleValue = document.getElementById('trebleValue');
        this.eqBypass = document.getElementById('eqBypass');

        // Atmosphere controls
        this.vinylNoise = document.getElementById('vinylNoise');
        this.vinylNoiseValue = document.getElementById('vinylNoiseValue');
        this.darkness = document.getElementById('darkness');
        this.darknessValue = document.getElementById('darknessValue');
        this.wowFlutterSlider = document.getElementById('wowFlutter');
        this.wowFlutterValue = document.getElementById('wowFlutterValue');
        this.atmosphereBypass = document.getElementById('atmosphereBypass');

        // Volume
        this.volumeSlider = document.getElementById('volume');
        this.volumeValue = document.getElementById('volumeValue');

        this.init();
    }

    init() {
        this.initAudioContext();
        this.setupEventListeners();
        this.createVinylNoise();

        // Set initial slowdown
        this.audioElement.playbackRate = this.slowdownRate;
        this.audioElement.volume = 0.7;
        this.noiseGain.gain.value = 0.15;
    }

    initAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create source
        this.source = this.audioContext.createMediaElementSource(this.audioElement);

        // Create EQ filters
        this.bassFilter = this.audioContext.createBiquadFilter();
        this.bassFilter.type = 'lowshelf';
        this.bassFilter.frequency.value = 200;
        this.bassFilter.gain.value = 4;

        this.midFilter = this.audioContext.createBiquadFilter();
        this.midFilter.type = 'peaking';
        this.midFilter.frequency.value = 1000;
        this.midFilter.Q.value = 0.7;
        this.midFilter.gain.value = -3;

        this.trebleFilter = this.audioContext.createBiquadFilter();
        this.trebleFilter.type = 'highshelf';
        this.trebleFilter.frequency.value = 3000;
        this.trebleFilter.gain.value = -6;

        // Create tube warmth
        this.tubeDistortion = this.audioContext.createWaveShaper();
        this.updateTubeWarmth(0.6);

        this.lowpassFilter = this.audioContext.createBiquadFilter();
        this.lowpassFilter.type = 'lowpass';
        this.lowpassFilter.frequency.value = 9600;
        this.lowpassFilter.Q.value = 0.7;

        this.highpassFilter = this.audioContext.createBiquadFilter();
        this.highpassFilter.type = 'highpass';
        this.highpassFilter.frequency.value = 30;

        // Create reverb (using convolver with synthetic impulse response)
        this.reverbNode = this.audioContext.createConvolver();
        this.createReverbImpulse(2.5);

        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0.4;

        this.dryGain = this.audioContext.createGain();
        this.dryGain.gain.value = 1.0;

        // Create delay
        this.delayNode = this.audioContext.createDelay(5.0);
        this.delayNode.delayTime.value = 0.375;

        this.delayFeedback = this.audioContext.createGain();
        this.delayFeedback.gain.value = 0.3;

        this.delayGain = this.audioContext.createGain();
        this.delayGain.gain.value = 0.25;

        // Create noise gain
        this.noiseGain = this.audioContext.createGain();

        // Create main gain
        this.mainGain = this.audioContext.createGain();

        // Connect audio chain
        // Source -> EQ -> Tube -> Filters -> Split (Dry/Wet)
        this.source.connect(this.bassFilter);
        this.bassFilter.connect(this.midFilter);
        this.midFilter.connect(this.trebleFilter);
        this.trebleFilter.connect(this.tubeDistortion);
        this.tubeDistortion.connect(this.highpassFilter);
        this.highpassFilter.connect(this.lowpassFilter);

        // Dry path
        this.lowpassFilter.connect(this.dryGain);
        this.dryGain.connect(this.mainGain);

        // Reverb path
        this.lowpassFilter.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.mainGain);

        // Delay path
        this.lowpassFilter.connect(this.delayNode);
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode); // Feedback loop
        this.delayNode.connect(this.delayGain);
        this.delayGain.connect(this.mainGain);

        // Noise connects separately
        this.noiseGain.connect(this.mainGain);

        // Main output
        this.mainGain.connect(this.audioContext.destination);
    }

    createReverbImpulse(decay) {
        const rate = this.audioContext.sampleRate;
        const length = rate * decay;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        const leftChannel = impulse.getChannelData(0);
        const rightChannel = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = length - i;
            leftChannel[i] = (Math.random() * 2 - 1) * Math.pow(n / length, 3);
            rightChannel[i] = (Math.random() * 2 - 1) * Math.pow(n / length, 3);
        }

        this.reverbNode.buffer = impulse;
    }

    createVinylNoise() {
        const bufferSize = this.audioContext.sampleRate * 2;
        this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            let noise = (Math.random() * 2 - 1) * 0.1;

            if (Math.random() > 0.995) {
                noise += (Math.random() * 2 - 1) * 0.5;
            }

            data[i] = noise;
        }
    }

    startVinylNoise() {
        if (this.noiseSource) {
            this.noiseSource.stop();
        }

        this.noiseSource = this.audioContext.createBufferSource();
        this.noiseSource.buffer = this.noiseBuffer;
        this.noiseSource.loop = true;
        this.noiseSource.connect(this.noiseGain);
        this.noiseSource.start(0);
    }

    stopVinylNoise() {
        if (this.noiseSource) {
            this.noiseSource.stop();
            this.noiseSource = null;
        }
    }

    setupEventListeners() {
        // Playback controls
        this.audioFileInput.addEventListener('change', (e) => this.loadAudio(e));
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());

        // Reverb
        this.reverbMix.addEventListener('input', (e) => {
            this.reverbMixValue.textContent = e.target.value + '%';
            this.reverbGain.gain.value = e.target.value / 100;
        });

        this.reverbDecay.addEventListener('input', (e) => {
            this.reverbDecayValue.textContent = e.target.value + '%';
            const decay = 1 + (e.target.value / 100) * 4; // 1-5 seconds
            this.createReverbImpulse(decay);
        });

        this.reverbBypass.addEventListener('click', () => this.toggleReverbBypass());

        // Delay
        this.delayTime.addEventListener('input', (e) => {
            this.delayTimeValue.textContent = e.target.value + 'ms';
            this.delayNode.delayTime.value = e.target.value / 1000;
        });

        this.delayFeedbackCtrl.addEventListener('input', (e) => {
            this.delayFeedbackValue.textContent = e.target.value + '%';
            this.delayFeedback.gain.value = e.target.value / 100;
        });

        this.delayMix.addEventListener('input', (e) => {
            this.delayMixValue.textContent = e.target.value + '%';
            this.delayGain.gain.value = e.target.value / 100;
        });

        this.delayBypass.addEventListener('click', () => this.toggleDelayBypass());

        // Tube
        this.tubeWarmth.addEventListener('input', (e) => {
            this.tubeValue.textContent = e.target.value + '%';
            this.updateTubeWarmth(e.target.value / 100);
        });

        this.tubeBypass.addEventListener('click', () => this.toggleTubeBypass());

        // EQ
        this.bassEQ.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.bassValue.textContent = (value >= 0 ? '+' : '') + value + ' dB';
            this.updateEQ();
        });

        this.midEQ.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.midValue.textContent = (value >= 0 ? '+' : '') + value + ' dB';
            this.updateEQ();
        });

        this.trebleEQ.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.trebleValue.textContent = (value >= 0 ? '+' : '') + value + ' dB';
            this.updateEQ();
        });

        this.eqBypass.addEventListener('click', () => this.toggleEQBypass());

        // Atmosphere
        this.vinylNoise.addEventListener('input', (e) => {
            this.vinylNoiseValue.textContent = e.target.value + '%';
            if (this.atmosphereEnabled) {
                this.noiseGain.gain.value = e.target.value / 100;
            }
        });

        this.darkness.addEventListener('input', (e) => {
            this.darknessValue.textContent = e.target.value + '%';
            this.updateDarkness(e.target.value / 100);
        });

        this.wowFlutterSlider.addEventListener('input', (e) => {
            this.wowFlutterValue.textContent = e.target.value + '%';
            this.wowFlutterAmount = e.target.value / 100;
        });

        this.atmosphereBypass.addEventListener('click', () => this.toggleAtmosphereBypass());

        // Volume
        this.volumeSlider.addEventListener('input', (e) => {
            this.volumeValue.textContent = e.target.value + '%';
            this.audioElement.volume = e.target.value / 100;
        });
    }

    loadAudio(event) {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            this.audioElement.src = url;
            this.audioElement.load();
        }
    }

    play() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.audioElement.play();
        if (this.atmosphereEnabled) {
            this.startVinylNoise();
        }
        this.startWowFlutter();
    }

    pause() {
        this.audioElement.pause();
        this.stopVinylNoise();
        this.stopWowFlutter();
    }

    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.stopVinylNoise();
        this.stopWowFlutter();
    }

    updateEQ() {
        if (this.bassFilter) {
            this.bassFilter.gain.value = this.eqEnabled ? parseFloat(this.bassEQ.value) : 0;
        }
        if (this.midFilter) {
            this.midFilter.gain.value = this.eqEnabled ? parseFloat(this.midEQ.value) : 0;
        }
        if (this.trebleFilter) {
            this.trebleFilter.gain.value = this.eqEnabled ? parseFloat(this.trebleEQ.value) : 0;
        }
    }

    updateTubeWarmth(amount) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        if (this.tubeEnabled) {
            for (let i = 0; i < samples; i++) {
                const x = (i * 2) / samples - 1;
                const intensity = amount * 3;
                curve[i] = (Math.exp(intensity * x) - Math.exp(-intensity * x)) /
                           (Math.exp(intensity * x) + Math.exp(-intensity * x));
            }
        } else {
            for (let i = 0; i < samples; i++) {
                curve[i] = (i * 2) / samples - 1;
            }
        }

        this.tubeDistortion.curve = curve;
        this.tubeDistortion.oversample = '4x';

        if (this.lowpassFilter && this.tubeEnabled) {
            const baseFreq = 12000 - (amount * 2400);
            this.lowpassFilter.frequency.value = baseFreq;
        }
    }

    updateDarkness(amount) {
        if (this.lowpassFilter && this.atmosphereEnabled) {
            const baseFreq = 12000 - (this.tubeWarmth.value / 100 * 2400);
            this.lowpassFilter.frequency.value = baseFreq - (amount * 4000);
        }
    }

    startWowFlutter() {
        this.stopWowFlutter();

        this.wowFlutterInterval = setInterval(() => {
            if (this.atmosphereEnabled && this.wowFlutterAmount > 0 && !this.audioElement.paused) {
                const wowVariation = Math.sin(Date.now() / 500) * 0.004 * this.wowFlutterAmount;
                const flutterVariation = Math.sin(Date.now() / 100) * 0.002 * this.wowFlutterAmount;

                this.audioElement.playbackRate = this.slowdownRate + wowVariation + flutterVariation;
            } else {
                this.audioElement.playbackRate = this.slowdownRate;
            }
        }, 50);
    }

    stopWowFlutter() {
        if (this.wowFlutterInterval) {
            clearInterval(this.wowFlutterInterval);
            this.wowFlutterInterval = null;
            this.audioElement.playbackRate = this.slowdownRate;
        }
    }

    toggleReverbBypass() {
        this.reverbEnabled = !this.reverbEnabled;
        this.reverbBypass.textContent = this.reverbEnabled ? 'ON' : 'OFF';
        this.reverbBypass.classList.toggle('active', this.reverbEnabled);
        this.reverbGain.gain.value = this.reverbEnabled ? this.reverbMix.value / 100 : 0;
    }

    toggleDelayBypass() {
        this.delayEnabled = !this.delayEnabled;
        this.delayBypass.textContent = this.delayEnabled ? 'ON' : 'OFF';
        this.delayBypass.classList.toggle('active', this.delayEnabled);
        this.delayGain.gain.value = this.delayEnabled ? this.delayMix.value / 100 : 0;
    }

    toggleTubeBypass() {
        this.tubeEnabled = !this.tubeEnabled;
        this.tubeBypass.textContent = this.tubeEnabled ? 'ON' : 'OFF';
        this.tubeBypass.classList.toggle('active', this.tubeEnabled);
        this.updateTubeWarmth(this.tubeWarmth.value / 100);
    }

    toggleEQBypass() {
        this.eqEnabled = !this.eqEnabled;
        this.eqBypass.textContent = this.eqEnabled ? 'ON' : 'OFF';
        this.eqBypass.classList.toggle('active', this.eqEnabled);
        this.updateEQ();
    }

    toggleAtmosphereBypass() {
        this.atmosphereEnabled = !this.atmosphereEnabled;
        this.atmosphereBypass.textContent = this.atmosphereEnabled ? 'ON' : 'OFF';
        this.atmosphereBypass.classList.toggle('active', this.atmosphereEnabled);

        if (this.atmosphereEnabled) {
            this.noiseGain.gain.value = this.vinylNoise.value / 100;
            this.updateDarkness(this.darkness.value / 100);
            if (!this.audioElement.paused) {
                this.startVinylNoise();
            }
        } else {
            this.noiseGain.gain.value = 0;
            this.stopVinylNoise();
            if (this.lowpassFilter && this.tubeEnabled) {
                const baseFreq = 12000 - (this.tubeWarmth.value / 100 * 2400);
                this.lowpassFilter.frequency.value = baseFreq;
            }
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TwinPeaksFX();
});
