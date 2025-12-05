/* ========== Visualisation Canvas 2D - Stereo Mirror Explosion (Création de Romain) ========== */

export class StereoMirrorBackground {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
    this.isEnabled = false;
    this.animationId = null;
    
    // Paramètres de visualisation
    this.numPoints = 64;
    this.baseRadius = 20;
    this.geometryCache = [];
    this.neonHues = [320, 270, 220, 180, 120, 60];
    
    // Pour la version bleutée flashy
    this.useBlueTheme = true;
    this.blueColors = [
      { h: 200, s: 100 }, // Bleu électrique
      { h: 190, s: 100 }, // Cyan flashy
      { h: 270, s: 100 }, // Violet électrique
      { h: 280, s: 100 }, // Magenta-bleu
      { h: 180, s: 100 }  // Turquoise néon
    ];
  }

  async initialize(canvasId = 'bgCanvas') {
    if (this.isInitialized) return;

    // Créer le canvas de fond s'il n'existe pas
    this.canvas = document.getElementById(canvasId);
    
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.zIndex = '0';
      this.canvas.style.pointerEvents = 'none';
      document.body.insertBefore(this.canvas, document.body.firstChild);
    }

    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.resizeCanvas();
    
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.isInitialized = true;
    console.log('✅ Stereo Mirror Background initialisé');
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.precomputeGeometry();
  }

  precomputeGeometry() {
    this.geometryCache = [];
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Pré-calcul pour les 2 canaux (L et R)
    for (let channel = 0; channel < 2; channel++) {
      let channelPoints = [];
      const isRight = channel === 1;

      for (let i = 0; i < this.numPoints; i++) {
        // Angle de base (Demi-cercle haut)
        let angleTop;
        if (isRight) {
          angleTop = (i / this.numPoints) * Math.PI;
        } else {
          angleTop = Math.PI - (i / this.numPoints) * Math.PI;
        }
        
        // Angle inversé (Demi-cercle bas)
        let angleBottom;
        if (isRight) {
          angleBottom = 2 * Math.PI - (i / this.numPoints) * Math.PI;
        } else {
          angleBottom = Math.PI + (i / this.numPoints) * Math.PI;
        }

        const calcMaxDist = (a) => {
          const dirX = Math.cos(a);
          const dirY = Math.sin(a);
          const epsilon = 0.0001;
          let distX = Infinity;
          let distY = Infinity;
          
          if (Math.abs(dirX) > epsilon) {
            distX = dirX > 0 ? (this.canvas.width - centerX) / dirX : -centerX / dirX;
          }
          if (Math.abs(dirY) > epsilon) {
            distY = dirY > 0 ? (this.canvas.height - centerY) / dirY : -centerY / dirY;
          }
          
          return {
            maxDist: Math.min(Math.abs(distX), Math.abs(distY)),
            dx: dirX,
            dy: dirY
          };
        };

        channelPoints.push({
          top: calcMaxDist(angleTop),
          bottom: calcMaxDist(angleBottom)
        });
      }
      this.geometryCache.push(channelPoints);
    }
  }

  enable() {
    if (!this.isInitialized) {
      console.warn('Stereo Mirror Background pas encore initialisé');
      return;
    }
    
    this.isEnabled = true;
    if (this.canvas) {
      this.canvas.style.display = 'block';
    }
    
    this.startRendering();
    console.log('👁️ Stereo Mirror Background activé');
  }

  disable() {
    this.isEnabled = false;
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    console.log('👁️ Stereo Mirror Background désactivé');
  }

  toggle() {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  startRendering() {
    if (!this.isEnabled) return;

    const render = () => {
      if (!this.isEnabled) return;
      
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    
    render();
  }

  draw() {
    if (!this.ctx || !this.canvas) return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Effet de trainée
    this.ctx.globalCompositeOperation = 'source-over';
    
    if (this.useBlueTheme) {
      // Fond bleuté sombre pour le thème bleu
      this.ctx.fillStyle = 'rgba(0, 5, 20, 0.3)';
    } else {
      this.ctx.fillStyle = 'rgba(5, 5, 16, 0.4)';
    }
    
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Récupérer les données audio stéréo
    const audioData = this.audioManager.getAudioData();
    
    if (audioData && audioData.dataArray) {
      // Simuler la séparation stéréo (on utilise les mêmes données mais avec variation)
      this.drawFastStereo(centerX, centerY, audioData.dataArray, audioData.dataArray);
    } else {
      // Mode statique/idle
      const dummyData = new Uint8Array(128).fill(20);
      this.drawFastStereo(centerX, centerY, dummyData, dummyData);
    }
  }

  drawFastStereo(centerX, centerY, leftData, rightData) {
    // Mode additif pour effet néon
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';

    const drawSide = (data, channelIndex) => {
      const cachedChannel = this.geometryCache[channelIndex];
      if (!cachedChannel) return;

      for (let i = 0; i < this.numPoints; i++) {
        const geo = cachedChannel[i];
        
        // Mapping vers les basses fréquences
        const dataIndex = Math.floor((i / this.numPoints) * (data.length * 0.6));
        const rawValue = data[dataIndex] / 255.0;
        
        // Skip si volume trop bas
        if (rawValue < 0.05) continue;

        const value = rawValue * rawValue * rawValue; // Courbe cubique
        
        // Couleur selon le thème
        let hue, saturation, lightness;
        
        if (this.useBlueTheme) {
          // Thème bleuté flashy
          const colorIndex = Math.floor((i / this.numPoints) * this.blueColors.length);
          const color = this.blueColors[colorIndex % this.blueColors.length];
          hue = color.h + (rawValue * 30); // Variation subtile
          saturation = color.s;
          lightness = 50 + rawValue * 40; // Très lumineux avec l'audio
        } else {
          // Palette originale
          const paletteIndex = Math.floor((i / this.numPoints) * this.neonHues.length);
          hue = this.neonHues[paletteIndex] + (rawValue * 40);
          saturation = 100;
          lightness = 50 + rawValue * 30;
        }
        
        this.ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        this.ctx.beginPath();
        
        if (i > 0) {
          const prevGeo = cachedChannel[i - 1];
          const prevIdx = Math.floor(((i - 1) / this.numPoints) * (data.length * 0.6));
          const prevRaw = data[prevIdx] / 255.0;
          const prevVal = prevRaw * prevRaw * prevRaw;
          
          // Dessiner segment haut
          const distTop = this.baseRadius + (geo.top.maxDist - this.baseRadius) * value;
          const prevDistTop = this.baseRadius + (prevGeo.top.maxDist - this.baseRadius) * prevVal;
          
          this.ctx.moveTo(
            centerX + prevGeo.top.dx * prevDistTop,
            centerY + prevGeo.top.dy * prevDistTop
          );
          this.ctx.lineTo(centerX + geo.top.dx * distTop, centerY + geo.top.dy * distTop);
          
          // Dessiner segment bas
          const distBot = this.baseRadius + (geo.bottom.maxDist - this.baseRadius) * value;
          const prevDistBot = this.baseRadius + (prevGeo.bottom.maxDist - this.baseRadius) * prevVal;
          
          this.ctx.moveTo(
            centerX + prevGeo.bottom.dx * prevDistBot,
            centerY + prevGeo.bottom.dy * prevDistBot
          );
          this.ctx.lineTo(
            centerX + geo.bottom.dx * distBot,
            centerY + geo.bottom.dy * distBot
          );
        }
        
        this.ctx.stroke();
      }
    };

    drawSide(leftData, 0); // Gauche
    drawSide(rightData, 1); // Droite
    
    // Reset composition
    this.ctx.globalCompositeOperation = 'source-over';
  }

  setTheme(useBlue = true) {
    this.useBlueTheme = useBlue;
  }
}
