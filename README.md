# Analify - Visualiseur Audio Intelligent

Application de visualisation audio avec analyse musicale automatique.

## 🎵 Fonctionnalités

- **Visualisation audio en temps réel** : Deux visualiseurs (Butterchurn et Shaders WebGL)
- **Analyse musicale intelligente** : Détection automatique des sections (intro, verse, chorus, drop, etc.)
- **Changements automatiques de shaders** : Adaptation visuelle selon la structure du morceau
- **20+ shaders audio-réactifs** : Effets visuels variés avec dual-layer rendering
- **Contrôle complet** : Drag & drop, click-to-seek, raccourcis clavier

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/hrtxr/Analify.git
cd Analify
```

### 2. Installer les dépendances

#### Option A : Avec Conda (Recommandé pour Windows)

Cette méthode évite les problèmes de compilation de `librosa` et ses dépendances.

**Installation automatique** :
```bash
# Windows
install.bat

# Linux/macOS
chmod +x install.sh
./install.sh
```

**Installation manuelle** :
```bash
# Créer l'environnement conda
conda env create -f environment.yml

# Activer l'environnement
conda activate analify
```

#### Option B : Avec pip (Linux/macOS)

```bash
# Créer un environnement virtuel (optionnel mais recommandé)
python -m venv venv
source venv/bin/activate  # Linux/macOS
# ou
venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt
```

**Note pour pip** : L'installation de `librosa` peut prendre quelques minutes. Si vous rencontrez des problèmes, installez FFmpeg :

**Windows** :
```bash
choco install ffmpeg
```

**macOS** :
```bash
brew install ffmpeg
```

**Linux** :
```bash
sudo apt-get install ffmpeg
```

### 3. Lancer l'application

**Avec les scripts fournis** :
```bash
# Windows
run.bat

# Linux/macOS
chmod +x run.sh
./run.sh
```

**Manuellement** :
```bash
# Activer l'environnement (si conda)
conda activate analify

# Lancer le serveur
python main.py
```

L'application sera accessible sur `http://localhost:5000`

## 📁 Structure du Projet

```
Analify/
├── app/
│   ├── controllers/
│   │   ├── indexcontroller.py      # Routes principales
│   │   └── analyzecontroller.py    # API d'analyse musicale
│   ├── services/
│   │   ├── music_analyzer.py       # Extraction de features audio
│   │   ├── section_detector.py     # Détection de sections
│   │   └── visualizer_mapper.py    # Mapping sections → visuels
│   ├── static/
│   │   ├── css/styles.css
│   │   └── js/
│   │       ├── audio.js            # Gestion Web Audio API
│   │       ├── visualization.js     # Canvas 2D
│   │       ├── shader_background.js # WebGL shaders
│   │       ├── main_viz2.js        # App principale
│   │       └── ui.js               # Interface utilisateur
│   └── templates/
│       ├── home.html               # Page d'accueil
│       ├── index_viz1.html         # Visualiseur Butterchurn
│       └── index_viz2.html         # Visualiseur Shaders
├── temp/                           # Fichiers temporaires (auto-créé)
├── main.py                         # Point d'entrée Flask
└── requirements.txt                # Dépendances Python
```

## 🎹 Utilisation

### Chargement d'un fichier audio

1. Glisser-déposer un fichier audio (MP3, WAV, FLAC, etc.) ou cliquer pour parcourir
2. L'analyse musicale démarre automatiquement en arrière-plan
3. Les shaders changeront automatiquement selon la structure détectée

### Raccourcis clavier

- **Espace** : Lecture/Pause
- **N** : Shader suivant (aléatoire)
- **P** : Shader précédent (aléatoire)
- **B** : Afficher/Masquer le fond

### Analyse musicale

L'analyse détecte automatiquement :
- **Tempo** (BPM)
- **Sections** : intro, verse, chorus, drop, bridge, outro, etc.
- **Caractéristiques** : énergie, brillance, variations
- **Drops** (pour musique électronique)

Les shaders s'adaptent en temps réel selon :
- Le type de section
- L'énergie du morceau
- La brillance spectrale
- Les transitions importantes

## 🔧 Technologies

### Backend
- **Flask** : Framework web Python
- **librosa** : Analyse audio et extraction de features
- **scikit-learn** : Clustering et classification
- **scipy** : Traitement du signal

### Frontend
- **Web Audio API** : Analyse fréquentielle en temps réel
- **WebGL/GLSL** : Rendu des shaders
- **Canvas 2D** : Visualisation du spectre
- **ES6 Modules** : Architecture modulaire

## 📊 API

### POST /api/analyze

Analyse un fichier audio et retourne sa structure.

**Request:**
```javascript
const formData = new FormData();
formData.append('audio', audioFile);

fetch('/api/analyze', {
  method: 'POST',
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "duration": 245.3,
  "tempo": 128.5,
  "sections": [
    {
      "start": 0.0,
      "end": 15.2,
      "type": "intro",
      "energy": 0.025,
      "brightness": 1850
    }
  ],
  "visualization_timeline": [
    {
      "time": 0.0,
      "section_type": "intro",
      "shader_pair": {"sharp": 0, "blurred": 1},
      "intensity": "low"
    }
  ]
}
```

## 🎨 Types de Sections Détectées

- **intro** : Début du morceau, énergie faible
- **verse** : Couplet, énergie moyenne stable
- **chorus** : Refrain, énergie haute
- **drop** : Pic d'énergie soudain (EDM)
- **buildup** : Montée progressive
- **bridge** : Pont, variation harmonique
- **breakdown** : Diminution d'énergie
- **outro** : Fin du morceau

## 🐛 Dépannage

### L'analyse ne fonctionne pas
- Vérifier que `librosa` est bien installé : `pip show librosa`
- Vérifier que FFmpeg est installé : `ffmpeg -version`
- Consulter les logs dans la console du serveur

### Les shaders ne s'affichent pas
- Vérifier que votre navigateur supporte WebGL 2.0
- Ouvrir la console développeur (F12) pour voir les erreurs
- Tester avec un autre navigateur (Chrome/Firefox recommandés)

## 📝 Licence

MIT License - Voir LICENSE pour plus de détails

## 👥 Auteurs

- **hrtxr** - Développement principal
- Projet réalisé dans le cadre de la Nuit de l'Info 2024

## 🙏 Remerciements

- [librosa](https://librosa.org/) pour l'analyse audio
- [ISF](https://isf.video/) pour l'inspiration des shaders
- Communauté VJ pour les techniques de visualisation
