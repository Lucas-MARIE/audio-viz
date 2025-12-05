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
    
    // Analyse musicale
    this.analysisData = null;
    this.currentSectionIndex = 0;
    this.autoChangeEnabled = false;
    
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
      } else if (e.code === 'Digit2' && e.shiftKey) {
        // Shift + 2 = Forcer le shader 21 (Stereo Mirror Explosion)
        await this.ensureShaderInitialized();
        this.shaderBg.setShader(20); // Index 20 = Shader 21
        console.log('🎨 Shader 21 (Stereo Mirror Explosion) activé !');
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
        this.enableAutoShaderChanges();
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

  enableAutoShaderChanges() {
    if (!this.analysisData || !this.analysisData.visualization_timeline) {
      return;
    }
    
    this.autoChangeEnabled = true;
    this.lastSectionIndex = -1;
    console.log('🎨 Changements automatiques de shaders activés!');
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
        this.applyShaderConfig(segment);
        this.updateSectionDisplay(segment);
        break;
      }
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

  applyShaderConfig(segment) {
    if (!this.shaderBg || !this.shaderInitialized) {
      return;
    }
    
    // Charger la paire de shaders recommandée
    const shaderPair = segment.shader_pair;
    
    if (shaderPair && this.shaderBg.loadShaderPair) {
      console.log(`  → Shaders: ${shaderPair.sharp} (net) + ${shaderPair.blurred} (flou)`);
      console.log(`  → Énergie: ${segment.energy.toFixed(3)} | Brillance: ${segment.brightness.toFixed(0)} Hz`);
      
      // Charger les shaders spécifiques
      this.shaderBg.currentShaderIndex1 = shaderPair.sharp;
      this.shaderBg.currentShaderIndex2 = shaderPair.blurred;
      this.shaderBg.loadShaderPair();
    }
  }

  disableAutoShaderChanges() {
    this.autoChangeEnabled = false;
    console.log('🎨 Changements automatiques désactivés');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AudioVisualizerApp();
  app.start();
});
