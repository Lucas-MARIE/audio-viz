/* ========== Visualisation de fond avec Butterchurn (MilkDrop) ========== */

export class ButterchurnBackground {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.butterchurn = null;
    this.visualizer = null;
    this.presets = null;
    this.currentPresetIndex = 0;
    this.canvas = null;
    this.animationId = null;
    this.isInitialized = false;
    
    // Charger les bibliothèques Butterchurn
    this.loadButterchurnLibraries();
  }

  loadButterchurnLibraries() {
    // Vérifier si les bibliothèques sont déjà chargées
    if (window.butterchurn && window.butterchurnPresets) {
      this.butterchurn = window.butterchurn.default || window.butterchurn;
      this.presets = window.butterchurnPresets.getPresets();
      console.log('Butterchurn déjà chargé depuis window', this.butterchurn);
      return;
    }

    console.log('Chargement de Butterchurn...');
    // Les scripts sont déjà dans le HTML, on attend qu'ils se chargent
  }

  async initialize(canvasId = 'bgCanvas') {
    if (this.isInitialized) return;

    // Attendre que Butterchurn soit chargé depuis le HTML
    let attempts = 0;
    while ((!window.butterchurn || !window.butterchurnPresets) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.butterchurn || !window.butterchurnPresets) {
      console.error('Butterchurn n\'a pas pu être chargé après 5 secondes');
      return;
    }

    this.butterchurn = window.butterchurn.default || window.butterchurn;
    this.presets = window.butterchurnPresets.getPresets();
    
    console.log('Butterchurn chargé:', {
      butterchurn: this.butterchurn,
      presetsCount: Object.keys(this.presets).length,
      createVisualizer: typeof this.butterchurn.createVisualizer,
      methods: Object.keys(this.butterchurn)
    });

    if (!this.butterchurn.createVisualizer) {
      console.error('createVisualizer n\'existe pas! Méthodes disponibles:', Object.keys(this.butterchurn));
      return;
    }

    // S'assurer que l'AudioContext existe
    if (!this.audioManager.audioCtx) {
      this.audioManager.ensureAudioContext();
    }

    // Créer le canvas s'il n'existe pas
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.zIndex = '-999';
      this.canvas.style.opacity = '1'; // Opacité à 100% pour test
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.border = '2px solid red'; // Bordure de test
      document.body.insertBefore(this.canvas, document.body.firstChild);
      console.log('Canvas Butterchurn créé et ajouté au DOM', {
        width: this.canvas.style.width,
        height: this.canvas.style.height,
        zIndex: this.canvas.style.zIndex
      });
    } else {
      console.log('Canvas Butterchurn déjà existant');
    }

    // Définir la taille du canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Créer l'instance Butterchurn
    try {
      console.log('Création du visualiseur Butterchurn avec:', {
        audioCtx: this.audioManager.audioCtx,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height
      });
      
      this.visualizer = this.butterchurn.createVisualizer(
        this.audioManager.audioCtx,
        this.canvas,
        {
          width: this.canvas.width,
          height: this.canvas.height,
          pixelRatio: window.devicePixelRatio || 1,
          textureRatio: 1
        }
      );

      console.log('Visualiseur créé:', this.visualizer);

      // Connecter l'audio au visualiseur
      if (this.audioManager.analyser) {
        this.visualizer.connectAudio(this.audioManager.analyser);
        console.log('Audio connecté au visualiseur');
      } else {
        console.warn('Pas d\'analyser disponible');
      }

      // Charger un preset par défaut
      this.loadRandomPreset();

      this.isInitialized = true;
      console.log('Butterchurn background initialized successfully');
    } catch (error) {
      console.error('Error initializing Butterchurn:', error);
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    if (this.visualizer) {
      this.visualizer.setRendererSize(width * pixelRatio, height * pixelRatio);
    }
  }

  loadRandomPreset() {
    if (!this.presets) return;

    const presetKeys = Object.keys(this.presets);
    const randomKey = presetKeys[Math.floor(Math.random() * presetKeys.length)];
    this.loadPreset(randomKey);
  }

  loadPreset(presetName, transitionTime = 2.0) {
    if (!this.visualizer || !this.presets) return;

    const preset = this.presets[presetName];
    if (preset) {
      this.visualizer.loadPreset(preset, transitionTime);
      console.log(`Loaded preset: ${presetName}`);
    }
  }

  nextPreset() {
    if (!this.presets) return;

    const presetKeys = Object.keys(this.presets);
    this.currentPresetIndex = (this.currentPresetIndex + 1) % presetKeys.length;
    const presetName = presetKeys[this.currentPresetIndex];
    this.loadPreset(presetName, 2.0);
  }

  previousPreset() {
    if (!this.presets) return;

    const presetKeys = Object.keys(this.presets);
    this.currentPresetIndex = (this.currentPresetIndex - 1 + presetKeys.length) % presetKeys.length;
    const presetName = presetKeys[this.currentPresetIndex];
    this.loadPreset(presetName, 2.0);
  }

  cyclePreset(direction = 1) {
    if (direction > 0) {
      this.nextPreset();
    } else {
      this.previousPreset();
    }
  }

  start() {
    if (!this.isInitialized) {
      console.warn('Butterchurn pas encore initialisé');
      return;
    }
    
    if (this.animationId) {
      console.log('Animation déjà en cours');
      return;
    }

    console.log('Démarrage de l\'animation Butterchurn');
    let frameCount = 0;
    
    const render = () => {
      if (this.visualizer) {
        try {
          this.visualizer.render();
          frameCount++;
          if (frameCount % 60 === 0) {
            console.log(`Butterchurn rendering - ${frameCount} frames`);
          }
        } catch (error) {
          console.error('Erreur lors du rendu Butterchurn:', error);
        }
      }
      this.animationId = requestAnimationFrame(render);
    };

    render();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setOpacity(opacity) {
    if (this.canvas) {
      this.canvas.style.opacity = opacity;
    }
  }

  toggle() {
    if (this.canvas) {
      const isVisible = this.canvas.style.opacity !== '0';
      if (isVisible) {
        // Cacher le visualiseur et activer le fond noir
        this.canvas.style.opacity = '0';
        document.body.classList.add('bg-hidden');
      } else {
        // Réafficher le visualiseur et retirer le fond noir
        this.canvas.style.opacity = '1';
        document.body.classList.remove('bg-hidden');
      }
      return !isVisible;
    }
    return false;
  }

  destroy() {
    this.stop();
    if (this.visualizer) {
      // Butterchurn n'a pas de méthode destroy explicite, mais on nettoie les références
      this.visualizer = null;
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.isInitialized = false;
  }
}
