# 🎵 Analify - Visualiseur audio intelligent

<div align="center">

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0.0-green.svg)
![Librosa](https://img.shields.io/badge/Librosa-0.10.1-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

*Un visualiseur audio avancé qui analyse et synchronise automatiquement les effets visuels avec la structure musicale*

[Fonctionnalités](#-fonctionnalités) • [Installation](#-installation) • [Utilisation](#-utilisation) • [Architecture](#-architecture) • [API](#-api)

</div>

---

## 📋 Table des matières

- [À propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Utilisation](#-utilisation)
- [Architecture](#-architecture)
- [API Documentation](#-api-documentation)
- [Algorithmes](#-algorithmes)

---

## 🎯 À propos

**Analify** est un visualiseur audio intelligent développé pour la Nuit de l'Info 2026. Contrairement aux visualiseurs traditionnels qui réagissent simplement à l'amplitude du son, Analify **analyse en profondeur la structure musicale** d'un morceau pour adapter intelligemment les effets visuels selon les différentes sections (intro, couplet, refrain, drop, outro).

### Pourquoi Analify ?

- 🧠 **Intelligence musicale** : Détection automatique de la structure (intro, verse, chorus, drop, outro)
- 🎨 **Visualisations adaptatives** : Chaque section a son propre style visuel
- 🎵 **Analyse audio avancée** : Tempo, beats, spectral features, MFCC, chroma
- 🎚️ **Navigation intuitive** : Barre de fréquences interactive servant de curseur pour naviguer dans le morceau
- ⚡ **Performance optimisée** : Mode rapide pour l'analyse en temps réel

---

## ✨ Fonctionnalités

### Analyse Musicale Automatique
- ✅ **Détection de tempo et beats** précise avec librosa
- ✅ **Segmentation automatique** en sections musicales
- ✅ **Classification intelligente** des sections (intro, verse, chorus, drop, bridge, outro)
- ✅ **Détection de drops** pour les morceaux électroniques
- ✅ **Extraction de features** : RMS, spectral centroid, MFCC, chroma, zero-crossing rate

### Visualisation
- 🎨 **2 modes de visualisation** distincts (Butterchurn et Shaders WebGL)
- 📊 **Barre de fréquences interactive** : Cliquez sur le spectre pour naviguer dans le morceau
- 🌈 **Effets visuels adaptatifs** synchronisés avec la structure musicale
- 📈 **Timeline interactive** montrant les sections détectées
- 🎮 **Contrôles utilisateur** : mode automatique ou manuel, drag & drop

### Navigation Innovante
- 🎚️ **Spectre audio cliquable** : La visualisation des fréquences sert de curseur de navigation
- ⏱️ **Sections visuelles** : Affichage coloré des différentes parties du morceau
- 🔄 **Changements automatiques** : Les effets s'adaptent automatiquement aux sections

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

L'application sera accessible sur `http://localhost:8000`

## 💻 Utilisation

### Utilisation de l'interface

1. **Ouvrir** votre navigateur sur http://localhost:8000
2. **Choisir** un visualiseur (Viz1 ou Viz2)
3. **Charger** un fichier audio (glisser-déposer ou cliquer)
4. **Attendre** l'analyse automatique (~5-15 secondes selon la durée)
5. **Profiter** de la synchronisation automatique !

### Contrôles

- **Espace** : Play/Pause
- **Clic sur la barre de fréquences** : Navigation rapide - cliquez n'importe où sur le spectre audio pour vous déplacer instantanément dans le morceau
- **Mode Auto** : Changement automatique des visuels selon les sections
- **Timeline** : Affichage visuel des différentes sections du morceau
- **N / P** : Changer de shader (suivant / précédent)

### Navigation par spectre audio

La **barre de fréquences** affichée à l'écran ne sert pas uniquement à la visualisation - elle est entièrement **cliquable** et agit comme un **curseur de navigation** :
- 🎯 Cliquez sur la partie gauche du spectre pour revenir en arrière
- 🎯 Cliquez sur la partie droite pour avancer
- 🎯 La position correspond proportionnellement au temps dans le morceau
- 🎨 Les sections sont colorées différemment pour un repérage visuel facile

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
│   │       ├── visualization.js     # Rendu Canvas et navigation par spectre
│   │       ├── shader_background.js # WebGL shaders
│   │       ├── main.js / main_viz2.js # Applications principales
│   │       └── ui.js               # Interface utilisateur
│   └── templates/
│       ├── home.html               # Page d'accueil
│       ├── index_viz1.html         # Visualiseur Butterchurn
│       └── index_viz2.html         # Visualiseur Shaders
├── temp/                           # Fichiers temporaires (auto-créé)
├── main.py                         # Point d'entrée Flask
└── requirements.txt                # Dépendances Python
```

---

## 🔧 Technologies

### Backend
- **Flask 3.0.0** : Framework web Python
- **librosa 0.10.1** : Analyse audio et extraction de features
- **scikit-learn 1.3.2** : Clustering et classification des sections
- **scipy 1.11.4** : Traitement du signal
- **numpy 1.26.2** : Calculs numériques

### Frontend
- **Web Audio API** : Analyse fréquentielle en temps réel
- **HTML5 Canvas** : Rendu du spectre et navigation interactive
- **WebGL/GLSL** : Rendu des shaders
- **ES6 Modules** : Architecture modulaire
- **Butterchurn** : Visualisations Milkdrop pour Viz1

---

## 📊 API Documentation

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
- Communauté VJ pour les techniques de [visualisation](https://ravinkumar.com/GenAiGuidebook/audio/audio_feature_extraction.html)
