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
                        <thead><tr><th>Título</th><th>Urgencia</th><th>Similitud</th></tr></thead>
                        <tbody>
                            ${data.results.map(r => `
                                <tr>
                                    <td>${r.title}</td>
                                    <td><span class="badge">${r.urgency || 'Media'}</span></td>
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
                    urgency: 'Media'
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

    // Carga Inicial de Datos
    async function loadDashboardStats() {
        if (!sbClient) return;
        try {
            const { count: total } = await sbClient.from('specifications').select('*', { count: 'exact', head: true });
            const { count: approved } = await sbClient.from('specifications').select('*', { count: 'exact', head: true }).eq('status', 'Aprobada');
            
            if (document.getElementById('count-total')) document.getElementById('count-total').innerText = total || 0;
            if (document.getElementById('count-approved')) document.getElementById('count-approved').innerText = approved || 0;
            if (document.getElementById('count-pending')) document.getElementById('count-pending').innerText = (total - approved) || 0;
        } catch (e) {
            console.warn('Error cargando estadísticas:', e);
        }
    }

    // Inicialización
    window.addEventListener('DOMContentLoaded', () => {
        loadDashboardStats();
        if (window.ExportManager) window.ExportManager.init();
        console.log('Spec Factory inicializado.');
    });
})();
