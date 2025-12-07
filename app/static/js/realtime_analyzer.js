/* ========== Analyse Audio Temps Réel ========== */

export class RealtimeAnalyzer {
  constructor(audioCapture) {
    this.audioCapture = audioCapture;
    
    // Paramètres du buffer circulaire
    this.bufferDuration = 5000; // 5 secondes en ms
    this.sampleRate = 60; // 60 FPS
    this.bufferSize = Math.floor((this.bufferDuration / 1000) * this.sampleRate);
    
    // Buffers circulaires pour les features
    this.energyBuffer = new Float32Array(this.bufferSize);
    this.spectralCentroidBuffer = new Float32Array(this.bufferSize);
    this.spectralRolloffBuffer = new Float32Array(this.bufferSize);
    this.lowFreqBuffer = new Float32Array(this.bufferSize);
    this.midFreqBuffer = new Float32Array(this.bufferSize);
    this.highFreqBuffer = new Float32Array(this.bufferSize);
    
    // Index circulaire
    this.currentIndex = 0;
    this.bufferFilled = false;
    
    // Stats courantes
    this.stats = {
      energy_mean: 0,
      energy_std: 0,
      centroid_mean: 0,
      centroid_std: 0,
      rolloff_mean: 0,
      rolloff_std: 0,
      low_mean: 0,
      mid_mean: 0,
      high_mean: 0
    };
    
    // Détection de transitions
    this.lastTransitionTime = 0;
    this.transitionCooldown = 2000; // 2 secondes entre transitions
    this.currentSectionType = 'intro';
    
    // Seuils de détection
    this.energyThreshold = 2.0; // Nombre d'écarts-types
    this.spectralThreshold = 1.5;
  }

  update() {
    if (!this.audioCapture.isCapturing) return null;
    
    const freqData = this.audioCapture.getFrequencyData();
    if (!freqData) return null;
    
    // Calculer les features de cette frame
    const features = this.extractFeatures(freqData);
    
    // Ajouter au buffer circulaire
    this.addToBuffer(features);
    
    // Calculer les statistiques
    this.computeStats();
    
    // Détecter les transitions
    const transition = this.detectTransition(features);
    
    return {
      current: features,
      stats: this.stats,
      transition: transition,
      sectionType: this.currentSectionType
    };
  }

  extractFeatures(freqData) {
    const len = freqData.length;
    
    // 1. Énergie globale (RMS)
    let sumSquares = 0;
    for (let i = 0; i < len; i++) {
      const val = freqData[i] / 255.0;
      sumSquares += val * val;
    }
    const energy = Math.sqrt(sumSquares / len);
    
    // 2. Spectral Centroid (centre de masse du spectre)
    let weightedSum = 0;
    let totalMagnitude = 0;
    for (let i = 0; i < len; i++) {
      const mag = freqData[i] / 255.0;
      weightedSum += i * mag;
      totalMagnitude += mag;
    }
    const centroid = totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
    
    // 3. Spectral Rolloff (85% de l'énergie)
    const threshold = totalMagnitude * 0.85;
    let cumulativeSum = 0;
    let rolloff = 0;
    for (let i = 0; i < len; i++) {
      cumulativeSum += freqData[i] / 255.0;
      if (cumulativeSum >= threshold) {
        rolloff = i / len;
        break;
      }
    }
    
    // 4. Bandes de fréquences détaillées (10 bandes au lieu de 3)
    // Division inspirée des instruments réels:
    // Sub-bass: 20-60Hz (bin 0-2%)
    // Bass: 60-250Hz (bin 2-8%)
    // Low-mid: 250-500Hz (bin 8-15%)
    // Mid: 500-1kHz (bin 15-25%)
    // High-mid: 1k-2kHz (bin 25-35%)
    // Presence: 2k-4kHz (bin 35-50%)
    // Brilliance: 4k-8kHz (bin 50-70%)
    // Air: 8k-12kHz (bin 70-85%)
    // Sparkle: 12k-16kHz (bin 85-95%)
    // Ultra: 16k-20kHz (bin 95-100%)
    
    const bands = [
      { name: 'subBass', start: 0, end: 0.02 },      // Kick fondamental
      { name: 'bass', start: 0.02, end: 0.08 },      // Basse, kick
      { name: 'lowMid', start: 0.08, end: 0.15 },    // Tom, guitare basse
      { name: 'mid', start: 0.15, end: 0.25 },       // Snare, guitare
      { name: 'highMid', start: 0.25, end: 0.35 },   // Voix, guitare lead
      { name: 'presence', start: 0.35, end: 0.50 },  // Voix brillance, cymbales
      { name: 'brilliance', start: 0.50, end: 0.70 },// Hi-hat, cymbales
      { name: 'air', start: 0.70, end: 0.85 },       // Cymbales, effets
      { name: 'sparkle', start: 0.85, end: 0.95 },   // Air, harmoniques
      { name: 'ultra', start: 0.95, end: 1.0 }       // Harmoniques ultra
    ];
    
    const bandValues = {};
    
    for (const band of bands) {
      const startIdx = Math.floor(len * band.start);
      const endIdx = Math.floor(len * band.end);
      let sum = 0;
      
      for (let i = startIdx; i < endIdx; i++) {
        sum += freqData[i] / 255.0;
      }
      
      bandValues[band.name] = sum / Math.max(1, endIdx - startIdx);
    }
    
    // Garder aussi les anciennes bandes pour compatibilité
    const lowEnd = Math.floor(len * 0.15);
    const midEnd = Math.floor(len * 0.5);
    let lowSum = 0, midSum = 0, highSum = 0;
    
    for (let i = 0; i < lowEnd; i++) {
      lowSum += freqData[i] / 255.0;
    }
    for (let i = lowEnd; i < midEnd; i++) {
      midSum += freqData[i] / 255.0;
    }
    for (let i = midEnd; i < len; i++) {
      highSum += freqData[i] / 255.0;
    }
    
    return {
      energy: energy,
      centroid: centroid / len,
      rolloff: rolloff,
      low: lowSum / lowEnd,
      mid: midSum / (midEnd - lowEnd),
      high: highSum / (len - midEnd),
      // Nouvelles bandes détaillées
      ...bandValues
    };
  }

  addToBuffer(features) {
    this.energyBuffer[this.currentIndex] = features.energy;
    this.spectralCentroidBuffer[this.currentIndex] = features.centroid;
    this.spectralRolloffBuffer[this.currentIndex] = features.rolloff;
    this.lowFreqBuffer[this.currentIndex] = features.low;
    this.midFreqBuffer[this.currentIndex] = features.mid;
    this.highFreqBuffer[this.currentIndex] = features.high;
    
    this.currentIndex = (this.currentIndex + 1) % this.bufferSize;
    
    if (!this.bufferFilled && this.currentIndex === 0) {
      this.bufferFilled = true;
      console.log('📊 Buffer de 5 secondes rempli - Détection activée');
    }
  }

  computeStats() {
    if (!this.bufferFilled) return;
    
    // Calculer moyenne et écart-type pour chaque feature
    this.stats.energy_mean = this.mean(this.energyBuffer);
    this.stats.energy_std = this.std(this.energyBuffer, this.stats.energy_mean);
    
    this.stats.centroid_mean = this.mean(this.spectralCentroidBuffer);
    this.stats.centroid_std = this.std(this.spectralCentroidBuffer, this.stats.centroid_mean);
    
    this.stats.rolloff_mean = this.mean(this.spectralRolloffBuffer);
    this.stats.rolloff_std = this.std(this.spectralRolloffBuffer, this.stats.rolloff_mean);
    
    this.stats.low_mean = this.mean(this.lowFreqBuffer);
    this.stats.mid_mean = this.mean(this.midFreqBuffer);
    this.stats.high_mean = this.mean(this.highFreqBuffer);
  }

  mean(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return sum / buffer.length;
  }

  std(buffer, mean) {
    let sumSquaredDiff = 0;
    for (let i = 0; i < buffer.length; i++) {
      const diff = buffer[i] - mean;
      sumSquaredDiff += diff * diff;
    }
    return Math.sqrt(sumSquaredDiff / buffer.length);
  }

  detectTransition(current) {
    if (!this.bufferFilled) return null;
    
    const now = Date.now();
    
    // Cooldown entre transitions
    if (now - this.lastTransitionTime < this.transitionCooldown) {
      return null;
    }
    
    // Détecter un saut d'énergie significatif
    const energyDeviation = (current.energy - this.stats.energy_mean) / (this.stats.energy_std + 0.001);
    const centroidDeviation = (current.centroid - this.stats.centroid_mean) / (this.stats.centroid_std + 0.001);
    
    // Transition détectée si énergie ou centroid dépassent le seuil
    if (Math.abs(energyDeviation) > this.energyThreshold || 
        Math.abs(centroidDeviation) > this.spectralThreshold) {
      
      this.lastTransitionTime = now;
      
      // Classifier le type de transition
      const newSectionType = this.classifySection(current, energyDeviation, centroidDeviation);
      
      console.log(`🎵 Transition détectée: ${this.currentSectionType} → ${newSectionType}`);
      console.log(`   Énergie: ${energyDeviation.toFixed(2)}σ, Centroid: ${centroidDeviation.toFixed(2)}σ`);
      
      this.currentSectionType = newSectionType;
      
      return {
        from: this.currentSectionType,
        to: newSectionType,
        energyChange: energyDeviation,
        spectralChange: centroidDeviation,
        timestamp: now
      };
    }
    
    return null;
  }

  classifySection(current, energyDev, centroidDev) {
    // Classification basée sur l'énergie et le contenu spectral
    const energy = current.energy;
    const centroid = current.centroid;
    const lowRatio = current.low / (current.low + current.mid + current.high + 0.001);
    
    // Drop : Énergie très haute + basses dominantes
    if (energy > 0.15 && lowRatio > 0.5 && energyDev > 2.5) {
      return 'drop';
    }
    
    // Buildup : Centroid qui monte + énergie qui augmente
    if (energyDev > 1.5 && centroidDev > 1.0 && energy > 0.08) {
      return 'buildup';
    }
    
    // Chorus : Énergie haute + spectre équilibré
    if (energy > 0.10 && energy < 0.15 && centroid > 0.3) {
      return 'chorus';
    }
    
    // Breakdown : Énergie qui baisse brutalement
    if (energyDev < -2.0 && energy < 0.05) {
      return 'breakdown';
    }
    
    // Verse : Énergie moyenne stable
    if (energy > 0.04 && energy < 0.10 && Math.abs(energyDev) < 1.0) {
      return 'verse';
    }
    
    // Bridge : Variation spectrale sans grand changement d'énergie
    if (Math.abs(centroidDev) > 1.5 && Math.abs(energyDev) < 1.0) {
      return 'bridge';
    }
    
    // Intro/Outro : Énergie très basse
    if (energy < 0.04) {
      return this.currentSectionType === 'intro' ? 'intro' : 'outro';
    }
    
    // Par défaut, garder le type actuel
    return this.currentSectionType;
  }

  reset() {
    this.energyBuffer.fill(0);
    this.spectralCentroidBuffer.fill(0);
    this.spectralRolloffBuffer.fill(0);
    this.lowFreqBuffer.fill(0);
    this.midFreqBuffer.fill(0);
    this.highFreqBuffer.fill(0);
    this.currentIndex = 0;
    this.bufferFilled = false;
    this.lastTransitionTime = 0;
    this.currentSectionType = 'intro';
    console.log('🔄 Analyseur réinitialisé');
  }

  getCurrentSection() {
    return this.currentSectionType;
  }

  getStats() {
    return this.stats;
  }
}
