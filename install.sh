#!/bin/bash

echo "========================================"
echo "Installation d'Analify"
echo "========================================"
echo ""

# Vérifier si conda est installé
if ! command -v conda &> /dev/null; then
    echo "[ERREUR] Conda n'est pas installé ou n'est pas dans le PATH."
    echo ""
    echo "Veuillez installer Anaconda ou Miniconda:"
    echo "- Anaconda: https://www.anaconda.com/download"
    echo "- Miniconda: https://docs.conda.io/en/latest/miniconda.html"
    echo ""
    exit 1
fi

echo "[1/3] Création de l'environnement conda..."
conda env create -f environment.yml
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERREUR] Échec de la création de l'environnement."
    echo ""
    echo "Si l'environnement existe déjà, supprimez-le avec:"
    echo "conda env remove -n analify"
    echo ""
    exit 1
fi

echo ""
echo "[2/3] Activation de l'environnement..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate analify

echo ""
echo "[3/3] Vérification de l'installation..."
python -c "import librosa; import flask; print('✓ Toutes les dépendances sont installées')"

echo ""
echo "========================================"
echo "Installation terminée avec succès!"
echo "========================================"
echo ""
echo "Pour lancer l'application:"
echo "  1. conda activate analify"
echo "  2. python main.py"
echo ""
echo "Ou utilisez simplement: ./run.sh"
echo ""
