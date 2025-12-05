/* ========== Application principale ========== */

import { AudioManager } from './audio.js';
import { Visualizer } from './visualization.js';
import { Car } from './car.js';
import { UIManager } from './ui.js';
import { ButterchurnBackground } from './visualization_background.js';

class AudioVisualizerApp {
  constructor() {
    this.canvas = document.getElementById('canvas');
    
    // Initialize modules
    this.audioManager = new AudioManager();
    this.visualizer = new Visualizer(this.canvas);
    this.car = new Car(this.canvas);
    this.butterchurnBg = new ButterchurnBackground(this.audioManager);
    this.uiManager = new UIManager(this.audioManager, this.visualizer, this.car, this.butterchurnBg);
    
    // Analyse musicale
    this.analysisData = null;
    this.currentSectionIndex = 0;
    this.autoChangeEnabled = false;
    this.lastSectionIndex = -1;
    
    // Don't initialize Butterchurn yet - wait for audio to be loaded
    this.butterchurnInitialized = false;
    
    // Start idle animation
    this.startIdleLoop();
    
    // Setup keyboard controls
    this.setupKeyboardControls();
  }

  async ensureButterchurnInitialized() {
    if (!this.butterchurnInitialized) {
      await this.butterchurnBg.initialize('bgCanvas');
      this.butterchurnInitialized = true;
    }
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', async (e) => {
      if (e.code === 'Space') {
        // Toujours empêcher le comportement par défaut de Space
        e.preventDefault();
        
        // Enlever le focus de tout bouton actif pour éviter les clics accidentels
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
          document.activeElement.blur();
        }
        
        // Toggle play/pause avec Espace
        if (!this.audioManager.audioEl.src) {
          return;
        }
        if (this.audioManager.isPlaying) {
          this.uiManager.pauseAudio();
        } else {
          this.uiManager.playAudio();
        }
      } else if (e.code === 'KeyN') {
        await this.ensureButterchurnInitialized();
        this.butterchurnBg.nextPreset();
      } else if (e.code === 'KeyP') {
        await this.ensureButterchurnInitialized();
        this.butterchurnBg.previousPreset();
      } else if (e.code === 'KeyB') {
        await this.ensureButterchurnInitialized();
        this.butterchurnBg.toggle();
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

    // Vérifier et changer de section si nécessaire
    this.checkAndUpdateSection();

    // Update and draw car (optionnel - commenté pour le nouveau design)
    /*
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
    */

    // Continue animation
    requestAnimationFrame(() => this.draw());
  }

  start() {
    // Override play method to start draw loop
    const originalPlay = this.audioManager.playAudio.bind(this.audioManager);
    this.audioManager.playAudio = async () => {
      const result = await originalPlay();
      if (result) {
        await this.ensureButterchurnInitialized();
        this.butterchurnBg.start();
        requestAnimationFrame(() => this.draw());
      }
      return result;
    };

    // Override pause method to stop butterchurn
    const originalPause = this.audioManager.pauseAudio.bind(this.audioManager);
    this.audioManager.pauseAudio = () => {
      originalPause();
      this.butterchurnBg.stop();
    };

    // Override loadAudioFile pour analyser le morceau
    const originalLoadAudioFile = this.audioManager.loadAudioFile.bind(this.audioManager);
    this.audioManager.loadAudioFile = async (file) => {
      console.log('📂 Chargement du fichier audio...', file.name);
      const result = await originalLoadAudioFile(file);
      console.log('✅ Fichier audio chargé, résultat:', result);
      
      // Toujours lancer l'analyse
      this.analyzeAudioFile(file);
      
      return result;
    };
  }

  async analyzeAudioFile(file) {
    console.log('🎵 Analyse du fichier audio en cours...', file.name);
    console.log('📤 Envoi de la requête à /api/analyze...');
    console.log('⏳ Cela peut prendre 10-30 secondes selon la durée du morceau...');
    
    // Afficher un message à l'utilisateur
    this.showAnalysisProgress('Analyse en cours... ⏳');
    
    const formData = new FormData();
    formData.append('audio', file);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('📥 Réponse reçue, status:', response.status, 'Temps:', elapsed + 's');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP:', response.status, errorText);
        this.hideAnalysisProgress();
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Données reçues:', data);
      
      if (data.success) {
        this.analysisData = data;
        console.log('✅ Analyse terminée en ' + elapsed + 's !');
        console.log(`Tempo: ${data.tempo.toFixed(1)} BPM`);
        console.log(`Sections: ${data.sections.length}`);
        console.log('Timeline:', data.visualization_timeline);
        
        this.showAnalysisProgress('✅ Analyse terminée !');
        setTimeout(() => this.hideAnalysisProgress(), 2000);
        
        // Activer les changements automatiques
        this.enableAutoPresetChanges();
      } else {
        console.error('❌ Erreur d\'analyse:', data.error);
        this.hideAnalysisProgress();
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse:', error);
      console.error('Stack:', error.stack);
      console.log('ℹ️ Le visualiseur continuera sans changements automatiques');
      this.hideAnalysisProgress();
    }
  }

  showAnalysisProgress(message) {
    let progressEl = document.getElementById('analysisProgress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'analysisProgress';
      progressEl.className = 'analysis-progress';
      document.body.appendChild(progressEl);
    }
    progressEl.textContent = message;
    progressEl.style.display = 'block';
  }

  hideAnalysisProgress() {
    const progressEl = document.getElementById('analysisProgress');
    if (progressEl) {
      progressEl.style.display = 'none';
    }
  }

  enableAutoPresetChanges() {
    if (!this.analysisData || !this.analysisData.visualization_timeline) {
      return;
    }
    
    this.autoChangeEnabled = true;
    this.lastSectionIndex = -1;
    console.log('🎨 Changements automatiques de presets Butterchurn activés!');
    console.log(`📋 Timeline: ${this.analysisData.visualization_timeline.length} sections détectées`);
    
    // Afficher les sections
    this.analysisData.visualization_timeline.forEach((seg, i) => {
      console.log(`  Section ${i + 1}: ${seg.section_type} à ${seg.time.toFixed(1)}s`);
    });
  }

  checkAndUpdateSection() {
    if (!this.autoChangeEnabled || !this.analysisData || !this.audioManager.isPlaying) {
      return;
    }
    
    const currentTime = this.audioManager.getCurrentTime();
    const timeline = this.analysisData.visualization_timeline;
    
    // Trouver la section actuelle
    for (let i = 0; i < timeline.length; i++) {
      const segment = timeline[i];
      const nextSegment = timeline[i + 1];
      
      // Vérifier si on est dans cette section
      const inSection = currentTime >= segment.time && 
                       (!nextSegment || currentTime < nextSegment.time);
      
      if (inSection && i !== this.lastSectionIndex) {
        // Nouvelle section détectée !
        this.lastSectionIndex = i;
        console.log(`\n🎨 Section ${i + 1}/${timeline.length}: ${segment.section_type} (${currentTime.toFixed(1)}s)`);
        this.applyPresetForSection(segment);
        this.updateSectionDisplay(segment);
        break;
      }
    }
  }

  applyPresetForSection(segment) {
    if (!this.butterchurnBg || !this.butterchurnInitialized) {
      return;
    }
    
    console.log(`  → Intensité: ${segment.intensity}`);
    console.log(`  → Énergie: ${segment.energy.toFixed(3)} | Brillance: ${segment.brightness.toFixed(0)} Hz`);
    
    // Changer de preset Butterchurn
    // Utiliser l'intensité pour choisir le type de preset
    if (segment.intensity === 'extreme' || segment.intensity === 'high') {
      // Presets énergiques
      this.butterchurnBg.nextPreset();
    } else if (segment.intensity === 'low') {
      // Rester sur un preset calme ou changer occasionnellement
      if (Math.random() > 0.7) {
        this.butterchurnBg.nextPreset();
      }
    } else {
      // Intensité moyenne - changer de preset
      this.butterchurnBg.nextPreset();
    }
  }

  updateSectionDisplay(segment) {
    const sectionInfo = document.getElementById('sectionInfo');
    const sectionType = document.getElementById('sectionType');
    
    if (sectionInfo && sectionType) {
      sectionInfo.style.display = 'block';
      sectionType.textContent = segment.section_type.toUpperCase();
    }
  }

  disableAutoPresetChanges() {
    this.autoChangeEnabled = false;
    console.log('🎨 Changements automatiques désactivés');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AudioVisualizerApp();
  app.start();
});
