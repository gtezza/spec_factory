// Configuración de Supabase
const SUPABASE_URL = APP_CONFIG.SUPABASE.URL;
const SUPABASE_KEY = APP_CONFIG.SUPABASE.ANON_KEY;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabaseClient = supabase; // Para que ExportManager lo use

// Navegación
const navItems = document.querySelectorAll('.nav-item');
const views = {
    'nav-dashboard': document.getElementById('dashboard-view'),
    'nav-create': document.getElementById('create-view'),
    'nav-specs': document.getElementById('dashboard-view'), // Por ahora comparten vista
};

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetViewId = item.id;
        
        // Actualizar UI activa
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Cambiar vista
        Object.values(views).forEach(v => v.style.display = 'none');
        if (views[targetViewId]) {
            views[targetViewId].style.display = targetViewId === 'nav-create' ? 'grid' : 'block';
        }
    });
});

// Búsqueda Semántica
const searchInput = document.getElementById('semantic-search');
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value;
        console.log('Buscando semánticamente:', query);
        // Aquí se llamaría a la función RPC 'match_specifications' de Supabase
        // Previamente se debe generar el embedding de la consulta
        alert('Funcionalidad de búsqueda semántica: Requiere que los vectores estén generados en el backend.');
    }
});

// Conversión de Código (Simulación para el frontend)
const btnConvert = document.getElementById('btn-convert');
const codeInput = document.getElementById('code-input');
const specPreview = document.getElementById('spec-preview');
const previewActions = document.getElementById('preview-actions');

btnConvert.addEventListener('click', async () => {
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
                urgency: document.getElementById('urgency-level')?.value || 'Media'
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
            alert('¡Especificación generada y guardada en Supabase!');
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
    if (!supabase) return;
    
    const { count: total } = await supabase.from('specifications').select('*', { count: 'exact', head: true });
    const { count: approved } = await supabase.from('specifications').select('*', { count: 'exact', head: true }).eq('status', 'Aprobada');
    
    document.getElementById('count-total').innerText = total || 0;
    document.getElementById('count-approved').innerText = approved || 0;
    document.getElementById('count-pending').innerText = (total - approved) || 0;
}

// Inicialización
window.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    ExportManager.init();
    console.log('Spec Factory inicializado con ExportManager.');
});
