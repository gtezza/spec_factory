import os
import json
import cohere
from werkzeug.security import check_password_hash, generate_password_hash
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

# Configuración de Clientes
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
cohere_client = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))

# El backend usa service_role para bypasear RLS (nunca exponer al frontend)
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase: Client = create_client(os.getenv("SUPABASE_URL"), supabase_service_key)

def get_embedding(text):
    """
    Genera un vector de embedding usando Cohere embed-multilingual-v3.0.
    Produce vectores de 1024 dimensiones, con soporte nativo para español.
    """
    response = cohere_client.embed(
        texts=[text],
        model="embed-multilingual-v3.0",
        input_type="search_document",
        embedding_types=["float"]
    )
    embedding = response.embeddings.float[0]
    print(f"[OK] Embedding Cohere generado ({len(embedding)} dimensiones).")
    return embedding

def convert_code_to_spec(code_content, project_name="Nuevo Proyecto"):
    """Convierte código fuente en una especificación IEEE 830 usando Groq."""
    
    # Obtener términos activos del glosario
    active_terms = get_glossary()
    glossary_text = "\n".join([f"- {t['termino']}: {t['definicion']} (Categoría: {t['categoria']})" for t in active_terms]) if active_terms else "Ningún término disponible actualmente."

    prompt = f"""
    Actúa como un Analista de Sistemas Senior experto en la norma IEEE 830.
    Convierte el siguiente bloque de código en una especificación funcional (SRS) profesional y detallada.
    
    GLOSARIO CORPORATIVO DISPONIBLE:
    {glossary_text}

    CÓDIGO:
    {code_content}
    
    RESPONDE ÚNICAMENTE EN FORMATO JSON con la siguiente estructura extendida:
    {{
        "title": "Título descriptivo del módulo",
        "introduction": {{
            "purpose": "Propósito detallado",
            "scope": "Alcance específico del código proporcionado",
            "definitions": ["Término 1: Definición (usar Glosario Corporativo si aplica. Si encuentras conceptos clave adicionales en el código que no estén en el Glosario, infiere su definición usando ÚNICAMENTE literatura técnica formal y estándares reconocidos. EVITAR estrictamente fuentes como Wikipedia. Marca el término con '(Nuevo)')"]
        }},
        "product_overview": {{
            "perspective": "Cómo encaja este código en un sistema mayor",
            "functions": ["Lista detallada de capacidades lógicas"],
            "user_characteristics": "Perfil del usuario que interactúa con esta lógica",
            "constraints": ["Limitaciones técnicas, de memoria o de seguridad"],
            "assumptions": ["Supuestos sobre el entorno de ejecución"]
        }},
        "external_interfaces": {{
            "user_interfaces": "Descripción de la interacción UI esperada",
            "software_interfaces": "Dependencias, APIs o librerías utilizadas",
            "communication_interfaces": "Protocolos (HTTP, WebSockets, etc.)"
        }},
        "requirements": {{
            "functional": [
                {{ "id": "REQ-001", "name": "Nombre corto", "statement": "Descripción del requerimiento funcional" }}
            ],
            "non_functional": [
                {{ "id": "REQ-QOS-001", "type": "Rendimiento/Seguridad/Disponibilidad", "statement": "Métrica o restricción" }}
            ]
        }},
        "data_model": {{
            "entities": ["Estructura de datos 1", "Estructura de datos 2"],
            "logic_description": "Explicación del flujo de datos principal"
        }},
        "system_attributes": {{
            "reliability": "Nivel de confianza esperado",
            "maintainability": "Facilidad de cambios según el código",
            "portability": "Entornos compatibles"
        }}
    }}
    
    Todo el contenido debe estar en ESPAÑOL y ser técnicamente riguroso.
    """
    
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": "Eres un experto en IEEE 830 y devuelves solo JSON."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"}
    )
    
    spec_json = json.loads(chat_completion.choices[0].message.content)
    return spec_json

def save_specification(spec_data, author_id, sector_id, urgency='Media'):
    """Guarda la especificación en Supabase con su embedding y manejo de versiones."""
    
    text_for_embedding = (
        f"{spec_data['title']} "
        f"{spec_data['introduction']['purpose']} "
        f"{spec_data['introduction']['scope']}"
    )
    
    try:
        embedding = get_embedding(text_for_embedding)
    except Exception as e:
        print(f"[WARN] Embedding no disponible, se guardara sin vector: {e}")
        embedding = None

    # Lógica de Versionado
    current_version = "1.0"
    existing = supabase.table("specifications")\
        .select("version")\
        .eq("title", spec_data['title'])\
        .eq("sector_id", sector_id)\
        .order("version", desc=True)\
        .limit(1).execute()
    
    if existing.data:
        try:
            last_v = float(existing.data[0]['version'])
            current_version = str(round(last_v + 0.1, 1))
        except:
            current_version = "1.1"

    data = {
        "title": spec_data['title'],
        "content": spec_data,
        "author_id": author_id,
        "sector_id": sector_id,
        "urgency": urgency,
        "status": "Borrador",
        "version": current_version,
        "embedding": embedding
    }
    
    result = supabase.table("specifications").insert(data).execute()
    
    # Registrar creación en el historial
    if result.data:
        try:
            history_data = {
                "spec_id": result.data[0]['id'],
                "status": "Borrador",
                "user_id": author_id,
                "comment": "Especificación generada inicialmente."
            }
            supabase.table("spec_history").insert(history_data).execute()
        except Exception as e:
            print(f"[WARN] No se pudo crear historial inicial: {e}")
            
    return result.data

def update_specification_status(spec_id, status, user_id, comment=None):
    """Actualiza el estado de una spec y registra el evento en el historial."""
    try:
        # 1. Actualizar tabla principal
        update_data = {"status": status}
        if status == "Aprobada":
            update_data["approver_id"] = user_id
            
        supabase.table("specifications").update(update_data).eq("id", spec_id).execute()
        
        # 2. Insertar en historial
        history_data = {
            "spec_id": spec_id,
            "status": status,
            "user_id": user_id,
            "comment": comment
        }
        supabase.table("spec_history").insert(history_data).execute()
        
        return {"status": "success"}
    except Exception as e:
        print(f"[ERROR] update_specification_status: {e}")
        return {"status": "error", "error": str(e)}

def get_specification_history(spec_id):
    """Obtiene el historial de cambios de una especificación con nombres de usuario."""
    try:
        result = supabase.table("spec_history")\
            .select("*, usuarios(full_name)")\
            .eq("spec_id", spec_id)\
            .order("created_at", desc=True)\
            .execute()
        return result.data
    except Exception as e:
        print(f"[ERROR] get_specification_history: {e}")
        return []

def validate_user(email, password):
    """Valida las credenciales de un usuario contra la tabla usuarios usando hashing."""
    try:
        result = supabase.table("usuarios")\
            .select("id, full_name, email, role, password")\
            .eq("email", email)\
            .execute()
        
        if result.data and len(result.data) > 0:
            user = result.data[0]
            # Verificamos el hash almacenado contra la password proporcionada
            if check_password_hash(user['password'], password):
                # Limpiamos datos sensibles antes de devolver al frontend
                del user['password']
                # Mapeamos role a role_name para compatibilidad si es necesario
                user['role_name'] = user['role']
                return user
        return None
    except Exception as e:
        print(f"[ERROR] Error en validate_user: {e}")
        return None

def create_user(user_data):
    """Crea un nuevo usuario en la base de datos con contraseña hasheada."""
    try:
        # Hasheamos la contraseña antes de guardar
        hashed_password = generate_password_hash(user_data['password'], method='scrypt')
        
        data = {
            "full_name": user_data['full_name'],
            "email": user_data['email'],
            "password": hashed_password,
            "role": user_data['role'],
            "sector": user_data.get('sector')
        }
        
        result = supabase.table("usuarios").insert(data).execute()
        return {"status": "success", "data": result.data[0]}
    except Exception as e:
        print(f"[ERROR] Error en create_user: {e}")
        return {"status": "error", "error": str(e)}

def search_specifications(query_text, threshold=0.4, max_results=5):
    """Busca specs semánticamente similares a la consulta de texto."""
    
    # Para búsquedas usar input_type="search_query" (no "search_document")
    response = cohere_client.embed(
        texts=[query_text],
        model="embed-multilingual-v3.0",
        input_type="search_query",
        embedding_types=["float"]
    )
    query_embedding = response.embeddings.float[0]
    print(f"[OK] Embedding de consulta generado ({len(query_embedding)} dims).")
    
    result = supabase.rpc("match_specifications", {
        "query_embedding": query_embedding,
        "match_threshold": threshold,
        "match_count": max_results
    }).execute()
    
    return result.data

def get_glossary(categoria=None):
    """Obtiene términos activos del glosario, opcionalmente filtrados por categoría."""
    try:
        query = supabase.table("glosario").select("*").eq("activo", True)
        if categoria:
            query = query.eq("categoria", categoria)
        # Ordenamos por término alfabéticamente
        query = query.order("termino")
        result = query.execute()
        return result.data
    except Exception as e:
        print(f"[ERROR] Error al obtener glosario: {e}")
        return []

def propose_glossary_term(term, context=""):
    """Usa IA para proponer una definición para un término desconocido."""
    prompt = f"""
    Actúa como un Arquitecto de Software y Analista de Negocio experto.
    El usuario necesita una definición formal para el término '{term}' en el contexto de: {context}.
    Proporciona la definición basándote ÚNICAMENTE en fuentes representativas de la industria tecnológica (ej. estándares IEEE, ISO, W3C, manuales oficiales). EVITA terminantemente fuentes enciclopédicas como Wikipedia o descripciones genéricas.
    Incluye un ejemplo, la categoría, la fuente y asigna un nivel de confianza ('estandar' si es ampliamente aceptado en la industria, 'parcial' si depende del contexto o 'usuario' si es muy específico).
    
    Responde ÚNICAMENTE en JSON con esta estructura:
    {{
        "termino": "{term}",
        "definicion": "Definición detallada, formal y técnica",
        "categoria": "negocio" o "tecnico" o "acronimo" o "sistema",
        "ejemplo": "Un ejemplo práctico de uso",
        "fuente": "Nombre de la fuente formal (ej. IEEE830, W3C, Documentación Oficial)",
        "confianza": "estandar" o "parcial"
    }}
    
    Todo debe estar en ESPAÑOL.
    """
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Devuelves solo JSON en español."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"[ERROR] Error en propose_glossary_term: {e}")
        return {"error": str(e)}

def save_glossary_term(term_data):
    """Guarda o actualiza un término en Supabase."""
    try:
        # Asegurar que se usen campos permitidos
        data = {
            "termino": term_data.get("termino"),
            "categoria": term_data.get("categoria", "negocio"),
            "definicion": term_data.get("definicion"),
            "ejemplo": term_data.get("ejemplo"),
            "fuente": term_data.get("fuente"),
            "confianza": term_data.get("confianza", "usuario"),
            "autor": term_data.get("autor", "sistema")
        }
        term_id = term_data.get("id")
        if term_id:
            result = supabase.table("glosario").update(data).eq("id", term_id).execute()
        else:
            result = supabase.table("glosario").insert(data).execute()
        return {"status": "success", "data": result.data[0] if result.data else None}
    except Exception as e:
        print(f"[ERROR] Error al guardar término en glosario: {e}")
        return {"status": "error", "error": str(e)}

def delete_glossary_term(term_id):
    """Realiza un soft delete (desactiva) de un término del glosario en Supabase."""
    try:
        result = supabase.table("glosario").update({"activo": False}).eq("id", term_id).execute()
        return {"status": "success", "data": result.data}
    except Exception as e:
        print(f"[ERROR] Error al eliminar término: {e}")
        return {"status": "error", "error": str(e)}

def analyze_vibe_logic(text):
    """
    Analiza una idea en lenguaje natural (Vibe Coding) para extraer:
    1. Objetivo refinado
    2. Criticidad sugerida
    3. ROI estimado
    4. Términos técnicos detectados del glosario o nuevos
    """
    # Obtener glosario para contexto de detección
    glossary = get_glossary()
    glossary_list = "\n".join([f"- {t['termino']}: {t['definicion']}" for t in glossary]) if glossary else "Glosario vacío."

    prompt = f"""
    Actúa como un Arquitecto de Soluciones y Analista de Triage Senior de GT Data Consulting.
    Tu misión es realizar un análisis semántico profundo ("Vibe Coding Analysis") de la siguiente idea de requerimiento:
    
    TEXTO DEL REQUERIMIENTO:
    "{text}"
    
    CONTEXTO DEL GLOSARIO CORPORATIVO ACTUAL:
    {glossary_list}
    
    INSTRUCCIONES DE PROCESAMIENTO:
    1. OBJETIVO: Redacta un objetivo técnico formal, específico y medible en español.
    2. CRITICIDAD: Clasifica en [Baja, Media, Alta, Crítica] justificando internamente por impacto en el negocio.
    3. ROI: Estima el retorno de inversión (ej. ahorro de tiempo, reducción de errores, impacto financiero).
    4. TÉRMINOS TÉCNICOS (CRÍTICO): 
       - Identifica palabras clave que ya estén en el GLOSARIO.
       - Detecta conceptos técnicos complejos, acrónimos o entidades de datos que NO estén en el glosario pero sean esenciales.
       - Para CADA término detectado, proporciona una definición técnica rigurosa y asígnale una capa:
         * 'GOBIERNO': Políticas, normas, cumplimiento.
         * 'TECNICO': Arquitectura, código, infraestructura, datos.
         * 'OBTENIDO': Datos de fuentes externas o terceros.

    REGLA DE ORO: Si no encuentras términos, ESFUÉRZATE en identificar al menos conceptos base de la arquitectura mencionada (ej. "API", "Base de Datos", "Frontend", etc.).

    RESPONDE ÚNICAMENTE EN JSON CON ESTA ESTRUCTURA:
    {{
        "goal": "Objetivo formal...",
        "criticality": "Alta",
        "roi": "Ahorro proyectado de...",
        "terms": [
            {{ 
                "term": "Nombre del Término", 
                "layer": "TECNICO", 
                "definition": "Definición técnica precisa",
                "origin": "IA_SUGGESTION"
            }}
        ]
    }}
    """
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Eres un experto en gobierno de datos y arquitectura. Solo respondes JSON en español."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        result = json.loads(chat_completion.choices[0].message.content)
        
        # Validación mínima de estructura
        if "terms" not in result: result["terms"] = []
        if "goal" not in result: result["goal"] = "Objetivo no determinado"
        
        return result
    except Exception as e:
        print(f"[ERROR] analyze_vibe_logic: {e}")
        return {
            "goal": "Error en el análisis",
            "criticality": "Media",
            "roi": "N/A",
            "terms": [],
            "error": str(e)
        }

if __name__ == "__main__":
    sample_code = """
    function login(user, pass) {
        if (user === 'admin' && pass === '1234') {
            return { token: 'abc-123', role: 'admin' };
        }
        throw new Error('Unauthorized');
    }
    """
    spec = convert_code_to_spec(sample_code)
    print(json.dumps(spec, indent=2, ensure_ascii=False))

