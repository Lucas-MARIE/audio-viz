/* ========== Gestion de l'interface utilisateur ========== */

export class UIManager {
  constructor(audioManager, visualizer, car) {
    this.audioManager = audioManager;
    this.visualizer = visualizer;
    this.car = car;
    this.bgVideo = document.getElementById('bgVideo');
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Audio file input
    document.getElementById('audioFile').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      await this.audioManager.loadAudioFile(file);
      this.playAudio();
    });

    // Video file input
    document.getElementById('videoFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      this.bgVideo.src = url;
      this.bgVideo.loop = true;
      this.bgVideo.muted = true;
      this.bgVideo.playsInline = true;
      this.bgVideo.play().catch(() => {});
    });

    // Car image input
    document.getElementById('carFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      this.car.loadImage(file);
    });

    // Play/Pause button
    document.getElementById('playPause').addEventListener('click', async () => {
      if (!this.audioManager.audioEl.src) {
        return alert('Charge d\'abord un fichier audio.');
      }
      
      if (!this.audioManager.isPlaying) {
        await this.playAudio();
      } else {
        this.pauseAudio();
      }
    });

    // FFT size selector
    document.getElementById('fftSelect').addEventListener('change', (e) => {
      const fftSize = parseInt(e.target.value);
      this.audioManager.setFFTSize(fftSize);
    });

    // Gain slider
    document.getElementById('gain').addEventListener('input', (e) => {
      const gain = parseFloat(e.target.value);
      this.audioManager.setGain(gain);
    });

    // Jump sensitivity slider
    document.getElementById('jumpThresh').addEventListener('input', (e) => {
      const sensitivity = parseFloat(e.target.value);
      this.car.setJumpSensitivity(sensitivity);
    });
  }

  async playAudio() {
    const success = await this.audioManager.playAudio();
    if (success && this.bgVideo.src && this.bgVideo.paused) {
      try { await this.bgVideo.play(); } catch(e) {}
    }
    if (success) {
      document.getElementById('playPause').textContent = 'Pause';
    }
  }

  pauseAudio() {
    this.audioManager.pauseAudio();
    if (!this.bgVideo.paused) this.bgVideo.pause();
    document.getElementById('playPause').textContent = 'Play';
  }
}
