"""
Service de détection de sections musicales.
Utilise les features audio pour segmenter et classifier la musique.
"""
import librosa
import numpy as np
from scipy import signal
from sklearn.cluster import KMeans


class SectionDetector:
    """Détecte et classifie les différentes sections d'un morceau."""
    
    def __init__(self, n_sections=None):
        """
        Args:
            n_sections: Nombre approximatif de sections à détecter (None = auto)
        """
        self.n_sections = n_sections
        self.min_section_duration = 8.0  # Durée minimale d'une section en secondes
    
    def detect_sections(self, features):
        """
        Détecte les frontières et classifie les sections musicales.
        
        Args:
            features: Dictionnaire de features audio (de MusicAnalyzer)
            
        Returns:
            list: Liste de sections avec start, end, type, caractéristiques
        """
        print("Détection des sections musicales...")
        
        duration = features['duration']
        
        # Calculer automatiquement le nombre de sections si non spécifié
        if self.n_sections is None:
            # Estimer: environ une section toutes les 15-20 secondes
            # Min 4 sections, max 20 sections
            estimated_sections = max(4, min(20, int(duration / 15)))
            print("Nombre de sections estimé: {}".format(estimated_sections))
        else:
            estimated_sections = self.n_sections
        
        # 1. Utiliser MFCC pour la segmentation structurelle
        mfcc = features['mfcc']
        
        # Calculer la matrice de récurrence (similarité)
        R = librosa.segment.recurrence_matrix(
            mfcc,
            mode='affinity',
            metric='cosine',
            width=43  # Fenêtre de contexte
        )
        
        # Détecter les frontières avec clustering agglomératif
        boundaries = librosa.segment.agglomerative(
            mfcc,
            k=estimated_sections
        )
        
        # Convertir les frames en temps
        boundary_times = librosa.frames_to_time(
            boundaries,
            sr=features['sr'],
            hop_length=features['hop_length']
        )
        
        print("{} sections détectées".format(len(boundary_times) - 1))
        
        # 2. Analyser chaque section
        sections = []
        for i in range(len(boundary_times) - 1):
            start = float(boundary_times[i])
            end = float(boundary_times[i + 1])
            
            # Extraire les features de cette section
            section_features = self._analyze_section(features, start, end)
            
            if section_features is None:
                continue
            
            # Classifier la section
            section_type = self._classify_section(section_features, i, len(boundary_times) - 1)
            
            sections.append({
                'index': i,
                'start': start,
                'end': end,
                'duration': end - start,
                'type': section_type,
                'energy': section_features['energy'],
                'energy_variation': section_features['energy_std'],
                'brightness': section_features['brightness'],
                'brightness_variation': section_features['brightness_std'],
                'bandwidth': section_features['bandwidth'],
                'percussiveness': section_features['zcr']
            })
        
        # 3. Post-traitement: affiner les classifications
        sections = self._refine_classifications(sections, features)
        
        summary = self._get_section_summary(sections)
        print(f"Classification terminée: {summary}")
        
        return sections
    
    def _analyze_section(self, features, start_time, end_time):
        """Analyse les caractéristiques d'une section temporelle."""
        hop_length = features['hop_length']
        sr = features['sr']
        
        start_frame = librosa.time_to_frames(start_time, sr=sr, hop_length=hop_length)
        end_frame = librosa.time_to_frames(end_time, sr=sr, hop_length=hop_length)
        
        start_frame = max(0, start_frame)
        end_frame = min(len(features['rms']), end_frame)
        
        if start_frame >= end_frame:
            return None
        
        # Extraire les statistiques de la section
        rms_section = features['rms'][start_frame:end_frame]
        centroid_section = features['spectral_centroid'][start_frame:end_frame]
        bandwidth_section = features['spectral_bandwidth'][start_frame:end_frame]
        zcr_section = features['zero_crossing_rate'][start_frame:end_frame]
        chroma_section = features['chroma'][:, start_frame:end_frame]
        
        return {
            'energy': float(np.mean(rms_section)),
            'energy_std': float(np.std(rms_section)),
            'energy_max': float(np.max(rms_section)),
            'brightness': float(np.mean(centroid_section)),
            'brightness_std': float(np.std(centroid_section)),
            'bandwidth': float(np.mean(bandwidth_section)),
            'zcr': float(np.mean(zcr_section)),
            'chroma_var': float(np.var(chroma_section))
        }
    
    def _classify_section(self, section_features, index, total_sections):
        """
        Classifie une section en type musical.
        
        Types possibles:
        - intro: Début, énergie faible à moyenne
        - buildup: Montée en énergie progressive
        - verse: Énergie moyenne, stable
        - chorus: Énergie haute, brillance élevée
        - drop: Pic d'énergie soudain (EDM)
        - bridge: Énergie moyenne, variation harmonique
        - breakdown: Diminution d'énergie
        - outro: Fin, énergie décroissante
        """
        energy = section_features['energy']
        brightness = section_features['brightness']
        energy_var = section_features['energy_std']
        
        # Position relative dans le morceau
        position = index / total_sections
        
        # Intro (début du morceau, énergie faible)
        if position < 0.15 and energy < 0.03:
            return 'intro'
        
        # Outro (fin du morceau)
        if position > 0.85:
            if energy < 0.03:
                return 'outro'
            elif energy > 0.08:
                return 'final_chorus'
        
        # Classifier selon l'énergie et la brillance
        if energy > 0.12 and brightness > 2500:
            # Très énergique et brillant
            return 'drop' if energy > 0.15 else 'chorus'
        elif energy > 0.08 and brightness > 2000:
            return 'chorus'
        elif energy_var > 0.015:
            # Forte variation d'énergie
            return 'buildup' if energy > 0.06 else 'breakdown'
        elif energy > 0.05 and energy < 0.09:
            return 'verse'
        elif energy < 0.04:
            return 'bridge'
        else:
            return 'interlude'
    
    def _refine_classifications(self, sections, features):
        """
        Affine les classifications en tenant compte du contexte.
        """
        if len(sections) < 2:
            return sections
        
        # Détecter les patterns (verse-chorus-verse)
        for i in range(1, len(sections) - 1):
            prev_type = sections[i - 1]['type']
            curr_type = sections[i]['type']
            next_type = sections[i + 1]['type']
            
            # Si une section "interlude" est entre deux chorus, c'est probablement un bridge
            if curr_type == 'interlude' and prev_type == 'chorus' and next_type == 'chorus':
                sections[i]['type'] = 'bridge'
            
            # Buildup suivi de section énergique = probablement un drop
            if curr_type == 'buildup' and next_type in ['chorus', 'drop']:
                sections[i]['type'] = 'pre_drop'
        
        return sections
    
    def _get_section_summary(self, sections):
        """Résumé des types de sections détectées."""
        types = {}
        for section in sections:
            section_type = section['type']
            types[section_type] = types.get(section_type, 0) + 1
        
        return ', '.join([f"{count}x {stype}" for stype, count in types.items()])
    
    def detect_drops(self, features, sections):
        """
        Détection spécifique des drops (EDM/Electronic).
        Cherche les pics d'énergie soudains.
        
        Args:
            features: Features audio
            sections: Sections détectées
            
        Returns:
            list: Timestamps des drops détectés
        """
        rms = features['rms']
        
        # Détecter les pics d'énergie
        peaks, properties = signal.find_peaks(
            rms,
            height=np.mean(rms) + 2 * np.std(rms),  # Seuil: moyenne + 2σ
            distance=int(features['sr'] / features['hop_length'] * 8)  # Min 8s entre drops
        )
        
        drop_times = librosa.frames_to_time(
            peaks,
            sr=features['sr'],
            hop_length=features['hop_length']
        )
        
        return drop_times.tolist()
