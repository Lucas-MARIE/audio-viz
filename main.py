from app import app 

if __name__ == "__main__":
    # Désactiver use_reloader pour éviter les problèmes avec librosa
    app.run(host="localhost", port=8000, debug=True, use_reloader=False)