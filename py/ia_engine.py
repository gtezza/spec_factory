import os
import json
import cohere
from groq import Groq
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargamos variables de entorno desde la ruta estandarizada
load_dotenv(dotenv_path='env/.env')

class IAEngine:
    """
    Motor Central de IA para Spec Factory.
    Maneja la conexion con LLMs (Groq), Embeddings (Cohere) y Vectores (Supabase).
    """
    
    def __init__(self):
        # Clientes de IA
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.cohere_client = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))
        
        # Cliente de Base de Datos (Supabase)
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
        self.supabase: Client = create_client(self.url, self.key)
        
        print("[IA Engine] Conexiones inicializadas correctamente.")

    def get_embedding(self, text):
        """Genera un vector de 1024 dimensiones para busqueda semantica."""
        try:
            response = self.cohere_client.embed(
                texts=[text],
                model="embed-multilingual-v3.0",
                input_type="search_document",
                embedding_types=["float"]
            )
            return response.embeddings.float[0]
        except Exception as e:
            print(f"[Error Embedding] {e}")
            return None

    def convert_code_to_spec(self, code_content, glossary_terms=None):
        """Transforma codigo fuente a formato IEEE 830 usando Llama 3.3."""
        
        glossary_text = ""
        if glossary_terms:
            glossary_text = "\n".join([f"- {t['termino']}: {t['definicion']}" for t in glossary_terms])
        else:
            glossary_text = "No hay glosario disponible."

        prompt = f"""
        Actua como un Analista de Sistemas Senior experto en IEEE 830.
        Convierte el siguiente codigo en una Especificacion de Requerimientos de Software (SRS) profesional.
        
        GLOSARIO:
        {glossary_text}

        CODIGO:
        {code_content}
        
        Responde exclusivamente en JSON con la estructura:
        {{
            "title": "...",
            "introduction": {{ "purpose": "...", "scope": "...", "definitions": [] }},
            "product_overview": {{ "perspective": "...", "functions": [], "constraints": [] }},
            "requirements": {{ "functional": [], "non_functional": [] }},
            "data_model": {{ "entities": [], "logic": "..." }}
        }}
        """
        
        try:
            completion = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "Experto en IEEE 830. Solo respondes JSON en español."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"[Error Conversion] {e}")
            return None

    def semantic_search(self, query_text, threshold=0.4, limit=5):
        """Busca especificaciones similares usando vectores en Supabase."""
        try:
            # Generar embedding de la consulta
            response = self.cohere_client.embed(
                texts=[query_text],
                model="embed-multilingual-v3.0",
                input_type="search_query",
                embedding_types=["float"]
            )
            query_vector = response.embeddings.float[0]
            
            # Llamada RPC a Postgres (pgvector)
            result = self.supabase.rpc("match_specifications", {
                "query_embedding": query_vector,
                "match_threshold": threshold,
                "match_count": limit
            }).execute()
            
            return result.data
        except Exception as e:
            print(f"[Error Search] {e}")
            return []

    def propose_term(self, term, context=""):
        """Usa IA para proponer una definicion formal de un termino tecnico."""
        prompt = f"Define el termino '{term}' en el contexto de '{context}' usando estándares IEEE. Responde en JSON (termino, definicion, categoria, ejemplo, fuente)."
        
        try:
            completion = self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"[Error Term] {e}")
            return None

# Instancia global para ser usada en los nuevos modulos
ia_engine = IAEngine()
