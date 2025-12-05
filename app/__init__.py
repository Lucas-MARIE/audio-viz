import os, glob

__all__ = [os.path.basename(f)[:-3] for f in glob.glob(os.path.dirname(__file__) + "/*.py")]

from flask import Flask

app = Flask(__name__, static_url_path='/static')

# Importer et enregistrer les blueprints
from app.controllers.indexcontroller import index_bp
from app.controllers.analyzecontroller import analyze_bp

app.register_blueprint(index_bp)
app.register_blueprint(analyze_bp)