/* ========== Application Visualiseur Temps Réel Infini ========== */

import { AudioCapture } from './audio_capture.js';
import { RealtimeAnalyzer } from './realtime_analyzer.js';
import { Visualizer } from './visualization.js';
import { ShaderBackground } from './shader_background.js';
import { ButterchurnBackground } from './visualization_background.js';

class InfiniteVisualizerApp {
  constructor() {
    this.canvas = document.getElementById('canvas');
    
    // Initialize modules
    this.audioCapture = new AudioCapture();
    this.realtimeAnalyzer = new RealtimeAnalyzer(this.audioCapture);
    this.visualizer = new Visualizer(this.canvas);
    this.shaderBg = new ShaderBackground(this.createAudioManagerAdapter());
    this.butterchurnBg = new ButterchurnBackground(this.createButterchurnAdapter());
    
    // État
    this.isRunning = false;
    this.animationId = null;
    this.shaderInitialized = false;
    this.butterchurnInitialized = false;
    this.currentMode = 'butterchurn';
    
    // Mapping sections → shaders (réutilise la logique existante)
    this.sectionToShaderMap = {
      'intro': [0, 1, 2, 19, 20],
      'verse': [3, 4, 5, 6, 7, 20],
      'chorus': [10, 11, 12, 15, 18, 20],
      'drop': [13, 14, 15, 16, 17, 20],
      'buildup': [8, 9, 10, 20],
      'bridge': [4, 5, 6, 7, 20],
      'breakdown': [1, 2, 3, 19, 20],
      'outro': [0, 1, 19, 20]
    };
    
    this.currentShaderPair = null;
    
    // Système de détection intelligent des changements musicaux
    this.musicChangeDetector = {
      history: [],
      maxHistory: 120, // 2 secondes à 60 FPS (réduit de 3s pour réactivité)
      lastChangeTime: 0,
      minTimeBetweenChanges: 3000, // 3 secondes minimum
      
      // Détection de tempo en temps réel (améliorée)
      beatTimes: [],
      estimatedBPM: 120,
      lastValidBPM: 120,
      lastBeatTime: 0,
      energyHistory: [], // Historique pour seuil adaptatif
      lastBPMUpdateTime: 0,
      bpmHistory: [], // Historique des BPM pour stabilisation
      maxBpmHistory: 10, // Garder 10 mesures de BPM
      
      // Détection d'instrumentation (NOUVEAU)
      instrumentationHistory: [],
      maxInstrumentationHistory: 120, // 2 secondes (réduit de 3s)
      lastInstrumentationState: null,
      
      // Détection de silences courts (NOUVEAU)
      silenceThreshold: 0.03, // Seuil plus bas (0.03 au lieu de 0.05)
      consecutiveSilenceFrames: 0,
      minSilenceForTransition: 6, // 6 frames (~100ms)
      maxSilenceForTransition: 20, // 20 frames (~333ms)
      silenceJustEnded: false, // Nouvelle variable pour détecter la reprise du son
      
      addFrame(features) {
        this.history.push({
          energy: features.energy,
          centroid: features.centroid,
          low: features.low,
          mid: features.mid,
          high: features.high,
          timestamp: Date.now()
        });
        
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }
        
        // Analyser l'instrumentation (NOUVEAU)
        this.analyzeInstrumentation(features);
        
        // Détecter les silences courts (NOUVEAU)
        this.detectSilence(features);
        
        // Détecter les beats pour estimer le tempo
        this.detectBeat(features);
      },
      
      // NOUVEAU: Analyser quels "instruments" (bandes de fréquences) sont actifs
      analyzeInstrumentation(features) {
        // Utiliser les 10 bandes détaillées pour une meilleure précision
        const kickPresent = (features.subBass || 0) > 0.30 && (features.bass || 0) > 0.20; // Sub + Bass
        const basslinePresent = (features.bass || 0) > 0.25 && (features.lowMid || 0) > 0.15; // Ligne de basse
        const snarePresent = (features.mid || 0) > 0.25 && (features.presence || 0) > 0.15; // Caisse claire
        const hihatPresent = (features.brilliance || 0) > 0.18 || (features.air || 0) > 0.12; // Charleston
        const cymbalPresent = (features.presence || 0) > 0.20 && (features.brilliance || 0) > 0.15; // Cymbales
        const vocalsPresent = (features.highMid || 0) > 0.20 && (features.presence || 0) > 0.18 && features.centroid > 0.35; // Voix
        const guitarPresent = (features.mid || 0) > 0.20 && (features.highMid || 0) > 0.15; // Guitare
        const synthPresent = (features.lowMid || 0) > 0.18 && (features.mid || 0) > 0.15; // Synthé
        
        const instrumentationState = {
          kick: kickPresent,
          bassline: basslinePresent,
          snare: snarePresent,
          hihat: hihatPresent,
          cymbal: cymbalPresent,
          vocals: vocalsPresent,
          guitar: guitarPresent,
          synth: synthPresent,
          timestamp: Date.now()
        };
        
        this.instrumentationHistory.push(instrumentationState);
        if (this.instrumentationHistory.length > this.maxInstrumentationHistory) {
          this.instrumentationHistory.shift();
        }
        
        this.lastInstrumentationState = instrumentationState;
      },
      
      // NOUVEAU: Détecter les silences courts (marqueurs de transitions)
      detectSilence(features) {
        const isSilent = features.energy < this.silenceThreshold;
        
        if (isSilent) {
          this.consecutiveSilenceFrames++;
          this.silenceJustEnded = false; // Pas encore fini
        } else {
          // Fin d'un silence - était-ce une transition ?
          if (this.consecutiveSilenceFrames >= this.minSilenceForTransition && 
              this.consecutiveSilenceFrames <= this.maxSilenceForTransition) {
            // Silence court détecté ! Le son reprend MAINTENANT
            console.log(`🔇 Silence de transition détecté (${this.consecutiveSilenceFrames} frames, ~${(this.consecutiveSilenceFrames * 16.7).toFixed(0)}ms) - Reprise du son!`);
            this.silenceJustEnded = true; // Marquer que le silence vient de se terminer
            this.consecutiveSilenceFrames = 0;
            return true; // Retourner true à la REPRISE du son
          }
          this.consecutiveSilenceFrames = 0;
          this.silenceJustEnded = false;
        }
        
        return false;
      },
      
      // NOUVEAU: Détecter les changements d'instrumentation
      detectInstrumentationChange() {
        if (this.instrumentationHistory.length < 60 || this.history.length < 60) return { changed: false, score: 0, energyChange: 0 };
        
        // Comparer les 30 premières frames avec les 30 dernières (fenêtre plus courte)
        const firstHalf = this.instrumentationHistory.slice(0, 30);
        const secondHalf = this.instrumentationHistory.slice(-30);
        
        // Calculer les moyennes de présence de chaque "instrument"
        const avg1 = this.getInstrumentationAverage(firstHalf);
        const avg2 = this.getInstrumentationAverage(secondHalf);
        
        // Détecter les changements significatifs avec seuils plus bas
        let changeScore = 0;
        
        // Apparition/disparition de kick (très important)
        if (Math.abs(avg2.kick - avg1.kick) > 0.25) changeScore += 3.5;
        
        // Apparition/disparition de bassline (très important)
        if (Math.abs(avg2.bassline - avg1.bassline) > 0.25) changeScore += 3.5;
        
        // Apparition/disparition de voix (très important)
        if (Math.abs(avg2.vocals - avg1.vocals) > 0.25) changeScore += 3.0;
        
        // Apparition/disparition de snare (seuil plus haut pour éviter faux positifs sur tempo lents)
        if (Math.abs(avg2.snare - avg1.snare) > 0.40) changeScore += 1.5;
        
        // Apparition/disparition de guitare
        if (Math.abs(avg2.guitar - avg1.guitar) > 0.25) changeScore += 2.0;
        
        // Apparition/disparition de synthé
        if (Math.abs(avg2.synth - avg1.synth) > 0.25) changeScore += 1.5;
        
        // Apparition/disparition de hihat (seuil plus haut, élément rythmique)
        if (Math.abs(avg2.hihat - avg1.hihat) > 0.35) changeScore += 0.8;
        
        // Apparition/disparition de cymbales
        if (Math.abs(avg2.cymbal - avg1.cymbal) > 0.25) changeScore += 1.0;
        
        // NOUVEAU: Calculer le changement d'énergie/dynamique spectrale
        const historyFirstHalf = this.history.slice(0, 30);
        const historySecondHalf = this.history.slice(-30);
        
        const energyAvg1 = this.getAverages(historyFirstHalf);
        const energyAvg2 = this.getAverages(historySecondHalf);
        const stdAll = this.getStdDevs(this.history.slice(-60));
        
        // Calculer le changement spectral global (même formule que shouldChangeShader)
        const energyChange = Math.abs(energyAvg2.energy - energyAvg1.energy) / Math.max(stdAll.energy, 0.01);
        const centroidChange = Math.abs(energyAvg2.centroid - energyAvg1.centroid) / Math.max(stdAll.centroid, 0.01);
        const lowChange = Math.abs(energyAvg2.low - energyAvg1.low) / Math.max(stdAll.low, 0.01);
        const midChange = Math.abs(energyAvg2.mid - energyAvg1.mid) / Math.max(stdAll.mid, 0.01);
        const highChange = Math.abs(energyAvg2.high - energyAvg1.high) / Math.max(stdAll.high, 0.01);
        
        const globalSpectralChange = (energyChange * 0.25) + (centroidChange * 0.20) + 
                                      (lowChange * 0.20) + (midChange * 0.20) + (highChange * 0.15);
        
        return {
          changed: changeScore > 3.4 && globalSpectralChange > 1.18, // Changement d'instruments ET changement d'énergie
          score: changeScore,
          energyChange: globalSpectralChange,
          details: {
            kickChange: Math.abs(avg2.kick - avg1.kick),
            basslineChange: Math.abs(avg2.bassline - avg1.bassline),
            vocalsChange: Math.abs(avg2.vocals - avg1.vocals),
            snareChange: Math.abs(avg2.snare - avg1.snare)
          }
        };
      },
      
      getInstrumentationAverage(states) {
        const sum = states.reduce((acc, state) => ({
          kick: acc.kick + (state.kick ? 1 : 0),
          bassline: acc.bassline + (state.bassline ? 1 : 0),
          snare: acc.snare + (state.snare ? 1 : 0),
          hihat: acc.hihat + (state.hihat ? 1 : 0),
          cymbal: acc.cymbal + (state.cymbal ? 1 : 0),
          vocals: acc.vocals + (state.vocals ? 1 : 0),
          guitar: acc.guitar + (state.guitar ? 1 : 0),
          synth: acc.synth + (state.synth ? 1 : 0)
        }), { kick: 0, bassline: 0, snare: 0, hihat: 0, cymbal: 0, vocals: 0, guitar: 0, synth: 0 });
        
        const count = states.length;
        return {
          kick: sum.kick / count,
          bassline: sum.bassline / count,
          snare: sum.snare / count,
          hihat: sum.hihat / count,
          cymbal: sum.cymbal / count,
          vocals: sum.vocals / count,
          guitar: sum.guitar / count,
          synth: sum.synth / count
        };
      },
      
      detectBeat(features) {
        const now = Date.now();
        
        // Garder un historique d'énergie pour calculer un seuil adaptatif
        this.energyHistory.push(features.low);
        if (this.energyHistory.length > 120) { // 2 secondes d'historique (au lieu de 1)
          this.energyHistory.shift();
        }
        
        // Calculer le seuil adaptatif
        if (this.energyHistory.length > 30) { // Attendre au moins 0.5 seconde
          const mean = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
          const variance = this.energyHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.energyHistory.length;
          const stdDev = Math.sqrt(variance);
          const adaptiveThreshold = Math.max(0.15, mean + 1.5 * stdDev); // Seuil plus haut (1.5 au lieu de 1.2)
          
          // Délai minimum entre beats basé sur BPM attendu (permet 60-200 BPM)
          const minBeatInterval = 60000 / 200; // 300ms pour 200 BPM
          const maxBeatInterval = 60000 / 60;  // 1000ms pour 60 BPM
          const timeSinceLastBeat = now - this.lastBeatTime;
          
          // Un beat est détecté si les basses dépassent le seuil ET qu'assez de temps s'est écoulé
          if (features.low > adaptiveThreshold && timeSinceLastBeat > minBeatInterval) {
            this.beatTimes.push(now);
            this.lastBeatTime = now;
            
            // Garder seulement les 16 derniers beats (au lieu de 8) pour plus de stabilité
            if (this.beatTimes.length > 16) {
              this.beatTimes.shift();
            }
            
            // Calculer le BPM si on a au moins 8 beats (au lieu de 4)
            if (this.beatTimes.length >= 8) {
              const intervals = [];
              for (let i = 1; i < this.beatTimes.length; i++) {
                intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
              }
              
              // Calculer la médiane au lieu de la moyenne (plus robuste aux outliers)
              intervals.sort((a, b) => a - b);
              const medianInterval = intervals[Math.floor(intervals.length / 2)];
              
              // Vérifier si c'est un tempo valide
              const rawBPM = 60000 / medianInterval;
              
              // Détecter si c'est un tempo double ou moitié du tempo actuel
              let candidateBPM = rawBPM;
              if (this.lastValidBPM > 0) {
                const ratio = rawBPM / this.lastValidBPM;
                if (ratio > 1.8 && ratio < 2.2) {
                  // C'est probablement le double, diviser par 2
                  candidateBPM = rawBPM / 2;
                } else if (ratio > 0.45 && ratio < 0.55) {
                  // C'est probablement la moitié, multiplier par 2
                  candidateBPM = rawBPM * 2;
                }
              }
              
              // Filtrer dans la plage valide
              if (candidateBPM >= 60 && candidateBPM <= 200) {
                // Ajouter à l'historique des BPM
                this.bpmHistory.push(candidateBPM);
                if (this.bpmHistory.length > this.maxBpmHistory) {
                  this.bpmHistory.shift();
                }
                
                // Calculer la médiane des derniers BPM pour stabilité
                const sortedBPMs = [...this.bpmHistory].sort((a, b) => a - b);
                const medianBPM = sortedBPMs[Math.floor(sortedBPMs.length / 2)];
                
                // Lissage plus fort (0.85/0.15 au lieu de 0.7/0.3)
                if (this.estimatedBPM === 120) {
                  // Premier BPM détecté, l'adopter directement
                  this.estimatedBPM = Math.round(medianBPM);
                } else if (Math.abs(medianBPM - this.estimatedBPM) < 10) {
                  // Petit changement, lisser fortement
                  this.estimatedBPM = Math.round(this.estimatedBPM * 0.9 + medianBPM * 0.1);
                } else if (Math.abs(medianBPM - this.estimatedBPM) < 30) {
                  // Changement moyen, lisser modérément
                  this.estimatedBPM = Math.round(this.estimatedBPM * 0.85 + medianBPM * 0.15);
                } else {
                  // Grand changement (nouveau morceau), adopter le nouveau BPM
                  this.estimatedBPM = Math.round(medianBPM);
                }
                
                // Sauvegarder le dernier BPM valide
                this.lastValidBPM = this.estimatedBPM;
                this.lastBPMUpdateTime = now;
              }
            }
          }
        }
        
        // Si aucun beat détecté depuis 5 secondes, garder le dernier BPM valide
        if (now - this.lastBPMUpdateTime > 5000 && this.lastValidBPM !== 120) {
          this.estimatedBPM = this.lastValidBPM;
        }
      },
      
      shouldChangeShader() {
        const now = Date.now();
        
        // Respecter le temps minimum entre changements
        if (now - this.lastChangeTime < this.minTimeBetweenChanges) {
          return false;
        }
        
        // Nécessite au moins 60 frames (1 seconde) pour avoir des statistiques fiables (réduit de 1.5s)
        if (this.history.length < 60) {
          return false;
        }
        
        // 1. DÉTECTION DE SILENCE DE TRANSITION (priorité maximale) - détecté en direct dans detectSilence()
        // Vérifier si on vient juste de sortir d'un silence
        const justEndedSilence = this.detectSilence(this.history[this.history.length - 1]);
        if (justEndedSilence) {
          this.lastChangeTime = now;
          console.log(`🎨 Changement IMMÉDIAT: SILENCE DE TRANSITION`);
          return true;
        }
        
        // 2. DÉTECTION DE CHANGEMENT D'INSTRUMENTATION (haute priorité)
        const instrumentChange = this.detectInstrumentationChange();
        if (instrumentChange.changed) {
          this.lastChangeTime = now;
          console.log(`🎨 Changement détecté: INSTRUMENTATION (score=${instrumentChange.score.toFixed(2)}, énergie=${instrumentChange.energyChange.toFixed(2)})`, instrumentChange.details);
          return true;
        }
        
        // 3. ANALYSE SPECTRALE CLASSIQUE (priorité normale)
        // Comparer 3 fenêtres temporelles pour mieux détecter les transitions
        const thirdPoint = Math.floor(this.history.length / 3);
        const twoThirdPoint = thirdPoint * 2;
        
        const firstThird = this.history.slice(0, thirdPoint);
        const middleThird = this.history.slice(thirdPoint, twoThirdPoint);
        const lastThird = this.history.slice(twoThirdPoint);
        
        // Moyennes de chaque tiers
        const avg1 = this.getAverages(firstThird);
        const avg2 = this.getAverages(middleThird);
        const avg3 = this.getAverages(lastThird);
        
        // Écart-types de toute la période
        const stdAll = this.getStdDevs(this.history);
        
        // Détecter un changement significatif entre le début et la fin
        const energyChange = Math.abs(avg3.energy - avg1.energy) / Math.max(stdAll.energy, 0.01);
        const centroidChange = Math.abs(avg3.centroid - avg1.centroid) / Math.max(stdAll.centroid, 0.01);
        const lowChange = Math.abs(avg3.low - avg1.low) / Math.max(stdAll.low, 0.01);
        const midChange = Math.abs(avg3.mid - avg1.mid) / Math.max(stdAll.mid, 0.01);
        const highChange = Math.abs(avg3.high - avg1.high) / Math.max(stdAll.high, 0.01);
        
        // Pondération améliorée : moins d'importance à l'énergie pure, plus aux fréquences
        // Energy: 25% (au lieu de 40%), Centroid: 20%, Low: 20%, Mid: 20%, High: 15%
        const globalChange = (energyChange * 0.25) + (centroidChange * 0.20) + 
                            (lowChange * 0.20) + (midChange * 0.20) + (highChange * 0.15);
        
        // Détecter aussi les changements brusques (spike detection)
        const energySpike = Math.abs(avg2.energy - avg1.energy) / Math.max(stdAll.energy, 0.01);
        const hasSpikeTransition = energySpike > 2.0; // Changement très brusque
        
        // Seuil adaptatif basé sur la variabilité de la musique (encore plus bas)
        const avgStd = (stdAll.energy + stdAll.centroid + stdAll.low + stdAll.mid + stdAll.high) / 5;
        const adaptiveThreshold = avgStd < 0.1 ? 1.18 : 1.75; // Seuils plus bas (1.2-1.8)
        
        // Détecter si changement dépasse le seuil OU si spike très net
        if (globalChange > adaptiveThreshold || hasSpikeTransition) {
          this.lastChangeTime = now;
          console.log(`🎨 Changement détecté: SPECTRAL (global=${globalChange.toFixed(2)}, seuil=${adaptiveThreshold.toFixed(2)})`);
          return true;
        }
        
        return false;
      },
      
      getAverages(frames) {
        const sum = frames.reduce((acc, f) => ({
          energy: acc.energy + f.energy,
          centroid: acc.centroid + f.centroid,
          low: acc.low + f.low,
          mid: acc.mid + f.mid,
          high: acc.high + f.high
        }), { energy: 0, centroid: 0, low: 0, mid: 0, high: 0 });
        
        const count = frames.length;
        return {
          energy: sum.energy / count,
          centroid: sum.centroid / count,
          low: sum.low / count,
          mid: sum.mid / count,
          high: sum.high / count
        };
      },
      
      getStdDevs(frames) {
        const avg = this.getAverages(frames);
        const variance = frames.reduce((acc, f) => ({
          energy: acc.energy + Math.pow(f.energy - avg.energy, 2),
          centroid: acc.centroid + Math.pow(f.centroid - avg.centroid, 2),
          low: acc.low + Math.pow(f.low - avg.low, 2),
          mid: acc.mid + Math.pow(f.mid - avg.mid, 2),
          high: acc.high + Math.pow(f.high - avg.high, 2)
        }), { energy: 0, centroid: 0, low: 0, mid: 0, high: 0 });
        
        const count = frames.length;
        return {
          energy: Math.sqrt(variance.energy / count),
          centroid: Math.sqrt(variance.centroid / count),
          low: Math.sqrt(variance.low / count),
          mid: Math.sqrt(variance.mid / count),
          high: Math.sqrt(variance.high / count)
        };
      },
      
      reset() {
        this.history = [];
        this.beatTimes = [];
        this.energyHistory = [];
        this.bpmHistory = [];
        this.instrumentationHistory = [];
        this.consecutiveSilenceFrames = 0;
        this.lastChangeTime = 0;
        this.lastBeatTime = 0;
        this.lastBPMUpdateTime = Date.now();
        this.lastInstrumentationState = null;
        // Garder lastValidBPM et estimatedBPM pour la continuité
      }
    };
    
    // Setup UI
    this.setupUI();
    this.setupKeyboardControls();
  }

  // Adaptateur pour que ShaderBackground fonctionne avec AudioCapture
  createAudioManagerAdapter() {
    const capture = this.audioCapture;
    
    // Variables de lissage pour adoucir les mouvements
    let smoothedLow = 0;
    let smoothedMid = 0;
    let smoothedHigh = 0;
    let smoothedLevel = 0;
    const smoothingFactor = 0.3; // Plus c'est bas, plus c'est lisse (0.1-0.5)
    
    return {
      get analyser() {
        return capture.analyser;
      },
      get dataArray() {
        return capture.getFrequencyData();
      },
      getAudioData() {
        const dataArray = capture.getFrequencyData();
        if (!dataArray) return null;
        
        // Calculer audioLow, audioMid, audioHigh
        const len = dataArray.length;
        const lowEnd = Math.floor(len * 0.15);
        const midEnd = Math.floor(len * 0.5);
        
        let audioLow = 0, audioMid = 0, audioHigh = 0;
        
        for (let i = 0; i < lowEnd; i++) {
          audioLow += dataArray[i];
        }
        for (let i = lowEnd; i < midEnd; i++) {
          audioMid += dataArray[i];
        }
        for (let i = midEnd; i < len; i++) {
          audioHigh += dataArray[i];
        }
        
        audioLow /= (lowEnd * 255);
        audioMid /= ((midEnd - lowEnd) * 255);
        audioHigh /= ((len - midEnd) * 255);
        
        // Moyenne globale
        let audioLevel = 0;
        for (let i = 0; i < len; i++) {
          audioLevel += dataArray[i];
        }
        audioLevel /= (len * 255);
        
        // Appliquer le lissage (smoothing) pour des mouvements plus fluides
        smoothedLow = smoothedLow * (1 - smoothingFactor) + audioLow * smoothingFactor;
        smoothedMid = smoothedMid * (1 - smoothingFactor) + audioMid * smoothingFactor;
        smoothedHigh = smoothedHigh * (1 - smoothingFactor) + audioHigh * smoothingFactor;
        smoothedLevel = smoothedLevel * (1 - smoothingFactor) + audioLevel * smoothingFactor;
        
        return {
          dataArray: dataArray,
          audioLevel: smoothedLevel,
          audioLow: smoothedLow,
          audioMid: smoothedMid,
          audioHigh: smoothedHigh
        };
      },
      isPlaying: capture.isCapturing
    };
  }

  // Adaptateur pour Butterchurn (besoin d'audioCtx et analyser)
  createButterchurnAdapter() {
    const capture = this.audioCapture;
    return {
      get audioCtx() {
        return capture.audioCtx;
      },
      get analyser() {
        return capture.analyser;
      },
      ensureAudioContext() {
        // AudioContext déjà créé par AudioCapture
        return capture.audioCtx;
      }
    };
  }

  setupUI() {
    // Boutons de démarrage
    const startMicBtn = document.getElementById('startMicBtn');
    const startDesktopBtn = document.getElementById('startDesktopBtn');
    const stopBtn = document.getElementById('stopBtn');
    const backBtn = document.getElementById('backBtn');
    
    // Status display
    const statusDisplay = document.getElementById('statusDisplay');
    const sectionDisplay = document.getElementById('sectionDisplay');
    const statsDisplay = document.getElementById('statsDisplay');
    
    if (startMicBtn) {
      startMicBtn.addEventListener('click', () => this.startMicrophone());
    }
    
    if (startDesktopBtn) {
      startDesktopBtn.addEventListener('click', () => this.startDesktop());
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stop());
    }
    
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.stop();
        window.location.href = '/';
      });
    }
    
    // Shader controls
    const nextShaderBtn = document.getElementById('nextShader');
    const switchModeBtn = document.getElementById('switchMode');
    
    if (nextShaderBtn) {
      nextShaderBtn.addEventListener('click', () => {
        if (this.shaderInitialized) {
          this.shaderBg.nextShader();
        }
      });
    }
    
    if (switchModeBtn) {
      switchModeBtn.addEventListener('click', () => this.switchMode());
    }
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.isRunning) {
          this.stop();
        }
      } else if (e.code === 'KeyN') {
        if (this.shaderInitialized) {
          this.shaderBg.nextShader();
        }
      } else if (e.code === 'KeyP') {
        if (this.shaderInitialized) {
          this.shaderBg.previousShader();
        }
      } else if (e.code === 'KeyM') {
        this.switchMode();
      }
    });
  }

  async startMicrophone() {
    console.log('🎤 Démarrage capture microphone...');
    
    const success = await this.audioCapture.startMicrophoneCapture();
    if (success) {
      await this.initializeVisualization();
      this.start();
      this.updateStatus('🎤 Microphone actif', 'success');
    }
  }

  async startDesktop() {
    console.log('🖥️ Démarrage capture audio système...');
    
    const success = await this.audioCapture.startDesktopCapture();
    if (success) {
      await this.initializeVisualization();
      this.start();
      this.updateStatus('🖥️ Audio système actif (Spotify, YouTube, etc.)', 'success');
    }
  }

  async initializeVisualization() {
    // Initialiser Shaders (obligatoire)
    if (!this.shaderInitialized) {
      await this.shaderBg.initialize('bgCanvas');
      this.shaderInitialized = true;
      this.loadShaderPairForSection('intro');
    }
    
    // Initialiser Butterchurn (optionnel)
    if (!this.butterchurnInitialized) {
      try {
        await this.butterchurnBg.initialize('butterchurnCanvas');
        this.butterchurnInitialized = true;
        console.log('✅ Butterchurn initialisé avec succès');
      } catch (error) {
        console.warn('⚠️ Butterchurn non disponible:', error.message);
        this.butterchurnInitialized = false;
      }
    }
    
    // Démarrer en mode butterchurn par défaut (ou shaders si butterchurn non disponible)
    if (this.butterchurnInitialized) {
      this.activateMode('butterchurn');
    } else {
      this.activateMode('shaders');
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.realtimeAnalyzer.reset();
    this.musicChangeDetector.reset();
    
    // Démarrer le mode actif
    if (this.currentMode === 'shaders' && this.shaderBg) {
      this.shaderBg.start();
    } else if (this.currentMode === 'butterchurn' && this.butterchurnBg) {
      this.butterchurnBg.start();
    }
    
    // Démarrer la boucle de visualisation
    this.animate();
    
    console.log('▶️ Visualisation démarrée');
    
    // Cacher l'écran de sélection
    const selectionScreen = document.getElementById('selectionScreen');
    if (selectionScreen) {
      selectionScreen.style.display = 'none';
    }
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.shaderBg) {
      this.shaderBg.stop();
    }
    
    this.audioCapture.stopCapture();
    this.realtimeAnalyzer.reset();
    
    console.log('⏹️ Visualisation arrêtée');
    this.updateStatus('⏹️ Arrêté', 'stopped');
    
    // Réafficher l'écran de sélection
    const selectionScreen = document.getElementById('selectionScreen');
    if (selectionScreen) {
      selectionScreen.style.display = 'flex';
    }
  }

  animate() {
    if (!this.isRunning) return;
    
    // Analyser le frame courant
    const analysis = this.realtimeAnalyzer.update();
    
    if (analysis) {
      // Ajouter les features au détecteur de changements
      this.musicChangeDetector.addFrame(analysis.current);
      
      // Mettre à jour l'affichage
      this.updateSectionDisplay(analysis.sectionType);
      this.updateStatsDisplay(analysis.stats, analysis.current);
      
      // Détecter les changements musicaux intelligents
      if (this.musicChangeDetector.shouldChangeShader()) {
        console.log(`🎨 Changement détecté (BPM estimé: ${this.musicChangeDetector.estimatedBPM})`);
        
        // Changer le shader si on est en mode shaders
        if (this.currentMode === 'shaders') {
          this.loadShaderPairForSection(analysis.sectionType);
        }
        
        // Changer le preset Butterchurn si on est en mode butterchurn
        if (this.currentMode === 'butterchurn' && this.butterchurnBg && this.butterchurnInitialized) {
          this.butterchurnBg.nextPreset();
        }
      }
      
      // Dessiner le spectre
      const freqData = this.audioCapture.getFrequencyData();
      if (freqData) {
        this.visualizer.drawSpectrum(freqData);
      }
    } else {
      // Debug: pourquoi analysis est null?
      if (this.musicChangeDetector.history.length === 0) {
        console.warn('⚠️ RealtimeAnalyzer ne retourne aucune analyse');
      }
    }
    
    // Pas besoin d'appeler render() - ShaderBackground et Butterchurn ont leurs propres boucles d'animation
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  loadShaderPairForSection(sectionType) {
    const shaderOptions = this.sectionToShaderMap[sectionType] || [5, 6, 7];
    
    // Sélectionner 2 shaders différents aléatoirement
    const shader1 = shaderOptions[Math.floor(Math.random() * shaderOptions.length)];
    let shader2 = shaderOptions[Math.floor(Math.random() * shaderOptions.length)];
    
    // S'assurer que les 2 shaders sont différents
    while (shader2 === shader1 && shaderOptions.length > 1) {
      shader2 = shaderOptions[Math.floor(Math.random() * shaderOptions.length)];
    }
    
    this.currentShaderPair = { sharp: shader1, blurred: shader2 };
    
    // Charger les shaders dans le ShaderBackground
    if (this.shaderBg && this.shaderInitialized) {
      this.shaderBg.currentShaderIndex1 = shader1;
      this.shaderBg.currentShaderIndex2 = shader2;
      this.shaderBg.loadShaderPair();
    }
  }

  updateStatus(message, type = 'info') {
    const statusDisplay = document.getElementById('statusDisplay');
    if (statusDisplay) {
      statusDisplay.textContent = message;
      statusDisplay.className = `status-display ${type}`;
    }
  }

  updateSectionDisplay(sectionType) {
    const sectionDisplay = document.getElementById('sectionDisplay');
    if (sectionDisplay) {
      sectionDisplay.textContent = `Section: ${sectionType.toUpperCase()}`;
    }
  }

  updateStatsDisplay(stats, current) {
    const statsDisplay = document.getElementById('statsDisplay');
    if (statsDisplay) {
      const bpm = this.musicChangeDetector.estimatedBPM;
      const beatCount = this.musicChangeDetector.beatTimes.length;
      const timeSinceLastBeat = Date.now() - this.musicChangeDetector.lastBeatTime;
      const beatIndicator = timeSinceLastBeat < 150 ? '🔴' : '⚫'; // Indicateur visuel de beat
      
      statsDisplay.innerHTML = `
        <div>Énergie: ${(current.energy * 100).toFixed(1)}% (μ=${(stats.energy_mean * 100).toFixed(1)}%, σ=${(stats.energy_std * 100).toFixed(1)}%)</div>
        <div>Centroid: ${(current.centroid * 100).toFixed(1)}% (μ=${(stats.centroid_mean * 100).toFixed(1)}%)</div>
        <div>Bass: ${(current.low * 100).toFixed(1)}% | Mid: ${(current.mid * 100).toFixed(1)}% | High: ${(current.high * 100).toFixed(1)}%</div>
        <div style="margin-top: 8px; color: #00ff00;">${beatIndicator} BPM: ${bpm} | Beats: ${beatCount}/8</div>
      `;
    }
  }

  switchMode() {
    // Vérifier si Butterchurn est disponible
    if (!this.butterchurnInitialized && this.currentMode === 'shaders') {
      console.warn('⚠️ Butterchurn n\'est pas disponible. Seul le mode Shaders est actif.');
      alert('Butterchurn n\'a pas pu se charger. Seul le mode Shaders est disponible.\n\nVérifiez votre connexion internet et rechargez la page.');
      return;
    }
    
    const newMode = this.currentMode === 'shaders' ? 'butterchurn' : 'shaders';
    this.activateMode(newMode);
    console.log(`🔄 Mode switché: ${this.currentMode}`);
  }

  activateMode(mode) {
    this.currentMode = mode;
    
    if (mode === 'shaders') {
      // Activer Shaders
      if (this.shaderBg && this.shaderInitialized) {
        if (this.shaderBg.canvas) {
          this.shaderBg.canvas.style.display = 'block';
        }
        if (this.isRunning) {
          this.shaderBg.start();
        }
      }
      
      // Désactiver Butterchurn
      if (this.butterchurnBg && this.butterchurnInitialized) {
        this.butterchurnBg.stop();
        if (this.butterchurnBg.canvas) {
          this.butterchurnBg.canvas.style.display = 'none';
        }
      }
      
      this.updateStatus('✨ Mode Shaders WebGL', 'success');
      
    } else if (mode === 'butterchurn') {
      // Activer Butterchurn
      if (this.butterchurnBg && this.butterchurnInitialized) {
        if (this.butterchurnBg.canvas) {
          this.butterchurnBg.canvas.style.display = 'block';
        }
        if (this.isRunning) {
          this.butterchurnBg.start();
        }
      }
      
      // Désactiver Shaders
      if (this.shaderBg && this.shaderInitialized) {
        this.shaderBg.stop();
        if (this.shaderBg.canvas) {
          this.shaderBg.canvas.style.display = 'none';
        }
      }
      
      this.updateStatus('🌊 Mode Butterchurn (MilkDrop)', 'success');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new InfiniteVisualizerApp();
  console.log('✅ Infinite Visualizer initialisé');
});
