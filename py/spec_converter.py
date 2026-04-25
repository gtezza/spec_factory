import os
import json
from groq import Groq
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

# Configuración de Clientes
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def get_embedding(text):
    """Genera un vector de embedding usando Gemini."""
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

def convert_code_to_spec(code_content, project_name="Nuevo Proyecto"):
    """Convierte código fuente en una especificación IEEE 830 usando Groq."""
    
    prompt = f"""
    Actúa como un Analista de Sistemas Senior experto en la norma IEEE 830.
    Convierte el siguiente bloque de código en una especificación funcional (SRS).
    
    CÓDIGO:
    {code_content}
    
    RESPONDE ÚNICAMENTE EN FORMATO JSON con la siguiente estructura:
    {{
        "title": "Título de la especificación",
        "introduction": {{
            "purpose": "Propósito del documento",
            "scope": "Alcance del producto"
        }},
        "product_overview": {{
            "perspective": "Perspectiva del producto",
            "functions": ["Función 1", "Función 2"],
            "constraints": ["Restricción 1"]
        }},
        "requirements": {{
            "functional": [
                {{ "id": "REQ-001", "statement": "El sistema debe..." }}
            ],
            "non_functional": [
                {{ "id": "REQ-QOS-001", "statement": "Latencia menor a..." }}
            ]
        }}
    }}
    
    Todo el contenido debe estar en ESPAÑOL.
    """
    
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": "Eres un experto en IEEE 830 y devuelves solo JSON."},
            {"role": "user", "content": prompt}
        ],
        model="llama3-70b-8192",
        response_format={"type": "json_object"}
    )
    
    spec_json = json.loads(chat_completion.choices[0].message.content)
    return spec_json

def save_specification(spec_data, author_id, sector_id, urgency='Media'):
    """Guarda la especificación en Supabase con su embedding."""
    
    # Combinar texto para el embedding (Título + Introducción)
    text_for_embedding = f"{spec_data['title']} {spec_data['introduction']['purpose']} {spec_data['introduction']['scope']}"
    embedding = get_embedding(text_for_embedding)
    
    data = {
        "title": spec_data['title'],
        "content": spec_data,
        "author_id": author_id,
        "sector_id": sector_id,
        "urgency": urgency,
        "embedding": embedding,
        "status": 'Borrador'
    }
    
    result = supabase.table("specifications").insert(data).execute()
    return result.data

if __name__ == "__main__":
    # Ejemplo de uso
    sample_code = """
    function login(user, pass) {
        if (user === 'admin' && pass === '1234') {
            return { token: 'abc-123', role: 'admin' };
        }
        throw new Error('Unauthorized');
    }
    """
    # spec = convert_code_to_spec(sample_code)
    # print(json.dumps(spec, indent=2, ensure_ascii=False))
