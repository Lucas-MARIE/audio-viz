/* ========== Visualisation du spectre audio ========== */

export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: true});
    this.W = 0;
    this.H = 0;
    this.symmetricData = [];
    this.bgVideo = document.getElementById('bgVideo');
    this.currentProgress = 0;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const ratio = devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.canvas.clientWidth * ratio);
    this.canvas.height = Math.floor(this.canvas.clientHeight * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.W = this.canvas.clientWidth;
    this.H = this.canvas.clientHeight;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.currentProgress = 0;
  }

  getSymmetricData(raw) {
    const N = raw.length;
    const half = Math.floor(N / 2);
    const left = new Float32Array(half);
    
    for (let i = 0; i < half; i++) {
      left[i] = raw[i] / 255;
    }
    
    // Smooth transition
    for (let i = 1; i < half - 1; i++) {
      left[i] = (left[i - 1] * 0.15 + left[i] * 0.7 + left[i + 1] * 0.15);
    }
    
    // Create symmetric array
    const symmetric = new Float32Array(half * 2);
    for (let i = 0; i < half; i++) {
      symmetric[i] = left[half - 1 - i];
      symmetric[half + i] = left[i];
    }
    
    return symmetric;
  }

  drawSpectrum(dataArray) {
    if (!dataArray) return;
    
    this.symmetricData = this.getSymmetricData(dataArray);
    const len = this.symmetricData.length;
    const marginTop = this.H * 0.1;
    const bottom = this.H * 0.9;
    const step = this.W / (len - 1);

    this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.save();

    // Calculer tous les points de la courbe
    const curvePoints = [];
    for (let i = 0; i < len; i++) {
      const x = i * step;
      const amp = this.symmetricData[i];
      const curve = Math.pow(amp, 0.8);
      const y = bottom - (curve * (this.H * 0.7)) - marginTop;
      curvePoints.push({x, y});
    }

    // Ne plus dessiner de fond opaque - on veut voir Butterchurn
    // Juste dessiner la courbe avec deux parties

    // Partie jouée (colorée) - on utilisera le progress depuis le main
    const progress = this.currentProgress || 0;
    const playedX = progress * this.W;
    
    // ===== PARTIE JOUÉE (colorée) =====
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, playedX, this.H);
    this.ctx.clip();

    this.ctx.beginPath();
    for (let i = 0; i < curvePoints.length; i++) {
      const pt = curvePoints[i];
      if (i === 0) this.ctx.moveTo(pt.x, pt.y);
      else this.ctx.lineTo(pt.x, pt.y);
    }
    this.ctx.lineWidth = 3;
    const strokeGrad = this.ctx.createLinearGradient(0, 0, this.W, 0);
    strokeGrad.addColorStop(0, "rgba(120, 40, 240, 0.9)");
    strokeGrad.addColorStop(0.5, "rgba(255,215,0,1)");
    strokeGrad.addColorStop(1, "rgba(120, 40, 240, 0.9)");
    this.ctx.strokeStyle = strokeGrad;
    this.ctx.stroke();
    this.ctx.restore();

    // ===== PARTIE NON-JOUÉE (blanche semi-transparente) =====
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(playedX, 0, this.W - playedX, this.H);
    this.ctx.clip();

    this.ctx.beginPath();
    for (let i = 0; i < curvePoints.length; i++) {
      const pt = curvePoints[i];
      if (i === 0) this.ctx.moveTo(pt.x, pt.y);
      else this.ctx.lineTo(pt.x, pt.y);
    }
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = "rgba(255,255,255,0.5)";
    this.ctx.stroke();
    this.ctx.restore();

    // Point indicateur sur la position actuelle
    const progressIdx = Math.floor(progress * (len - 1));
    if (progressIdx < curvePoints.length) {
      const pt = curvePoints[progressIdx];
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(255,215,0,1)";
      this.ctx.fill();
      this.ctx.strokeStyle = "rgba(255,255,255,0.9)";
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // Méthode pour mettre à jour le progress depuis l'extérieur
  setProgress(progress) {
    this.currentProgress = progress;
  }

  drawIdleBackground() {
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    this.ctx.lineWidth = 1;
    const step = 40;
    
    for (let x = 0; x < this.W; x += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.H);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < this.H; y += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.W, y);
      this.ctx.stroke();
    }
  }

  drawHUD(currentTime, duration) {
    this.ctx.fillStyle = "rgba(255,255,255,0.06)";
    this.ctx.fillRect(8, 8, 180, 36);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px system-ui, Arial";
    this.ctx.fillText(`${this.formatTime(currentTime)} / ${this.formatTime(duration)}`, 18, 30);
  }

  formatTime(sec) {
    if (!isFinite(sec)) return "0:00";
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const m = Math.floor(sec / 60).toString();
    return `${m}:${s}`;
  }

  getAmplitudeAt(progress) {
    if (this.symmetricData.length === 0) return 0;
    const idx = Math.floor(progress * (this.symmetricData.length - 1));
    return this.symmetricData[idx] || 0;
  }

  getGroundY(amplitude) {
    const bottom = this.H * 0.92;
    const marginTop = 24;
    const ampCurve = Math.pow(amplitude, 0.85);
    return bottom - (ampCurve * (this.H * 0.7)) - marginTop;
  }
}
