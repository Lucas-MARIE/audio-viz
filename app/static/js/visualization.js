/* ========== Visualisation du spectre audio ========== */

export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: true});
    this.W = 0;
    this.H = 0;
    this.symmetricData = [];
    this.bgVideo = document.getElementById('bgVideo');
    
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
    const marginTop = 24;
    const bottom = this.H * 0.92;
    const step = this.W / (len - 1);

    this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.save();

    // Create path for clipping
    this.ctx.beginPath();
    this.ctx.moveTo(0, bottom);
    
    for (let i = 0; i < len; i++) {
      const x = i * step;
      const amp = this.symmetricData[i];
      const curve = Math.pow(amp, 0.8);
      const y = bottom - (curve * (this.H * 0.7)) - marginTop;
      
      if (i === 0) {
        this.ctx.lineTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const prevAmp = this.symmetricData[i - 1];
        const prevCurve = Math.pow(prevAmp, 0.8);
        const prevY = bottom - (prevCurve * (this.H * 0.7)) - marginTop;
        const cx = (prevX + x) / 2;
        const cy = (prevY + y) / 2;
        this.ctx.quadraticCurveTo(prevX, prevY, cx, cy);
      }
    }
    
    this.ctx.lineTo(this.W, bottom);
    this.ctx.closePath();

    // Draw video background with clipping
    this.ctx.save();
    this.ctx.clip();
    
    if (this.bgVideo && this.bgVideo.readyState >= 2 && !this.bgVideo.paused) {
      const vW = this.bgVideo.videoWidth || this.W;
      const vH = this.bgVideo.videoHeight || this.H;
      const scale = Math.max(this.W / vW, this.H / vH);
      const vw = vW * scale;
      const vh = vH * scale;
      const dx = (this.W - vw) / 2;
      const dy = (this.H - vh) / 2;
      this.ctx.globalAlpha = 0.95;
      this.ctx.drawImage(this.bgVideo, dx, dy, vw, vh);
    } else {
      const g = this.ctx.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, "rgba(124,58,237,0.18)");
      g.addColorStop(0.5, "rgba(14,165,233,0.12)");
      g.addColorStop(1, "rgba(15,23,42,0.08)");
      this.ctx.fillStyle = g;
      this.ctx.fillRect(0, 0, this.W, this.H);
    }
    
    this.ctx.restore();

    // Draw glow
    this.ctx.save();
    this.ctx.shadowBlur = 24;
    this.ctx.shadowColor = "rgba(124,58,237,0.6)";
    this.ctx.fillStyle = "rgba(124,58,237,0.12)";
    this.ctx.fill();
    this.ctx.restore();

    // Draw stroke
    this.ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = i * step;
      const amp = this.symmetricData[i];
      const curve = Math.pow(amp, 0.85);
      const y = bottom - (curve * (this.H * 0.7)) - marginTop;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    
    this.ctx.lineWidth = 2.5;
    const strokeGrad = this.ctx.createLinearGradient(0, 0, this.W, 0);
    strokeGrad.addColorStop(0, "rgba(120, 40, 240, 0.9)");
    strokeGrad.addColorStop(0.5, "rgba(255,215,0,1)");
    strokeGrad.addColorStop(1, "rgba(120, 40, 240, 0.9)");
    this.ctx.strokeStyle = strokeGrad;
    this.ctx.stroke();

    // Subtle top glow
    this.ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = i * step;
      const amp = this.symmetricData[i];
      const curve = Math.pow(amp, 0.6);
      const y = bottom - (curve * (this.H * 0.7)) - marginTop;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = "rgba(255,255,255,0.08)";
    this.ctx.stroke();

    // Center marker
    this.ctx.beginPath();
    this.ctx.moveTo(this.W / 2, bottom + 6);
    this.ctx.lineTo(this.W / 2, bottom + 24);
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeStyle = "rgba(255,255,255,0.06)";
    this.ctx.stroke();

    this.ctx.restore();
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
