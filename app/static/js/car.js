/* ========== Gestion de la voiture animée ========== */

export class Car {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: true});
    this.carImg = null;
    this.posX = 0;
    this.posY = 0;
    this.yVel = 0;
    this.visualScale = 1.0;
    this.lastPeakTime = 0;
    this.jumpSensitivity = 0.5;
  }

  loadImage(file) {
    const img = new Image();
    img.onload = () => { this.carImg = img; };
    img.src = URL.createObjectURL(file);
  }

  setJumpSensitivity(value) {
    this.jumpSensitivity = value;
  }

  update(progress, amplitude, groundY, canvasWidth, canvasHeight) {
    this.posX = progress * canvasWidth;
    
    // Jump detection
    const now = performance.now();
    if (amplitude > this.jumpSensitivity && (now - this.lastPeakTime) > 180) {
      this.yVel = -6 - (amplitude * 12);
      this.lastPeakTime = now;
    }

    // Gravity simulation
    this.yVel += 0.35;
    this.posY += this.yVel;
    
    const carGround = groundY - 12;
    
    if (this.posY > carGround) {
      this.posY = carGround;
      this.yVel *= -0.12;
      if (Math.abs(this.yVel) < 0.5) this.yVel = 0;
    }

    // Initialize posY if first frame
    if (!this.posY || this.posY === 0) this.posY = carGround;
  }

  draw(groundY, canvasWidth, canvasHeight) {
    const W = canvasWidth;
    const H = canvasHeight;

    // Draw shadow
    const shadowW = 60 * this.visualScale;
    const shadowH = 12 * this.visualScale;
    this.ctx.beginPath();
    this.ctx.ellipse(this.posX, groundY + 22, shadowW, shadowH, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = "rgba(0,0,0,0.28)";
    this.ctx.fill();

    // Draw car
    if (this.carImg) {
      const cw = 120 * this.visualScale;
      const ch = (this.carImg.height / this.carImg.width) * cw;
      this.ctx.save();
      const tilt = Math.max(-0.25, Math.min(0.25, this.yVel * 0.03));
      this.ctx.translate(this.posX, this.posY - ch / 2);
      this.ctx.rotate(tilt);
      this.ctx.drawImage(this.carImg, -cw / 2, -ch / 2, cw, ch);
      this.ctx.restore();
    } else {
      this.drawStylizedCar(W);
    }
  }

  drawStylizedCar(canvasWidth) {
    this.ctx.save();
    this.ctx.translate(this.posX, this.posY);
    const scale = Math.max(0.6, Math.min(1.2, canvasWidth / 900));
    this.ctx.scale(scale, scale);
    
    // Main body (sleek sports car shape)
    this.ctx.beginPath();
    this.ctx.moveTo(-55, 10);
    this.ctx.bezierCurveTo(-55, -5, -45, -15, -30, -15);
    this.ctx.lineTo(30, -15);
    this.ctx.bezierCurveTo(50, -15, 60, -5, 60, 10);
    this.ctx.lineTo(60, 15);
    this.ctx.lineTo(-55, 15);
    this.ctx.closePath();
    
    const bodyGrad = this.ctx.createLinearGradient(0, -15, 0, 15);
    bodyGrad.addColorStop(0, "#7c3aed");
    bodyGrad.addColorStop(0.5, "#a78bfa");
    bodyGrad.addColorStop(1, "#6d28d9");
    this.ctx.fillStyle = bodyGrad;
    this.ctx.fill();
    
    // Body outline/shine
    this.ctx.strokeStyle = "rgba(255,255,255,0.3)";
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    
    // Windshield
    this.ctx.beginPath();
    this.ctx.moveTo(-20, -15);
    this.ctx.lineTo(-10, -25);
    this.ctx.lineTo(20, -25);
    this.ctx.lineTo(30, -15);
    this.ctx.closePath();
    const windshieldGrad = this.ctx.createLinearGradient(0, -25, 0, -15);
    windshieldGrad.addColorStop(0, "rgba(100,200,255,0.4)");
    windshieldGrad.addColorStop(1, "rgba(150,220,255,0.6)");
    this.ctx.fillStyle = windshieldGrad;
    this.ctx.fill();
    this.ctx.strokeStyle = "rgba(255,255,255,0.5)";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // Side windows
    this.ctx.fillStyle = "rgba(50,50,100,0.5)";
    this.ctx.beginPath();
    this.ctx.moveTo(-20, -15);
    this.ctx.lineTo(-15, -20);
    this.ctx.lineTo(-10, -20);
    this.ctx.lineTo(-10, -15);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.moveTo(30, -15);
    this.ctx.lineTo(25, -20);
    this.ctx.lineTo(20, -20);
    this.ctx.lineTo(20, -15);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Headlights
    this.ctx.fillStyle = "#fff";
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = "#ffff00";
    this.ctx.beginPath();
    this.ctx.ellipse(55, 8, 5, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(55, 2, 5, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Taillights
    this.ctx.fillStyle = "#ff0000";
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = "#ff0000";
    this.ctx.beginPath();
    this.ctx.ellipse(-52, 8, 4, 2.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(-52, 2, 4, 2.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Spoiler
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(-58, -8, 5, 2);
    this.ctx.fillRect(-60, -12, 10, 3);
    this.ctx.strokeStyle = "rgba(255,255,255,0.2)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(-60, -12, 10, 3);
    
    // Racing stripes
    this.ctx.fillStyle = "rgba(255,255,255,0.3)";
    this.ctx.fillRect(-20, -14, 6, 28);
    this.ctx.fillRect(5, -14, 6, 28);
    
    // Wheels (with rims)
    const wheelPositions = [-35, 35];
    wheelPositions.forEach(x => {
      // Tire
      this.ctx.beginPath();
      this.ctx.arc(x, 18, 12, 0, Math.PI * 2);
      this.ctx.fillStyle = "#1a1a1a";
      this.ctx.fill();
      this.ctx.strokeStyle = "#333";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Rim
      this.ctx.beginPath();
      this.ctx.arc(x, 18, 8, 0, Math.PI * 2);
      const rimGrad = this.ctx.createRadialGradient(x, 18, 0, x, 18, 8);
      rimGrad.addColorStop(0, "#ddd");
      rimGrad.addColorStop(0.6, "#999");
      rimGrad.addColorStop(1, "#666");
      this.ctx.fillStyle = rimGrad;
      this.ctx.fill();
      
      // Rim spokes
      this.ctx.strokeStyle = "#555";
      this.ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 18);
        this.ctx.lineTo(x + Math.cos(angle) * 6, 18 + Math.sin(angle) * 6);
        this.ctx.stroke();
      }
      
      // Hub cap
      this.ctx.beginPath();
      this.ctx.arc(x, 18, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = "#aaa";
      this.ctx.fill();
    });
    
    // Undercarriage shadow detail
    this.ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.ctx.fillRect(-50, 16, 100, 3);
    
    // Speed lines effect (optional visual flair)
    if (Math.abs(this.yVel) > 1) {
      this.ctx.strokeStyle = "rgba(124,58,237,0.3)";
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(-60 - i * 8, -10 + i * 5);
        this.ctx.lineTo(-70 - i * 10, -10 + i * 5);
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = {tl: r, tr: r, br: r, bl: r};
    else r = Object.assign({tl: 0, tr: 0, br: 0, bl: 0}, r);
    
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
  }
}

// Polyfill for roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = {tl: r, tr: r, br: r, bl: r};
    else r = Object.assign({tl: 0, tr: 0, br: 0, bl: 0}, r);
    
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
  };
}
