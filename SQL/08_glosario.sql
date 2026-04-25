-- =====================================================
-- Spec Factory — Glosario Inteligente
-- Archivo: 08_glosario.sql
-- Versión: 1.0
-- Autor: Antigravity
-- Fecha: 2026-04-25
-- Descripción: Crea la tabla de glosario como fuente
--              de verdad central. El .md es un snapshot
--              generado a demanda, no la fuente.
-- =====================================================

-- 1. Tipo enumerado para categorías del glosario
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'glosario_categoria') THEN
        CREATE TYPE glosario_categoria AS ENUM (
            'negocio',    -- Términos del dominio del negocio
            'tecnico',    -- Términos técnicos de infraestructura/código
            'acronimo',   -- Siglas y abreviaturas
            'sistema'     -- Términos propios de Spec Factory
        );
    END IF;
END $$;

-- 2. Tipo enumerado para nivel de confianza de la definición
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_confianza') THEN
        CREATE TYPE nivel_confianza AS ENUM (
            'usuario',    -- Definición aportada por el usuario, sin validación externa
            'parcial',    -- Validada contra 1 fuente interna del proyecto
            'estandar'    -- Consenso en IEEE 830, industria o fuentes técnicas reconocidas
        );
    END IF;
END $$;

-- 3. Tabla principal del glosario
CREATE TABLE IF NOT EXISTS glosario (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    termino         TEXT NOT NULL,
    categoria       glosario_categoria NOT NULL,
    definicion      TEXT NOT NULL,
    ejemplo         TEXT,                                 -- Caso de uso concreto (opcional)
    fuente          TEXT,                                 -- 'IEEE830' | 'SDD' | 'usuario' | 'industria'
    confianza       nivel_confianza DEFAULT 'usuario',
    autor           TEXT DEFAULT 'sistema',
    version         TEXT DEFAULT '1.0',
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT glosario_termino_unico UNIQUE (termino)    -- Un término, una definición
);

-- 4. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION fn_glosario_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_glosario_updated_at
    BEFORE UPDATE ON glosario
    FOR EACH ROW EXECUTE FUNCTION fn_glosario_updated_at();

-- 5. Índice para búsqueda por término (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_glosario_termino
    ON glosario (LOWER(termino));

CREATE INDEX IF NOT EXISTS idx_glosario_categoria
    ON glosario (categoria);


-- =====================================================
-- DATOS SEMILLA — Términos iniciales del ecosistema
-- =====================================================

-- ► CATEGORÍA: NEGOCIO
INSERT INTO glosario (termino, categoria, definicion, ejemplo, fuente, confianza, autor) VALUES

('Especificación',
 'negocio',
 'Documento formal que describe de manera completa y verificable los requisitos que debe cumplir un sistema o funcionalidad. En Spec Factory es el artefacto central generado conforme al estándar IEEE 830.',
 'Spec-0042: Sistema de autenticación con roles para GT Data.',
 'IEEE830',
 'estandar',
 'sistema'),

('Requisito',
 'negocio',
 'Condición o capacidad que el sistema debe satisfacer para cumplir con un contrato, estándar u objetivo de negocio. Cada requisito es identificado con un REQ-ID único.',
 'REQ-SEC-001: El sistema no deberá almacenar contraseñas en texto plano.',
 'IEEE830',
 'estandar',
 'sistema'),

('Urgencia',
 'negocio',
 'Indicador de prioridad temporal de una especificación. Valores posibles: Baja, Media, Alta, Crítica. Determina el orden de atención en el backlog.',
 'Urgencia Crítica: falla en producción que afecta facturación.',
 'SDD',
 'parcial',
 'sistema'),

('Sector',
 'negocio',
 'Área funcional de la organización (ej. Operaciones, Tecnología, Finanzas) a la que pertenece un usuario o una especificación. Permite segmentar vistas y filtros en el dashboard.',
 'Sector Operaciones genera specs de procesos internos.',
 'SDD',
 'parcial',
 'sistema'),

('Aprobación',
 'negocio',
 'Acto formal por el cual un usuario con rol Aprovador valida que una especificación cumple los criterios de calidad y puede pasar de estado "En Revisión" a "Aprobada".',
 'El Aprovador revisa el SRS y cambia el estado a Aprobada.',
 'SDD',
 'parcial',
 'sistema'),

('Stakeholder',
 'negocio',
 'Persona o grupo con interés directo o indirecto en el sistema especificado. Pueden ser usuarios finales, sponsors del proyecto, equipos de operaciones o reguladores.',
 'El área de Compliance es un stakeholder clave en specs de seguridad.',
 'IEEE830',
 'estandar',
 'sistema'),

('Caso de Uso',
 'negocio',
 'Descripción de la interacción entre un actor (usuario o sistema externo) y el sistema para lograr un objetivo concreto. Sirve de insumo para redactar requisitos funcionales.',
 'UC-01: El usuario ingresa credenciales y accede al dashboard.',
 'IEEE830',
 'estandar',
 'sistema'),

('Criterio de Aceptación',
 'negocio',
 'Condición verificable y medible que debe cumplirse para considerar que un requisito está correctamente implementado. Es la base de las pruebas de aceptación.',
 'El login debe fallar si la contraseña tiene menos de 8 caracteres.',
 'IEEE830',
 'estandar',
 'sistema'),

('Impacto Arquitectónico',
 'negocio',
 'Escala del 1 al 5 que indica cuánto afecta un requisito al esquema de base de datos, las integraciones o la infraestructura general del sistema. Metadata de trazabilidad de Spec Factory.',
 'Impacto 5: cambio en el modelo de roles afecta todas las tablas.',
 'SDD',
 'parcial',
 'sistema'),

('Nivel de Riesgo',
 'negocio',
 'Evaluación técnica de posibles cuellos de botella, fallos de integración o amenazas de seguridad asociadas a un requisito. Complementa el Impacto Arquitectónico.',
 'Riesgo Alto: latencia en Edge Functions puede afectar el SLA.',
 'SDD',
 'parcial',
 'sistema'),

('Borrador',
 'negocio',
 'Estado inicial de una especificación recién generada. No ha sido revisada ni aprobada. Solo el Creador y el Admin pueden editarla en este estado.',
 NULL,
 'SDD',
 'parcial',
 'sistema'),

('Trazabilidad',
 'negocio',
 'Capacidad de rastrear la relación entre requisitos, casos de uso, pruebas y versiones. En Spec Factory se implementa mediante el REQ-ID y el historial de versiones.',
 'REQ-FUNC-001 → UC-01 → TEST-001.',
 'IEEE830',
 'estandar',
 'sistema')

ON CONFLICT (termino) DO NOTHING;


-- ► CATEGORÍA: TÉCNICO
INSERT INTO glosario (termino, categoria, definicion, ejemplo, fuente, confianza, autor) VALUES

('scrypt',
 'tecnico',
 'Algoritmo de derivación de claves (KDF) diseñado para ser resistente a ataques por hardware. Spec Factory lo usa para almacenar contraseñas con salting automático vía Werkzeug.',
 'generate_password_hash(password, method="scrypt")',
 'industria',
 'estandar',
 'sistema'),

('sessionStorage',
 'tecnico',
 'API del navegador que almacena datos de sesión en memoria, que se eliminan al cerrar la pestaña o el navegador. Spec Factory la usa para implementar sesiones efímeras.',
 'sessionStorage.setItem("user", JSON.stringify(userData))',
 'industria',
 'estandar',
 'sistema'),

('RLS',
 'tecnico',
 'Row Level Security. Mecanismo de Supabase/PostgreSQL que restringe el acceso a filas de una tabla según el rol o identidad del usuario que realiza la consulta.',
 'Solo el autor puede ver sus especificaciones en estado Borrador.',
 'industria',
 'estandar',
 'sistema'),

('Embedding',
 'tecnico',
 'Representación vectorial numérica de un texto generada por un modelo de lenguaje. Spec Factory almacena embeddings de las specs para permitir búsqueda semántica.',
 'El embedding de un SRS se genera con Cohere y se guarda como vector(768).',
 'industria',
 'estandar',
 'sistema'),

('Endpoint',
 'tecnico',
 'URL específica de una API REST que acepta solicitudes HTTP y devuelve una respuesta. Spec Factory expone endpoints bajo /api/ mediante Flask.',
 'POST /api/login — valida credenciales y retorna el perfil del usuario.',
 'industria',
 'estandar',
 'sistema'),

('RBAC',
 'tecnico',
 'Role-Based Access Control. Modelo de control de acceso donde los permisos se asignan a roles y los usuarios heredan los permisos del rol asignado.',
 'El rol Visor solo tiene permiso de lectura sobre specs Aprobadas.',
 'industria',
 'estandar',
 'sistema'),

('Glassmorphism',
 'tecnico',
 'Tendencia de diseño UI que usa fondos semitransparentes con desenfoque (blur) para simular vidrio esmerilado. Spec Factory lo aplica en tarjetas, modales y sidebar.',
 'Clase .glass: backdrop-filter: blur(12px); background: rgba(30,41,59,0.7)',
 'industria',
 'parcial',
 'sistema'),

('Flask',
 'tecnico',
 'Microframework web de Python utilizado como capa de API en Spec Factory. Expone los endpoints REST que consume el frontend.',
 'python py/api.py — inicia el servidor en el puerto 5005.',
 'industria',
 'estandar',
 'sistema')

ON CONFLICT (termino) DO NOTHING;


-- ► CATEGORÍA: ACRÓNIMOS
INSERT INTO glosario (termino, categoria, definicion, fuente, confianza, autor) VALUES

('SRS',
 'acronimo',
 'Software Requirements Specification (Especificación de Requisitos de Software). Documento estándar IEEE 830 que describe los requisitos funcionales y no funcionales de un sistema.',
 'IEEE830',
 'estandar',
 'sistema'),

('SDD',
 'acronimo',
 'Software Design Document (Documento de Diseño de Software). Describe la arquitectura, capas y decisiones de diseño del sistema. En Spec Factory es el archivo sdd-spec-factory.md.',
 'IEEE830',
 'estandar',
 'sistema'),

('API',
 'acronimo',
 'Application Programming Interface. Conjunto de reglas y protocolos que permite la comunicación entre sistemas de software. Spec Factory usa una API REST con Flask.',
 'industria',
 'estandar',
 'sistema'),

('UI',
 'acronimo',
 'User Interface (Interfaz de Usuario). Parte visual de la aplicación con la que interactúa el usuario. En Spec Factory es el dashboard desarrollado en HTML/CSS/JS.',
 'industria',
 'estandar',
 'sistema'),

('UX',
 'acronimo',
 'User Experience (Experiencia de Usuario). Disciplina que estudia cómo los usuarios interactúan con un sistema y cómo mejorar esa experiencia.',
 'industria',
 'estandar',
 'sistema'),

('REQ-ID',
 'acronimo',
 'Identificador único de un requisito en el formato REQ-[AREA]-[NNN]. Permite trazabilidad entre requisitos, pruebas y versiones.',
 'IEEE830',
 'estandar',
 'sistema'),

('KDF',
 'acronimo',
 'Key Derivation Function (Función de Derivación de Claves). Algoritmo que transforma una contraseña en un hash seguro. Spec Factory usa scrypt como KDF.',
 'industria',
 'estandar',
 'sistema'),

('RBAC',
 'acronimo',
 'Role-Based Access Control. Ver término técnico RBAC.',
 'industria',
 'estandar',
 'sistema'),

('RLS',
 'acronimo',
 'Row Level Security. Ver término técnico RLS.',
 'industria',
 'estandar',
 'sistema'),

('GT Data',
 'acronimo',
 'GT Data Consulting. Organización propietaria y usuaria principal del sistema Spec Factory.',
 'SDD',
 'parcial',
 'sistema')

ON CONFLICT (termino) DO NOTHING;


-- ► CATEGORÍA: DEL SISTEMA (propios de Spec Factory)
INSERT INTO glosario (termino, categoria, definicion, ejemplo, fuente, confianza, autor) VALUES

('Spec Factory',
 'sistema',
 'Sistema de automatización de especificaciones técnicas bajo el estándar IEEE 830, desarrollado para GT Data Consulting. Convierte descripciones informales (Live Coding) en documentos SRS formales.',
 NULL,
 'SDD',
 'parcial',
 'sistema'),

('Live Coding',
 'sistema',
 'Módulo del dashboard de Spec Factory donde el usuario ingresa código o descripción informal (el "vibe" del problema) y el sistema genera un borrador de SRS. Nombre propio del proyecto.',
 'El usuario pega un fragmento de código en el editor y presiona "Convertir a Spec".',
 'SDD',
 'parcial',
 'sistema'),

('Admin',
 'sistema',
 'Rol del sistema con acceso total: gestión de usuarios, sectores, glosario, logs y configuración. Solo el Admin puede crear, editar y desactivar usuarios.',
 NULL,
 'SDD',
 'parcial',
 'sistema'),

('Creador',
 'sistema',
 'Rol del sistema que puede generar nuevas especificaciones y editar las propias en estado Borrador o En Revisión. No puede aprobar specs.',
 NULL,
 'SDD',
 'parcial',
 'sistema'),

('Aprovador',
 'sistema',
 'Rol del sistema con capacidad de cambiar el estado de una especificación a Aprobada. Es el validador técnico del flujo de trabajo.',
 NULL,
 'SDD',
 'parcial',
 'sistema'),

('Visor',
 'sistema',
 'Rol del sistema con acceso de solo lectura a las especificaciones en estado Aprobada. No puede crear, editar ni aprobar.',
 NULL,
 'SDD',
 'parcial',
 'sistema'),

('Spec',
 'sistema',
 'Abreviación coloquial de "Especificación" dentro del ecosistema Spec Factory. Referencia a un documento SRS generado por el sistema.',
 'Esta spec ya fue aprobada por el Aprovador.',
 'SDD',
 'usuario',
 'sistema'),

('Glosario Inteligente',
 'sistema',
 'Componente de Spec Factory que centraliza las definiciones de términos de negocio, técnicos y del sistema. Es la fuente de verdad para la sección 1.3 de todos los SRS generados. Se mantiene en Supabase y los agentes lo consultan y enriquecen automáticamente.',
 NULL,
 'SDD',
 'parcial',
 'sistema')

ON CONFLICT (termino) DO NOTHING;


-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecutar para confirmar que los datos fueron insertados:
-- SELECT categoria, COUNT(*) FROM glosario GROUP BY categoria ORDER BY categoria;
-- SELECT termino, categoria, confianza FROM glosario ORDER BY categoria, termino;
