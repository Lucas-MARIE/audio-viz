# Déploiement sur Railway.app

Guide complet pour déployer l'application audio-viz sur Railway avec 8 GB de RAM.

## 🚀 Pourquoi Railway ?

✅ **8 GB RAM** (vs 512 MB sur Render)
✅ **Pas de timeout HTTP strict**
✅ **Timeout Gunicorn : 300s** (5 minutes)
✅ **2 workers + threading** pour meilleures performances
✅ **$5 gratuit/mois** (~500h d'uptime)
✅ **Déploiement automatique depuis GitHub**
✅ **Support complet ffmpeg/librosa**

## 📋 Prérequis

1. Compte Railway : https://railway.app/
2. Repository GitHub : `Lucas-MARIE/audio-viz`
3. Branche `deploy_railway` (cette branche)

## 🎯 Étapes de déploiement

### 1. Créer un compte Railway

1. Allez sur https://railway.app/
2. Cliquez sur **"Start a New Project"**
3. Connectez-vous avec GitHub

### 2. Créer un nouveau projet

1. Dans le dashboard Railway, cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Choisissez le repo **`Lucas-MARIE/audio-viz`**
4. Sélectionnez la branche **`deploy_railway`**

### 3. Configuration automatique

Railway va automatiquement détecter :
- ✅ `nixpacks.toml` → Installation de Python 3.12, ffmpeg, libsndfile
- ✅ `requirements.txt` → Installation des dépendances Python
- ✅ `Procfile` → Commande de démarrage Gunicorn
- ✅ `railway.json` → Configuration avancée

### 4. Variables d'environnement (optionnel)

Railway génère automatiquement `PORT`, mais tu peux ajouter :

- `PYTHON_VERSION=3.12.7` (déjà dans nixpacks.toml)
- `WORKERS=2` (déjà dans Procfile)

### 5. Déploiement

1. Railway va build automatiquement
2. Attendre ~3-5 minutes pour le premier deploy
3. Une URL sera générée : `https://ton-projet.up.railway.app`

### 6. Configuration du domaine (optionnel)

Dans **Settings** → **Domains** :
- Railway génère un domaine gratuit `.up.railway.app`
- Tu peux ajouter un domaine custom si tu veux

## 📊 Configuration Railway vs Render

### Fichiers de config Railway (cette branche)

**`railway.json`** :
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install --upgrade pip && pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "gunicorn main:app --bind 0.0.0.0:$PORT --timeout 300 --workers 2 --threads 4 --worker-class gthread",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**`nixpacks.toml`** :
```toml
[phases.setup]
nixPkgs = ["python312", "ffmpeg", "libsndfile"]

[start]
cmd = "gunicorn main:app --bind 0.0.0.0:$PORT --timeout 300 --workers 2 --threads 4 --worker-class gthread"
```

**`Procfile`** (amélioré) :
```
web: gunicorn main:app --bind 0.0.0.0:$PORT --timeout 300 --workers 2 --threads 4 --worker-class gthread
```

### Optimisations appliquées

1. **Sample rate restauré** : 11025 → 22050 Hz (meilleure qualité avec 8 GB RAM)
2. **2 workers + 4 threads** : Utilise mieux les ressources
3. **Timeout 300s** : 5 minutes pour analyses longues
4. **Worker class gthread** : Threading pour I/O parallèle
5. **Auto-restart** : Redémarre si crash

## 🔧 Commandes Railway CLI (optionnel)

### Installer Railway CLI

```powershell
npm install -g @railway/cli
```

### Se connecter

```powershell
railway login
```

### Déployer depuis le terminal

```powershell
cd c:\Users\aquob\Desktop\BUT3_INFO\Nuit_de_linfo\Analify
railway up
```

### Voir les logs

```powershell
railway logs
```

### Ouvrir l'app

```powershell
railway open
```

## 📈 Monitoring

Railway fournit :
- 📊 **Metrics** : CPU, RAM, Network
- 📝 **Logs en temps réel**
- 🔔 **Alertes** sur crash
- 💰 **Usage tracker** : Voir combien de crédit restant

## 💰 Gestion du crédit gratuit

**$5/mois = ~500 heures d'uptime**

Stratégies pour économiser :
1. **Sleep automatique** : Railway peut mettre l'app en veille si pas d'activité
2. **Limiter les heures** : Actif seulement 16h/jour = ~30 jours de gratuité
3. **Upgrade si besoin** : $5/mois pour usage illimité

## 🐛 Debug

### Logs de build

Si le build échoue :
1. Ouvre **Deployments** dans Railway
2. Clique sur le dernier deploy
3. Vérifie les logs de build

### Logs runtime

```powershell
railway logs
```

Ou dans le dashboard Railway → **Deployments** → **View Logs**

### Tester localement

```powershell
# Simuler Railway localement
gunicorn main:app --bind 0.0.0.0:5000 --timeout 300 --workers 2 --threads 4 --worker-class gthread
```

## 🔄 Mises à jour

Chaque push sur `deploy_railway` redéploie automatiquement :

```powershell
git add .
git commit -m "Update"
git push origin deploy_railway
```

Railway redéploie en ~2-3 minutes.

## ⚡ Performances attendues

Avec 8 GB RAM et les optimisations :

| Durée audio | Temps d'analyse | RAM utilisée |
|-------------|-----------------|--------------|
| 3 minutes | ~5-8 secondes | ~200 MB |
| 5 minutes | ~10-15 secondes | ~400 MB |
| 10 minutes | ~25-35 secondes | ~800 MB |

**Fini les timeouts !** 🎉

## 🎯 Checklist de déploiement

- [ ] Compte Railway créé
- [ ] Repo connecté à Railway
- [ ] Branche `deploy_railway` sélectionnée
- [ ] Premier build terminé
- [ ] URL générée et testée
- [ ] Upload d'un fichier audio de test
- [ ] Analyse fonctionne (check logs)
- [ ] Visualisation fonctionne
- [ ] Shaders changent automatiquement

## 🆘 Support

Si problème :
1. Check les logs Railway
2. Vérifie que la branche `deploy_railway` est active
3. Vérifie que `nixpacks.toml` est présent
4. Contacte le support Railway (très réactif)

## 🎊 Après le déploiement

Une fois déployé, ton app sera accessible 24/7 avec :
- ✅ Analyse rapide et fiable
- ✅ Pas de timeout
- ✅ Meilleure performance
- ✅ URL stable

Partage le lien : `https://ton-projet.up.railway.app` 🚀
