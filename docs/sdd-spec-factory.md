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
    - `content`: JSONB (Contenido estructurado IEEE 830).
    - `markdown`: TEXT (Representación final).
    - `sector_id`: FK -> sectors.
    - `author_id`: FK -> profiles.
    - `approver_id`: FK -> profiles.
    - `urgency`: ENUM (Baja, Media, Alta, Crítica).
    - `criticality`: ENUM (Baja, Media, Alta, Crítica).
    - `status`: ENUM (Borrador, En Revisión, Aprobada).
    - `embedding`: VECTOR(1536) (Para búsqueda semántica).

## Capa 4: Comportamiento (BDD)
### Escenario: Creación de Spec desde Código
- **Dado** que un desarrollador tiene un bloque de código funcional.
- **Cuando** solicita la conversión a especificación IEEE 830.
- **Entonces** el sistema debe generar un borrador completando las secciones 1, 2 y 3 del template.

## Capa 5: Flujo de Datos
1.  **Ingesta**: El código se envía al motor de inferencia **Groq (Free Tier)** para una conversión veloz y gratuita.
2.  **Procesamiento**: La IA extrae lógica, entradas y salidas mapeándolas al template IEEE 830.
3.  **Vectorización**: Se utiliza **Gemini Embeddings (Free Tier)** para convertir el texto en un vector.
4.  **Almacenamiento**: Se guarda en Supabase (`spec_ctrl`) con metadatos y el embedding generado.
5.  **Consumo**: Búsqueda semántica a través de consultas vectoriales en el dashboard.
