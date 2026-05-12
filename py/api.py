import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from spec_converter import convert_code_to_spec, save_specification, search_specifications, validate_user, create_user, get_glossary, propose_glossary_term, save_glossary_term, delete_glossary_term, update_specification_status, get_specification_history, analyze_vibe_logic, convert_triage_to_spec, supabase

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

@app.route('/api/analyze-vibe', methods=['POST'])
def analyze_vibe():
    try:
        data = request.json
        text = data.get('text', '')
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        result = analyze_vibe_logic(text)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/approvers', methods=['GET'])
def get_approvers_list():
    try:
        result = supabase.table("usuarios")\
            .select("id, full_name")\
            .in_("role", ["administrador", "aprovador", "aprobador"])\
            .order("full_name")\
            .execute()
        return jsonify({"status": "success", "data": result.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ENDPOINTS DE TRIAGE Y APORBACIONES

@app.route('/api/triage', methods=['GET'])
def get_triage_requests():
    try:
        approver_id = request.args.get('approver_id')
        status_name = request.args.get('status')
        
        query = supabase.table("triage_requests").select("*, sectors(*), statuses(*)")
        
        if approver_id:
            query = query.eq("approver_id", approver_id)
            
        result = query.order("created_at", desc=True).execute()
        
        # Filtrar por nombre de estado en Python si se especifica (más tolerante que joins complejos)
        data = result.data
        if status_name:
            data = [r for r in data if r.get('statuses', {}).get('name') == status_name]
            
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/triage/<triage_id>', methods=['GET'])
def get_triage_detail(triage_id):
    try:
        result = supabase.table("triage_requests").select("*, sectors(*), statuses(*)").eq("id", triage_id).execute()
        if not result.data:
            return jsonify({"error": "Solicitud de triage no encontrada"}), 404
        return jsonify({"status": "success", "data": result.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/triage/approve', methods=['POST'])
def approve_triage():
    try:
        data = request.json
        triage_id = data.get('triage_id')
        approver_id = data.get('approver_id')
        comment = data.get('comment', '')
        project_name = data.get('project_name')
        
        if not triage_id or not approver_id:
            return jsonify({"error": "Faltan triage_id o approver_id"}), 400
            
        # 1. Obtener la solicitud de triage original
        triage_res = supabase.table("triage_requests").select("*").eq("id", triage_id).execute()
        if not triage_res.data:
            return jsonify({"error": "Solicitud de triage no encontrada"}), 404
            
        triage_data = triage_res.data[0]
        
        # Nombre de proyecto por defecto si no se pasa
        if not project_name:
            project_name = triage_data.get('idea', 'Proyecto Agéntico')[:40]
            
        # 2. Invocar IA para generar la especificación agéntica completa
        print(f"[API] Generando especificación agéntica para el proyecto: {project_name}")
        spec_json = convert_triage_to_spec(triage_data, project_name)
        
        # 3. Guardar la especificación en Supabase con estado 'Aprobada'
        print(f"[API] Guardando especificación en base de datos...")
        db_spec = save_specification(
            spec_json=spec_json,
            author_id=triage_data.get('creator_id') or approver_id,
            sector_id=triage_data.get('sector_id'),
            urgency='Media',
            status='Aprobada',
            criticality=triage_data.get('criticality', 'Media'),
            approver_id=approver_id
        )
        
        if not db_spec:
            return jsonify({"error": "No se pudo guardar la especificación generada"}), 500
            
        spec_id = db_spec[0]['id']
        
        # 4. Obtener ID del estado APROBADO
        status_res = supabase.table("statuses").select("id").eq("name", "APROBADO").execute()
        if not status_res.data:
            return jsonify({"error": "Estado APROBADO no configurado en la base de datos"}), 500
        approved_status_id = status_res.data[0]['id']
        
        # 5. Actualizar la propuesta de triage a APROBADO con metadata de trazabilidad
        metadata = triage_data.get('metadata', {}) or {}
        metadata['approval_comment'] = comment
        metadata['specification_id'] = spec_id
        metadata['approved_by'] = approver_id
        
        supabase.table("triage_requests").update({
            "status_id": approved_status_id,
            "metadata": metadata,
            "updated_at": "now()"
        }).eq("id", triage_id).execute()
        
        return jsonify({
            "status": "success",
            "message": "Solicitud aprobada y especificación agéntica generada con éxito",
            "specification_id": spec_id,
            "spec": spec_json
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/triage/reject', methods=['POST'])
def reject_triage():
    try:
        data = request.json
        triage_id = data.get('triage_id')
        approver_id = data.get('approver_id')
        comment = data.get('comment')
        
        if not triage_id or not approver_id or not comment:
            return jsonify({"error": "Faltan triage_id, approver_id o comentario de rechazo"}), 400
            
        # 1. Obtener la solicitud de triage original
        triage_res = supabase.table("triage_requests").select("*").eq("id", triage_id).execute()
        if not triage_res.data:
            return jsonify({"error": "Solicitud de triage no encontrada"}), 404
            
        triage_data = triage_res.data[0]
        
        # 2. Obtener ID del estado RECHAZADO
        status_res = supabase.table("statuses").select("id").eq("name", "RECHAZADO").execute()
        if not status_res.data:
            return jsonify({"error": "Estado RECHAZADO no configurado en la base de datos"}), 500
        rejected_status_id = status_res.data[0]['id']
        
        # 3. Actualizar la propuesta de triage a RECHAZADO con metadata de feedback
        metadata = triage_data.get('metadata', {}) or {}
        metadata['rejection_comment'] = comment
        metadata['rejected_by'] = approver_id
        
        supabase.table("triage_requests").update({
            "status_id": rejected_status_id,
            "metadata": metadata,
            "updated_at": "now()"
        }).eq("id", triage_id).execute()
        
        return jsonify({
            "status": "success",
            "message": "Solicitud de triage rechazada correctamente"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ENDPOINTS DE ESPECIFICACIONES (PROYECTOS) PARA EL DASHBOARD

@app.route('/api/specifications', methods=['GET'])
def get_specifications():
    try:
        # Obtiene todas las especificaciones con su sector para el dashboard de proyectos activos
        result = supabase.table("specifications").select("*, sectors(*)").order("created_at", desc=True).execute()
        return jsonify({"status": "success", "data": result.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/specifications/<spec_id>', methods=['GET'])
def get_specification_detail(spec_id):
    try:
        result = supabase.table("specifications").select("*, sectors(*)").eq("id", spec_id).execute()
        if not result.data:
            return jsonify({"error": "Especificación no encontrada"}), 404
        return jsonify({"status": "success", "data": result.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)
