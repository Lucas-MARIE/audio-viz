from flask import render_template, Blueprint

index_bp = Blueprint('index', __name__)


@index_bp.route("/", methods=["GET"])
def index():
    metadata = {
        'title':'🎵 Analify - Visualiseurs Audio'
        }
    return render_template('home.html', metadata=metadata)

@index_bp.route("/viz1", methods=["GET"])
def viz1():
    metadata = {
        'title':'🔉 Visualiseur1'
        }

    return render_template('index_viz1.html',metadata = metadata)

@index_bp.route("/viz2", methods=["GET"])
def viz2():
    metadata = {
        'title':'🔉 Visualiseur2 - modV'
        }

    return render_template('index_viz2.html',metadata = metadata)