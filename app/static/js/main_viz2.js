/* ========== Application principale - Visualiseur 2 avec Shaders ========== */

import { AudioManager } from './audio.js';
import { Visualizer } from './visualization.js';
import { UIManager } from './ui.js';
import { ShaderBackground } from './shader_background.js';

class AudioVisualizerApp {
  constructor() {
    this.canvas = document.getElementById('canvas');
    
    // Initialize modules
    this.audioManager = new AudioManager();
    this.visualizer = new Visualizer(this.canvas);
    this.shaderBg = new ShaderBackground(this.audioManager);
    this.uiManager = new UIManager(this.audioManager, this.visualizer, null, this.shaderBg);
    
    // Adapter les boutons pour le shader background
    this.setupShaderControls();
    
    // Don't initialize shader yet - wait for audio to be loaded
    this.shaderInitialized = false;
    
    // Start idle animation
    this.startIdleLoop();
    
    // Setup keyboard controls
    this.setupKeyboardControls();
  }

  setupShaderControls() {
    // Remplacer les handlers Butterchurn par des handlers Shader
    const nextShaderBtn = document.getElementById('nextShader');
    const toggleBgBtn = document.getElementById('toggleBg');

    if (nextShaderBtn) {
      nextShaderBtn.addEventListener('click', async () => {
        await this.ensureShaderInitialized();
        this.shaderBg.nextShader();
      });
    }

    if (toggleBgBtn) {
      toggleBgBtn.addEventListener('click', async () => {
        await this.ensureShaderInitialized();
        this.shaderBg.toggle();
      });
    }
  }

  async ensureShaderInitialized() {
    if (!this.shaderInitialized) {
      await this.shaderBg.initialize('bgCanvas');
      this.shaderInitialized = true;
    }
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', async (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
          document.activeElement.blur();
        }
        
        if (!this.audioManager.audioEl.src) {
          return;
        }
        if (this.audioManager.isPlaying) {
          this.uiManager.pauseAudio();
        } else {
          this.uiManager.playAudio();
        }
      } else if (e.code === 'KeyN') {
        await this.ensureShaderInitialized();
        this.shaderBg.nextShader();
      } else if (e.code === 'KeyP') {
        await this.ensureShaderInitialized();
        this.shaderBg.previousShader();
      } else if (e.code === 'KeyB') {
        await this.ensureShaderInitialized();
        this.shaderBg.toggle();
      }
    });
  }

  startIdleLoop() {
    const idleAnimation = () => {
      if (!this.audioManager.isPlaying) {
        this.visualizer.drawIdleBackground();
        requestAnimationFrame(idleAnimation);
      }
    };
    idleAnimation();
  }

  draw() {
    if (!this.audioManager.isPlaying) return;

    // Get frequency data
    const dataArray = this.audioManager.getFrequencyData();
    if (!dataArray) {
      requestAnimationFrame(() => this.draw());
      return;
    }

    // Update progress for visualizer
    const progress = this.audioManager.getProgress();
    this.visualizer.setProgress(progress);

    // Draw spectrum
    this.visualizer.drawSpectrum(dataArray);

    // Update timer
    this.uiManager.updateTimer(
      this.audioManager.getCurrentTime(),
      this.audioManager.getDuration()
    );

    // Continue animation
    requestAnimationFrame(() => this.draw());
  }

  start() {
    // Override play method to start draw loop
    const originalPlay = this.audioManager.playAudio.bind(this.audioManager);
    this.audioManager.playAudio = async () => {
      const result = await originalPlay();
      if (result) {
        await this.ensureShaderInitialized();
        this.shaderBg.start();
        requestAnimationFrame(() => this.draw());
      }
      return result;
    };

    // Override pause method to stop shader
    const originalPause = this.audioManager.pauseAudio.bind(this.audioManager);
    this.audioManager.pauseAudio = () => {
      originalPause();
      this.shaderBg.stop();
    };
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AudioVisualizerApp();
  app.start();
});
