"""
Contrôleur Flask pour l'analyse musicale.
"""
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import time
from app.services.music_analyzer import MusicAnalyzer
from app.services.section_detector import SectionDetector
from app.services.visualizer_mapper import VisualizerMapper


analyze_bp = Blueprint('analyze', __name__)

# Configuration
TEMP_FOLDER = 'temp'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'}

# S'assurer que le dossier temp existe
os.makedirs(TEMP_FOLDER, exist_ok=True)


def allowed_file(filename):
    """Vérifie si l'extension du fichier est autorisée."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@analyze_bp.route('/api/analyze', methods=['POST'])
def analyze_audio():
    """
    Analyse un fichier audio et retourne la structure musicale.
    
    Returns:
        JSON avec tempo, sections, et timeline de visualisation
    """
    # Vérifier qu'un fichier est présent
    if 'audio' not in request.files:
        return jsonify({'error': 'Aucun fichier audio fourni'}), 400
    
    audio_file = request.files['audio']
    
    if audio_file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400
    
    if not allowed_file(audio_file.filename):
        return jsonify({
            'error': f'Format non supporté. Formats acceptés: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400
    
    # Sauvegarder le fichier temporairement
    filename = secure_filename(audio_file.filename)
    timestamp = int(time.time())
    temp_filename = f"{timestamp}_{filename}"
    temp_path = os.path.join(TEMP_FOLDER, temp_filename)
    
    try:
        print(f"\n{'='*60}")
        print(f"Nouvelle analyse: {filename}")
        print(f"{'='*60}")
        
        audio_file.save(temp_path)
        print(f"Fichier sauvegardé: {temp_path}")
        
        # 1. Analyser les features audio (mode rapide activé)
        analyzer = MusicAnalyzer(fast_mode=True)
        features = analyzer.analyze(temp_path)
        
        # 2. Détecter les sections (nombre automatique basé sur la durée)
        detector = SectionDetector(n_sections=None)  # Auto-detect
        sections = detector.detect_sections(features)
        
        # 3. Détecter les drops (optionnel, pour EDM)
        drops = detector.detect_drops(features, sections)
        
        # Convertir les drops en liste Python (pas numpy)
        if hasattr(drops, 'tolist'):
            drops = drops.tolist()
        
        # 4. Mapper aux visualiseurs
        mapper = VisualizerMapper()
        timeline = mapper.get_visualization_timeline(sections, features['tempo'])
        
        # 5. Préparer la réponse
        response = {
            'success': True,
            'filename': filename,
            'duration': features['duration'],
            'tempo': features['tempo'],
            'beat_times': features['beat_times'],
            'sections': sections,
            'drops': drops,
            'visualization_timeline': timeline,
            'stats': {
                'total_sections': len(sections),
                'section_types': _get_section_type_counts(sections)
            }
        }
        
        print(f"\n{'='*60}")
        print("Analyse terminée avec succès!")
        print("Durée: {:.1f}s | Tempo: {:.1f} BPM".format(features['duration'], features['tempo']))
        print("Sections: {} | Drops: {}".format(len(sections), len(drops)))
        print(f"{'='*60}\n")
        
        return jsonify(response), 200
    
    except Exception as e:
        print(f"\n❌ ERREUR lors de l'analyse: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': f'Erreur lors de l\'analyse: {str(e)}'
        }), 500
    
    finally:
        # Nettoyer le fichier temporaire
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                print(f"Fichier temporaire supprimé: {temp_path}")
            except Exception as e:
                print(f"⚠️ Impossible de supprimer {temp_path}: {e}")


@analyze_bp.route('/api/suggest-shader', methods=['POST'])
def suggest_shader():
    """
    Suggère un shader basé sur l'énergie et la brillance actuelles.
    
    Expected JSON:
        {
            "energy": 0.08,
            "brightness": 2500
        }
    
    Returns:
        JSON avec l'index du shader recommandé
    """
    data = request.get_json()
    
    if not data or 'energy' not in data or 'brightness' not in data:
        return jsonify({'error': 'Paramètres manquants (energy, brightness)'}), 400
    
    try:
        energy = float(data['energy'])
        brightness = float(data['brightness'])
        
        mapper = VisualizerMapper()
        shader_index = mapper.suggest_shader_for_energy(energy, brightness)
        
        return jsonify({
            'success': True,
            'shader_index': shader_index,
            'energy': energy,
            'brightness': brightness
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def _get_section_type_counts(sections):
    """Compte le nombre de sections par type."""
    counts = {}
    for section in sections:
        section_type = section['type']
        counts[section_type] = counts.get(section_type, 0) + 1
    return counts
