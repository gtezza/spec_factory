# Plan de Implementación: Sistema Jira con Búsqueda Semántica Vectorial

Este proyecto tiene como objetivo construir una herramienta de gestión de proyectos de alto rendimiento, similar a Jira, con una integración profunda de IA para la búsqueda semántica en la documentación técnica.

## Evaluación de Requerimientos

### 1. Base de Datos y Vectores (Supabase)
*   **Supabase** será el pilar central, utilizando PostgreSQL para los datos estructurados.
*   Se habilitará la extensión `pgvector` para el almacenamiento de embeddings.
*   La búsqueda semántica permitirá encontrar soluciones a problemas técnicos o configuraciones simplemente describiendo la necesidad, sin depender de palabras clave exactas.

### 2. Procesamiento de Documentación e IA
*   **Generador de Embeddings**: Utilizaremos un modelo local (ej. `all-MiniLM-L6-v2` vía Python) o un proveedor gratuito para evitar costos de OpenAI.
*   **Motor de Inferencia**: Integración con **Groq** para tareas de chat, resúmenes y asistencia inteligente.
*   **Pipeline de Ingesta**: Scripts en Python (`py/`) que indexarán tanto la **documentación formal** como los **comentarios y detalles de las tareas**.

### 3. Frontend y Estética (Reglas Globales)
*   **Aesthetics**: Diseño premium con degradados suaves, micro-animaciones y modo oscuro.
*   **Compatibilidad**: Soporte total para Chrome, Firefox, Brave y Edge.
*   **Responsividad**: Adaptable a Desktop y Tablet.

---

## Estructura de Módulos Sugerida

Para una escalabilidad óptima, el proyecto se dividirá en los siguientes módulos:

1.  **Módulo de Administración (Admin & Auth)**:
    *   Gestión de usuarios, organizaciones y permisos granulares.
    *   Configuración de seguridad y perfiles.

2.  **Módulo de Gestión de Trabajo (Core Issue Tracker)**:
    *   CRUD de tareas, bugs, historias y épicas.
    *   Soporte para jerarquías y dependencias entre tareas.

3.  **Módulo de Visualización Ágil (Agile Boards)**:
    *   Tableros Kanban y Scrum configurables.
    *   Gestión de Sprints y Backlogs.

4.  **Módulo de Especificaciones Técnicas (IEEE 830 SRS)**:
    *   Editor especializado para Especificaciones de Requisitos de Software (SRS) siguiendo el estándar IEEE 830.
    *   Visualización web estructurada y profesional.
    *   Exportación a formato estándar (PDF) para impresión y archivo.

5.  **Módulo de Búsqueda Semántica Vectorial (AI Search)**:
    *   Indexación automática de documentos, tareas y comentarios.
    *   Interfaz de búsqueda que entiende el contexto técnico del proyecto.

6.  **Módulo de Dashboards y Reportes Automáticos**:
    *   Gráficos dinámicos (Burndown, Velocidad).
    *   Generación automática de reportes al finalizar cada Sprint.
    *   Exportación multiformato.

7.  **Módulo de Notificaciones y Comunicación**:
    *   Alertas en tiempo real y sistema de comentarios enriquecido.

---

## Propuesta de Estructura de Directorios

```text
c:/Proyectos/Temp/
├── css/          # Estilos CSS premium y variables de diseño
├── docs/         # Documentación técnica y evaluación (este plan)
├── env/          # Configuración de variables (API Keys, DB URL)
├── img/          # Imágenes de la interfaz y diagramas
├── js/           # Lógica Frontend (Vanilla JS)
└── py/           # Scripts de procesamiento de IA y backend
```

## Preguntas Abiertas para el Usuario

> [!NOTE]
> 1. Para los embeddings (vectores), utilizaremos una librería de Python local para mantener el proyecto gratuito y privado, complementando a Groq para la lógica de IA. ¿Estás de acuerdo?
> 2. ¿La indexación de tareas y comentarios debe incluir también los archivos adjuntos (archivos de texto/código) vinculados a dichas tareas?
> 3. ¿La generación automática de reportes debe enviar una notificación push o correo electrónico al administrador del equipo?

## Plan de Verificación

*   **Pruebas de Vectores**: Verificar que la similitud de coseno en Supabase devuelva resultados relevantes.
*   **Cross-Browser**: Validación en los 4 navegadores especificados.
*   **Layout**: Comprobación del diseño responsive en resolución de tablet.
