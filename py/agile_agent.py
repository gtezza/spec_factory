import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

# Inicializar cliente de Groq
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_agile_backlog(sdd_title, sdd_markdown):
    """
    Agente Agile Kanban: Convierte una especificación técnica en una épica y user stories.
    """
    
    prompt = f"""
    Actúa como un Consultor Agile Coach y Product Owner Senior de GT Data Consulting.
    Tu misión es tomar la siguiente Especificación de Requerimientos de Software (SRS / SDD) y traducirla a una estructura ágil lista para el backlog de un tablero Kanban.
    
    TÍTULO DE LA ESPECIFICACIÓN:
    {sdd_title}
    
    CONTENIDO DE LA ESPECIFICACIÓN:
    {sdd_markdown}
    
    INSTRUCCIONES CRÍTICAS:
    1. LA ÉPICA: Debe sintetizar el proyecto, definiendo el "Theme" de negocio, objetivos, criterios de éxito e impacto.
    2. HISTORIAS DE USUARIO (USER STORIES):
       - Genera entre 4 y 7 User Stories concretas y granulares que cubran los requerimientos de la SDD.
       - Sigue estrictamente la plantilla formal: "Como [Rol de Usuario/Sistema], quiero [Acción/Funcionalidad], para [Beneficio/Valor de Negocio]".
       - Cada historia debe contar con al menos 2 Criterios de Aceptación claros en formato Gherkin (Given-When-Then / Dado-Cuando-Entonces).
       - Estima puntos de historia (Story Points) usando la escala de Fibonacci (1, 2, 3, 5, 8).
    3. TODO el contenido debe estar en ESPAÑOL, ser técnicamente preciso y directamente aplicable al caso de uso de la especificación técnica dada.
    
    RESPONDE ÚNICAMENTE EN FORMATO JSON con la siguiente estructura:
    {{
        "epic": {{
            "title": "Nombre descriptivo de la Épica (Ej: Implementación de Módulo X)",
            "description": "Descripción formal de la épica que justifique el valor comercial y el alcance general."
        }},
        "user_stories": [
            {{
                "title": "Título corto y conciso de la User Story",
                "description": "Como..., quiero..., para...",
                "acceptance_criteria": [
                    "Dado [contexto inicial], Cuando [el usuario realiza una acción], Entonces [resultado esperado]",
                    "Dado [otro contexto], Cuando [acción], Entonces [resultado]"
                ],
                "story_points": 3
            }}
        ]
    }}
    """
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Eres un Agile Coach y Product Owner experto. Solo respondes en formato JSON en español."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        
        backlog_json = json.loads(chat_completion.choices[0].message.content)
        
        # Generar versión Markdown para descarga o render
        backlog_json["markdown"] = convert_backlog_to_markdown(backlog_json)
        return backlog_json
        
    except Exception as e:
        print(f"[ERROR] generate_agile_backlog: {e}")
        return {
            "error": str(e),
            "epic": {
                "title": "Fallo en la generación",
                "description": "Ocurrió un error al procesar el backlog Agile."
            },
            "user_stories": []
        }

def convert_backlog_to_markdown(backlog_json):
    """Convierte el JSON del backlog en un archivo Markdown formal."""
    epic = backlog_json.get("epic", {})
    stories = backlog_json.get("user_stories", [])
    
    md = f"# Épica: {epic.get('title', 'N/A')}\n\n"
    md += f"## Descripción General\n{epic.get('description', 'N/A')}\n\n"
    md += "## Backlog de Historias de Usuario (Backlog Kanban)\n\n"
    
    for idx, story in enumerate(stories, 1):
        md += f"### US-{idx:03d}: {story.get('title', 'Historia de Usuario')}\n"
        md += f"- **Descripción:** {story.get('description', 'N/A')}\n"
        md += f"- **Story Points:** {story.get('story_points', 'N/A')}\n"
        md += f"- **Criterios de Aceptación (Gherkin):**\n"
        for ac in story.get("acceptance_criteria", []):
            md += f"  - {ac}\n"
        md += "\n"
        
    return md
