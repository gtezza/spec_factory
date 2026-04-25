import os
import json
import cohere
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
    
    prompt = f"""
    Actúa como un Analista de Sistemas Senior experto en la norma IEEE 830.
    Convierte el siguiente bloque de código en una especificación funcional (SRS) profesional y detallada.
    
    CÓDIGO:
    {code_content}
    
    RESPONDE ÚNICAMENTE EN FORMATO JSON con la siguiente estructura extendida:
    {{
        "title": "Título descriptivo del módulo",
        "introduction": {{
            "purpose": "Propósito detallado",
            "scope": "Alcance específico del código proporcionado",
            "definitions": ["Término 1: Definición", "Término 2: Definición"]
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
    return result.data

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
