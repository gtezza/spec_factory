# Documento de Diseño de Software (SDD): Spec Factory

Este documento define la arquitectura y las especificaciones técnicas para el proyecto **Spec Factory**, una plataforma diseñada para automatizar la creación de especificaciones funcionales IEEE 830 con capacidades de IA y búsqueda semántica.

## Capa 1: Requisitos Funcionales (SRS)
Basado en la norma **IEEE 830**, el sistema debe permitir:
- **Conversión de Live Coding**: Tomar código fuente y generar una descripción funcional estructurada.
- **Gestión de Versiones**: Cada especificación tendrá un número de identificación y versión.
- **Roles y Permisos**: Acceso granular para Autores, Aprobadores y Consultores.
- **Clasificación**: Por sector, urgencia y criticidad.

## Capa 2: Contratos de Interfaz (API)
La comunicación se realizará a través de la API REST y Realtime de Supabase.
- `GET /specifications`: Listado de especificaciones con filtros.
- `POST /rpc/match_specifications`: Búsqueda semántica por vectores.
- `POST /rpc/convert_code_to_spec`: Integración con Edge Functions/IA.

## Capa 3: Estructura de Datos (Data Spec)
Base de datos: Supabase (`spec_ctrl`).

### Tablas Principales:
- `roles`: `id`, `name` (Admin, Author, Approver, Viewer).
- `sectors`: `id`, `name`.
- `profiles`: `id`, `full_name`, `role_id`, `sector_id`.
- `specifications`:
    - `id`: UUID (Primary Key).
    - `serial_number`: Identificador secuencial para humanos.
    - `version`: VARCHAR.
    - `title`: TEXT.
    - `content`: JSONB (Contenido exhaustivo IEEE 830).
    - `markdown`: TEXT (Representación final).
    - `sector_id`: FK -> sectors.
    - `author_id`: FK -> profiles.
    - `urgency`: ENUM (Baja, Media, Alta, Crítica).
    - `status`: ENUM (Borrador, En Revisión, Aprobada).
    - `embedding`: VECTOR(1024) (Cohere embed-multilingual-v3.0).

## Capa 4: Comportamiento (BDD)
### Escenario: Creación de Spec desde Código
- **Dado** que un desarrollador tiene un bloque de código funcional.
- **Cuando** solicita la conversión a especificación IEEE 830.
- **Entonces** el sistema debe generar un borrador completando las secciones 1, 2 y 3 del template.

## Capa 5: Flujo de Datos
1.  **Ingesta**: El código se envía a **Groq (Llama 3.3 70B)** para una conversión estructurada.
2.  **Procesamiento**: La IA mapea la lógica a secciones exhaustivas de la norma IEEE 830.
3.  **Vectorización**: Se utiliza **Cohere (embed-multilingual-v3.0)** para vectores de 1024 dimensiones.
4.  **Almacenamiento**: Se guarda en Supabase usando `service_role` para evitar bloqueos de seguridad.
5.  **Consumo**: Búsqueda semántica mediante comparaciones vectoriales en el dashboard.

## Capa 6: Infraestructura y Despliegue
- **Backend**: Microservicio en Python/Flask (puerto 5005).
- **Frontend**: SPA con HTML5, CSS3 (Glassmorphism) y JS Vanilla (puerto 8000).
- **Base de Datos**: Supabase (PostgreSQL + pgvector).
- **IA**:
    - Generación: Groq Cloud (Llama-3.3-70b-versatile).
    - Embeddings: Cohere API (embed-multilingual-v3.0).
- **Exportación**: `html2pdf.js` y `PptxGenJS`.

## Capa 7: Verificación y Validación
- [x] **Prueba de Pipeline**: Código -> Groq -> Cohere -> Supabase.
- [x] **Prueba de Búsqueda**: Query -> Vector Search -> Dashboard.
- [x] **Prueba de Exportación**: Generación de PDF sin estilos oscuros (Clean Style).
- [x] **Seguridad**: Bypass de RLS en backend mediante `service_role`.

## Checklist de Tareas Faltantes
- [x] **Estabilización de Pipeline**: Conectar todos los componentes.
- [x] **Búsqueda Semántica**: Implementar RPC y búsqueda en el frontend.
- [x] **Export Manager**: Corregir exportación PDF/PPTX.
- [ ] **Gestión de Versiones**: Implementar lógica para crear versiones (v1.1, v1.2) de una misma spec.
- [ ] **Filtros Avanzados**: Filtrar dashboard por sector y urgencia de forma dinámica.
- [ ] **Autenticación UI**: Pantalla de login integrada con perfiles de Supabase.
- [ ] **Mantenimiento**: Scripts de limpieza de vectores antiguos.
