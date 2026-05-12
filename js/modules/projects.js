/**
 * Spec Factory | Dashboard de Proyectos Activos
 */

import { state, elements } from './state.js';
import { showToast } from './ui.js';
import { apiFetch, endpoints } from './api.js';

let activeProjects = [];

export function initProjects() {
    console.log('Inicializando módulo de Proyectos...');
    
    // Configurar listeners de filtros en tiempo real
    elements.projectSearch?.addEventListener('input', renderFilteredProjects);
    elements.projectFilterSector?.addEventListener('change', renderFilteredProjects);
    elements.projectFilterCriticality?.addEventListener('change', renderFilteredProjects);
    elements.projectFilterStatus?.addEventListener('change', renderFilteredProjects);
}

export async function loadProjects() {
    console.log('Cargando proyectos en el dashboard...');
    if (!elements.projectsGrid) return;

    elements.projectsGrid.innerHTML = `
        <div class="loading-state">
            <i class="ri-loader-4-line ri-spin"></i>
            <p>Cargando dashboard de proyectos...</p>
        </div>
    `;

    // Rellenar el filtro de sectores si está vacío o solo tiene la opción inicial
    if (elements.projectFilterSector && elements.projectFilterSector.options.length <= 1) {
        state.sectors.forEach(sec => {
            const opt = document.createElement('option');
            opt.value = sec.id;
            opt.textContent = sec.name;
            elements.projectFilterSector.appendChild(opt);
        });
    }

    try {
        const result = await apiFetch(endpoints.specifications);
        if (result && result.status === 'success') {
            activeProjects = (result.data || []).map(p => ({
                ...p,
                project_name: p.title || p.project_name
            }));
            localStorage.setItem('spec_factory_projects', JSON.stringify(activeProjects));
        } else {
            throw new Error('Fallo al obtener especificaciones de la API');
        }
    } catch (error) {
        console.warn('Error cargando proyectos del servidor, intentando fallback local:', error);
        const localData = localStorage.getItem('spec_factory_projects');
        if (localData) {
            activeProjects = JSON.parse(localData);
            showToast('Mostrando datos locales (Modo Offline)', 'info');
        } else {
            activeProjects = [];
            showToast('No se pudieron cargar los proyectos y no hay respaldo local.', 'error');
        }
    }

    renderFilteredProjects();
}

function renderFilteredProjects() {
    if (!elements.projectsGrid) return;

    const searchTerm = elements.projectSearch?.value.toLowerCase().trim() || '';
    const selectedSector = elements.projectFilterSector?.value || '';
    const selectedCriticality = elements.projectFilterCriticality?.value || '';
    const selectedStatus = elements.projectFilterStatus?.value || '';

    // Filtrar proyectos
    const filtered = activeProjects.filter(proj => {
        // Excluir proyectos vacíos (sin nombre de proyecto definido)
        if (!proj.project_name || proj.project_name.trim() === '') {
            return false;
        }

        const matchesSearch = !searchTerm || 
            proj.project_name?.toLowerCase().includes(searchTerm) || 
            proj.markdown?.toLowerCase().includes(searchTerm) ||
            (proj.sectors?.name && proj.sectors.name.toLowerCase().includes(searchTerm));
        
        const matchesSector = !selectedSector || proj.sector_id === selectedSector;
        const matchesCriticality = !selectedCriticality || proj.criticality === selectedCriticality;
        
        // Mapear estado interno a filtro (por ejemplo 'Aprobada' -> 'APROBADO')
        let matchesStatus = true;
        if (selectedStatus) {
            const mappedStatus = proj.status?.toUpperCase() || 'BORRADOR';
            if (selectedStatus === 'APROBADO' && mappedStatus === 'APROBADA') {
                matchesStatus = true;
            } else {
                matchesStatus = mappedStatus === selectedStatus;
            }
        }

        return matchesSearch && matchesSector && matchesCriticality && matchesStatus;
    });

    if (filtered.length === 0) {
        elements.projectsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 48px; text-align: center;">
                <i class="ri-folder-open-line" style="font-size: 48px; opacity: 0.3; margin-bottom: 12px; display: block;"></i>
                <p style="color: var(--dark-text-muted);">No se encontraron proyectos activos que coincidan con los filtros.</p>
            </div>
        `;
        return;
    }

    elements.projectsGrid.innerHTML = '';

    filtered.forEach(proj => {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        // Calcular porcentaje según estado
        const currentStatus = (proj.status || 'BORRADOR').toUpperCase();
        let progressPercent = 20;
        let badgeClass = 'badge-secondary';
        
        if (currentStatus === 'EN ANALISIS' || currentStatus === 'ANALISIS') {
            progressPercent = 40;
            badgeClass = 'badge-info';
        } else if (currentStatus === 'PENDIENTE APROBACION' || currentStatus === 'PENDIENTE') {
            progressPercent = 70;
            badgeClass = 'badge-warning';
        } else if (currentStatus === 'APROBADO' || currentStatus === 'APROBADA') {
            progressPercent = 100;
            badgeClass = 'badge-success';
        } else if (currentStatus === 'RECHAZADO') {
            progressPercent = 100;
            badgeClass = 'badge-danger';
        }

        // Crear ID amigable cortando el UUID
        const compactId = `SPEC-${(proj.id || '0000').slice(0, 5).toUpperCase()}`;
        const sectorName = proj.sectors?.name || 'General';
        const dateStr = proj.created_at ? new Date(proj.created_at).toLocaleDateString() : 'N/A';

        card.innerHTML = `
            <div class="project-card-header">
                <span class="project-card-id">${compactId}</span>
                <span class="badge ${badgeClass}">${currentStatus === 'APROBADA' ? 'APROBADO' : currentStatus}</span>
            </div>
            <h4 class="project-card-title">${proj.project_name || 'Proyecto sin título'}</h4>
            <div class="project-card-meta">
                <span><i class="ri-government-line"></i> ${sectorName}</span>
                <span><i class="ri-time-line"></i> ${dateStr}</span>
            </div>
            <div class="project-card-tags">
                <span class="tag-criticality" data-level="${proj.criticality || 'Media'}">${proj.criticality || 'Media'}</span>
            </div>
            <div class="project-card-progress-section">
                <div class="progress-header">
                    <span>Progreso de Especificación</span>
                    <span class="progress-percentage">${progressPercent}%</span>
                </div>
                <div class="progress-bar-wrapper">
                    <div class="progress-bar-fill" style="width: ${progressPercent}%; ${currentStatus === 'RECHAZADO' ? 'background: #FF5630;' : ''}"></div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => showProjectDetailModal(proj));
        elements.projectsGrid.appendChild(card);
    });
}

function showProjectDetailModal(project) {
    // Remover modal anterior si existe
    const existingModal = document.querySelector('.modal-overlay-dark');
    if (existingModal) existingModal.remove();

    // Crear overlay del modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay-dark';

    // Crear contenedor
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content-lg';

    const compactId = `SPEC-${(project.id || '0000').slice(0, 5).toUpperCase()}`;
    const sectorName = project.sectors?.name || 'General';
    const dateStr = project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A';

    // Renderizar cuerpo con Marked (Markdown parse)
    let parsedMarkdown = '<p class="text-muted">Sin contenido de especificación disponible.</p>';
    if (project.markdown) {
        try {
            parsedMarkdown = marked.parse(project.markdown);
        } catch (e) {
            console.error('Error parseando markdown en el modal:', e);
            parsedMarkdown = `<pre>${project.markdown}</pre>`;
        }
    }

    modalContent.innerHTML = `
        <div class="modal-header-premium">
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--primary);">${compactId} / Sector: ${sectorName}</span>
                <h3 class="modal-title-premium">${project.project_name || 'Especificación Técnica'}</h3>
            </div>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body-premium">
            <div class="detail-sub-meta" style="margin-top: 0; margin-bottom: 20px; border-top: none; padding-top: 0;">
                <span><i class="ri-user-smile-line"></i> Autor (ID): <strong>${(project.author_id || 'N/A').slice(0, 8)}</strong></span>
                <span><i class="ri-time-line"></i> Fecha de Creación: <strong>${dateStr}</strong></span>
                <span><i class="ri-shield-check-line"></i> Criticidad: <strong>${project.criticality || 'Media'}</strong></span>
            </div>
            <div class="sdd-document-content" style="background: transparent; padding: 0;">
                ${parsedMarkdown}
            </div>
        </div>
        <div class="modal-footer-premium">
            <button id="modal-download-md" class="btn btn-secondary">
                <i class="ri-file-markdown-line"></i> Descargar .md
            </button>
            <button id="modal-export-pdf" class="btn btn-primary">
                <i class="ri-file-pdf-line"></i> Descargar PDF Corporativo
            </button>
            <button id="modal-close-footer" class="btn btn-secondary" style="background: rgba(255,255,255,0.05); color: white;">Cerrar</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Bloquear scroll de la página trasera
    document.body.style.overflow = 'hidden';

    // Cerrar modal
    const closeModal = () => {
        modalOverlay.remove();
        document.body.style.overflow = '';
    };

    modalContent.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    modalContent.querySelector('#modal-close-footer').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Descarga de Markdown
    modalContent.querySelector('#modal-download-md').addEventListener('click', () => {
        const blob = new Blob([project.markdown || ''], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${(project.project_name || 'especificacion').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_srs.md`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Archivo Markdown (.md) descargado con éxito', 'success');
    });

    // Descarga de PDF Corporativo
    modalContent.querySelector('#modal-export-pdf').addEventListener('click', async () => {
        try {
            showToast('Generando PDF corporativo premium...', 'info');
            // Importación dinámica de pdfExporter para mantener el principio de modularidad granular
            const { exportToPDF } = await import('./pdfExporter.js');
            await exportToPDF(project.project_name, project.markdown, project);
            showToast('PDF corporativo generado con éxito', 'success');
        } catch (err) {
            console.error('Error generando PDF:', err);
            showToast('No se pudo generar el PDF corporativo.', 'error');
        }
    });
}
