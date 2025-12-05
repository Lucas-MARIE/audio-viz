# Guide de déploiement - Analify

## 🚀 Déploiement sur Render.com (Gratuit)

### Étape 1 : Préparer le dépôt GitHub

1. Assurez-vous que tous les fichiers sont commit et push :
```bash
git add .
git commit -m "Préparation pour déploiement"
git push origin main
```

### Étape 2 : Créer un compte Render

1. Allez sur [render.com](https://render.com)
2. Cliquez sur "Get Started for Free"
3. Connectez-vous avec GitHub

### Étape 3 : Créer le Web Service

1. Dans le dashboard Render, cliquez sur **"New +"** → **"Web Service"**

2. Connectez votre dépôt GitHub `Analify`

3. Configurez le service :

   **Settings :**
   - **Name** : `analify` (ou votre choix)
   - **Region** : `Frankfurt (EU Central)` ou le plus proche
   - **Branch** : `main`
   - **Root Directory** : (laisser vide)
   - **Environment** : `Python 3`
   - **Build Command** : 
     ```
     bash build.sh
     ```
   - **Start Command** :
     ```
     gunicorn main:app --bind 0.0.0.0:$PORT --timeout 120 --workers 1
     ```

4. **Plan** : Sélectionnez **"Free"**

5. **Advanced Settings** (optionnel) :
   - Ajoutez une variable d'environnement :
     - Key: `FLASK_ENV`
     - Value: `production`

### Étape 4 : Déployer

1. Cliquez sur **"Create Web Service"**

2. Attendez le build (première fois : 5-10 minutes)
   - Vous verrez les logs en temps réel
   - ✅ "Build successful" → "Deploy live"

3. Une fois déployé, votre URL sera :
   ```
   https://analify-xxxx.onrender.com
   ```

### Étape 5 : Tester

Visitez votre URL et testez :
- Upload d'un fichier audio
- Analyse musicale
- Visualisation

## ⚠️ Limitations du plan gratuit Render

- **Inactivité** : L'app se met en veille après 15 min sans requête
- **Réveil** : Premier chargement lent (30-60 secondes)
- **Heures** : 750h/mois gratuites
- **RAM** : 512 MB
- **Build** : Temps de build limité

**Solutions** :
- Utiliser un service de "ping" gratuit (UptimeRobot) pour garder l'app active
- Passer au plan payant ($7/mois) pour éliminer le sleep

## 🔄 Mises à jour automatiques

Chaque fois que vous push sur GitHub :
```bash
git add .
git commit -m "Nouvelle fonctionnalité"
git push origin main
```

→ Render redéploie automatiquement ! 🎉

## 🌐 Alternatives

### Railway.app (Gratuit avec limites)
- Plus simple à configurer
- $5 de crédit gratuit/mois
- https://railway.app

### Fly.io (Gratuit généreux)
- Configuration plus complexe
- Meilleure performance
- https://fly.io

### PythonAnywhere (Gratuit limité)
- Spécialisé Python
- Interface web complète
- https://www.pythonanywhere.com

## 🐛 Dépannage déploiement

### ❌ Build échoue avec "Error installing scipy" ou "Unknown compiler(s): gfortran"

**Cause** : scipy/numpy tentent de compiler depuis les sources au lieu d'utiliser les wheels précompilés.

**Solution** : Les versions dans `requirements.txt` sont maintenant fixées pour utiliser des wheels. Si le problème persiste :

1. Vérifiez que `build.sh` est bien exécuté
2. Les versions de numpy (1.24.3) et scipy (1.10.1) ont des wheels pour Python 3.12
3. Render utilise bien `bash build.sh` comme Build Command

### ❌ Build échoue avec "Error installing librosa"

**Cause** : Dépendances manquantes (ffmpeg, libsndfile).

**Solution** : Le script `build.sh` installe automatiquement :
- `ffmpeg` (pour audioread)
- `libsndfile1` (pour soundfile)

### "Application Error" au lancement
1. Vérifiez les logs dans Render Dashboard
2. Variables d'environnement bien configurées ?
3. Commande de start correcte ?

### L'app est très lente
→ Plan gratuit = ressources limitées. Première requête = réveil (30-60s).

### Upload de fichier échoue
→ Vérifiez que le dossier `temp/` est bien créé (fait automatiquement dans le code).

## 📊 Monitoring

Dans Render Dashboard :
- **Logs** : Voir les erreurs en temps réel
- **Metrics** : CPU, RAM, requêtes
- **Events** : Historique des déploiements

## 🎯 Checklist avant déploiement

- [x] `Procfile` créé
- [x] `requirements.txt` à jour avec gunicorn
- [x] `runtime.txt` spécifie Python 3.12
- [x] `main.py` utilise `PORT` et `HOST` dynamiques
- [x] Code push sur GitHub
- [x] Compte Render créé
- [x] Service configuré

Vous êtes prêt ! 🚀
