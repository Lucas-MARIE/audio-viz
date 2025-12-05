#!/usr/bin/env bash
# Build script for Render.com

# Installer les dépendances système pour audio
apt-get update
apt-get install -y ffmpeg libsndfile1

# Mettre à jour pip
pip install --upgrade pip

# Installer les dépendances Python (--no-cache-dir pour économiser RAM)
pip install --no-cache-dir -r requirements.txt

echo "Build completed successfully!"
