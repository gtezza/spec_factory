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

def json_to_markdown_srs(spec_json):
    """Convierte el JSON estructurado de la SRS IEEE 830 + IA Agéntica en un archivo Markdown formal."""
    title = spec_json.get("title", "Especificación de Requerimientos de Software (SRS)")
    
    md = f"""# {title}
## Adaptación IEEE 830 + Arquitectura de IA Agéntica

### 1. Introducción
"""
    intro = spec_json.get("introduction", {})
    md += f"**1.1. Propósito**\n{intro.get('purpose', 'N/A')}\n\n"
    md += f"**1.2. Ámbito del Sistema**\n{intro.get('system_scope', 'N/A')}\n\n"
    md += f"**1.3. Definiciones, Acrónimos y Abreviaturas**\n"
    for df in intro.get("definitions", []):
        md += f"- {df}\n"
    if not intro.get("definitions"):
         md += "N/A\n"
    md += f"\n**1.4. Referencias**\n"
    for ref in intro.get("references", []):
        md += f"- {ref}\n"
    if not intro.get("references"):
         md += "N/A\n"
    md += f"\n**1.5. Visión General del Documento**\n{intro.get('document_overview', 'N/A')}\n\n"

    md += "### 2. Descripción General\n"
    desc = spec_json.get("general_description", {})
    md += f"**2.1. Perspectiva del Producto**\n{desc.get('product_perspective', 'N/A')}\n\n"
    md += f"**2.2. Funciones del Producto**\n"
    for func in desc.get("product_functions", []):
        md += f"- {func}\n"
    if not desc.get("product_functions"):
         md += "N/A\n"
    md += f"\n**2.3. Características de los Usuarios**\n"
    for u in desc.get("user_characteristics", []):
        md += f"- {u}\n"
    if not desc.get("user_characteristics"):
         md += "N/A\n"
    md += f"\n**2.4. Restricciones**\n"
    for c in desc.get("constraints", []):
        md += f"- {c}\n"
    if not desc.get("constraints"):
         md += "N/A\n"
    md += f"\n**2.5. Suposiciones y Dependencias**\n"
    for sd in desc.get("assumptions_dependencies", []):
        md += f"- {sd}\n"
    if not desc.get("assumptions_dependencies"):
         md += "N/A\n"
    md += f"\n**2.6. Requisitos Futuros**\n"
    for fr in desc.get("future_requirements", []):
        md += f"- {fr}\n"
    if not desc.get("future_requirements"):
         md += "N/A\n"

    md += "\n### 3. Requisitos Específicos\n"
    spec_req = spec_json.get("specific_requirements", {})
    
    ext_int = spec_req.get("external_interfaces", {})
    md += f"**3.1. Interfaces Externas**\n"
    md += f"- **3.1.1. Interfaces de Usuario**: {ext_int.get('user_interfaces', 'N/A')}\n"
    md += f"- **3.1.2. Interfaces de Hardware**: {ext_int.get('hardware_interfaces', 'N/A')}\n"
    md += f"- **3.1.3. Interfaces de Software**: {ext_int.get('software_interfaces', 'N/A')}\n"
    md += f"- **3.1.4. Interfaces de Comunicación**: {ext_int.get('communication_interfaces', 'N/A')}\n\n"

    agent_sys = spec_req.get("agent_system_functions", {})
    md += f"**3.2. Funciones de Agentes y Sistema (Mapeo a Épicas)**\n"
    md += f"**3.2.1. Definición de Agentes (Roles y Metas)**\n"
    for ag in agent_sys.get("agent_definitions", []):
        md += f"- {ag}\n"
    if not agent_sys.get("agent_definitions"):
         md += "N/A\n"
    md += f"\n**3.2.2. Matriz de Skills e Inventario de Herramientas**\n"
    for sk in agent_sys.get("skills_tools_matrix", []):
        md += f"- {sk}\n"
    if not agent_sys.get("skills_tools_matrix"):
         md += "N/A\n"
    md += f"\n**3.2.3. Lógica de Orquestación y Workflows Autónomos**\n{agent_sys.get('orchestration_logic', 'N/A')}\n\n"
    md += f"**3.2.4. Gestión de Memoria y Contexto**\n{agent_sys.get('memory_context_management', 'N/A')}\n\n"

    md += f"**3.3. Requisitos de Rendimiento**\n"
    for perf in spec_req.get("performance_requirements", []):
        md += f"- {perf}\n"
    if not spec_req.get("performance_requirements"):
         md += "N/A\n"

    md += f"\n**3.4. Restricciones de Diseño**\n"
    for d_const in spec_req.get("design_constraints", []):
        md += f"- {d_const}\n"
    if not spec_req.get("design_constraints"):
         md += "N/A\n"

    sys_attr = spec_req.get("system_attributes", {})
    md += f"\n**3.5. Atributos del Sistema**\n"
    md += f"- **3.5.1. Fiabilidad y Manejo de Alucinaciones**: {sys_attr.get('reliability_hallucinations', 'N/A')}\n"
    md += f"- **3.5.2. Disponibilidad**: {sys_attr.get('availability', 'N/A')}\n"
    md += f"- **3.5.3. Seguridad (RBAC y Auditoría de Acciones de IA)**: {sys_attr.get('security_rbac_audit', 'N/A')}\n"
    md += f"- **3.5.4. Mantenibilidad**: {sys_attr.get('maintainability', 'N/A')}\n\n"

    md += f"**3.6. Otros Requisitos**\n"
    for o_req in spec_req.get("other_requirements", []):
        md += f"- {o_req}\n"
    if not spec_req.get("other_requirements"):
         md += "N/A\n"

    md += "\n### 4. Apéndices\n"
    append = spec_json.get("appendices", {})
    md += f"**4.1. Diccionario de Datos (Smart Dictionary)**\n"
    for dd in append.get("data_dictionary", []):
        md += f"- {dd}\n"
    if not append.get("data_dictionary"):
         md += "N/A\n"
    md += f"\n**4.2. Matriz de Trazabilidad (Requisito vs. User Story)**\n"
    for tm in append.get("traceability_matrix", []):
        md += f"- {tm}\n"
    if not append.get("traceability_matrix"):
         md += "N/A\n"

    return md

def convert_triage_to_spec(triage_data, project_name="Nuevo Proyecto"):
    """Convierte una propuesta de triage enriquecida en una especificación formal IEEE 830 + Diseño de Solución Accionable."""
    
    # Obtener términos activos del glosario para dar contexto lingüístico
    active_terms = get_glossary()
    glossary_text = "\n".join([f"- {t['termino']}: {t['definicion']} (Categoría: {t['categoria']})" for t in active_terms]) if active_terms else "Ningún término disponible actualmente."

    prompt = f"""
    Actúa como un Arquitecto de Soluciones Senior, Analista Funcional y Consultor de Estrategia Digital de GT Data Consulting.
    Tu misión es redactar una Especificación formal de Requerimientos de Software (SRS) y Diseño de Solución basada EXACTAMENTE en la idea y necesidad proporcionada.
    DEBES evitar usar texto de relleno o descripciones genéricas de la norma IEEE 830. Todo el contenido generado debe aplicarse de manera concreta y directa al caso de uso descrito. 
    Dime CON CLARIDAD QUÉ HAY QUE HACER, paso a paso, funciones, estructuras de datos, etc.
    
    DATOS DEL TRIAGE DE ORIGEN (LA NECESIDAD DEL USUARIO):
    - Título/Proyecto: {project_name}
    - Idea Original del Usuario: {triage_data.get('idea', 'N/A')}
    - Objetivo SMART Refinado (si existe): {triage_data.get('objective', triage_data.get('goal', 'N/A'))}
    - Riesgos detectados: {triage_data.get('risks', 'N/A')}
    - Sugerencias previas: {triage_data.get('suggestions', 'N/A')}
    
    GLOSARIO CORPORATIVO DISPONIBLE:
    {glossary_text}
    
    INSTRUCCIONES CRÍTICAS:
    1. Enfócate 100% en la Idea Original. Si el usuario pide procesar un Excel de "Muestra Supertienda" por país y predecir stock crítico, ENTONCES tu documento debe hablar de procesar ese Excel, filtrar por país, algoritmos de predicción para 6 meses y cálculo de criticidad.
    2. Detalla QUÉ y CÓMO se va a construir. (Ej: Módulos necesarios, pipelines de datos, automatizaciones).
    3. Si el caso de uso se beneficia de automatización agéntica (IA), inclúyelo en la sección de agentes. Si no, usa herramientas de automatización de datos convencionales.
    4. NO expliques qué es una interfaz de hardware, directamente pon qué requiere la solución.
    
    RESPONDE ÚNICAMENTE EN FORMATO JSON con la estructura exacta detallada a continuación.
    
    {{
        "title": "Especificación de Software: [Insertar Título Atractivo y Realista]",
        "introduction": {{
            "purpose": "Propósito específico de la solución. Qué problema concreto del usuario resuelve.",
            "system_scope": "Alcance del sistema. Qué va a hacer y qué NO va a hacer.",
            "definitions": ["Términos clave relevantes para esta solución particular."],
            "references": ["Estándares o librerías técnicas que recomiendas usar para este proyecto (ej. Pandas, Scikit-learn, OpenAI, etc.)"],
            "document_overview": "Visión general de esta especificación."
        }},
        "general_description": {{
            "product_perspective": "Contexto de la solución: ¿Es un script, una web app, una canalización en la nube, un proceso batch?",
            "product_functions": ["Función principal 1 que se va a programar", "Función principal 2...", "Debe ser lo que el usuario pidió"],
            "user_characteristics": ["Usuarios que consumirán esta solución y sus habilidades"],
            "constraints": ["Limitaciones reales esperadas para este proyecto"],
            "assumptions_dependencies": ["Requisitos previos (ej. Formato del Excel, acceso a APIs)"],
            "future_requirements": ["Siguientes pasos sugeridos una vez completada esta fase"]
        }},
        "specific_requirements": {{
            "external_interfaces": {{
                "user_interfaces": "Detalle de las pantallas o reportes generados (ej. 'Reporte en Excel separado por hoja' o 'Dashboard').",
                "hardware_interfaces": "N/A o hardware específico requerido.",
                "software_interfaces": "Librerías de software, conectores a BD, APIs externas requeridas.",
                "communication_interfaces": "Mecanismos de integración o notificación (ej. Emails, SFTP, REST)."
            }},
            "agent_system_functions": {{
                "agent_definitions": ["Agentes IA o Scripts de automatización: Rol asignado y meta (Ej. 'Script de Extracción', 'Agente de Pronóstico')."],
                "skills_tools_matrix": ["Herramienta/Librería 1: Acción técnica que realizará (Ej. 'Pandas: Agrupación por país y suma')."],
                "orchestration_logic": "Paso a paso lógico de la ejecución. (Ej. 1. Leer Excel, 2. Agrupar, 3. Predecir, 4. Exportar).",
                "memory_context_management": "Dónde se guardarán los resultados temporales o modelos entrenados."
            }},
            "performance_requirements": ["Métricas de rendimiento esperadas (ej. procesar 100k filas en menos de 1 min)."],
            "design_constraints": ["Reglas de negocio o limitaciones tecnológicas."],
            "system_attributes": {{
                "reliability_hallucinations": "Mecanismos para garantizar la precisión de los datos o de la predicción.",
                "availability": "Esquema de disponibilidad requerido.",
                "security_rbac_audit": "Quién puede ejecutar esto y cómo se audita.",
                "maintainability": "Cómo mantener el código a futuro."
            }},
            "other_requirements": ["Otros detalles importantes."]
        }},
        "appendices": {{
            "data_dictionary": ["Estructura de datos clave esperada (Ej. 'País (str), Artículo (str), Cantidad Vendida (int), Proyección M+1 (int)')."],
            "traceability_matrix": ["Mapeo de las ideas del usuario a las funcionalidades técnicas."]
        }}
    }}
    
    Todo el contenido redactado debe estar completamente en ESPAÑOL, ser accionable, directo, y describir una solución técnica real al problema del usuario.
    """
    
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": "Eres un Arquitecto de Software Senior y experto Funcional. Eres práctico, directo, y evitas el relleno genérico. Solo devuelves JSON."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"}
    )
    
    spec_json = json.loads(chat_completion.choices[0].message.content)
    return spec_json

def save_specification(spec_data, author_id, sector_id, urgency='Media', status='Borrador', criticality='Media', approver_id=None):
    """Guarda la especificación en Supabase con su embedding, markdown y manejo de versiones."""
    
    intro = spec_data.get('introduction', {})
    scope_text = intro.get('scope') or intro.get('system_scope') or ""
    text_for_embedding = (
        f"{spec_data.get('title', '')} "
        f"{intro.get('purpose', '')} "
        f"{scope_text}"
    )
    
    try:
        embedding = get_embedding(text_for_embedding)
    except Exception as e:
        print(f"[WARN] Embedding no disponible, se guardara sin vector: {e}")
        embedding = None

    # Obtener prefijo del sector
    sector_prefix = "GEN"
    if sector_id:
        try:
            sector_res = supabase.table("sectors").select("name").eq("id", sector_id).execute()
            if sector_res.data:
                # Tomar las primeras 3 letras, en mayúsculas
                sector_name = sector_res.data[0]['name'].upper()
                sector_prefix = sector_name[:3] if len(sector_name) >= 3 else sector_name.ljust(3, 'X')
        except Exception as e:
            print(f"[WARN] No se pudo obtener el nombre del sector: {e}")

    # Lógica de Versionado (Major-Minor con prefijo)
    current_version = f"{sector_prefix}-1.0"
    existing = supabase.table("specifications")\
        .select("version")\
        .eq("title", spec_data.get('title'))\
        .eq("sector_id", sector_id)\
        .order("created_at", desc=True)\
        .limit(1).execute()
    
    if existing.data:
        last_version = str(existing.data[0]['version'])
        try:
            # Separar el prefijo del número si existe (ej. "FIN-1.0")
            if "-" in last_version:
                num_part = last_version.split("-")[-1]
            else:
                num_part = last_version
            
            parts = num_part.split('.')
            if len(parts) >= 2:
                major, minor = int(parts[0]), int(parts[1])
                minor += 1
                current_version = f"{sector_prefix}-{major}.{minor}"
            else:
                major = int(parts[0]) if parts[0].isdigit() else 1
                current_version = f"{sector_prefix}-{major}.1"
        except:
            current_version = f"{sector_prefix}-1.1"

    # Generar Markdown formal
    markdown_content = json_to_markdown_srs(spec_data)

    data = {
        "title": spec_data.get('title', 'Especificación de Requerimientos de Software'),
        "content": spec_data,
        "markdown": markdown_content,
        "author_id": author_id,
        "sector_id": sector_id,
        "urgency": urgency,
        "criticality": criticality,
        "status": status,
        "version": current_version,
        "embedding": embedding
    }
    
    if approver_id:
        data["approver_id"] = approver_id
    
    result = supabase.table("specifications").insert(data).execute()
    
    # Registrar creación en el historial
    if result.data:
        try:
            history_data = {
                "spec_id": result.data[0]['id'],
                "status": status,
                "user_id": author_id,
                "comment": f"Especificación generada en base a propuesta. Versión {current_version}."
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
    """Valida las credenciales de un usuario contra la tabla usuarios usando hashing o fallback local."""
    try:
        # Alias para el typo común del admin
        if email == "admin@spfactory.com":
            email = "admin@specfactory.com"
            
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
                
        # FALLBACK SI NO SE ENCONTRÓ EN DB O NO COINCIDE CONTRASEÑA, PERO ES EL ADMIN POR DEFECTO
        if email == "admin@specfactory.com" and password == "1234":
            print("[INFO] Inicio de sesión fallback para admin@specfactory.com")
            return {
                "id": "00000000-0000-0000-0000-000000000000",
                "full_name": "Administrador Local",
                "email": "admin@specfactory.com",
                "role": "administrador",
                "role_name": "administrador"
            }
            
        return None
    except Exception as e:
        print(f"[ERROR] Error en validate_user: {e}")
        # MODO FALLBACK LOCAL (OFFLINE):
        if email == "admin@specfactory.com" and password == "1234":
            print("[INFO] Inicio de sesión offline exitoso para admin@specfactory.com")
            return {
                "id": "00000000-0000-0000-0000-000000000000",
                "full_name": "Administrador Local (Modo Offline)",
                "email": "admin@specfactory.com",
                "role": "administrador",
                "role_name": "administrador"
            }
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
        print(f"[ERROR] Error al desactivar término: {e}")
        return {"status": "error", "error": str(e)}

def analyze_vibe_logic(text, answers=None):
    """
    Analiza una idea en lenguaje natural (Vibe Coding) para extraer:
    1. Objetivo refinado (IEEE 830 / SMART)
    2. Criticidad técnica justificada
    3. Análisis de Viabilidad y ROI
    4. Riesgos Técnicos y Mitigación
    5. Preguntas de Ingeniería profunda (Discovery)
    6. Sugerencias de Mejora y Arquitectura (Valor Agregado)
    
    Si se proporcionan 'answers', se realiza un refinamiento del análisis previo.
    """
    
    refinement_context = ""
    if answers and len(answers) > 0:
        refinement_context = "\nCONOCIMIENTO ADICIONAL OBTENIDO (Respuestas del usuario a preguntas previas):\n"
        for item in answers:
            refinement_context += f"- Pregunta: {item['question']}\n  Respuesta: {item['answer']}\n"
        
        refinement_context += "\nINSTRUCCIÓN ESPECIAL: El usuario ha respondido a preguntas de discovery. UTILIZA estas respuestas para eliminar ambigüedades, ajustar los riesgos, precisar el ROI y proponer una arquitectura mucho más específica y técnica. Si una respuesta descarta una funcionalidad, elimínala del análisis."

    prompt = f"""
    Actúa como un Arquitecto de Soluciones Senior y Consultor de Estrategia Digital de GT Data Consulting.
    Tu misión es realizar un análisis semántico exhaustivo, de alto nivel técnico y con visión de negocio del siguiente requerimiento:
    
    TEXTO DEL REQUERIMIENTO:
    "{text}"
    {refinement_context}
    
    INSTRUCCIONES DE PROCESAMIENTO (MÁXIMA PROFUNDIDAD TÉCNICA):
    1. OBJETIVO (SRS IEEE 830): Redacta un objetivo técnico formal siguiendo la metodología SMART y alineado con la sección 3.1 de la norma IEEE 830. Debe ser preciso, verificable y orientado a la implementación.
    2. CRITICIDAD Y GOBERNANZA: Clasifica en [Baja, Media, Alta, Crítica]. Justifica basándote en la Matriz de Riesgos Corporativa: Impacto en Seguridad, Privacidad de Datos (GDPR/Compliance), Continuidad Operativa y Complejidad Técnica.
    3. ANÁLISIS DE ROI Y VIABILIDAD: Realiza una proyección financiera y técnica. Estima el TCO (Total Cost of Ownership), ahorros operativos en FTE (Full Time Equivalent), reducción de latencia y escalabilidad a largo plazo.
    4. RIESGOS TÉCNICOS Y MITIGACIÓN: Identifica riesgos críticos como Deuda Técnica latente, Cuellos de Botella en infraestructura, Dependencias de terceros y vulnerabilidades OWASP aplicables. Propón una estrategia de mitigación profesional para cada uno.
    5. PREGUNTAS DE INGENIERÍA (DISCOVERY PROFUNDO): Genera 5-8 preguntas críticas que desafíen la viabilidad de la idea. Si ya hay respuestas, genera nuevas preguntas sobre los detalles técnicos revelados.
    6. SUGERENCIAS DE MEJORA Y ARQUITECTURA: Proporciona 5 sugerencias de "Arquitectura Premium" que eleven el valor de la idea original. Ejemplos: Implementación de Event-Sourcing, patrones de Circuit Breaker para resiliencia, IA Augmentation (RAG/Agentes), u optimizaciones de Backend-for-Frontend (BFF).
    
    REGLA DE ORO: Produce un análisis que un CTO o Arquitecto de Software consideraría valioso. La profundidad debe ser tal que sirva como base para un documento de diseño técnico (TDD).
    
    CRITICAL: Si el texto contiene el marcador "--- DETALLES REFINADOS (IA) ---", considera toda la información debajo de ese marcador como HECHOS VALIDADOS por el usuario. Úsalos para eliminar ambigüedades y NO vuelvas a preguntar sobre esos mismos puntos en la sección de discovery.
    
    RESPONDE ÚNICAMENTE EN JSON CON ESTA ESTRUCTURA:
    {{
        "goal": "Objetivo SMART/IEEE 830 detallado...",
        "criticality": "Clasificación con justificación técnica exhaustiva...",
        "roi": "Análisis de Viabilidad, TCO y ROI proyectado...",
        "risks": [{{ "risk": "Nombre del riesgo técnico", "mitigation": "Estrategia de mitigación detallada..." }}],
        "questions": ["Pregunta de Ingeniería Crítica 1", "...", "Pregunta de Ingeniería Crítica 8"],
        "suggestions": ["Sugerencia de Mejora Arquitectónica 1", "...", "Sugerencia de Valor Estratégico 5"],
        "is_refined": true/false (dependiendo de si se usaron respuestas)
    }}
    """
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Eres un Arquitecto de Soluciones experto en Triage Técnico de GT Data Consulting. Solo respondes JSON en español de alta calidad técnica y máxima profundidad."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        result = json.loads(chat_completion.choices[0].message.content)
        
        # Valores por defecto para evitar errores en el frontend
        if "goal" not in result: result["goal"] = "Objetivo no determinado"
        if "questions" not in result: result["questions"] = []
        if "suggestions" not in result: result["suggestions"] = []
        if "risks" not in result: result["risks"] = []
        if "criticality" not in result: result["criticality"] = "Media"
        if "roi" not in result: result["roi"] = "N/A"
        result["is_refined"] = True if answers else False
        
        return result
    except Exception as e:
        print(f"[ERROR] analyze_vibe_logic: {e}")
        return {
            "goal": "Error en el análisis técnico",
            "criticality": "No determinada",
            "roi": "Error",
            "questions": [],
            "suggestions": [],
            "risks": [],
            "is_refined": False,
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

