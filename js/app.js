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
                        <button onclick="document.getElementById('search-results').style.display='none';document.getElementById('semantic-search').value='';" 
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

    // Gestión de Login
    const modalLogin = document.getElementById('modal-login');
    const btnOpenLogin = document.getElementById('btn-open-login');
    const btnLoginAction = document.getElementById('btn-login');
    const inputUserName = document.getElementById('user-name');

    btnOpenLogin?.addEventListener('click', () => {
        modalLogin.classList.add('active');
    });

    btnLoginAction?.addEventListener('click', async () => {
        const name = inputUserName.value.trim();
        if (!name) return alert('Ingresa tu nombre');

        try {
            // Buscar si existe el perfil, si no crearlo
            const { data: existing, error: searchError } = await sbClient
                .from('profiles')
                .select('*')
                .ilike('full_name', name)
                .single();

            if (existing) {
                currentUser = existing;
            } else {
                const { data: newUser, error: createError } = await sbClient
                    .from('profiles')
                    .insert([{ full_name: name, role_id: '88888888-8888-8888-8888-888888888888' }]) // Default a Analyst si existe el seed
                    .select()
                    .single();
                
                if (createError) throw createError;
                currentUser = newUser;
            }

            btnOpenLogin.innerHTML = `<i class="ri-user-smile-line"></i> Hola, ${currentUser.full_name.split(' ')[0]}`;
            modalLogin.classList.remove('active');
            alert(`Bienvenido, ${currentUser.full_name}`);
        } catch (e) {
            console.error('Error login:', e);
            alert('Error al identificar usuario. Verifica que la DB esté inicializada.');
        }
    });

    // Cerrar modal al hacer click fuera
    window.addEventListener('click', (e) => {
        if (e.target === modalLogin) modalLogin.classList.remove('active');
    });

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
                    profiles(full_name),
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
                    <td>${spec.profiles?.full_name || 'IA System'}</td>
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
        loadSectors();
        loadDashboardStats();
        loadRecentSpecs();
        if (window.ExportManager) window.ExportManager.init();
        
        // Auto-abrir login si es necesario
        if (!currentUser) {
            setTimeout(() => {
                modalLogin?.classList.add('active');
            }, 1000);
        }
        
        console.log('Spec Factory inicializado.');
    });
})();
