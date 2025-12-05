/* ========== Gestion de l'interface utilisateur ========== */

export class UIManager {
  constructor(audioManager, visualizer, car, butterchurnBg = null) {
    this.audioManager = audioManager;
    this.visualizer = visualizer;
    this.car = car;
    this.butterchurnBg = butterchurnBg;
    this.timerElement = null;
    this.uploadScreen = null;
    this.dropZone = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Éléments UI
    this.timerElement = document.getElementById('timer');
    this.uploadScreen = document.getElementById('uploadScreen');
    this.dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const backBtn = document.getElementById('backBtn');
    const playBtn = document.getElementById('playBtn');
    const canvas = document.getElementById('canvas');

    // Bouton upload déclenche le file input
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }

    // File input
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          this.hideUploadScreen();
          await this.audioManager.loadAudioFile(file);
          this.playAudio();
        }
      });
    }

    // Drag & Drop sur la zone de drop
    if (this.dropZone) {
      this.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropZone.classList.add('dragover');
      });

      this.dropZone.addEventListener('dragleave', () => {
        this.dropZone.classList.remove('dragover');
      });

      this.dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('audio/')) {
          this.hideUploadScreen();
          await this.audioManager.loadAudioFile(file);
          this.playAudio();
        }
      });
    }

    // Bouton retour
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        // Vérifier si on est sur une page de visualiseur
        if (window.location.pathname.includes('/viz')) {
          // Retour à la page d'accueil
          window.location.href = '/';
        } else {
          // Si déjà sur la page d'accueil, afficher l'écran d'upload
          this.showUploadScreen();
          this.stopAndReset();
        }
      });
    }

    // Bouton play/pause
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (!this.audioManager.audioEl.src) {
          return alert('Charge d\'abord un fichier audio.');
        }
        
        if (!this.audioManager.isPlaying) {
          this.playAudio();
        } else {
          this.pauseAudio();
        }
      });
    }

    // Click to seek sur le canvas
    if (canvas) {
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = x / rect.width;
        this.seekTo(progress);
      });
    }

    // Butterchurn controls (si disponible)
    if (this.butterchurnBg) {
      const nextPresetBtn = document.getElementById('nextPreset');
      const toggleBgBtn = document.getElementById('toggleBg');
      const bgOpacitySlider = document.getElementById('bgOpacity');

      if (nextPresetBtn) {
        nextPresetBtn.addEventListener('click', () => {
          this.butterchurnBg.nextPreset();
        });
      }

      if (toggleBgBtn) {
        toggleBgBtn.addEventListener('click', () => {
          const isVisible = this.butterchurnBg.toggle();
          toggleBgBtn.textContent = isVisible ? 'Masquer fond' : 'Afficher fond';
        });
      }

      if (bgOpacitySlider) {
        bgOpacitySlider.addEventListener('input', (e) => {
          const opacity = parseFloat(e.target.value);
          this.butterchurnBg.setOpacity(opacity);
        });
      }
    }
  }

  hideUploadScreen() {
    if (this.uploadScreen) {
      this.uploadScreen.style.display = 'none';
    }
  }

  showUploadScreen() {
    if (this.uploadScreen) {
      this.uploadScreen.style.display = 'flex';
    }
  }

  updateTimer(currentTime, duration) {
    if (!this.timerElement || !duration) return;
    const current = this.formatTime(currentTime);
    const total = this.formatTime(duration);
    this.timerElement.textContent = `${current} / ${total}`;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  seekTo(progress) {
    const duration = this.audioManager.getDuration();
    if (duration) {
      const newTime = progress * duration;
      this.audioManager.seek(newTime);
    }
  }

  async playAudio() {
    const success = await this.audioManager.playAudio();
    if (success) {
      const playBtn = document.getElementById('playBtn');
      if (playBtn) playBtn.textContent = '⏸';
    }
  }

  pauseAudio() {
    this.audioManager.pauseAudio();
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.textContent = '▶';
  }

  stopAndReset() {
    // Arrêter l'audio complètement
    this.audioManager.stopAudio();
    
    // Nettoyer le canvas
    this.visualizer.clear();
    
    // Arrêter Butterchurn si actif
    if (this.butterchurnBg) {
      this.butterchurnBg.stop();
    }
    
    // Réinitialiser le bouton play
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.textContent = '▶';
    
    // Réinitialiser le timer
    if (this.timerElement) {
      this.timerElement.textContent = '0:00 / 0:00';
    }
  }
}
