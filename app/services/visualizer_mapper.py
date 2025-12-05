"""
Service de mapping entre sections musicales et configurations de visualiseurs.
"""
import random


class VisualizerMapper:
    """Mappe les sections musicales aux configurations de visualiseurs."""
    
    def __init__(self):
        """Initialise les mappings entre types de sections et visualiseurs."""
        
        # Configuration pour les shaders (indices des 20 shaders)
        self.shader_mappings = {
            'intro': {
                'type': 'shader',
                'shaders': [0, 1, 2, 19],  # Shaders calmes/ambients
                'intensity': 'low',
                'blur_amount': 4.0,
                'opacity': 0.4
            },
            'verse': {
                'type': 'shader',
                'shaders': [3, 4, 5, 6, 7],  # Shaders rythmiques modérés
                'intensity': 'medium',
                'blur_amount': 3.0,
                'opacity': 0.5
            },
            'chorus': {
                'type': 'shader',
                'shaders': [10, 11, 12, 15, 18],  # Shaders énergiques
                'intensity': 'high',
                'blur_amount': 2.0,
                'opacity': 0.7
            },
            'drop': {
                'type': 'shader',
                'shaders': [13, 14, 15, 16, 17],  # Shaders intenses/explosifs
                'intensity': 'extreme',
                'blur_amount': 1.5,
                'opacity': 0.8
            },
            'buildup': {
                'type': 'shader',
                'shaders': [8, 9, 10],  # Shaders progressifs
                'intensity': 'medium-high',
                'blur_amount': 2.5,
                'opacity': 0.6
            },
            'pre_drop': {
                'type': 'shader',
                'shaders': [8, 9, 10],  # Montée en tension
                'intensity': 'high',
                'blur_amount': 2.0,
                'opacity': 0.7
            },
            'bridge': {
                'type': 'shader',
                'shaders': [4, 5, 6, 7],  # Variation harmonique
                'intensity': 'medium',
                'blur_amount': 3.5,
                'opacity': 0.5
            },
            'breakdown': {
                'type': 'shader',
                'shaders': [1, 2, 3, 19],  # Retour au calme
                'intensity': 'low-medium',
                'blur_amount': 4.0,
                'opacity': 0.4
            },
            'outro': {
                'type': 'shader',
                'shaders': [0, 1, 19],  # Fin en douceur
                'intensity': 'low',
                'blur_amount': 5.0,
                'opacity': 0.3
            },
            'final_chorus': {
                'type': 'shader',
                'shaders': [10, 15, 18],  # Finale épique
                'intensity': 'extreme',
                'blur_amount': 1.5,
                'opacity': 0.8
            },
            'interlude': {
                'type': 'shader',
                'shaders': [2, 3, 4, 5],  # Transition
                'intensity': 'medium',
                'blur_amount': 3.0,
                'opacity': 0.5
            }
        }
        
        # Fallback par défaut
        self.default_config = {
            'type': 'shader',
            'shaders': [5, 6, 7],
            'intensity': 'medium',
            'blur_amount': 3.0,
            'opacity': 0.5
        }
    
    def get_visualization_timeline(self, sections, tempo=120.0):
        """
        Crée une timeline de changements de visualiseurs.
        
        Args:
            sections: Liste de sections (de SectionDetector)
            tempo: Tempo du morceau (BPM)
            
        Returns:
            list: Timeline avec timestamps et configurations
        """
        timeline = []
        
        for i, section in enumerate(sections):
            # Récupérer la configuration pour ce type de section
            config = self.shader_mappings.get(
                section['type'],
                self.default_config
            )
            
            # Sélectionner un shader aléatoire parmi ceux recommandés
            shader_index = random.choice(config['shaders'])
            
            # Adapter l'intensité selon l'énergie réelle
            adjusted_config = self._adjust_config_to_energy(
                config.copy(),
                section['energy'],
                section.get('brightness', 2000)
            )
            
            timeline.append({
                'time': section['start'],
                'duration': section['duration'],
                'section_index': section['index'],
                'section_type': section['type'],
                'visualizer_type': adjusted_config['type'],
                'shader_index': shader_index,
                'shader_pair': self._get_shader_pair(adjusted_config['shaders']),
                'intensity': adjusted_config['intensity'],
                'blur_amount': adjusted_config['blur_amount'],
                'opacity': adjusted_config['opacity'],
                'energy': section['energy'],
                'brightness': section.get('brightness', 2000),
                'is_transition': self._is_transition_point(section, sections, i)
            })
        
        return timeline
    
    def _adjust_config_to_energy(self, config, energy, brightness):
        """Ajuste la configuration selon l'énergie réelle de la section."""
        
        # Ajuster l'opacité selon l'énergie
        if energy > 0.12:
            config['opacity'] = min(0.9, config['opacity'] + 0.2)
        elif energy < 0.03:
            config['opacity'] = max(0.3, config['opacity'] - 0.1)
        
        # Ajuster le blur selon la brillance
        if brightness > 3000:
            config['blur_amount'] = max(1.0, config['blur_amount'] - 0.5)
        elif brightness < 1500:
            config['blur_amount'] = min(6.0, config['blur_amount'] + 1.0)
        
        return config
    
    def _get_shader_pair(self, shader_list):
        """
        Sélectionne une paire de shaders différents pour le dual-layer.
        
        Args:
            shader_list: Liste d'indices de shaders recommandés
            
        Returns:
            dict: {sharp: index1, blurred: index2}
        """
        if len(shader_list) >= 2:
            pair = random.sample(shader_list, 2)
            return {'sharp': pair[0], 'blurred': pair[1]}
        else:
            # Si pas assez de shaders, utiliser le même avec un autre aléatoire
            shader1 = shader_list[0]
            shader2 = random.randint(0, 19)
            while shader2 == shader1:
                shader2 = random.randint(0, 19)
            return {'sharp': shader1, 'blurred': shader2}
    
    def _is_transition_point(self, section, all_sections, index):
        """Détermine si c'est un point de transition important."""
        if index == 0 or index >= len(all_sections) - 1:
            return False
        
        prev_section = all_sections[index - 1]
        
        # Transition importante si changement de type ou grosse variation d'énergie
        type_change = prev_section['type'] != section['type']
        energy_jump = abs(section['energy'] - prev_section['energy']) > 0.05
        
        return type_change or energy_jump
    
    def get_config_for_section_type(self, section_type):
        """Récupère la configuration pour un type de section."""
        return self.shader_mappings.get(section_type, self.default_config)
    
    def suggest_shader_for_energy(self, energy, brightness):
        """
        Suggère un shader basé sur l'énergie et la brillance.
        
        Args:
            energy: Niveau d'énergie (0.0 - 1.0)
            brightness: Brillance spectrale (Hz)
            
        Returns:
            int: Index du shader recommandé
        """
        if energy > 0.12:
            # Très énergique
            return random.choice([13, 14, 15, 16, 17, 18])
        elif energy > 0.08:
            # Énergique
            return random.choice([10, 11, 12, 15])
        elif energy > 0.05:
            # Modéré
            return random.choice([3, 4, 5, 6, 7, 8])
        else:
            # Calme
            return random.choice([0, 1, 2, 19])
