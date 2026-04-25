# Software Design Document (SDD) - Spec Factory

**Proyecto**: Spec Factory - Sistema de Automatización de Especificaciones IEEE 830
**Autor**: Gerardo Tezza
**Rol**: Creador / Aprobador
**Sector**: Operaciones
**Versión**: 1.1
**Control de Cambios**: Implementación de módulo de seguridad, autenticación real y control de acceso por roles (admin, creador, aprovador, visor).
**Objetivo**: Garantizar la seguridad de la información almacenada, impidiendo accesos malintencionados mediante un sistema robusto de autenticación y control de acceso por roles.

---

## Modelo de Arquitectura de 5 Capas

### 1. Capa de Presentación (UI/UX)
- **Tecnologías**: HTML5, Vanilla CSS (Glassmorphism), JavaScript ES6.
- **Control de Acceso**: Interfaz bloqueada mediante modal de login obligatorio. No se permite la visualización de datos sin autenticación previa.
- **Gestión de Sesión**: Las sesiones se almacenan en `sessionStorage`, garantizando que la información se elimine al cerrar la pestaña.
- **Interrupción de Cierre**: Implementación de advertencia en el evento `beforeunload` para forzar el cierre de sesión formal.

### 2. Capa de Lógica y Servicios (Backend)
- **Servidor**: Python Flask (Puerto 5005).
- **Controlador de Autenticación**: Endpoint `/api/login` para validación de credenciales.
- **Middleware de Seguridad**: Validación de token en cada petición para impedir el acceso directo por URL a los datos de la API.

### 3. Capa de Datos (Persistencia)
- **Base de Datos**: Supabase (PostgreSQL).
- **Gestión de Roles**:
    - `admin`: Acceso total al sistema y gestión de usuarios.
    - `creador`: Capacidad de generar y editar especificaciones.
    - `aprovador`: Capacidad de validar y aprobar documentos.
    - `visor`: Acceso de solo lectura a las especificaciones aprobadas.
- **Seguridad**: Row Level Security (RLS) activo para filtrar datos según el rol del usuario.

### 4. Capa de Inteligencia Artificial (IA)
- **Generación**: Integración con Groq Cloud (Llama-3.3-70b).
- **Vectores**: Embeddings de Cohere para búsqueda semántica de requerimientos históricos.

### 5. Capa de Seguridad y Resiliencia
- **Autenticación**: Usuario de prueba `admin/admin` pre-cargado.
- **Protección de Sesión**: Cierre automático y destrucción de tokens al finalizar la interacción.
- **Mensajería**: Notificaciones elegantes pero estrictas para el cumplimiento del flujo de cierre de sesión.

---

## Control de Cambios y Versiones
- **v1.0**: Estructura básica y generación de specs.
- **v1.1**: Implementación de Seguridad, Roles y Gestión de Sesiones (Actual).

## Registro de Tareas de Seguridad
- [ ] Implementar `beforeunload` con mensaje de seguridad en `app.js`.
- [ ] Crear endpoint `/api/login` en `api.py`.
- [ ] Configurar tabla de roles y perfiles en Supabase (`SQL/06_security_init.sql`).
- [ ] Bloquear acceso a vistas de Dashboard si no hay sesión activa.
