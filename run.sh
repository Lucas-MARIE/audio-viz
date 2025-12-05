#!/bin/bash

echo "Lancement d'Analify..."
echo ""

# Activer l'environnement conda
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate analify

if [ $? -ne 0 ]; then
    echo "[ERREUR] L'environnement 'analify' n'existe pas."
    echo ""
    echo "Lancez d'abord: ./install.sh"
    echo ""
    exit 1
fi

# Lancer l'application
python main.py
