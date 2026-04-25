from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from spec_converter import convert_code_to_spec, save_specification
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

app = Flask(__name__)
CORS(app) # Permitir peticiones desde el frontend

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
        
        # 2. Guardar en Supabase con Embeddings usando Gemini
        # Nota: author_id y sector_id deben existir en la DB
        result = save_specification(spec_json, author_id, sector_id, urgency)
        
        return jsonify({
            "status": "success",
            "spec": spec_json,
            "db_result": result
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)
