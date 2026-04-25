import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from spec_converter import convert_code_to_spec, save_specification, search_specifications, validate_user, create_user, get_glossary, propose_glossary_term, save_glossary_term, delete_glossary_term, update_specification_status, get_specification_history

load_dotenv(dotenv_path='env/.env')

# Configuración de rutas absolutas para evitar fallos en Windows
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))

app = Flask(__name__, static_folder=ROOT_DIR, static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.route('/')
def serve_index():
    return send_from_directory(ROOT_DIR, 'index.html')

@app.route('/api/health')
def health():
    return jsonify({"status": "online", "message": "Spec Factory API is running"}), 200

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email y contraseña requeridos"}), 400

        user = validate_user(email, password)
        if user:
            return jsonify({"status": "success", "user": user}), 200
        else:
            return jsonify({"error": "Credenciales inválidas"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/create', methods=['POST'])
def add_user():
    try:
        data = request.json
        required = ['full_name', 'email', 'password', 'role']
        if not all(k in data for k in required):
            return jsonify({"error": "Faltan campos obligatorios"}), 400
            
        result = create_user(data)
        if result['status'] == 'success':
            return jsonify(result), 201
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/glossary', methods=['GET'])
def glossary_list():
    try:
        categoria = request.args.get('categoria')
        data = get_glossary(categoria)
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/glossary/propose', methods=['POST'])
def glossary_propose():
    try:
        data = request.json
        term = data.get('termino')
        context = data.get('contexto', '')
        
        if not term:
            return jsonify({"error": "Término requerido"}), 400
            
        proposal = propose_glossary_term(term, context)
        if "error" in proposal:
            return jsonify(proposal), 500
            
        return jsonify({"status": "success", "proposal": proposal}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/glossary/confirm', methods=['POST'])
def glossary_confirm():
    try:
        data = request.json
        # data debería contener: termino, definicion, categoria, ejemplo, fuente, confianza, autor
        required = ['termino', 'definicion', 'categoria']
        if not all(k in data for k in required):
            return jsonify({"error": "Faltan campos obligatorios"}), 400
            
        result = save_glossary_term(data)
        if result['status'] == 'success':
            return jsonify(result), 201
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/glossary/<term_id>', methods=['PUT'])
def glossary_update(term_id):
    try:
        data = request.json
        data['id'] = term_id
        result = save_glossary_term(data)
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/glossary/<term_id>', methods=['DELETE'])
def glossary_delete(term_id):
    try:
        result = delete_glossary_term(term_id)
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/glossary/export/md', methods=['GET'])
def glossary_export_md():
    try:
        terms = get_glossary()
        
        # Agrupar por categoría
        grouped = {"negocio": [], "tecnico": [], "acronimo": [], "sistema": []}
        for t in terms:
            cat = t.get('categoria', 'negocio')
            if cat in grouped:
                grouped[cat].append(t)
        
        # Construir MD
        md = "# Glosario de Spec Factory\n\n"
        md += "Este documento es una foto exportada del Glosario Inteligente.\n\n"
        
        categorias_nombres = {
            "negocio": "Términos de Negocio",
            "tecnico": "Términos Técnicos",
            "acronimo": "Acrónimos",
            "sistema": "Términos del Sistema"
        }
        
        for cat_key, cat_name in categorias_nombres.items():
            if grouped[cat_key]:
                md += f"## {cat_name}\n\n"
                for t in grouped[cat_key]:
                    md += f"**{t['termino']}**:\n"
                    md += f"> {t['definicion']}\n"
                    if t.get('ejemplo'):
                        md += f"> *Ejemplo: {t['ejemplo']}*\n"
                    md += "\n"
        
        return jsonify({"status": "success", "markdown": md}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/specifications/status', methods=['POST'])
def update_status():
    try:
        data = request.json
        spec_id = data.get('spec_id')
        status = data.get('status')
        user_id = data.get('user_id')
        comment = data.get('comment')
        
        if not all([spec_id, status, user_id]):
            return jsonify({"error": "Faltan datos obligatorios"}), 400
            
        result = update_specification_status(spec_id, status, user_id, comment)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/specifications/<spec_id>/history', methods=['GET'])
def get_history(spec_id):
    try:
        data = get_specification_history(spec_id)
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)
