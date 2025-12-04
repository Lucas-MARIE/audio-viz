/* ========== Application principale ========== */

import { AudioManager } from './audio.js';
import { Visualizer } from './visualization.js';
import { Car } from './car.js';
import { UIManager } from './ui.js';

class AudioVisualizerApp {
  constructor() {
    this.canvas = document.getElementById('canvas');
    
    // Initialize modules
    this.audioManager = new AudioManager();
    this.visualizer = new Visualizer(this.canvas);
    this.car = new Car(this.canvas);
    this.uiManager = new UIManager(this.audioManager, this.visualizer, this.car);
    
    // Start idle animation
    this.startIdleLoop();
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

    // Draw spectrum
    this.visualizer.drawSpectrum(dataArray);

    // Update and draw car
    const progress = this.audioManager.getProgress();
    const amplitude = this.visualizer.getAmplitudeAt(progress);
    const groundY = this.visualizer.getGroundY(amplitude);
    
    this.car.update(
      progress, 
      amplitude, 
      groundY, 
      this.visualizer.W, 
      this.visualizer.H
    );
    
    this.car.draw(
      groundY, 
      this.visualizer.W, 
      this.visualizer.H
    );

    // Draw HUD
    this.visualizer.drawHUD(
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
        requestAnimationFrame(() => this.draw());
      }
      return result;
    };
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AudioVisualizerApp();
  app.start();
});
