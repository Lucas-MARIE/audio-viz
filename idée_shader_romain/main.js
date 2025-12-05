let audioCtx;
let audioBuffer;
let sourceNode;
let splitter;
let analyserLeft;
let analyserRight;
let isPlaying = false;
let startTime = 0;
let pauseTime = 0;
let lastDataLeft = null;
let lastDataRight = null;

// OPTIMISATION : Cache pour stocker les calculs géométriques
let geometryCache = []; 
const numPoints = 64; // Réduit légèrement pour la perf (puissance de 2 préférée)
const baseRadius = 20;

const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false peut aider le GPU
const popup = document.getElementById('popup');
const controls = document.getElementById('controls');
const fileInput = document.getElementById('fileInput');
const playBtn = document.getElementById('playBtn');
const newBtn = document.getElementById('newBtn');
const timeDisplay = document.getElementById('time');

// OPTIMISATION : Pré-calculer les angles et distances max au redimensionnement
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  precomputeGeometry();
  
  // Si en pause, redessiner pour adapter à la nouvelle taille
  if (!isPlaying && (lastDataLeft || audioBuffer)) {
    drawStaticVisualization();
  }
}

function precomputeGeometry() {
  geometryCache = [];
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // On pré-calcule pour les 2 canaux (L et R)
  // Canal 0 = Gauche, Canal 1 = Droite
  for (let channel = 0; channel < 2; channel++) {
    let channelPoints = [];
    const isRight = channel === 1;

    for (let i = 0; i < numPoints; i++) {
      // Calcul de l'angle (statique)
      // Pour simuler l'inversion "miroir", on gère l'angle ici
      // Note: On stockera deux versions d'angles pour le mode "miroir" (haut/bas)
      
      // Angle de base (Demi-cercle haut)
      let angleTop;
      if (isRight) {
         angleTop = (i / numPoints) * Math.PI;
      } else {
         angleTop = Math.PI - (i / numPoints) * Math.PI;
      }
      
      // Angle inversé (Demi-cercle bas)
      let angleBottom;
      if (isRight) {
         angleBottom = 2 * Math.PI - (i / numPoints) * Math.PI;
      } else {
         angleBottom = Math.PI + (i / numPoints) * Math.PI;
      }

      // Fonction locale pour calculer la dist max pour un angle donné
      const calcMaxDist = (a) => {
        const dirX = Math.cos(a);
        const dirY = Math.sin(a);
        const epsilon = 0.0001;
        let distX = Infinity;
        let distY = Infinity;
        
        if (Math.abs(dirX) > epsilon) distX = dirX > 0 ? (canvas.width - centerX) / dirX : -centerX / dirX;
        if (Math.abs(dirY) > epsilon) distY = dirY > 0 ? (canvas.height - centerY) / dirY : -centerY / dirY;
        
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
    geometryCache.push(channelPoints);
  }
}

// Initialisation
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    popup.classList.add('hidden');
    controls.classList.remove('hidden');
    
    drawStaticVisualization();
    updateTimeDisplay(0, audioBuffer.duration);
  } catch (error) {
    alert('Erreur lors du chargement du fichier');
    console.error(error);
  }
});

function play() {
  if (!audioBuffer) return;

  sourceNode = audioCtx.createBufferSource();
  splitter = audioCtx.createChannelSplitter(2);
  analyserLeft = audioCtx.createAnalyser();
  analyserRight = audioCtx.createAnalyser();
  const merger = audioCtx.createChannelMerger(2);

  sourceNode.buffer = audioBuffer;
  sourceNode.connect(splitter);
  splitter.connect(analyserLeft, 0);
  splitter.connect(analyserRight, 1);
  analyserLeft.connect(merger, 0, 0);
  analyserRight.connect(merger, 0, 1);
  merger.connect(audioCtx.destination);

  // Optimisation FFT : 128 ou 256 sont bien. 
  analyserLeft.fftSize = 256; 
  analyserRight.fftSize = 256;
  analyserLeft.smoothingTimeConstant = 0.85;
  analyserRight.smoothingTimeConstant = 0.85;

  sourceNode.start(0, pauseTime);
  startTime = audioCtx.currentTime - pauseTime;
  isPlaying = true;
  playBtn.textContent = '⏸';

  animate();

  sourceNode.onended = () => stop();
}

function pause() {
  if (!sourceNode) return;
  pauseTime = audioCtx.currentTime - startTime;
  
  if (analyserLeft && analyserRight) {
    const tempLeft = new Uint8Array(analyserLeft.frequencyBinCount);
    const tempRight = new Uint8Array(analyserRight.frequencyBinCount);
    analyserLeft.getByteFrequencyData(tempLeft);
    analyserRight.getByteFrequencyData(tempRight);
    lastDataLeft = new Uint8Array(tempLeft);
    lastDataRight = new Uint8Array(tempRight);
  }
  
  try {
    sourceNode.onended = null;
    sourceNode.stop();
  } catch (e) {}
  
  isPlaying = false;
  playBtn.textContent = '▶';
  drawStaticVisualization();
}

function stop() {
  if (sourceNode) {
    try { sourceNode.stop(); } catch (e) {}
  }
  isPlaying = false;
  pauseTime = 0;
  startTime = 0;
  playBtn.textContent = '▶';
  lastDataLeft = null;
  lastDataRight = null;
  drawStaticVisualization();
  if (audioBuffer) updateTimeDisplay(0, audioBuffer.duration);
}

function drawStaticVisualization() {
  // Fond solide propre
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#050510'; // Hex est un tout petit peu plus rapide à parser
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  if (lastDataLeft && lastDataRight) {
    drawFastStereo(centerX, centerY, lastDataLeft, lastDataRight);
  }

  // UI Elements
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('L', 30, 40);
  ctx.textAlign = 'right';
  ctx.fillText('R', canvas.width - 30, 40);

  if (audioBuffer && pauseTime > 0) {
    const progress = pauseTime / audioBuffer.duration;
    const progressX = progress * canvas.width;
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, canvas.height);
    ctx.stroke();
  }
}

function animate() {
  if (!isPlaying) return;
  requestAnimationFrame(animate);

  const dataArrayLeft = new Uint8Array(analyserLeft.frequencyBinCount);
  const dataArrayRight = new Uint8Array(analyserRight.frequencyBinCount);
  analyserLeft.getByteFrequencyData(dataArrayLeft);
  analyserRight.getByteFrequencyData(dataArrayRight);

  // Effet de trainée optimisé
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(5, 5, 16, 0.4)'; // Trainée
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  drawFastStereo(centerX, centerY, dataArrayLeft, dataArrayRight);

  const currentTime = audioCtx.currentTime - startTime;
  updateTimeDisplay(currentTime, audioBuffer.duration);
}

// OPTIMISATION : Fonction de dessin consolidée
function drawFastStereo(centerX, centerY, leftData, rightData) {
  // Mode additif pour simuler le néon sans coût CPU
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 3; 
  ctx.lineCap = 'round';

  const neonHues = [320, 270, 220, 180, 120, 60];

  // Fonction interne optimisée qui utilise le cache
  const drawSide = (data, channelIndex) => {
    // Récupérer le cache pour ce canal (0 ou 1)
    const cachedChannel = geometryCache[channelIndex]; 
    if (!cachedChannel) return;

    // Pour chaque point, on doit dessiner 2 segments (Haut et Bas - symétrie)
    // Au lieu de faire 2 boucles, on fait tout dans une seule boucle pour limiter l'overhead JS
    
    for (let i = 0; i < numPoints; i++) {
      const geo = cachedChannel[i];
      
      // Récupération donnée audio
      // Mapping un peu plus agressif vers les basses
      const dataIndex = Math.floor((i / numPoints) * (data.length * 0.6)); 
      const rawValue = data[dataIndex] / 255.0;
      
      // Si le volume est très bas, on skip le dessin pour gagner des FPS
      if (rawValue < 0.05) continue; 

      const value = rawValue * rawValue * rawValue; // Cubic pour dynamique
      
      // Couleur calculée une seule fois pour les deux miroirs
      const paletteIndex = Math.floor(i / numPoints * neonHues.length);
      const hue = neonHues[paletteIndex] + (rawValue * 40);
      const lightness = 50 + rawValue * 30;
      
      // On définit la couleur
      ctx.strokeStyle = `hsl(${hue}, 100%, ${lightness}%)`;
      
      // Dessin Haut
      const distTop = baseRadius + (geo.top.maxDist - baseRadius) * value;
      const xTop = centerX + geo.top.dx * distTop;
      const yTop = centerY + geo.top.dy * distTop;
      
      ctx.beginPath();
      // On triche un peu : au lieu de faire lineTo depuis le point précédent,
      // on dessine des "rayons" ou de petits segments si on veut relier.
      // Pour l'effet "Explosion vers les coins", tracer depuis le centre est plus performant et joli
      // Mais tu voulais des points reliés ?
      // Pour des points reliés performants, il faut calculer P(i) et P(i-1).
      
      // VERSION PERFORMANTE POINTS RELIÉS :
      // On a besoin du point précédent.
      if (i > 0) {
        // Recalcul rapide du point précédent (i-1)
        // Note: Dans un moteur de jeu on mettrait tout ça en cache frame, 
        // mais ici le calcul est simple multiplications.
        const prevGeo = cachedChannel[i-1];
        const prevIdx = Math.floor(((i-1) / numPoints) * (data.length * 0.6));
        const prevRaw = data[prevIdx] / 255.0;
        const prevVal = prevRaw * prevRaw * prevRaw;
        
        // HAUT
        const prevDistTop = baseRadius + (prevGeo.top.maxDist - baseRadius) * prevVal;
        ctx.moveTo(centerX + prevGeo.top.dx * prevDistTop, centerY + prevGeo.top.dy * prevDistTop);
        ctx.lineTo(xTop, yTop);
        
        // BAS
        const distBot = baseRadius + (geo.bottom.maxDist - baseRadius) * value;
        const prevDistBot = baseRadius + (prevGeo.bottom.maxDist - baseRadius) * prevVal;
        
        // Pour éviter de faire 2x stroke(), on ajoute le chemin au path courant
        // MAIS `moveTo` casse le chemin continu, donc ça marche.
        ctx.moveTo(centerX + prevGeo.bottom.dx * prevDistBot, centerY + prevGeo.bottom.dy * prevDistBot);
        ctx.lineTo(centerX + geo.bottom.dx * distBot, centerY + geo.bottom.dy * distBot);
      }
      
      ctx.stroke();
    }
  };

  drawSide(leftData, 0); // Gauche
  drawSide(rightData, 1); // Droite
  
  // Reset pour le reste de l'UI
  ctx.globalCompositeOperation = 'source-over';
}

function updateTimeDisplay(current, total) {
  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  if (!isFinite(current)) current = 0;
  if (!isFinite(total)) total = 0;
  timeDisplay.textContent = `${formatTime(current)} / ${formatTime(total)}`;
}

playBtn.addEventListener('click', () => {
  if (isPlaying) pause(); else play();
});

newBtn.addEventListener('click', () => {
  stop();
  popup.classList.remove('hidden');
  controls.classList.add('hidden');
});

canvas.addEventListener('click', (e) => {
  if (!audioBuffer) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const progress = clickX / rect.width;
  const wasPlaying = isPlaying;
  
  if (sourceNode) {
    try {
      sourceNode.onended = null;
      sourceNode.stop();
      sourceNode.disconnect();
    } catch (err) {}
  }
  
  isPlaying = false;
  pauseTime = Math.max(0, Math.min(progress * audioBuffer.duration, audioBuffer.duration));
  updateTimeDisplay(pauseTime, audioBuffer.duration);

  if (wasPlaying) play(); else drawStaticVisualization();
});