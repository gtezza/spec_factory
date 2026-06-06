/**
 * Spec Factory | Panel de Administración de Gobernanza y Aprobaciones (IEEE 830)
 */

import { state, elements } from './state.js';
import { showToast } from './ui.js';
import { apiFetch, endpoints } from './api.js';
import { sbClient } from './supabase.js';

// Variables de estado local del módulo de administración
let adminRequests = [];
let selectedRequest = null;
let glossaryTerms = [];
let activeGlossaryTab = 'gobierno';
let generatedSddSpec = null;

/**
 * Inicializa el módulo de administración, vinculando listeners globales
 */
export function initAdmin() {
    console.log('Inicializando módulo de Administración de Gobernanza...');

    if (!elements.viewAdmin) return;

    // Configurar listeners para filtros de triage lateral
    elements.adminFilterSector?.addEventListener('change', renderRequestsList);
    elements.adminFilterCriticality?.addEventListener('change', renderRequestsList);

    // Configurar delegación de eventos para las pestañas del glosario de 3 capas
    elements.glosarioTabs?.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;

        // Cambiar pestaña activa en el DOM
        elements.glosarioTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabBtn.classList.add('active');

        // Actualizar estado de pestaña seleccionada y renderizar términos correspondientes
        activeGlossaryTab = tabBtn.dataset.tab;
        renderGlossaryTerms();
    });

    // Configurar acciones de gobernanza (Aprobar y Rechazar)
    elements.btnApproveTriage?.addEventListener('click', handleApproveRequest);
    elements.btnRejectTriage?.addEventListener('click', handleRejectRequest);

    // Configurar descarga de Markdown de propuesta original
    elements.btnDownloadMd?.addEventListener('click', handleDownloadProposalMd);

    // Configurar exportación de PDF de la SDD generada
    elements.btnExportPdf?.addEventListener('click', handleExportSddPdf);

    // Configurar sincronización de propuesta de triage offline
    elements.btnSyncOfflineRequest?.addEventListener('click', handleSyncOfflineRequest);

    // Configurar pestañas del visor SDD (Especificación vs Agile Backlog)
    const sddViewTabs = document.getElementById('sdd-view-tabs');
    sddViewTabs?.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;

        sddViewTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabBtn.classList.add('active');

        const tab = tabBtn.dataset.tab;
        const specWorkspace = document.getElementById('sdd-spec-workspace');
        const agileWorkspace = document.getElementById('sdd-agile-workspace');

        if (tab === 'sdd-spec') {
            if (specWorkspace) specWorkspace.style.display = 'flex';
            if (agileWorkspace) agileWorkspace.style.display = 'none';
        } else if (tab === 'sdd-agile') {
            if (specWorkspace) specWorkspace.style.display = 'none';
            if (agileWorkspace) agileWorkspace.style.display = 'flex';
            
            // Cargar Backlog Agile si existe
            if (generatedSddSpec) {
                loadAgileBacklog(generatedSddSpec.id);
            }
        }
    });

    // Configurar botón de generación de Backlog Agile
    const btnGenerateAgile = document.getElementById('btn-generate-agile');
    btnGenerateAgile?.addEventListener('click', handleGenerateAgileBacklog);
}


/**
 * Carga las propuestas de triage desde el servidor de base de datos
 */
export async function loadAdminTriage() {
    console.log('Cargando solicitudes de triage en administración...');
    
    if (!elements.adminRequestsList) return;

    elements.adminRequestsList.innerHTML = `
        <div class="loading-state" style="padding: 24px; text-align: center;">
            <i class="ri-loader-4-line ri-spin" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
            <p style="font-size: 13px; color: var(--dark-text-muted);">Cargando solicitudes...</p>
        </div>
    `;

    try {
        // Obtener todas las solicitudes de triage desde la API Flask
        const response = await apiFetch(endpoints.triage);
        if (response && response.status === 'success') {
            adminRequests = response.data || [];

            // Integración de borradores locales / offline
            try {
                const localRequests = JSON.parse(localStorage.getItem('sf_offline_requests') || '[]');
                localRequests.forEach((req, index) => {
                    req.offline = true;
                    if (!req.id) {
                        req.id = `offline-${req.request_id || index}-${Date.now()}`;
                    }
                    if (!req.sectors) {
                        const sectorObj = state.sectors?.find(s => s.id === req.sector_id);
                        req.sectors = sectorObj || { name: 'General' };
                    }
                    if (!req.statuses) {
                        req.statuses = { name: 'BORRADOR' };
                    }
                });
                adminRequests = [...localRequests, ...adminRequests];
            } catch (storageError) {
                console.error('Error al procesar solicitudes offline en administración:', storageError);
            }

            renderRequestsList();
        } else {
            throw new Error('No se pudo obtener la respuesta correcta de triage');
        }
    } catch (error) {
        console.error('Error cargando solicitudes de triage:', error);
        elements.adminRequestsList.innerHTML = `
            <div class="error-state" style="padding: 24px; text-align: center; color: var(--danger);">
                <i class="ri-error-warning-line" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                <p style="font-size: 13px;">Error al conectar con la API de triage.</p>
            </div>
        `;
        showToast('No se pudieron cargar las solicitudes de triage', 'error');
    }
}

/**
 * Filtra y renderiza la lista lateral de solicitudes en base a los filtros seleccionados
 */
function renderRequestsList() {
    if (!elements.adminRequestsList) return;

    const selectedSector = elements.adminFilterSector?.value || '';
    const selectedCriticality = elements.adminFilterCriticality?.value || '';

    // Filtrar localmente la lista de propuestas cargadas
    const filtered = adminRequests.filter(req => {
        const matchesSector = !selectedSector || req.sector_id === selectedSector;
        const matchesCriticality = !selectedCriticality || req.criticality === selectedCriticality;
        return matchesSector && matchesCriticality;
    });

    if (filtered.length === 0) {
        elements.adminRequestsList.innerHTML = `
            <div class="empty-state" style="padding: 32px; text-align: center;">
                <i class="ri-folder-shield-line" style="font-size: 32px; opacity: 0.2; margin-bottom: 8px; display: block;"></i>
                <p style="font-size: 13px; color: var(--dark-text-muted);">No hay propuestas que coincidan con los filtros.</p>
            </div>
        `;
        return;
    }

    elements.adminRequestsList.innerHTML = '';

    filtered.forEach(req => {
        const item = document.createElement('div');
        
        // Determinar si es el item actualmente seleccionado
        const isSelected = selectedRequest && selectedRequest.id === req.id;
        item.className = `admin-request-item ${isSelected ? 'active' : ''}`;

        // ID compacto (ej: REQ-A1B2)
        const compactId = req.offline ? req.request_id : `REQ-${(req.id || '0000').slice(0, 4).toUpperCase()}`;
        const sectorName = req.sectors?.name || 'General';
        const dateStr = req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A';
        const statusName = req.offline ? 'LOCAL / OFFLINE' : (req.statuses?.name || 'BORRADOR');

        // Estilos para badge de criticidad y estado
        let critBadgeClass = 'badge-secondary';
        if (req.criticality === 'Alta' || req.criticality === 'Crítica') {
            critBadgeClass = 'badge-danger';
        } else if (req.criticality === 'Media') {
            critBadgeClass = 'badge-warning';
        }

        let statusBadgeClass = 'badge-secondary';
        let customStatusStyle = '';
        if (req.offline) {
            statusBadgeClass = 'badge-warning';
            customStatusStyle = 'style="background: #f97316; color: #fff; font-weight: 700; font-size: 10px;"';
        } else if (statusName === 'APROBADO' || statusName === 'APROBADA') {
            statusBadgeClass = 'badge-success';
        } else if (statusName === 'PENDIENTE APROBACION' || statusName === 'PENDIENTE') {
            statusBadgeClass = 'badge-warning';
        } else if (statusName === 'RECHAZADO') {
            statusBadgeClass = 'badge-danger';
        }

        item.innerHTML = `
            <div class="request-item-header">
                <span class="request-item-id">${compactId}</span>
                <span class="badge ${statusBadgeClass}" ${customStatusStyle}>${statusName}</span>
            </div>
            <h4 class="request-item-title">${req.idea || 'Idea de Proyecto'}</h4>
            <div class="request-item-footer">
                <span><i class="ri-government-line"></i> ${sectorName}</span>
                <span class="badge ${critBadgeClass}" style="font-size: 10px; padding: 2px 6px;">${req.criticality || 'Media'}</span>
            </div>
        `;

        item.addEventListener('click', () => {
            // Desmarcar anterior, marcar actual
            elements.adminRequestsList.querySelectorAll('.admin-request-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            loadRequestDetail(req);
        });

        elements.adminRequestsList.appendChild(item);
    });
}

/**
 * Carga el panel de detalle activo para la propuesta de triage seleccionada
 */
async function loadRequestDetail(request) {
    selectedRequest = request;
    generatedSddSpec = null;

    if (!elements.adminDetailActive || !elements.adminDetailEmpty) return;

    // Mostrar panel activo, ocultar panel vacío por defecto
    elements.adminDetailEmpty.style.display = 'none';
    elements.adminDetailActive.style.display = 'flex';

    // Restablecer la pestaña de SDD a "Especificación Técnica" por defecto
    const sddViewTabs = document.getElementById('sdd-view-tabs');
    const tabBtnSpec = document.getElementById('tab-btn-spec');
    const tabBtnAgile = document.getElementById('tab-btn-agile');
    const specWorkspace = document.getElementById('sdd-spec-workspace');
    const agileWorkspace = document.getElementById('sdd-agile-workspace');

    if (sddViewTabs && tabBtnSpec && tabBtnAgile && specWorkspace && agileWorkspace) {
        sddViewTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabBtnSpec.classList.add('active');
        specWorkspace.style.display = 'flex';
        agileWorkspace.style.display = 'none';
    }


    // Rellenar metadatos principales de cabecera
    const compactId = request.offline ? request.request_id : `REQ-${(request.id || '0000').slice(0, 5).toUpperCase()}`;
    if (elements.detailRequestId) elements.detailRequestId.textContent = compactId;
    if (elements.detailTitle) elements.detailTitle.textContent = request.idea || 'Idea sin título';
    
    if (elements.detailBadgeSector) {
        elements.detailBadgeSector.textContent = request.sectors?.name || 'General';
    }

    if (elements.detailBadgeCriticality) {
        elements.detailBadgeCriticality.textContent = request.criticality || 'Media';
        elements.detailBadgeCriticality.className = `badge ${request.criticality === 'Alta' || request.criticality === 'Crítica' ? 'badge-danger' : 'badge-warning'}`;
    }

    const statusName = request.offline ? 'LOCAL / OFFLINE' : (request.statuses?.name || 'PENDIENTE');
    if (elements.detailBadgeStatus) {
        elements.detailBadgeStatus.textContent = statusName;
        let badgeClass = 'badge-warning';
        if (request.offline) {
            badgeClass = 'badge-warning';
        } else if (statusName === 'APROBADO' || statusName === 'APROBADA') {
            badgeClass = 'badge-success';
        } else if (statusName === 'RECHAZADO') {
            badgeClass = 'badge-danger';
        }
        elements.detailBadgeStatus.className = `badge ${badgeClass}`;
        if (request.offline) {
            elements.detailBadgeStatus.style.background = '#f97316';
            elements.detailBadgeStatus.style.color = '#fff';
            elements.detailBadgeStatus.style.fontWeight = '700';
        } else {
            elements.detailBadgeStatus.style.background = '';
            elements.detailBadgeStatus.style.color = '';
            elements.detailBadgeStatus.style.fontWeight = '';
        }
    }

    if (elements.detailCreatorName) {
        elements.detailCreatorName.textContent = `Usuario ID: ${(request.creator_id || 'N/A').slice(0, 8)}`;
    }
    if (elements.detailCreatedDate) {
        elements.detailCreatedDate.textContent = request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A';
    }

    // Renderizar la propuesta original en Markdown
    renderProposalMarkdown(request);

    // Limpiar campo de comentario de auditoría
    if (elements.adminComment) elements.adminComment.value = '';

    // Cargar Glosario Inteligente de 3 Capas
    await loadGlossary();

    // Gestionar visualización del Visor de SDD e Inferencia
    const approvalCard = document.querySelector('.approval-action-card');
    
    if (statusName === 'APROBADO' || statusName === 'APROBADA') {
        // Ocultar caja de resolución de triage y sincronización offline
        if (approvalCard) approvalCard.style.display = 'none';
        if (elements.syncOfflineBox) elements.syncOfflineBox.style.display = 'none';
        
        // Cargar especificación agéntica asociada
        const specId = request.metadata?.specification_id;
        if (specId) {
            await loadAssociatedSdd(specId);
        } else {
            if (elements.sddViewerContainer) elements.sddViewerContainer.style.display = 'none';
        }
    } else {
        // Mostrar u ocultar controles según el origen local u online
        if (request.offline) {
            if (approvalCard) approvalCard.style.display = 'none';
            if (elements.syncOfflineBox) elements.syncOfflineBox.style.display = 'block';
        } else {
            if (approvalCard) approvalCard.style.display = 'block';
            if (elements.syncOfflineBox) elements.syncOfflineBox.style.display = 'none';
        }
        if (elements.sddViewerContainer) elements.sddViewerContainer.style.display = 'none';
    }
}

/**
 * Renderiza el reporte estructurado de la propuesta en Markdown
 */
function renderProposalMarkdown(request) {
    if (!elements.markdownProposalPreview) return;

    // Construir reporte premium en Markdown
    let md = `# Propuesta de Triage: ${request.idea}\n\n`;
    md += `## 1. Objetivos del Sistema\n${request.objective || 'No especificado.'}\n\n`;
    md += `## 2. Beneficios Esperados\n${request.benefits || 'No especificado.'}\n\n`;
    md += `## 3. Retorno de Inversión (ROI) Estimado\n${request.roi || 'No especificado.'}\n\n`;
    
    if (request.metadata) {
        md += `## 4. Metadata de Triage de IA\n`;
        const vScore = request.metadata.vibe_score || {};
        md += `- **Vibe Score de IA**: ${(vScore.score * 100).toFixed(0)}% (${vScore.vibe || 'Pendiente'})\n`;
        md += `- **Explicación**: ${vScore.explanation || 'No provista.'}\n`;
        if (request.metadata.triage_ai_analysis) {
            md += `- **Análisis de Complejidad**: ${request.metadata.triage_ai_analysis.complexity || 'N/A'}\n`;
            md += `- **Esfuerzo Estimado**: ${request.metadata.triage_ai_analysis.effort || 'N/A'}\n`;
        }
    }

    try {
        elements.markdownProposalPreview.innerHTML = marked.parse(md);
    } catch (e) {
        elements.markdownProposalPreview.innerHTML = `<pre>${md}</pre>`;
    }

    // Almacenar el markdown de forma local para la descarga
    elements.markdownProposalPreview.dataset.mdContent = md;
}

/**
 * Carga todos los términos de glosario desde la API
 */
async function loadGlossary() {
    try {
        const response = await apiFetch(endpoints.glossary);
        if (response && response.status === 'success') {
            glossaryTerms = response.data || [];
            updateGlossaryBadges();
            renderGlossaryTerms();
        }
    } catch (error) {
        console.error('Error cargando glosario en admin:', error);
        if (elements.termListContainer) {
            elements.termListContainer.innerHTML = '<p class="text-muted">Error al cargar términos de glosario.</p>';
        }
    }
}

/**
 * Actualiza los contadores (badges) de cada pestaña de glosario de 3 capas
 */
function updateGlossaryBadges() {
    let gobiernoCount = 0;
    let tecnicoCount = 0;
    let obtenidoCount = 0;

    glossaryTerms.forEach(term => {
        const cat = (term.categoria || '').toLowerCase();
        const conf = term.confianza || 'parcial';

        if (cat === 'negocio' || cat === 'sistema') {
            gobiernoCount++;
        } else if (cat === 'tecnico' || cat === 'acronimo') {
            tecnicoCount++;
        } else {
            obtenidoCount++;
        }
    });

    if (elements.badgeCountGobierno) elements.badgeCountGobierno.textContent = gobiernoCount;
    if (elements.badgeCountTecnico) elements.badgeCountTecnico.textContent = tecnicoCount;
    if (elements.badgeCountObtenido) elements.badgeCountObtenido.textContent = obtenidoCount;
}

/**
 * Renderiza los términos del glosario según la capa activa
 */
function renderGlossaryTerms() {
    if (!elements.termListContainer) return;

    elements.termListContainer.innerHTML = '';

    // Filtrar términos de la capa activa
    const filteredTerms = glossaryTerms.filter(term => {
        const cat = (term.categoria || '').toLowerCase();
        if (activeGlossaryTab === 'gobierno') {
            return cat === 'negocio' || cat === 'sistema';
        } else if (activeGlossaryTab === 'tecnico') {
            return cat === 'tecnico' || cat === 'acronimo';
        } else {
            // Obtenido (IA)
            return cat !== 'negocio' && cat !== 'sistema' && cat !== 'tecnico' && cat !== 'acronimo';
        }
    });

    // Si estamos en la capa "Obtenido (IA)", agregar componente interactivo superior para proponer términos
    if (activeGlossaryTab === 'obtenido') {
        const proposeForm = document.createElement('div');
        proposeForm.className = 'glosario-propose-box';
        proposeForm.style.cssText = `
            background: rgba(255, 255, 255, 0.02);
            border: 1px dashed rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        proposeForm.innerHTML = `
            <div style="font-size: 12px; font-weight: 600; color: var(--primary);">
                <i class="ri-magic-line"></i> Consultar Término Rápido con IA (Groq)
            </div>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="input-propose-term" class="input-custom" placeholder="Ej: Microservicios, Orquestación..." style="font-size: 12px; padding: 6px 10px; flex: 1;">
                <button id="btn-propose-term" class="btn btn-primary btn-sm" style="padding: 6px 12px; font-size: 11px;">
                    <i class="ri-ai-generate"></i> Proponer
                </button>
            </div>
        `;
        elements.termListContainer.appendChild(proposeForm);

        // Listener para proponer término rápido
        const btnPropose = proposeForm.querySelector('#btn-propose-term');
        const inputPropose = proposeForm.querySelector('#input-propose-term');
        
        btnPropose?.addEventListener('click', async () => {
            const termText = inputPropose?.value.trim();
            if (!termText) {
                showToast('Introduce un término para proponer a la IA', 'warning');
                return;
            }

            try {
                showToast('Consultando a IA Groq...', 'info');
                btnPropose.disabled = true;
                btnPropose.innerHTML = '<i class="ri-loader-4-line ri-spin"></i>';
                
                // Realizar llamada a api/glossary/propose
                const response = await apiFetch(endpoints.glossaryPropose, {
                    method: 'POST',
                    body: JSON.stringify({
                        termino: termText,
                        contexto: selectedRequest ? selectedRequest.idea : ''
                    })
                });

                if (response && response.status === 'success') {
                    showToast('Término generado por IA con éxito', 'success');
                    // Recargar glosario completo
                    await loadGlossary();
                } else {
                    throw new Error(response.error || 'Fallo en respuesta');
                }
            } catch (err) {
                console.error(err);
                showToast('Error al consultar término con la IA', 'error');
            } finally {
                if (btnPropose) {
                    btnPropose.disabled = false;
                    btnPropose.innerHTML = '<i class="ri-ai-generate"></i> Proponer';
                }
                if (inputPropose) inputPropose.value = '';
            }
        });
    }

    if (filteredTerms.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'text-muted';
        emptyMsg.style.cssText = 'text-align: center; padding: 20px; font-size: 13px;';
        emptyMsg.textContent = 'No hay términos en esta capa del glosario.';
        elements.termListContainer.appendChild(emptyMsg);
        return;
    }

    // Renderizar la lista de términos filtrados
    filteredTerms.forEach(t => {
        const card = document.createElement('div');
        card.className = 'term-card-premium';
        card.style.cssText = `
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            position: relative;
        `;

        // Si es capa Obtenido, agregar el botón interactivo "Confirmar y Elevar"
        let elevateButtonHtml = '';
        if (activeGlossaryTab === 'obtenido') {
            elevateButtonHtml = `
                <button class="btn-elevate-term" style="
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(40, 167, 69, 0.1);
                    color: #28a745;
                    border: 1px solid rgba(40, 167, 69, 0.2);
                    border-radius: 4px;
                    padding: 2px 8px;
                    font-size: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s ease;
                " title="Aprobar término y clasificar en Gobierno o Técnico">
                    <i class="ri-arrow-up-circle-line"></i> Confirmar y Elevar
                </button>
            `;
        }

        card.innerHTML = `
            ${elevateButtonHtml}
            <div style="font-weight: 600; font-size: 14px; color: var(--primary); margin-bottom: 4px; max-width: 75%;">${t.termino}</div>
            <div style="font-size: 12px; color: var(--dark-text-muted); line-height: 1.4; margin-bottom: 6px;">${t.definicion}</div>
            <div style="display: flex; gap: 15px; font-size: 10px; color: rgba(255,255,255,0.4);">
                <span>Categoría: <strong style="color: var(--text);">${t.categoria || 'N/A'}</strong></span>
                ${t.ejemplo ? `<span>Ejemplo: <strong style="color: var(--text);">${t.ejemplo}</strong></span>` : ''}
            </div>
        `;

        // Evento para elevar término
        if (activeGlossaryTab === 'obtenido') {
            card.querySelector('.btn-elevate-term')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await handleElevateGlossaryTerm(t);
            });
        }

        elements.termListContainer.appendChild(card);
    });
}

/**
 * Procesa la elevación e incorporación oficial de un término de glosario
 */
async function handleElevateGlossaryTerm(term) {
    // Crear un pequeño modal flotante para seleccionar categoría de destino
    const destCategory = prompt(`Elige la clasificación de destino para "${term.termino}":\nEscribe "gobierno" (para términos de negocio/sistema) o "tecnico" (para términos tecnológicos/acrónimos):`, "gobierno");
    
    if (!destCategory) return;
    
    const mappedCategory = destCategory.toLowerCase().trim() === 'tecnico' ? 'tecnico' : 'negocio';

    try {
        showToast('Elevando término de glosario...', 'info');
        
        // Llamar a endpoints.glossaryConfirm
        const response = await apiFetch(endpoints.glossaryConfirm, {
            method: 'POST',
            body: JSON.stringify({
                termino: term.termino,
                definicion: term.definicion,
                categoria: mappedCategory,
                ejemplo: term.ejemplo || '',
                fuente: 'Gobernanza de IA',
                confianza: 'consolidado'
            })
        });

        if (response && response.status === 'success') {
            showToast(`Término "${term.termino}" consolidado oficialmente como ${mappedCategory === 'tecnico' ? 'Técnico' : 'Gobierno'}`, 'success');
            await loadGlossary();
        } else {
            throw new Error(response.error || 'Fallo al confirmar');
        }
    } catch (err) {
        console.error(err);
        showToast('No se pudo elevar el término del glosario.', 'error');
    }
}

/**
 * Descarga el Markdown de la propuesta original
 */
function handleDownloadProposalMd() {
    if (!selectedRequest) return;
    const md = elements.markdownProposalPreview?.dataset.mdContent || '';
    
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `propuesta_${(selectedRequest.idea || 'triage').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Markdown de la propuesta descargado con éxito', 'success');
}

/**
 * Audita y aprueba una propuesta de triage, invocando la IA para generar la especificación IEEE 830
 */
async function handleApproveRequest() {
    if (!selectedRequest) return;

    const commentText = elements.adminComment?.value.trim() || '';
    const projectName = selectedRequest.idea || 'Especificación de Proyecto';

    // Mostrar overlay del spinner interactivo
    showLoadingOverlay('Generando especificación de software agéntica...', 'Invocando LLM Groq & Orquestador de Agentes...');

    try {
        const response = await apiFetch(endpoints.triageApprove, {
            method: 'POST',
            body: JSON.stringify({
                triage_id: selectedRequest.id,
                approver_id: state.user?.id || '00000000-0000-0000-0000-000000000000',
                comment: commentText,
                project_name: projectName
            })
        });

        if (response && response.status === 'success') {
            showToast('Especificación generada y aprobada correctamente', 'success');
            
            // Recargar la lista de propuestas para reflejar el estado aprobado
            await loadAdminTriage();
            
            // Volver a cargar los detalles, lo que automáticamente renderizará el visor de SDD
            const updatedReq = adminRequests.find(r => r.id === selectedRequest.id);
            if (updatedReq) {
                await loadRequestDetail(updatedReq);
            }
        } else {
            throw new Error(response.error || 'Fallo al aprobar triage');
        }
    } catch (error) {
        console.error(error);
        showToast('Error generando especificación agéntica', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Rechaza formalmente una solicitud de triage de forma auditada
 */
async function handleRejectRequest() {
    if (!selectedRequest) return;

    const commentText = elements.adminComment?.value.trim();
    if (!commentText) {
        showToast('El comentario/observación de auditoría es obligatorio para rechazar', 'warning');
        if (elements.adminComment) elements.adminComment.focus();
        return;
    }

    try {
        showToast('Rechazando propuesta...', 'info');
        const response = await apiFetch(endpoints.triageReject, {
            method: 'POST',
            body: JSON.stringify({
                triage_id: selectedRequest.id,
                approver_id: state.user?.id || '00000000-0000-0000-0000-000000000000',
                comment: commentText
            })
        });

        if (response && response.status === 'success') {
            showToast('Solicitud rechazada con auditoría registrada', 'success');
            await loadAdminTriage();
            
            const updatedReq = adminRequests.find(r => r.id === selectedRequest.id);
            if (updatedReq) {
                await loadRequestDetail(updatedReq);
            }
        } else {
            throw new Error(response.error || 'Fallo al rechazar triage');
        }
    } catch (err) {
        console.error(err);
        showToast('Error al registrar el rechazo de la solicitud', 'error');
    }
}

/**
 * Obtiene e inyecta la especificación agéntica (SDD) ya generada en el visor
 */
async function loadAssociatedSdd(specId) {
    if (!elements.sddViewerContainer || !elements.sddDocumentBody) return;

    elements.sddViewerContainer.style.display = 'block';
    elements.sddDocumentBody.innerHTML = `
        <div class="loading-state" style="padding: 48px; text-align: center;">
            <i class="ri-loader-4-line ri-spin" style="font-size: 32px; display: block; margin-bottom: 12px;"></i>
            <p style="font-size: 14px; color: var(--dark-text-muted);">Cargando documento SDD IEEE 830...</p>
        </div>
    `;

    try {
        const response = await apiFetch(`${endpoints.specifications}/${specId}`);
        if (response && response.status === 'success') {
            generatedSddSpec = response.data;
            
            // Renderizar Markdown formal
            const md = generatedSddSpec.markdown || '';
            elements.sddDocumentBody.innerHTML = marked.parse(md);

            // Generar la navegación lateral interna por encabezados (h2 y h3)
            generateSddInternalNavigation();
        } else {
            throw new Error('Fallo al cargar SDD');
        }
    } catch (error) {
        console.error(error);
        elements.sddDocumentBody.innerHTML = `
            <p style="color: var(--danger); text-align: center; padding: 24px;">No se pudo cargar la especificación técnica asociada.</p>
        `;
    }
}

/**
 * Genera la barra de navegación lateral dinámica para el visor de SDD
 */
function generateSddInternalNavigation() {
    if (!elements.sddSectionsNav || !elements.sddDocumentBody) return;

    elements.sddSectionsNav.innerHTML = '';
    
    // Obtener los encabezados h2 del documento
    const headers = elements.sddDocumentBody.querySelectorAll('h2');
    
    if (headers.length === 0) {
        elements.sddSectionsNav.innerHTML = '<span class="sdd-nav-link text-muted">Sin índice</span>';
        return;
    }

    headers.forEach((header, index) => {
        // Crear un ID único para anclaje si no tiene
        const sectionId = `sdd-sec-${index}`;
        header.id = sectionId;

        const navLink = document.createElement('a');
        navLink.href = `#${sectionId}`;
        navLink.className = `sdd-nav-link ${index === 0 ? 'active' : ''}`;
        
        // Copiar texto recortado de forma inteligente
        navLink.textContent = header.textContent;

        navLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Navegación suave scroll
            header.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Marcar activo en sidebar
            elements.sddSectionsNav.querySelectorAll('.sdd-nav-link').forEach(link => link.classList.remove('active'));
            navLink.classList.add('active');
        });

        elements.sddSectionsNav.appendChild(navLink);
    });
}

/**
 * Exporta el documento SDD actual a PDF corporativo premium
 */
async function handleExportSddPdf() {
    if (!generatedSddSpec) {
        showToast('No hay ninguna especificación técnica activa para exportar.', 'warning');
        return;
    }

    try {
        showToast('Generando PDF corporativo premium de GT Consulting...', 'info');
        
        // Importación dinámica con cache buster para forzar actualización del script
        const { exportToPDF } = await import(`./pdfExporter.js?v=${Date.now()}`);
        await exportToPDF(
            generatedSddSpec.title || selectedRequest?.idea || 'Especificación de Software',
            generatedSddSpec.markdown,
            generatedSddSpec
        );
        showToast('PDF corporativo generado con éxito', 'success');
    } catch (err) {
        console.error(err);
        showToast('No se pudo generar el PDF corporativo.', 'error');
    }
}

/**
 * Muestra el overlay de carga interactiva
 */
function showLoadingOverlay(title, subtitle) {
    let overlay = document.getElementById('admin-loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'admin-loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 10, 12, 0.92);
            backdrop-filter: blur(8px);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 20px;
            color: white;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 4px solid rgba(255, 255, 255, 0.05);
            border-top-color: var(--primary);
            animation: spin 1s linear infinite;
        "></div>
        <div style="text-align: center; max-width: 400px; padding: 0 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff, rgba(255,255,255,0.7)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${title}</h3>
            <p style="font-size: 13px; color: var(--dark-text-muted);">${subtitle}</p>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Oculta el overlay de carga interactiva
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('admin-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    document.body.style.overflow = '';
}

/**
 * Sincroniza una solicitud offline seleccionada con el servidor central
 */
async function handleSyncOfflineRequest() {
    if (!selectedRequest || !selectedRequest.offline) return;

    try {
        showLoadingOverlay('Sincronizando con base de datos...', 'Migrando datos locales a persistencia centralizada...');
        
        // Limpiar flags offline para enviar datos puros
        const cleanRequest = { ...selectedRequest };
        delete cleanRequest.offline;
        delete cleanRequest.id;
        delete cleanRequest.sectors;
        delete cleanRequest.statuses;
        delete cleanRequest.created_at;

        // Intentar guardar vía API
        const response = await apiFetch(endpoints.triage, {
            method: 'POST',
            body: JSON.stringify(cleanRequest)
        });

        if (response && response.status === 'success') {
            showToast('Propuesta sincronizada con éxito', 'success');
            
            // Eliminar de localStorage
            try {
                let offlineRequests = JSON.parse(localStorage.getItem('sf_offline_requests') || '[]');
                offlineRequests = offlineRequests.filter(req => req.request_id !== selectedRequest.request_id);
                localStorage.setItem('sf_offline_requests', JSON.stringify(offlineRequests));
            } catch (storageError) {
                console.error('Error al limpiar localStorage post-sync:', storageError);
            }

            // Recargar panel administrativo
            await loadAdminTriage();
            
            // Seleccionar el nuevo item si es posible
            if (response.data && response.data.id) {
                // Buscamos el nuevo objeto en la lista recargada
                const syncedReq = adminRequests.find(r => r.id === response.data.id);
                if (syncedReq) {
                    await loadRequestDetail(syncedReq);
                }
            }
        } else {
            throw new Error(response.error || 'Fallo en la sincronización');
        }
    } catch (error) {
        console.error('Error durante sincronización offline:', error);
        showToast('Error al sincronizar: ' + error.message, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Carga el backlog Agile asociado a la especificación activa
 */
async function loadAgileBacklog(specId) {
    const emptyState = document.getElementById('agile-empty-state');
    const backlogContent = document.getElementById('agile-backlog-content');
    const epicTitle = document.getElementById('agile-epic-title');
    const epicDesc = document.getElementById('agile-epic-desc');
    const storiesContainer = document.getElementById('agile-stories-container');

    if (!emptyState || !backlogContent) return;

    emptyState.style.display = 'none';
    backlogContent.style.display = 'none';
    
    let loader = document.getElementById('agile-loading-state');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'agile-loading-state';
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

            renderAgileStories(stories, storiesContainer);

            backlogContent.style.display = 'flex';
        } else {
            emptyState.style.display = 'flex';
        }
    } catch (err) {
        console.warn('Backlog no encontrado o error al cargar:', err);
        loader.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

/**
 * Genera el backlog Agile consultando al agente local experto en Agile Kanban
 */
async function handleGenerateAgileBacklog() {
    if (!generatedSddSpec) return;

    showLoadingOverlay('Agente Agile Kanban Consultando...', 'El agente experto está traduciendo la especificación técnica en Épicas e Historias de Usuario...');

    try {
        const response = await apiFetch(`/api/specifications/${generatedSddSpec.id}/agile`, {
            method: 'POST'
        });

        if (response && response.status === 'success') {
            showToast('Backlog Agile generado con éxito', 'success');
            await loadAgileBacklog(generatedSddSpec.id);
        } else {
            throw new Error(response.error || 'Error al generar el backlog');
        }
    } catch (err) {
        console.error('Error al generar backlog agile:', err);
        showToast('Error al generar el backlog con el Agente Agile', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Renderiza las User Stories en formato Kanban
 */
function renderAgileStories(stories, container) {
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

