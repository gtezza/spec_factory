(function() {
    // Configuración de Supabase
    const SUPABASE_URL = APP_CONFIG.SUPABASE.URL;
    const SUPABASE_KEY = APP_CONFIG.SUPABASE.ANON_KEY;

    // Usamos window.supabase.createClient pero guardamos el resultado en una variable distinta
    const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabaseClient = sbClient; // Para que ExportManager lo use

    // Navegación
    const navItems = document.querySelectorAll('.nav-item');
    const btnNewSpec = document.getElementById('btn-new-spec');
    const views = {
        'dashboard-view': document.getElementById('dashboard-view'),
        'create-view': document.getElementById('create-view'),
        'settings-view': document.getElementById('settings-view'),
    };

    let currentUser = null; // Guardará el objeto de perfil del usuario logueado

    function switchView(viewId) {
        console.log('Cambiando a vista:', viewId);
        
        // Ocultar todas las vistas
        Object.values(views).forEach(v => {
            if (v) v.style.display = 'none';
        });

        // Mostrar la vista objetivo
        const target = document.getElementById(viewId);
        if (target) {
            target.style.display = viewId === 'create-view' ? 'grid' : 'block';
        }

        // Actualizar estado activo en la sidebar
        navItems.forEach(item => {
            const linkTarget = item.id === 'nav-create' ? 'create-view' : 'dashboard-view';
            if (linkTarget === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Listeners de Navegación
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            let viewId = 'dashboard-view';
            if (item.id === 'nav-create') viewId = 'create-view';
            if (item.id === 'nav-settings') {
                viewId = 'settings-view';
                if (window.loadGlossary) window.loadGlossary();
            }
            
            switchView(viewId);
        });
    });

    btnNewSpec?.addEventListener('click', () => {
        switchView('create-view');
    });

    // Búsqueda Semántica
    const searchInput = document.getElementById('semantic-search');
    searchInput?.addEventListener('keypress', async (e) => {
        if (e.key !== 'Enter') return;
        const query = searchInput.value.trim();
        if (!query) return;

        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = `<p style="opacity:0.6"><i class="ri-loader-4-line ri-spin"></i> Buscando "${query}"...</p>`;

        try {
            const res = await fetch(`${APP_CONFIG.SERVER.ENDPOINT}/api/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, threshold: 0.35, maxResults: 6 })
            });
            const data = await res.json();

            if (data.status === 'success' && data.results.length > 0) {
                resultsContainer.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h3 style="margin:0"><i class="ri-search-line"></i> ${data.count} resultado(s) para "${query}"</h3>
                        <button onclick="document.getElementById('search-results').style.display='none';" 
                            style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;">✕</button>
                    </div>
                    <table class="data-table">
                        <thead><tr><th>Título</th><th>Urgencia</th><th>Versión</th><th>Similitud</th></tr></thead>
                        <tbody>
                            ${data.results.map(r => `
                                <tr>
                                    <td>${r.title}</td>
                                    <td><span class="badge">${r.urgency || 'Media'}</span></td>
                                    <td>v${r.version || '1.0'}</td>
                                    <td><strong>${Math.round(r.similarity * 100)}%</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`;
            } else {
                resultsContainer.innerHTML = `
                    <p style="opacity:0.6; text-align:center; padding:20px;">
                        <i class="ri-search-line" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                        Sin resultados para "<strong>${query}</strong>". Intentá con otros términos.
                        <button onclick="document.getElementById('search-results').style.display='none';" 
                            style="display:block;margin:12px auto 0;background:none;border:1px solid var(--border);color:var(--text-muted);padding:6px 14px;border-radius:6px;cursor:pointer;">
                            Cerrar
                        </button>
                    </p>`;
            }
        } catch (err) {
            resultsContainer.innerHTML = `<p style="color:var(--accent-red)">Error en la búsqueda: ${err.message}</p>`;
        }
    });

    // === SISTEMA DE SEGURIDAD Y AUTH ===
    const modalLogin = document.getElementById('modal-login');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const userInfoArea = document.getElementById('user-info');
    const headerUserName = document.getElementById('header-user-name');
    const headerUserRole = document.getElementById('header-user-role');

    function updateAuthUI(user) {
        if (user) {
            currentUser = user;
            modalLogin.style.display = 'none';
            userInfoArea.style.display = 'block';
            headerUserName.innerText = user.full_name;
            headerUserRole.innerText = user.role_name;

            // Control de Roles en UI
            if (user.role_name === 'visor') {
                btnNewSpec.style.display = 'none';
                document.getElementById('nav-create').style.display = 'none';
            } else {
                btnNewSpec.style.display = 'flex';
                document.getElementById('nav-create').style.display = 'flex';
            }
        } else {
            currentUser = null;
            modalLogin.style.display = 'flex';
            userInfoArea.style.display = 'none';
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btnSubmit = document.getElementById('btn-login-submit');

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Validando...';
        loginError.style.display = 'none';

        try {
            const response = await fetch(`${APP_CONFIG.SERVER.ENDPOINT}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.status === 'success') {
                sessionStorage.setItem('sf_session', JSON.stringify(data.user));
                updateAuthUI(data.user);
                loadDashboardStats();
                loadRecentSpecs();
            } else {
                loginError.style.display = 'block';
                loginError.innerText = data.error || 'Credenciales inválidas';
            }
        } catch (err) {
            loginError.style.display = 'block';
            loginError.innerText = 'Error de conexión con el servidor';
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Entrar <i class="ri-login-box-line"></i>';
        }
    }

    function handleLogout() {
        if (confirm('¿Está seguro que desea cerrar la sesión de seguridad?')) {
            sessionStorage.removeItem('sf_session');
            window.location.reload();
        }
    }

    const btnSettingsLogout = document.getElementById('btn-settings-logout');
    if (btnSettingsLogout) {
        btnSettingsLogout.addEventListener('click', handleLogout);
    }

    function checkSession() {
        // SEGURIDAD: Si es una recarga (F5), forzamos login
        if (performance.navigation.type === 1) {
            console.log('Recarga detectada - Cerrando sesión por seguridad');
            sessionStorage.removeItem('sf_session');
            updateAuthUI(null);
            return;
        }

        const session = sessionStorage.getItem('sf_session');
        if (session) {
            const user = JSON.parse(session);
            updateAuthUI(user);
        } else {
            updateAuthUI(null);
        }
    }

    loginForm?.addEventListener('submit', handleLogin);

    // Aviso de cierre estricto (Solicitado por Gerardo Tezza)
    window.addEventListener('beforeunload', (e) => {
        if (currentUser) {
            const msg = "PROTOCOLO DE SEGURIDAD: Por favor, utilice el botón 'Salir' oficial para garantizar la integridad de su información. El cierre directo vulnera los estándares de Spec Factory.";
            e.preventDefault();
            e.returnValue = msg;
            return msg;
        }
    });

    // El modal de login ahora solo se cierra con el botón de Acceder
    // para evitar que se cierre accidentalmente mientras escribes

    // Conversión de Código
    const btnConvert = document.getElementById('btn-convert');
    const codeInput = document.getElementById('code-input');
    const specPreview = document.getElementById('spec-preview');
    const previewActions = document.getElementById('preview-actions');

    btnConvert?.addEventListener('click', async () => {
        const code = codeInput.value;
        if (!code) return alert('Por favor, ingresa algún código.');

        btnConvert.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Procesando con IA...';
        btnConvert.disabled = true;

        try {
            const response = await fetch(`${APP_CONFIG.SERVER.ENDPOINT}/api/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code: code,
                    projectName: "Spec Generada",
                    urgency: 'Media',
                    authorId: currentUser?.id || null
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                const spec = result.spec;
                let html = `
                    <div class="generated-spec">
                        <h2>${spec.title}</h2>
                        <p><strong>Propósito:</strong> ${spec.introduction.purpose}</p>
                        <h3>Funciones del Producto</h3>
                        <ul>
                            ${spec.product_overview.functions.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                        <h3>Requisitos Funcionales</h3>
                        <ul>
                            ${spec.requirements.functional.map(r => `<li><strong>${r.id}:</strong> ${r.statement}</li>`).join('')}
                        </ul>
                    </div>
                `;
                specPreview.innerHTML = html;
                previewActions.style.display = 'flex';
                alert('¡Especificación generada!');
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al conectar con el servidor de IA: ' + error.message);
        } finally {
            btnConvert.innerHTML = '<i class="ri-magic-line"></i> Convertir a Spec';
            btnConvert.disabled = false;
        }
    });

    // Eventos de ExportManager
    document.getElementById('btn-download-pdf')?.addEventListener('click', () => {
        ExportManager.handleExport('pdf');
    });

    document.getElementById('btn-share-spec')?.addEventListener('click', () => {
        ExportManager.openModal();
    });

    // Carga de Sectores para Filtros
    async function loadSectors() {
        const sectorSelect = document.getElementById('filter-sector');
        if (!sectorSelect || !sbClient) return;

        try {
            const { data, error } = await sbClient.from('sectors').select('id, name').order('name');
            if (error) throw error;

            data.forEach(sector => {
                const opt = document.createElement('option');
                opt.value = sector.id;
                opt.textContent = sector.name;
                sectorSelect.appendChild(opt);

                // También cargar en el formulario de creación de usuarios
                const formSector = document.getElementById('new-user-sector-form');
                if (formSector) {
                    const optForm = opt.cloneNode(true);
                    formSector.appendChild(optForm);
                }
            });
        } catch (e) {
            console.warn('Error cargando sectores:', e);
        }
    }

    // GESTIÓN DE USUARIOS
    async function loadUsersList() {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody || !sbClient) return;

        try {
            const { data, error } = await sbClient
                .from('usuarios')
                .select('id, full_name, email, role, sector')
                .order('full_name');
            
            if (error) throw error;

            tableBody.innerHTML = data.map(u => `
                <tr>
                    <td>
                        <div style="font-weight:500;">${u.full_name}</div>
                        <div style="font-size:11px; opacity:0.6;">${u.email}</div>
                    </td>
                    <td><span class="badge">${u.role}</span></td>
                    <td>${u.sector || '-'}</td>
                    <td>
                        <button class="btn-icon" title="Eliminar" onclick="alert('Funcionalidad restringida por SDD')"><i class="ri-delete-bin-line"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            console.error('Error cargando usuarios:', e);
        }
    }

    const createUserForm = document.getElementById('create-user-form');
    createUserForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSave = document.getElementById('btn-save-user');
        
        const userData = {
            full_name: document.getElementById('new-user-name').value,
            email: document.getElementById('new-user-email').value,
            password: document.getElementById('new-user-pass').value,
            role: document.getElementById('new-user-role').value,
            sector: document.getElementById('new-user-sector-form').value
        };

        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Guardando...';

        try {
            const response = await fetch(`${APP_CONFIG.SERVER.ENDPOINT}/api/users/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            if (result.status === 'success') {
                alert('Usuario creado correctamente');
                createUserForm.reset();
                loadUsersList();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            alert('Error de conexión al crear usuario');
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="ri-save-line"></i> Guardar Usuario';
        }
    });

    window.glossaryTermsData = [];

    // === GESTIÓN DE GLOSARIO INTELIGENTE ===
    window.loadGlossary = async function() {
        const tableBody = document.getElementById('glossary-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;opacity:0.6;"><i class="ri-loader-4-line ri-spin"></i> Cargando glosario...</td></tr>';
        
        const filterCat = document.getElementById('glossary-filter-category')?.value || '';
        let url = `${APP_CONFIG.SERVER.ENDPOINT}/api/glossary`;
        if (filterCat) url += `?categoria=${filterCat}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.status === 'success') {
                window.glossaryTermsData = data.data;
                if (data.data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;opacity:0.6;">No hay términos en el glosario.</td></tr>';
                    return;
                }
                
                tableBody.innerHTML = data.data.map(t => `
                    <tr>
                        <td style="font-weight:600;">${t.termino}</td>
                        <td><span class="badge">${t.categoria}</span></td>
                        <td>
                            <div style="font-size:13px;">${t.definicion}</div>
                            ${t.ejemplo ? `<div style="font-size:11px; opacity:0.6; margin-top:4px;"><i>Ej: ${t.ejemplo}</i></div>` : ''}
                        </td>
                        <td><span style="font-size:11px; opacity:0.8;">${t.confianza}</span></td>
                        <td>
                            <button class="btn-icon" title="Editar" onclick="window.editGlossaryTerm('${t.id}')"><i class="ri-edit-line"></i></button>
                            <button class="btn-icon" title="Eliminar" onclick="window.deleteGlossaryTerm('${t.id}')"><i class="ri-delete-bin-line"></i></button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" style="color:var(--accent-red);text-align:center;">Error: ${data.error}</td></tr>`;
            }
        } catch (e) {
            console.error('Error cargando glosario:', e);
            tableBody.innerHTML = '<tr><td colspan="5" style="color:var(--accent-red);text-align:center;">Error de conexión.</td></tr>';
        }
    };

    window.editGlossaryTerm = function(id) {
        const term = window.glossaryTermsData.find(t => t.id == id);
        if (!term) return;
        document.getElementById('term-id').value = term.id;
        document.getElementById('term-name').value = term.termino;
        document.getElementById('term-category').value = term.categoria;
        document.getElementById('term-definition').value = term.definicion;
        document.getElementById('term-fuente').value = term.fuente || '';
        document.getElementById('modal-term-title').innerText = 'Editar Término';
        document.getElementById('modal-term').style.display = 'flex';
    };

    window.deleteGlossaryTerm = async function(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este término del glosario?')) return;
        try {
            const res = await fetch(`${APP_CONFIG.SERVER.ENDPOINT}/api/glossary/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.status === 'success') {
                window.loadGlossary();
            } else {
                alert('Error al eliminar: ' + data.error);
            }
        } catch (e) {
            alert('Error de conexión');
        }
    };

    document.getElementById('glossary-filter-category')?.addEventListener('change', window.loadGlossary);

    const modalTerm = document.getElementById('modal-term');
    const termForm = document.getElementById('term-form');
    
    document.getElementById('btn-new-term')?.addEventListener('click', () => {
        if(termForm) termForm.reset();
        document.getElementById('term-id').value = '';
        document.getElementById('modal-term-title').innerText = 'Nuevo Término';
        if(modalTerm) modalTerm.style.display = 'flex';
    });

    document.getElementById('close-term-modal')?.addEventListener('click', () => {
        if(modalTerm) modalTerm.style.display = 'none';
    });

    termForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('term-id').value;
        const termino = document.getElementById('term-name').value;
        const categoria = document.getElementById('term-category').value;
        const definicion = document.getElementById('term-definition').value;
        const fuente = document.getElementById('term-fuente').value;

        const payload = { termino, categoria, definicion, fuente };
        if (id) payload.id = id;

        const btn = termForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Guardando...';

        try {
            const res = await fetch(`${APP_CONFIG.SERVER.ENDPOINT}/api/glossary`, {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === 'success') {
                modalTerm.style.display = 'none';
                window.loadGlossary();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Error de conexión');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-save-line"></i> Guardar Término';
        }
    });

    document.getElementById('btn-export-glossary')?.addEventListener('click', async () => {
        try {
            const res = await fetch(\`\${APP_CONFIG.SERVER.ENDPOINT}/api/glossary/export/md\`);
            const data = await res.json();
            
            if (data.status === 'success') {
                const blob = new Blob([data.markdown], { type: 'text/markdown' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Glosario_SpecFactory.md';
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Error al exportar glosario: ' + data.error);
            }
        } catch (e) {
            alert('Error de red al exportar glosario.');
        }
    });

    // Carga Inicial de Datos con Filtros
    async function loadDashboardStats(filters = {}) {
        if (!sbClient) return;
        try {
            let queryTotal = sbClient.from('specifications').select('*', { count: 'exact', head: true });
            let queryApproved = sbClient.from('specifications').select('*', { count: 'exact', head: true }).eq('status', 'Aprobada');

            if (filters.sector && filters.sector !== 'all') {
                queryTotal = queryTotal.eq('sector_id', filters.sector);
                queryApproved = queryApproved.eq('sector_id', filters.sector);
            }
            if (filters.urgency && filters.urgency !== 'all') {
                queryTotal = queryTotal.eq('urgency', filters.urgency);
                queryApproved = queryApproved.eq('urgency', filters.urgency);
            }

            const { count: total } = await queryTotal;
            const { count: approved } = await queryApproved;
            
            if (document.getElementById('count-total')) document.getElementById('count-total').innerText = total || 0;
            if (document.getElementById('count-approved')) document.getElementById('count-approved').innerText = approved || 0;
            if (document.getElementById('count-pending')) document.getElementById('count-pending').innerText = (total - approved) || 0;
        } catch (e) {
            console.warn('Error cargando estadísticas:', e);
        }
    }

    // Carga de Tabla de Specs Recientes
    async function loadRecentSpecs(filters = {}) {
        const tableBody = document.querySelector('#recent-specs-table tbody');
        if (!tableBody || !sbClient) return;

        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;opacity:0.6;"><i class="ri-loader-4-line ri-spin"></i> Cargando especificaciones...</td></tr>';

        try {
            let query = sbClient
                .from('specifications')
                .select(`
                    id, 
                    title, 
                    urgency, 
                    status, 
                    version,
                    usuarios(full_name),
                    sectors(name)
                `)
                .order('version', { ascending: false }) // Versiones más recientes primero
                .order('title', { ascending: true })
                .limit(20);

            if (filters.sector && filters.sector !== 'all') query = query.eq('sector_id', filters.sector);
            if (filters.urgency && filters.urgency !== 'all') query = query.eq('urgency', filters.urgency);

            const { data, error } = await query;
            if (error) throw error;

            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;opacity:0.6;">No se encontraron especificaciones.</td></tr>';
                return;
            }

            tableBody.innerHTML = data.map(spec => `
                <tr>
                    <td>
                        <div style="font-weight:500;">${spec.title}</div>
                        <div style="font-size:11px; opacity:0.6;">v${spec.version || '1.0'} | ${spec.sectors?.name || 'Gral'}</div>
                    </td>
                    <td>${spec.usuarios?.full_name || 'IA System'}</td>
                    <td><span class="badge ${spec.urgency === 'Alta' ? 'badge-high' : ''}">${spec.urgency}</span></td>
                    <td><span class="status-dot ${spec.status === 'Aprobada' ? 'status-approved' : 'status-draft'}"></span> ${spec.status}</td>
                    <td>
                        <button class="btn-icon" title="Ver" onclick="alert('Funcionalidad de visor en desarrollo')"><i class="ri-eye-line"></i></button>
                        <button class="btn-icon" title="Exportar" onclick="window.ExportManager.openModal()"><i class="ri-share-forward-line"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            console.error('Error cargando tabla:', e);
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--accent-red);">Error al cargar datos.</td></tr>';
        }
    }

    // Aplicar Filtros
    document.getElementById('btn-apply-filters')?.addEventListener('click', () => {
        const filters = {
            sector: document.getElementById('filter-sector').value,
            urgency: document.getElementById('filter-urgency').value
        };
        loadDashboardStats(filters);
        loadRecentSpecs(filters);
    });

    // Inicialización
    window.addEventListener('DOMContentLoaded', () => {
        checkSession(); // Validar seguridad primero
        loadSectors();
        loadDashboardStats();
        loadRecentSpecs();
        if (window.ExportManager) window.ExportManager.init();
        
        console.log('Spec Factory inicializado con protocolo de seguridad v1.1');
    });
})();
