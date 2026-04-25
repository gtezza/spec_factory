# Especificación de Diseño de Software (SDD) - Spec Factory

**Proyecto:** sdd-spec-factory  
**Versión:** 1.3  
**Fecha:** 2026-04-25  
**Autor:** Gerardo Tezza (Creador)  
**Sector:** Operaciones  

## Control de Cambios y Versiones
| Fecha | Versión | Autor | Cambios |
| :--- | :--- | :--- | :--- |
| 2026-04-25 | 1.0 | Antigravity | Estructura inicial. |
| 2026-04-25 | 1.1 | Antigravity | Inclusión de hashing scrypt y tabla usuarios. |
| 2026-04-25 | 1.2 | Gerardo Tezza | Ampliación: 5 capas, roles Creador/Aprovador y sesiones efímeras. |
| 2026-04-25 | 1.3 | Antigravity | Corrección de marca: Restaurado a 'Vive Coding'. |

**Estado:** En Desarrollo (Ampliación de Seguridad)

---

## 1. Introducción y Objetivo
El objetivo de esta ampliación es dotar al sistema **Spec Factory** de un control de acceso y autenticación robusto, garantizando la integridad de la información y previniendo accesos malintencionados. Se busca que solo personal autorizado pueda visualizar, crear o aprobar especificaciones.

### Objetivos de Seguridad:
- Impedir el acceso directo por URL a áreas restringidas.
- Implementar sesiones efímeras (se destruyen al cerrar la pestaña o refrescar).
- Almacenamiento seguro de credenciales mediante algoritmos de hashing modernos.

## 2. Arquitectura de 5 Capas
El sistema se organiza bajo el siguiente modelo para garantizar escalabilidad y separación de responsabilidades:

1.  **Capa de Presentación (Frontend):** 
    - Desarrollada en HTML5, CSS3 (Vanilla) y JavaScript (ES6+).
    - Manejo de estados de sesión mediante `sessionStorage`.
    - Lógica de interceptación para forzar login en cada recarga.
    - Módulo **Vive Coding** para previsualización en tiempo real.

2.  **Capa de Control y Aplicación (API):**
    - Flask (Python) como orquestador de peticiones.
    - Endpoints protegidos para login, creación de usuarios y conversión.

3.  **Capa de Lógica de Negocio (Servicios):**
    - `spec_converter.py`: Procesa la conversión IEEE 830 y gestiona el hashing de seguridad.
    - Validación de roles para operaciones críticas.

4.  **Capa de Persistencia y Datos (Supabase):**
    - Base de datos relacional (PostgreSQL).
    - Almacenamiento de usuarios, roles, sectores y especificaciones.
    - Búsqueda vectorial para embeddings.

5.  **Capa de Infraestructura y Seguridad:**
    - Algoritmo de Hashing: **scrypt** (vía Werkzeug).
    - Políticas RLS en Supabase para control de acceso granular a nivel de fila.

## 3. Modelo de Control de Acceso (RBAC)
Se definen los siguientes perfiles:

| Rol | Descripción | Permisos |
| :--- | :--- | :--- |
| **Admin** | Administrador de plataforma | Gestión total de usuarios, sectores y logs. |
| **Creador** | Generador de contenido | Puede crear y editar sus propias especificaciones. |
| **Aprovador** | Validador técnico | Puede revisar y cambiar el estado de specs a "Aprobado". |
| **Visor** | Usuario de consulta | Solo lectura de especificaciones aprobadas. |

## 4. Gestión de Sesiones y Seguridad Crítica
- **Persistencia:** Las sesiones son **estrictamente efímeras**. No se utiliza `localStorage` para tokens de acceso.
- **Refresh/Cierre:** Al detectar una recarga de página (`F5`) o cierre natural, el sistema limpia el `sessionStorage`.
- **Cierre Elegante:** El sistema incluye un mensaje de advertencia si el usuario intenta cerrar la ventana sin usar el botón de "Cerrar Sesión", instando al cumplimiento de los protocolos de seguridad.

---
**Nota de Arquitectura:** Las contraseñas nunca se almacenan ni transmiten en texto plano. El backend utiliza salting automático mediante el método scrypt.

