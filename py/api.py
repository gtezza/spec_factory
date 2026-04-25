import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from spec_converter import convert_code_to_spec, save_specification, search_specifications
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

app = Flask(__name__)
CORS(app) # Permitir peticiones desde el frontend

@app.route('/')
def index():
    return jsonify({"status": "online", "message": "Spec Factory API is running"}), 200

@app.route('/api/convert', methods=['POST'])
def convert():
    try:
        data = request.json
        code = data.get('code')
        project_name = data.get('projectName', 'Nuevo Proyecto')
        author_id = data.get('authorId') # UUID de Supabase
        sector_id = data.get('sectorId') # UUID de Supabase
        urgency = data.get('urgency', 'Media')

        if not code:
            return jsonify({"error": "No code provided"}), 400

        # 1. Convertir código a Spec usando Groq
        spec_json = convert_code_to_spec(code, project_name)
        
        # 2. Intentar guardar en Supabase con Embeddings (no bloquea el flujo)
        db_result = None
        db_warning = None
        try:
            db_result = save_specification(spec_json, author_id, sector_id, urgency)
        except Exception as db_error:
            db_warning = f"Spec generada pero no guardada en BD: {str(db_error)}"
            print(f"[WARN] {db_warning}")
        
        return jsonify({
            "status": "success",
            "spec": spec_json,
            "db_result": db_result,
            "db_warning": db_warning
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    try:
        data = request.json
        query = data.get('query', '').strip()
        if not query:
            return jsonify({"error": "No query provided"}), 400

        threshold = data.get('threshold', 0.4)
        max_results = data.get('maxResults', 5)

        results = search_specifications(query, threshold, max_results)
        return jsonify({"status": "success", "results": results, "count": len(results)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)
