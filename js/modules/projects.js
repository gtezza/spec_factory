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
        <div class="modal-body-premium" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="detail-sub-meta" style="margin-top: 0; margin-bottom: 10px; border-top: none; padding-top: 0; display: flex; gap: 16px;">
                <span><i class="ri-user-smile-line"></i> Autor (ID): <strong>${(project.author_id || 'N/A').slice(0, 8)}</strong></span>
                <span><i class="ri-time-line"></i> Fecha de Creación: <strong>${dateStr}</strong></span>
                <span><i class="ri-shield-check-line"></i> Criticidad: <strong>${project.criticality || 'Media'}</strong></span>
            </div>
            
            <!-- Pestañas internas del Modal -->
            <div class="tabs-nav" id="modal-view-tabs" style="border-bottom: 1px solid var(--border-color); margin-bottom: 0; display: flex; gap: 10px;">
                <button class="tab-btn active" data-tab="modal-spec" id="modal-tab-btn-spec" style="padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <i class="ri-file-text-line"></i> Especificación Técnica
                </button>
                <button class="tab-btn" id="modal-tab-btn-agile" data-tab="modal-agile" style="padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <i class="ri-git-pull-request-line"></i> Backlog Agile (Kanban)
                </button>
            </div>

            <!-- Workspace de Especificación Técnica -->
            <div id="modal-spec-workspace" style="display: block;">
                <div class="sdd-document-content" style="background: transparent; padding: 0;">
                    ${parsedMarkdown}
                </div>
            </div>

            <!-- Workspace de Backlog Agile -->
            <div id="modal-agile-workspace" style="display: none; flex-direction: column; gap: 24px;">
                <!-- Botón para generar backlog si no existe -->
                <div id="modal-agile-empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; border: 2px dashed rgba(255,255,255,0.05); border-radius: 8px; gap: 15px; background: rgba(0,0,0,0.1);">
                    <i class="ri-git-pull-request-line" style="font-size: 48px; color: var(--primary); opacity: 0.5;"></i>
                    <h4 style="margin: 0; font-size: 16px; font-weight: 700;">Backlog Agile no generado</h4>
                    <p style="font-size: 13px; color: var(--dark-text-muted); max-width: 400px; margin: 0; line-height: 1.5;">El agente experto en Agile Kanban puede analizar esta especificación para estructurar la Épica de desarrollo y el backlog de Historias de Usuario.</p>
                    <button class="btn btn-primary" id="modal-btn-generate-agile" style="padding: 10px 20px; font-weight: 600; font-size: 13px;">
                        <i class="ri-magic-line"></i> Consultar Agente Agile Kanban
                    </button>
                </div>

                <!-- Contenido del Backlog (Épica + Historias) -->
                <div id="modal-agile-backlog-content" style="display: none; flex-direction: column; gap: 24px;">
                    <!-- Cabecera de la épica -->
                    <div class="card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 18px; border-radius: 8px; margin: 0;">
                        <div style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 1px;">Épica Ágil</div>
                        <h3 id="modal-agile-epic-title" style="margin: 8px 0; font-size: 18px; font-weight: 700; color: #fff;"></h3>
                        <p id="modal-agile-epic-desc" style="font-size: 13px; color: var(--dark-text-muted); line-height: 1.5; margin: 0;"></p>
                    </div>

                    <!-- Listado de historias de usuario en formato tarjetas Kanban -->
                    <div>
                        <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: #fff;">
                            <i class="ri-list-check" style="color: var(--primary);"></i> Historias de Usuario (Backlog)
                        </h4>
                        <div id="modal-agile-stories-container" style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                            <!-- Tarjetas de US inyectadas -->
                        </div>
                    </div>
                </div>
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

    // Configurar tab switcher del modal
    const modalViewTabs = modalContent.querySelector('#modal-view-tabs');
    const modalSpecWorkspace = modalContent.querySelector('#modal-spec-workspace');
    const modalAgileWorkspace = modalContent.querySelector('#modal-agile-workspace');
    
    modalViewTabs?.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;
        
        modalViewTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabBtn.classList.add('active');
        
        const tab = tabBtn.dataset.tab;
        if (tab === 'modal-spec') {
            if (modalSpecWorkspace) modalSpecWorkspace.style.display = 'block';
            if (modalAgileWorkspace) modalAgileWorkspace.style.display = 'none';
        } else if (tab === 'modal-agile') {
            if (modalSpecWorkspace) modalSpecWorkspace.style.display = 'none';
            if (modalAgileWorkspace) modalAgileWorkspace.style.display = 'flex';
            
            // Cargar Backlog Agile en el modal
            loadModalAgileBacklog(project.id, modalContent);
        }
    });

    // Configurar generación de backlog
    const modalBtnGenerateAgile = modalContent.querySelector('#modal-btn-generate-agile');
    modalBtnGenerateAgile?.addEventListener('click', () => handleModalGenerateAgileBacklog(project.id, modalContent));


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
            // Importación dinámica con cache buster para forzar actualización del script
            const { exportToPDF } = await import(`./pdfExporter.js?v=${Date.now()}`);
            await exportToPDF(project.project_name, project.markdown, project);
            showToast('PDF corporativo generado con éxito', 'success');
        } catch (err) {
            console.error('Error generando PDF:', err);
            showToast('No se pudo generar el PDF corporativo.', 'error');
        }
    });
}

/**
 * Cargar el backlog Agile en el modal de proyectos activos
 */
async function loadModalAgileBacklog(specId, modalEl) {
    const emptyState = modalEl.querySelector('#modal-agile-empty-state');
    const backlogContent = modalEl.querySelector('#modal-agile-backlog-content');
    const epicTitle = modalEl.querySelector('#modal-agile-epic-title');
    const epicDesc = modalEl.querySelector('#modal-agile-epic-desc');
    const storiesContainer = modalEl.querySelector('#modal-agile-stories-container');

    if (!emptyState || !backlogContent) return;

    emptyState.style.display = 'none';
    backlogContent.style.display = 'none';

    let loader = modalEl.querySelector('#modal-agile-loading-state');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'modal-agile-loading-state';
        loader.style.cssText = 'padding: 40px; text-align: center; color: var(--dark-text-muted);';
        loader.innerHTML = `
            <i class="ri-loader-4-line ri-spin" style="font-size: 32px; display: block; margin-bottom: 8px; color: var(--primary);"></i>
            <p style="font-size: 13px;">Consultando backlog en base de datos...</p>
        `;
        emptyState.parentNode.insertBefore(loader, emptyState.nextSibling);
    }
    loader.style.display = 'block';

    try {
        const response = await apiFetch(`/api/specifications/${specId}/agile`);
        loader.style.display = 'none';

        if (response && response.status === 'success') {
            const backlog = response.data;
            const epic = backlog.epic || {};
            const stories = backlog.user_stories || [];

            if (epicTitle) epicTitle.textContent = epic.title || 'Épica de Desarrollo';
            if (epicDesc) epicDesc.textContent = epic.description || 'Sin descripción disponible.';

            renderModalAgileStories(stories, storiesContainer);

            backlogContent.style.display = 'flex';
        } else {
            emptyState.style.display = 'flex';
        }
    } catch (err) {
        console.warn('Backlog no encontrado en modal:', err);
        loader.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

/**
 * Generar backlog Agile desde el modal
 */
async function handleModalGenerateAgileBacklog(specId, modalEl) {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 10, 12, 0.9);
        backdrop-filter: blur(6px);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 20px;
        color: white;
        border-radius: 14px;
    `;
    loadingOverlay.innerHTML = `
        <div style="
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 4px solid rgba(255, 255, 255, 0.05);
            border-top-color: var(--primary);
            animation: spin 1s linear infinite;
        "></div>
        <div style="text-align: center; max-width: 350px; padding: 0 20px;">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">Agente Agile Kanban Consultando...</h3>
            <p style="font-size: 12px; color: var(--dark-text-muted);">Traduciendo la especificación técnica en Épicas e Historias de Usuario...</p>
        </div>
    `;
    modalEl.appendChild(loadingOverlay);

    try {
        const response = await apiFetch(`/api/specifications/${specId}/agile`, {
            method: 'POST'
        });

        if (response && response.status === 'success') {
            showToast('Backlog Agile generado con éxito', 'success');
            await loadModalAgileBacklog(specId, modalEl);
        } else {
            throw new Error(response.error || 'Error al generar el backlog');
        }
    } catch (err) {
        console.error('Error al generar backlog en modal:', err);
        showToast('Error al generar el backlog con el Agente Agile', 'error');
    } finally {
        loadingOverlay.remove();
    }
}

/**
 * Renderizar historias en el modal
 */
function renderModalAgileStories(stories, container) {
    if (!container) return;
    container.innerHTML = '';

    if (stories.length === 0) {
        container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No hay historias de usuario en este backlog.</p>';
        return;
    }

    stories.forEach((story, idx) => {
        const card = document.createElement('div');
        card.className = 'agile-story-card';
        card.style.cssText = `
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: all 0.2s ease;
            position: relative;
        `;

        card.addEventListener('mouseenter', () => {
            card.style.borderColor = 'rgba(0, 82, 204, 0.3)';
            card.style.background = 'rgba(255, 255, 255, 0.03)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            card.style.background = 'rgba(255, 255, 255, 0.02)';
        });

        let acHtml = '';
        if (story.acceptance_criteria && story.acceptance_criteria.length > 0) {
            acHtml = `
                <div class="story-ac-section" style="margin-top: 8px;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                        Criterios de Aceptación (Gherkin)
                    </div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--dark-text-muted); line-height: 1.5; display: flex; flex-direction: column; gap: 4px;">
                        ${story.acceptance_criteria.map(ac => `<li>${ac}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        const usId = `US-${String(idx + 1).padStart(3, '0')}`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
                    <span style="font-size: 10px; font-weight: 700; color: var(--primary); letter-spacing: 0.5px;">${usId}</span>
                    <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #fff;">${story.title}</h4>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge badge-info" style="font-size: 10px; padding: 3px 8px; font-weight: 700;">
                        ${story.story_points} SP
                    </span>
                    <button class="btn-copy-story btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 11px; display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1);" title="Copiar Historia de Usuario en formato Markdown">
                        <i class="ri-file-copy-line"></i> Copiar
                    </button>
                </div>
            </div>
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.45; font-style: italic;">
                ${story.description}
            </p>
            ${acHtml}
        `;

        card.querySelector('.btn-copy-story').addEventListener('click', (e) => {
            e.stopPropagation();
            const formattedText = `### ${usId}: ${story.title}
- **Descripción:** ${story.description}
- **Story Points:** ${story.story_points}
- **Criterios de Aceptación (Gherkin):**
${story.acceptance_criteria.map(ac => `  - ${ac}`).join('\n')}`;

            navigator.clipboard.writeText(formattedText).then(() => {
                showToast(`${usId} copiada al portapapeles`, 'success');
            }).catch(err => {
                console.error('Error al copiar:', err);
                showToast('Error al copiar al portapapeles', 'error');
            });
        });

        container.appendChild(card);
    });
}
