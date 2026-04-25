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
            const viewId = item.id === 'nav-create' ? 'create-view' : 'dashboard-view';
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
    const btnLogout = document.getElementById('btn-logout');
    const userInfoArea = document.getElementById('user-info');
    const headerUserName = document.getElementById('header-user-name');
    const headerUserRole = document.getElementById('header-user-role');

    function updateAuthUI(user) {
        if (user) {
            currentUser = user;
            modalLogin.style.display = 'none';
            userInfoArea.style.display = 'block';
            btnLogout.style.display = 'block';
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
            btnLogout.style.display = 'none';
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

    function checkSession() {
        const session = sessionStorage.getItem('sf_session');
        if (session) {
            const user = JSON.parse(session);
            updateAuthUI(user);
        } else {
            updateAuthUI(null);
        }
    }

    loginForm?.addEventListener('submit', handleLogin);
    btnLogout?.addEventListener('click', handleLogout);

    // Aviso de cierre estricto (Solicitado por Gerardo Tezza)
    window.addEventListener('beforeunload', (e) => {
        if (currentUser) {
            const msg = "SEGURIDAD: Debe cerrar la sesión formalmente desde el botón 'Salir'. El cierre forzado puede comprometer la integridad de la información.";
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
            });
        } catch (e) {
            console.warn('Error cargando sectores para filtros:', e);
        }
    }

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
