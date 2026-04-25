# Evaluación Técnica Actualizada: Proyecto Jira-Semantic (Groq + IEEE 830)

Este documento refleja los acuerdos alcanzados sobre la arquitectura del sistema, priorizando herramientas gratuitas/eficientes y el cumplimiento de estándares de ingeniería de software.

## 1. Infraestructura de Inteligencia Artificial (IA)

### Motor de Inferencia: Groq
*   Utilizaremos **Groq** como motor principal para el procesamiento de lenguaje natural (LLM). Groq ofrece una velocidad de inferencia superior, ideal para asistentes en tiempo real y resúmenes de tareas.
*   **Modelos**: Llama 3 o Mixtral (vía Groq Cloud API) para manejar la lógica de negocio y asistencia.

### Motor de Embeddings: Local/Free
*   Para evitar dependencia de OpenAI, implementaremos un motor de embeddings local en Python (`py/`) utilizando librerías como `Sentence-Transformers`.
*   Esto garantiza que el almacenamiento de vectores en **Supabase** sea totalmente gratuito y privado.

### Alcance de la Búsqueda Semántica
*   **Documentación Formal**: Manuales, guías y especificaciones.
*   **Tareas e Incidencias**: Se indexarán los títulos, descripciones y, fundamentalmente, los **comentarios** de las tareas para poder realizar consultas sobre el historial de resolución de problemas.

---

## 2. Especificaciones IEEE 830 (SRS)

El sistema incluirá un módulo dedicado para la creación de **Especificaciones de Requisitos de Software (SRS)** basado en el estándar IEEE 830.

### Características del Módulo:
1.  **Formato Web Dinámico**: Los requisitos se cargarán mediante una interfaz estructurada que garantiza que no falte ninguna sección obligatoria (Introducción, Descripción General, Requisitos Específicos, etc.).
2.  **Visualización Profesional**: Renderizado de las especificaciones con una estética limpia y legible directamente en el navegador.
3.  **Exportación Standard**: Generación de documentos listos para imprimir en formato PDF, cumpliendo con los estándares de documentación técnica.

---

## 3. Automatización de Reportes

*   Al finalizar cada **Sprint**, el sistema generará automáticamente un reporte de desempeño.
*   Incluirá métricas clave y será exportable de forma masiva para su revisión en reuniones de Stakeholders.

---

## 4. Desglose de Módulos (Revisado)

1.  **IAM (Identity & Access)**: Auth y perfiles.
2.  **Project Core**: Estructura de proyectos y workflows.
3.  **Issue Engine**: Gestión de tareas y comentarios (indexados para búsqueda).
4.  **SRS IEEE 830 Manager**: Creación, visualización y exportación de especificaciones de requisitos.
5.  **Agile Boards**: Tableros Kanban/Scrum interactivos.
6.  **Semantic Search (AI Engine)**: Integración de vectores de Supabase con Groq y embeddings locales.
7.  **Automated Reporting**: Dashboards y exportación automática de fin de Sprint.
8.  **Communication Hub**: Notificaciones y alertas.

---

## Estructura de Carpetas

*   `css/`: Estilos premium, incluyendo el formato de impresión para IEEE 830.
*   `docs/`: Evaluaciones (este archivo) y documentos PDF generados.
*   `env/`: Configuración para Groq y Supabase.
*   `js/`: Componentes del editor SRS y lógica de búsqueda.
*   `py/`: Servidor de embeddings local y generación de PDF.
