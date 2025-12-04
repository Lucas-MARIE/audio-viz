/* ========== Audio Context et gestion ========== */

export class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.sourceNode = null;
    this.analyser = null;
    this.gainNode = null;
    this.dataArray = null;
    this.bufferLength = 0;
    this.audioBuffer = null;
    this.audioEl = document.getElementById('audioEl');
    this.isPlaying = false;
    this.fftSize = 2048;
    this.globalGain = 1.0;
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this.globalGain;
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.6;
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    }
  }

  async loadAudioFile(file) {
    this.stopAudio();
    this.ensureAudioContext();

    const url = URL.createObjectURL(file);
    this.audioEl.src = url;
    await this.audioEl.load();

    if (this.sourceNode) this.sourceNode.disconnect();
    this.sourceNode = this.audioCtx.createMediaElementSource(this.audioEl);
    this.sourceNode.connect(this.gainNode);

    this.analyser.fftSize = this.fftSize;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
  }

  async playAudio() {
    if (!this.audioCtx) this.ensureAudioContext();
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
    await this.audioEl.play().catch(() => {});
    this.isPlaying = true;
    return this.isPlaying;
  }

  pauseAudio() {
    this.audioEl.pause();
    this.isPlaying = false;
  }

  stopAudio() {
    this.pauseAudio();
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch(e){}
      this.sourceNode = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
  }

  getFrequencyData() {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  setFFTSize(size) {
    this.fftSize = size;
    if (this.analyser) {
      this.analyser.fftSize = this.fftSize;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
    }
  }

  setGain(value) {
    this.globalGain = value;
    if (this.gainNode) this.gainNode.gain.value = this.globalGain;
  }

  getCurrentTime() {
    return this.audioEl.currentTime || 0;
  }

  getDuration() {
    return this.audioEl.duration || 1;
  }

  getProgress() {
    return Math.max(0, Math.min(1, this.getCurrentTime() / this.getDuration()));
  }
}
