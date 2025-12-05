"""
Service d'analyse musicale utilisant librosa.
Extrait les features audio pour la détection de structure.
"""
import librosa
import numpy as np
from scipy import signal


class MusicAnalyzer:
    """Analyse les caractéristiques audio d'un fichier musical."""
    
    def __init__(self, sr=22050, fast_mode=True):
        """
        Args:
            sr: Sample rate pour le chargement audio (22050 par défaut)
            fast_mode: Si True, réduit la qualité pour accélérer l'analyse
        """
        self.sr = sr
        self.hop_length = 1024 if fast_mode else 512  # Doubler le hop pour 2x plus rapide
        self.n_fft = 2048
        self.fast_mode = fast_mode
    
    def analyze(self, audio_path):
        """
        Analyse complète d'un fichier audio.
        
        Args:
            audio_path: Chemin vers le fichier audio
            
        Returns:
            dict: Dictionnaire contenant toutes les features extraites
        """
        print(f"Chargement de {audio_path}...")
        
        # Charger l'audio
        y, sr = librosa.load(audio_path, sr=self.sr)
        duration = len(y) / sr
        
        print("Durée: {:.2f}s, Sample rate: {}Hz".format(duration, sr))
        print("Extraction des features...")
        
        # 1. Tempo et beats
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=self.hop_length)
        beat_times = librosa.frames_to_time(beats, sr=sr, hop_length=self.hop_length)
        
        print("Tempo détecté: {:.1f} BPM, {} beats".format(float(tempo), len(beats)))
        
        # 2. Energy (RMS - Root Mean Square)
        rms = librosa.feature.rms(y=y, hop_length=self.hop_length)[0]
        
        # 3. Spectral features
        spectral_centroid = librosa.feature.spectral_centroid(
            y=y, sr=sr, hop_length=self.hop_length
        )[0]
        
        spectral_rolloff = librosa.feature.spectral_rolloff(
            y=y, sr=sr, hop_length=self.hop_length
        )[0]
        
        spectral_bandwidth = librosa.feature.spectral_bandwidth(
            y=y, sr=sr, hop_length=self.hop_length
        )[0]
        
        # 4. Zero crossing rate (utile pour détecter les sections percussives)
        zcr = librosa.feature.zero_crossing_rate(y, hop_length=self.hop_length)[0]
        
        # 5. MFCC pour la structure (coefficients cepstraux)
        n_mfcc = 13 if self.fast_mode else 20
        mfcc = librosa.feature.mfcc(
            y=y, sr=sr, n_mfcc=n_mfcc, hop_length=self.hop_length
        )
        
        # 6. Chroma features (contenu harmonique)
        chroma = librosa.feature.chroma_stft(
            y=y, sr=sr, hop_length=self.hop_length
        )
        
        # 7. Onset strength (force des attaques)
        onset_env = librosa.onset.onset_strength(
            y=y, sr=sr, hop_length=self.hop_length
        )
        
        # 8. Tempogram (variations de tempo)
        tempogram = librosa.feature.tempogram(
            onset_envelope=onset_env, sr=sr, hop_length=self.hop_length
        )
        
        print("Features extraites avec succès!")
        
        return {
            'y': y,  # Signal audio
            'sr': sr,
            'duration': duration,
            'tempo': float(tempo),
            'beats': beats,
            'beat_times': beat_times.tolist(),
            'rms': rms,
            'spectral_centroid': spectral_centroid,
            'spectral_rolloff': spectral_rolloff,
            'spectral_bandwidth': spectral_bandwidth,
            'zero_crossing_rate': zcr,
            'mfcc': mfcc,
            'chroma': chroma,
            'onset_strength': onset_env,
            'tempogram': tempogram,
            'hop_length': self.hop_length
        }
    
    def get_frame_time(self, frame_idx):
        """Convertit un index de frame en temps (secondes)."""
        return librosa.frames_to_time(frame_idx, sr=self.sr, hop_length=self.hop_length)
    
    def get_time_frame(self, time_sec):
        """Convertit un temps (secondes) en index de frame."""
        return librosa.time_to_frames(time_sec, sr=self.sr, hop_length=self.hop_length)
    
    def extract_segment_features(self, features, start_time, end_time):
        """
        Extrait les features moyennes d'un segment temporel.
        
        Args:
            features: Dictionnaire de features (résultat de analyze())
            start_time: Début du segment (secondes)
            end_time: Fin du segment (secondes)
            
        Returns:
            dict: Features moyennes du segment
        """
        start_frame = self.get_time_frame(start_time)
        end_frame = self.get_time_frame(end_time)
        
        # S'assurer que les indices sont valides
        start_frame = max(0, start_frame)
        end_frame = min(len(features['rms']), end_frame)
        
        if start_frame >= end_frame:
            return None
        
        return {
            'energy': float(np.mean(features['rms'][start_frame:end_frame])),
            'energy_std': float(np.std(features['rms'][start_frame:end_frame])),
            'brightness': float(np.mean(features['spectral_centroid'][start_frame:end_frame])),
            'brightness_std': float(np.std(features['spectral_centroid'][start_frame:end_frame])),
            'bandwidth': float(np.mean(features['spectral_bandwidth'][start_frame:end_frame])),
            'zcr': float(np.mean(features['zero_crossing_rate'][start_frame:end_frame])),
            'chroma_mean': np.mean(features['chroma'][:, start_frame:end_frame], axis=1).tolist(),
        }
