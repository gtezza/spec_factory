-- Insertar Roles básicos
INSERT INTO roles (name, permissions) VALUES
('admin', '{"all": true}'),
('author', '{"create": true, "edit_own": true}'),
('approver', '{"approve": true, "view_all": true}'),
('viewer', '{"view_approved": true}')
ON CONFLICT (name) DO NOTHING;

-- Insertar Sectores iniciales
INSERT INTO sectors (name) VALUES
('Arquitectura'),
('Frontend'),
('Backend'),
('Seguridad'),
('QA'),
('DevOps')
ON CONFLICT (name) DO NOTHING;
