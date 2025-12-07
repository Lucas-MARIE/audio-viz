/* ========== Capture Audio Système / Micro ========== */

export class AudioCapture {
  constructor() {
    this.audioCtx = null;
    this.sourceNode = null;
    this.analyser = null;
    this.stream = null;
    this.isCapturing = false;
    this.captureType = null; // 'microphone' ou 'desktop'
    this.dataArray = null;
    this.bufferLength = 0;
    this.fftSize = 2048;
  }

  async startMicrophoneCapture() {
    try {
      console.log('🎤 Demande d\'accès au microphone...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
      
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.6;
      
      this.sourceNode.connect(this.analyser);
      
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      
      this.isCapturing = true;
      this.captureType = 'microphone';
      
      console.log('✅ Microphone capturé avec succès!');
      return true;
    } catch (error) {
      console.error('❌ Erreur capture microphone:', error);
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
      return false;
    }
  }

  async startDesktopCapture() {
    try {
      console.log('🖥️ Demande d\'accès à l\'audio du système...');
      
      // Capture de l'onglet/écran avec audio
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Requis par l'API même si on veut juste l'audio
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Vérifier qu'on a bien l'audio
      const audioTrack = this.stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error('Aucune piste audio capturée. Assurez-vous de partager l\'audio de l\'onglet.');
      }
      
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
      
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.6;
      
      this.sourceNode.connect(this.analyser);
      
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      
      this.isCapturing = true;
      this.captureType = 'desktop';
      
      console.log('✅ Audio système capturé avec succès!');
      
      // Détecter quand l'utilisateur arrête le partage
      this.stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('🛑 Partage d\'écran arrêté par l\'utilisateur');
        this.stopCapture();
      });
      
      return true;
    } catch (error) {
      console.error('❌ Erreur capture desktop:', error);
      alert('Impossible de capturer l\'audio système.\n\nAstuce: Assurez-vous de cocher "Partager l\'audio de l\'onglet" dans la fenêtre de partage.');
      return false;
    }
  }

  stopCapture() {
    console.log('🛑 Arrêt de la capture audio...');
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    
    this.isCapturing = false;
    this.captureType = null;
    this.analyser = null;
    this.dataArray = null;
    
    console.log('✅ Capture audio arrêtée');
  }

  getFrequencyData() {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  getTimeDomainData() {
    if (!this.analyser || !this.dataArray) return null;
    const timeData = new Uint8Array(this.bufferLength);
    this.analyser.getByteTimeDomainData(timeData);
    return timeData;
  }

  setFFTSize(size) {
    this.fftSize = size;
    if (this.analyser) {
      this.analyser.fftSize = this.fftSize;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
    }
  }

  getAudioContext() {
    return this.audioCtx;
  }

  getAnalyser() {
    return this.analyser;
  }
}
