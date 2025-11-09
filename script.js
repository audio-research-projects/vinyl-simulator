class VinylPlayer {
    constructor() {
        // Audio elements
        this.audioContext = null;
        this.audioElement = new Audio();
        this.source = null;
        this.noiseBuffer = null;
        this.noiseSource = null;
        this.noiseGain = null;
        this.mainGain = null;

        // Audio filters
        this.bassFilter = null;
        this.midFilter = null;
        this.trebleFilter = null;
        this.tubeDistortion = null;
        this.lowpassFilter = null;
        this.highpassFilter = null;

        // Wow & Flutter
        this.wowFlutterAmount = 0.2;
        this.wowFlutterInterval = null;

        // Current RPM (45 is standard, represents 1.0 playback rate)
        this.currentRPM = 45;
        this.baseRPM = 45;

        // Elements
        this.vinylRecord = document.getElementById('vinylRecord');
        this.audioFileInput = document.getElementById('audioFile');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.rpmButtons = document.querySelectorAll('.rpm-btn');
        this.noiseLevel = document.getElementById('noiseLevel');
        this.noiseValue = document.getElementById('noiseValue');
        this.volumeSlider = document.getElementById('volume');
        this.volumeValue = document.getElementById('volumeValue');

        // Filter controls
        this.tubeWarmth = document.getElementById('tubeWarmth');
        this.tubeValue = document.getElementById('tubeValue');
        this.bassEQ = document.getElementById('bassEQ');
        this.bassValue = document.getElementById('bassValue');
        this.midEQ = document.getElementById('midEQ');
        this.midValue = document.getElementById('midValue');
        this.trebleEQ = document.getElementById('trebleEQ');
        this.trebleValue = document.getElementById('trebleValue');
        this.wowFlutterSlider = document.getElementById('wowFlutter');
        this.wowFlutterValue = document.getElementById('wowFlutterValue');
        this.ageingSlider = document.getElementById('ageing');
        this.ageingValue = document.getElementById('ageingValue');

        // Bypass buttons
        this.tubeBypass = document.getElementById('tubeBypass');
        this.eqBypass = document.getElementById('eqBypass');
        this.effectsBypass = document.getElementById('effectsBypass');

        // Bypass states
        this.tubeEnabled = true;
        this.eqEnabled = true;
        this.effectsEnabled = true;

        this.init();
    }

    init() {
        // Initialize Audio Context
        this.initAudioContext();

        // Event listeners
        this.audioFileInput.addEventListener('change', (e) => this.loadAudio(e));
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());

        this.rpmButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.setRPM(e.target.dataset.rpm));
        });

        this.noiseLevel.addEventListener('input', (e) => {
            this.noiseValue.textContent = e.target.value + '%';
            this.updateNoiseLevel(e.target.value / 100);
        });

        this.volumeSlider.addEventListener('input', (e) => {
            this.volumeValue.textContent = e.target.value + '%';
            this.audioElement.volume = e.target.value / 100;
        });

        // Filter event listeners
        this.tubeWarmth.addEventListener('input', (e) => {
            this.tubeValue.textContent = e.target.value + '%';
            this.updateTubeWarmth(e.target.value / 100);
        });

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

        this.wowFlutterSlider.addEventListener('input', (e) => {
            this.wowFlutterValue.textContent = e.target.value + '%';
            this.wowFlutterAmount = e.target.value / 100;
        });

        this.ageingSlider.addEventListener('input', (e) => {
            this.ageingValue.textContent = e.target.value + '%';
            this.updateAgeing(e.target.value / 100);
        });

        // Bypass button listeners
        this.tubeBypass.addEventListener('click', () => this.toggleTubeBypass());
        this.eqBypass.addEventListener('click', () => this.toggleEQBypass());
        this.effectsBypass.addEventListener('click', () => this.toggleEffectsbypass());

        // Set initial volume
        this.audioElement.volume = 0.7;

        // Set initial noise level
        this.noiseGain.gain.value = 0.01; // 1% default

        // Create vinyl noise
        this.createVinylNoise();
    }

    initAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create audio source from HTML audio element
        this.source = this.audioContext.createMediaElementSource(this.audioElement);

        // Create EQ filters
        this.bassFilter = this.audioContext.createBiquadFilter();
        this.bassFilter.type = 'lowshelf';
        this.bassFilter.frequency.value = 200;
        this.bassFilter.gain.value = 3;

        this.midFilter = this.audioContext.createBiquadFilter();
        this.midFilter.type = 'peaking';
        this.midFilter.frequency.value = 1000;
        this.midFilter.Q.value = 0.7;
        this.midFilter.gain.value = -2;

        this.trebleFilter = this.audioContext.createBiquadFilter();
        this.trebleFilter.type = 'highshelf';
        this.trebleFilter.frequency.value = 3000;
        this.trebleFilter.gain.value = -4;

        // Create tube warmth filters
        this.tubeDistortion = this.audioContext.createWaveShaper();
        this.updateTubeWarmth(0.5);

        this.lowpassFilter = this.audioContext.createBiquadFilter();
        this.lowpassFilter.type = 'lowpass';
        this.lowpassFilter.frequency.value = 12000;
        this.lowpassFilter.Q.value = 0.7;

        this.highpassFilter = this.audioContext.createBiquadFilter();
        this.highpassFilter.type = 'highpass';
        this.highpassFilter.frequency.value = 30;

        // Create main gain node
        this.mainGain = this.audioContext.createGain();

        // Create noise gain node
        this.noiseGain = this.audioContext.createGain();
        this.noiseGain.gain.value = 0.3; // 30% default

        // Connect audio chain: source -> EQ -> tube -> filters -> output
        this.source.connect(this.bassFilter);
        this.bassFilter.connect(this.midFilter);
        this.midFilter.connect(this.trebleFilter);
        this.trebleFilter.connect(this.tubeDistortion);
        this.tubeDistortion.connect(this.highpassFilter);
        this.highpassFilter.connect(this.lowpassFilter);
        this.lowpassFilter.connect(this.mainGain);
        this.mainGain.connect(this.audioContext.destination);

        // Noise connects separately
        this.noiseGain.connect(this.audioContext.destination);
    }

    createVinylNoise() {
        const bufferSize = this.audioContext.sampleRate * 2;
        this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);

        // Generate vinyl crackle (mix of white noise and pops)
        for (let i = 0; i < bufferSize; i++) {
            // White noise
            let noise = (Math.random() * 2 - 1) * 0.1;

            // Random pops and crackles
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

    updateNoiseLevel(level) {
        if (this.noiseGain) {
            this.noiseGain.gain.value = level;
        }
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
        this.startVinylNoise();
        this.startWowFlutter();
        this.vinylRecord.classList.add('spinning');
        this.updateSpinSpeed();
    }

    pause() {
        this.audioElement.pause();
        this.stopVinylNoise();
        this.stopWowFlutter();
        this.vinylRecord.classList.remove('spinning');
    }

    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.stopVinylNoise();
        this.stopWowFlutter();
        this.vinylRecord.classList.remove('spinning');
    }

    setRPM(rpm) {
        this.currentRPM = parseInt(rpm);

        // Update active button
        this.rpmButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Calculate playback rate
        // 45 RPM is the standard (1.0x speed)
        // 33 RPM = slower = 33/45 ≈ 0.733x
        // 78 RPM = faster = 78/45 ≈ 1.733x
        this.audioElement.playbackRate = this.currentRPM / this.baseRPM;

        // Update spin speed
        this.updateSpinSpeed();
    }

    updateSpinSpeed() {
        // Calculate rotation duration based on RPM
        // 33 RPM = 1.82 seconds per rotation
        // 45 RPM = 1.33 seconds per rotation
        // 78 RPM = 0.77 seconds per rotation
        const duration = 60 / this.currentRPM;
        this.vinylRecord.style.animationDuration = duration + 's';
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
        // Create waveshaper curve for tube-like saturation
        const samples = 1024;
        const curve = new Float32Array(samples);

        if (this.tubeEnabled) {
            for (let i = 0; i < samples; i++) {
                const x = (i * 2) / samples - 1;
                // Soft clipping with variable intensity
                const intensity = amount * 3;
                curve[i] = (Math.exp(intensity * x) - Math.exp(-intensity * x)) /
                           (Math.exp(intensity * x) + Math.exp(-intensity * x));
            }
        } else {
            // Bypass - linear curve
            for (let i = 0; i < samples; i++) {
                curve[i] = (i * 2) / samples - 1;
            }
        }

        this.tubeDistortion.curve = curve;
        this.tubeDistortion.oversample = '4x';

        // Adjust lowpass based on warmth (warmer = darker = lower cutoff)
        if (this.lowpassFilter) {
            const baseFreq = this.tubeEnabled ? 12000 - (amount * 4000) : 20000;
            this.lowpassFilter.frequency.value = baseFreq;
        }
    }

    updateAgeing(amount) {
        // Ageing affects high frequency rolloff and adds more wear
        if (this.lowpassFilter && this.effectsEnabled) {
            const baseFreq = 12000 - (this.tubeWarmth.value / 100 * 4000);
            this.lowpassFilter.frequency.value = baseFreq - (amount * 3000);
        }
    }

    startWowFlutter() {
        // Wow & Flutter simulates speed variations in turntable
        this.stopWowFlutter();

        this.wowFlutterInterval = setInterval(() => {
            if (this.effectsEnabled && this.wowFlutterAmount > 0 && !this.audioElement.paused) {
                // Slow variations (wow) - around 0.5-3 Hz
                const wowVariation = Math.sin(Date.now() / 500) * 0.003 * this.wowFlutterAmount;
                // Fast variations (flutter) - around 5-10 Hz
                const flutterVariation = Math.sin(Date.now() / 100) * 0.001 * this.wowFlutterAmount;

                const baseRate = this.currentRPM / this.baseRPM;
                this.audioElement.playbackRate = baseRate + wowVariation + flutterVariation;
            } else {
                // Reset to base rate when effects are disabled
                this.audioElement.playbackRate = this.currentRPM / this.baseRPM;
            }
        }, 50);
    }

    stopWowFlutter() {
        if (this.wowFlutterInterval) {
            clearInterval(this.wowFlutterInterval);
            this.wowFlutterInterval = null;
            // Reset to base rate
            this.audioElement.playbackRate = this.currentRPM / this.baseRPM;
        }
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

    toggleEffectsbypass() {
        this.effectsEnabled = !this.effectsEnabled;
        this.effectsBypass.textContent = this.effectsEnabled ? 'ON' : 'OFF';
        this.effectsBypass.classList.toggle('active', this.effectsEnabled);

        // Update effects state
        if (this.effectsEnabled) {
            this.updateAgeing(this.ageingSlider.value / 100);
        } else {
            // Reset to neutral state when disabled
            if (this.lowpassFilter && this.tubeEnabled) {
                const baseFreq = 12000 - (this.tubeWarmth.value / 100 * 4000);
                this.lowpassFilter.frequency.value = baseFreq;
            }
        }
    }
}

// Initialize the player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VinylPlayer();
});
