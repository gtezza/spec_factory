/**
 * Spec Factory | Dashboard por Rol de Usuario y Administrador
 * Lógica de negocio y renderizado del Panel de Inicio
 */

import { state, elements } from './state.js';
import { showToast, toggleModal } from './ui.js';
import { apiFetch, endpoints } from './api.js';
import { navigateSPA } from '../app.js';

let dashboardIdeas = [];

/**
 * Inicializa el módulo del Dashboard
 */
export function initDashboard() {
    console.log('[DASHBOARD] Inicializando módulo de Dashboard...');
}

/**
 * Carga y renderiza el Dashboard según el rol del usuario
 */
export async function loadDashboard() {
    if (!state.user) return;
    
    const role = (state.user.role || state.user.role_name || '').toLowerCase();
    const isCcAdmin = role === 'admin' || role === 'administrador';
    
    // Actualizar banner de bienvenida
    const badgeText = isCcAdmin 
        ? '<span class="badge badge-danger" style="font-weight: 700; font-size: 11px;"><i class="ri-shield-user-line"></i> Administrador de Gobernanza</span>' 
        : '<span class="badge badge-info" style="font-weight: 700; font-size: 11px;"><i class="ri-user-smile-line"></i> Rol: Colaborador / Usuario</span>';
    
    if (elements.dashboardRoleBadge) {
        elements.dashboardRoleBadge.innerHTML = `Sesión activa: <strong>${state.user.email}</strong> • ${badgeText}`;
    }
    
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle) {
        welcomeTitle.innerHTML = `¡Hola, ${state.user.full_name || 'Usuario'}!`;
    }

    // Renderizar acciones rápidas en el banner
    renderQuickActions(isCcAdmin);

    // Renderizar loader en el área de contenido
    if (elements.dashboardContentArea) {
        elements.dashboardContentArea.innerHTML = `
            <div class="loading-state" style="padding: 48px; text-align: center;">
                <i class="ri-loader-4-line ri-spin" style="font-size: 32px; display: block; margin-bottom: 12px; color: var(--primary);"></i>
                <p style="color: var(--text-muted);">Cargando tu panel personalizado de Spec Factory...</p>
            </div>
        `;
    }

    try {
        // Cargar todas las solicitudes de triage
        const response = await apiFetch(endpoints.triage);
        if (response && response.status === 'success') {
            dashboardIdeas = response.data || [];
            
            // Incorporar borradores locales offline si existen
            try {
                const localRequests = JSON.parse(localStorage.getItem('sf_offline_requests') || '[]');
                localRequests.forEach(req => {
                    req.offline = true;
                    if (!req.id) req.id = `offline-${req.request_id || Date.now()}`;
                    if (!req.sectors) {
                        const sectorObj = state.sectors?.find(s => s.id === req.sector_id);
                        req.sectors = sectorObj || { name: 'General' };
                    }
                    if (!req.statuses) req.statuses = { name: 'BORRADOR' };
                });
                dashboardIdeas = [...localRequests, ...dashboardIdeas];
            } catch (e) {
                console.error('Error al procesar ideas offline en dashboard:', e);
            }
        }
    } catch (error) {
        console.warn('[DASHBOARD] Error cargando ideas del servidor, intentando fallback de localStorage:', error);
        // Fallback local robusto
        const localRequests = JSON.parse(localStorage.getItem('sf_offline_requests') || '[]');
        localRequests.forEach(req => {
            req.offline = true;
            if (!req.sectors) req.sectors = { name: 'General' };
            if (!req.statuses) req.statuses = { name: 'BORRADOR' };
        });
        dashboardIdeas = localRequests;
        showToast('Mostrando datos locales offline', 'info');
    }

    // Renderizar la vista correspondiente según el rol
    if (isCcAdmin) {
        renderAdminDashboard();
    } else {
        renderUserDashboard();
    }
}

/**
 * Renderiza los botones de acción rápida en el banner superior
 */
function renderQuickActions(isAdmin) {
    if (!elements.dashboardQuickActions) return;
    
    elements.dashboardQuickActions.innerHTML = '';
    
    // Botón para crear nueva idea (disponible para todos, ya que el admin también puede crear)
    const btnCreate = document.createElement('button');
    btnCreate.className = 'btn btn-primary';
    btnCreate.style.cssText = 'padding: 12px 20px; font-weight: 600; display: flex; align-items: center; gap: 8px; border-radius: 8px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); box-shadow: 0 4px 12px rgba(0, 82, 204, 0.2); transition: all 0.2s;';
    btnCreate.innerHTML = '<i class="ri-lightbulb-line" style="font-size: 18px;"></i> Crear Nueva Idea';
    btnCreate.addEventListener('click', () => {
        // Limpiar el estado de edición para iniciar una propuesta en blanco
        state.currentRequest = {
            id: null,
            sector_id: null,
            status_id: null,
            objective: '',
            benefits: '',
            roi: '',
            idea: '',
            priority: 'Media',
            sample_files: []
        };
        // Limpiar inputs del formulario
        if (elements.textObjective) elements.textObjective.value = '';
        if (elements.textBenefits) elements.textBenefits.value = '';
        if (elements.inputRoi) elements.inputRoi.value = '';
        if (elements.textIdea) elements.textIdea.value = '';
        if (elements.fileList) elements.fileList.innerHTML = '';
        
        // Resetear ID visual
        if (elements.currentRequestId) elements.currentRequestId.innerText = 'NUEVA SOLICITUD';
        if (elements.currentStatus) {
            elements.currentStatus.innerText = 'BORRADOR';
            elements.currentStatus.style.background = '#EBECF0';
            elements.currentStatus.style.color = '#42526E';
        }
        
        navigateSPA('triage');
    });
    
    elements.dashboardQuickActions.appendChild(btnCreate);

    if (isAdmin) {
        // Botón para ir al panel de gobernanza
        const btnAdmin = document.createElement('button');
        btnAdmin.className = 'btn btn-secondary';
        btnAdmin.style.cssText = 'padding: 12px 20px; font-weight: 600; display: flex; align-items: center; gap: 8px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white; transition: all 0.2s;';
        btnAdmin.innerHTML = '<i class="ri-settings-5-line" style="font-size: 18px;"></i> Panel de Gobernanza';
        btnAdmin.addEventListener('click', () => {
            navigateSPA('admin');
        });
        elements.dashboardQuickActions.appendChild(btnAdmin);
    }
}

/**
 * Renderiza el dashboard del Colaborador (Usuario estándar)
 */
function renderUserDashboard() {
    if (!elements.dashboardContentArea) return;

    // Filtrar ideas del usuario creador
    const myIdeas = dashboardIdeas.filter(idea => idea.creator_id === state.user.id || idea.requester_id === state.user.id);

    // Calcular contadores por estado
    let drafts = 0;
    let inApproval = 0;
    let rejected = 0;

    myIdeas.forEach(idea => {
        const statusName = (idea.statuses?.name || idea.status || 'BORRADOR').toUpperCase();
        if (statusName === 'BORRADOR') {
            drafts++;
        } else if (statusName === 'RECHAZADO') {
            rejected++;
        } else {
            // En aprobación: PENDIENTE, A APROBAR, PENDIENTE APROBACION, EN ANALISIS
            inApproval++;
        }
    });

    // Armar HTML del Dashboard de Usuario
    let html = `
        <!-- KPI METRICS GRID -->
        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            <div class="kpi-card card" style="background: linear-gradient(135deg, rgba(148,163,184,0.1) 0%, rgba(148,163,184,0.02) 100%); border-left: 5px solid #94a3b8; padding: 20px; border-radius: 12px; position: relative;">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Borradores</div>
                <div style="font-size: 32px; font-weight: 700; color: var(--text-main); margin-top: 8px;">${drafts}</div>
                <i class="ri-draft-line" style="position: absolute; right: 20px; bottom: 20px; font-size: 36px; opacity: 0.15; color: #94a3b8;"></i>
            </div>
            
            <div class="kpi-card card" style="background: linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.02) 100%); border-left: 5px solid #3b82f6; padding: 20px; border-radius: 12px; position: relative;">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">En aprobación</div>
                <div style="font-size: 32px; font-weight: 700; color: var(--text-main); margin-top: 8px;">${inApproval}</div>
                <i class="ri-time-line" style="position: absolute; right: 20px; bottom: 20px; font-size: 36px; opacity: 0.15; color: #3b82f6;"></i>
            </div>

            <div class="kpi-card card" style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%); border-left: 5px solid #ef4444; padding: 20px; border-radius: 12px; position: relative;">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Rechazadas</div>
                <div style="font-size: 32px; font-weight: 700; color: var(--text-main); margin-top: 8px;">${rejected}</div>
                <i class="ri-close-circle-line" style="position: absolute; right: 20px; bottom: 20px; font-size: 36px; opacity: 0.15; color: #ef4444;"></i>
            </div>
        </div>

        <!-- LISTA DE PROPUESTAS -->
        <div class="card" style="padding: 24px; border-radius: 16px;">
            <div class="card-title" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 8px;">
                    <i class="ri-list-unordered"></i> Mis Propuestas Creadas
                </span>
                <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Total: ${myIdeas.length} ideas</span>
            </div>
    `;

    if (myIdeas.length === 0) {
        html += `
            <div class="empty-state" style="padding: 48px 24px; text-align: center;">
                <i class="ri-creative-commons-zero" style="font-size: 48px; opacity: 0.2; margin-bottom: 12px; display: block;"></i>
                <p style="color: var(--text-muted); margin-bottom: 16px;">Aún no has creado ninguna propuesta de requerimiento técnico.</p>
                <button class="btn btn-primary" id="btn-dashboard-empty-create" style="margin: 0 auto;">
                    <i class="ri-lightbulb-line"></i> Comenzar con mi primera idea
                </button>
            </div>
        </div>`;
        elements.dashboardContentArea.innerHTML = html;
        
        document.getElementById('btn-dashboard-empty-create')?.addEventListener('click', () => {
            elements.dashboardQuickActions.querySelector('button')?.click();
        });
        return;
    }

    // Cabecera de la tabla
    html += `
        <div style="overflow-x: auto;">
            <table class="dashboard-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-weight: 600;">
                        <th style="padding: 12px 10px;">ID Propuesta</th>
                        <th style="padding: 12px 10px;">Idea de Negocio / Título</th>
                        <th style="padding: 12px 10px;">Sector</th>
                        <th style="padding: 12px 10px;">Prioridad</th>
                        <th style="padding: 12px 10px;">Estado</th>
                        <th style="padding: 12px 10px; text-align: right;">Acción</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Filas de datos
    myIdeas.forEach(idea => {
        const compactId = idea.offline ? idea.request_id : `REQ-${(idea.id || '0000').slice(0, 5).toUpperCase()}`;
        const statusName = (idea.statuses?.name || idea.status || 'BORRADOR').toUpperCase();
        const sectorName = idea.sectors?.name || 'General';
        const isDraft = statusName === 'BORRADOR';

        let badgeClass = 'badge-secondary';
        let customStyle = '';
        if (idea.offline) {
            badgeClass = 'badge-warning';
            customStyle = 'style="background: #f97316; color: #fff; font-weight: 700;"';
        } else if (statusName === 'APROBADO' || statusName === 'APROBADA') {
            badgeClass = 'badge-success';
        } else if (statusName === 'RECHAZADO') {
            badgeClass = 'badge-danger';
        } else {
            badgeClass = 'badge-warning';
        }

        let critBadgeClass = 'badge-secondary';
        if (idea.criticality === 'Alta' || idea.criticality === 'Crítica') {
            critBadgeClass = 'badge-danger';
        } else if (idea.criticality === 'Media') {
            critBadgeClass = 'badge-warning';
        }

        html += `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;" class="table-row-hover">
                <td style="padding: 14px 10px; font-weight: 700; color: var(--primary);">${compactId}</td>
                <td style="padding: 14px 10px; font-weight: 600; color: var(--text-main); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${idea.idea}</td>
                <td style="padding: 14px 10px; color: var(--text-muted);"><i class="ri-government-line"></i> ${sectorName}</td>
                <td style="padding: 14px 10px;"><span class="badge ${critBadgeClass}" style="font-size: 11px;">${idea.criticality || 'Media'}</span></td>
                <td style="padding: 14px 10px;"><span class="badge ${badgeClass}" ${customStyle}>${idea.offline ? 'LOCAL / OFFLINE' : statusName}</span></td>
                <td style="padding: 14px 10px; text-align: right;">
                    <button class="btn btn-action" data-id="${idea.id}" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; background: ${isDraft ? 'rgba(0, 82, 204, 0.1)' : 'rgba(255,255,255,0.06)'}; color: ${isDraft ? 'var(--primary)' : 'white'}; border: 1px solid ${isDraft ? 'rgba(0, 82, 204, 0.2)' : 'rgba(255,255,255,0.1)'};">
                        ${isDraft ? '<i class="ri-edit-line"></i> Editar' : '<i class="ri-eye-line"></i> Revisar'}
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    </div>`;

    elements.dashboardContentArea.innerHTML = html;

    // Vincular eventos a los botones de acción rápida
    elements.dashboardContentArea.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const ideaId = btn.dataset.id;
            const targetIdea = myIdeas.find(idea => idea.id === ideaId);
            if (targetIdea) {
                const statusName = (targetIdea.statuses?.name || targetIdea.status || 'BORRADOR').toUpperCase();
                if (statusName === 'BORRADOR') {
                    // Editar borrador
                    loadIdeaIntoTriageForm(targetIdea);
                } else {
                    // Ver reporte de lectura / revisión
                    showProposalReadonlyModal(targetIdea);
                }
            }
        });
    });
}

/**
 * Renderiza el dashboard del Administrador de Gobernanza
 */
function renderAdminDashboard() {
    if (!elements.dashboardContentArea) return;

    // 1. Mis propuestas creadas
    const myIdeas = dashboardIdeas.filter(idea => idea.creator_id === state.user.id);
    
    // 2. Propuestas en aprobación asignadas a mí
    const assignedIdeas = dashboardIdeas.filter(idea => {
        const isApprover = idea.approver_id === state.user.id;
        const statusName = (idea.statuses?.name || idea.status || 'BORRADOR').toUpperCase();
        const isPending = statusName === 'PENDIENTE' || statusName === 'PENDIENTE APROBACION' || statusName === 'A APROBAR' || statusName === 'A APROBACION';
        return isApprover && isPending;
    });

    let html = `
        <!-- KPI METRICS GRID -->
        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
            <div class="kpi-card card" style="background: linear-gradient(135deg, rgba(0,82,204,0.1) 0%, rgba(0,82,204,0.02) 100%); border-left: 5px solid var(--primary); padding: 20px; border-radius: 12px; position: relative;">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Mis Propuestas Creadas</div>
                <div style="font-size: 32px; font-weight: 700; color: var(--text-main); margin-top: 8px;">${myIdeas.length}</div>
                <i class="ri-user-add-line" style="position: absolute; right: 20px; bottom: 20px; font-size: 36px; opacity: 0.15; color: var(--primary);"></i>
            </div>
            
            <div class="kpi-card card" style="background: linear-gradient(135deg, rgba(255,171,0,0.1) 0%, rgba(255,171,0,0.02) 100%); border-left: 5px solid var(--warning); padding: 20px; border-radius: 12px; position: relative;">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Por Auditar / Asignadas</div>
                <div style="font-size: 32px; font-weight: 700; color: var(--text-main); margin-top: 8px;">${assignedIdeas.length}</div>
                <i class="ri-shield-flash-line" style="position: absolute; right: 20px; bottom: 20px; font-size: 36px; opacity: 0.15; color: var(--warning);"></i>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
            <!-- SECCIÓN: SOLICITUDES PENDIENTES DE AUDITORÍA (MÁS CRÍTICA) -->
            <div class="card" style="padding: 24px; border-radius: 16px; border-top: 4px solid var(--warning);">
                <div class="card-title" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        <i class="ri-shield-check-line" style="color: var(--warning);"></i> Pendientes de Triage y Aprobación
                    </span>
                    <span class="badge badge-warning" style="font-size: 11px; font-weight: 700;">${assignedIdeas.length} asignadas</span>
                </div>
    `;

    if (assignedIdeas.length === 0) {
        html += `
            <div class="empty-state" style="padding: 30px; text-align: center;">
                <i class="ri-checkbox-circle-line" style="font-size: 40px; color: var(--success); opacity: 0.5; margin-bottom: 8px; display: block;"></i>
                <p style="color: var(--text-muted); font-size: 13.5px;">No tienes solicitudes pendientes asignadas para tu revisión en este momento.</p>
            </div>
        </div>`;
    } else {
        html += `
            <div style="overflow-x: auto;">
                <table class="dashboard-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-weight: 600;">
                            <th style="padding: 10px 8px;">ID</th>
                            <th style="padding: 10px 8px;">Propuesta / Idea</th>
                            <th style="padding: 10px 8px;">Sector</th>
                            <th style="padding: 10px 8px;">Criticidad</th>
                            <th style="padding: 10px 8px;">Creador</th>
                            <th style="padding: 10px 8px; text-align: right;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        assignedIdeas.forEach(idea => {
            const compactId = `REQ-${(idea.id || '0000').slice(0, 5).toUpperCase()}`;
            const sectorName = idea.sectors?.name || 'General';
            const creatorName = idea.creator_id ? `Colaborador (${idea.creator_id.slice(0,8)})` : 'N/A';

            let critBadgeClass = 'badge-secondary';
            if (idea.criticality === 'Alta' || idea.criticality === 'Crítica') {
                critBadgeClass = 'badge-danger';
            } else if (idea.criticality === 'Media') {
                critBadgeClass = 'badge-warning';
            }

            html += `
                <tr style="border-bottom: 1px solid var(--border-color);" class="table-row-hover">
                    <td style="padding: 12px 8px; font-weight: 700; color: var(--primary);">${compactId}</td>
                    <td style="padding: 12px 8px; font-weight: 600; color: var(--text-main); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${idea.idea}</td>
                    <td style="padding: 12px 8px; color: var(--text-muted);"><i class="ri-government-line"></i> ${sectorName}</td>
                    <td style="padding: 12px 8px;"><span class="badge ${critBadgeClass}">${idea.criticality || 'Media'}</span></td>
                    <td style="padding: 12px 8px; font-size: 11.5px; color: var(--text-muted);">${creatorName}</td>
                    <td style="padding: 12px 8px; text-align: right;">
                        <button class="btn btn-primary btn-process-sdd" data-id="${idea.id}" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #FFAB00 0%, #E69B00 100%); color: #172B4D; border: none;">
                            <i class="ri-shield-flash-line"></i> Auditar y SDD
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    // 3. Mis propias ideas creadas como administrador
    html += `
        <div class="card" style="padding: 24px; border-radius: 16px; margin-top: 24px;">
            <div class="card-title" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 8px;">
                    <i class="ri-user-add-line"></i> Mis Propias Ideas Creadas
                </span>
                <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Total: ${myIdeas.length}</span>
            </div>
    `;

    if (myIdeas.length === 0) {
        html += `
            <div class="empty-state" style="padding: 30px; text-align: center;">
                <p style="color: var(--text-muted); font-size: 13.5px;">No has creado propuestas como autor todavía.</p>
            </div>
        </div>`;
    } else {
        html += `
            <div style="overflow-x: auto;">
                <table class="dashboard-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-weight: 600;">
                            <th style="padding: 10px 8px;">ID</th>
                            <th style="padding: 10px 8px;">Propuesta</th>
                            <th style="padding: 10px 8px;">Sector</th>
                            <th style="padding: 10px 8px;">Prioridad</th>
                            <th style="padding: 10px 8px;">Estado</th>
                            <th style="padding: 10px 8px; text-align: right;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        myIdeas.forEach(idea => {
            const compactId = `REQ-${(idea.id || '0000').slice(0, 5).toUpperCase()}`;
            const sectorName = idea.sectors?.name || 'General';
            const statusName = (idea.statuses?.name || idea.status || 'BORRADOR').toUpperCase();
            const isDraft = statusName === 'BORRADOR';

            let badgeClass = 'badge-secondary';
            if (statusName === 'APROBADO' || statusName === 'APROBADA') {
                badgeClass = 'badge-success';
            } else if (statusName === 'RECHAZADO') {
                badgeClass = 'badge-danger';
            } else {
                badgeClass = 'badge-warning';
            }

            html += `
                <tr style="border-bottom: 1px solid var(--border-color);" class="table-row-hover">
                    <td style="padding: 12px 8px; font-weight: 700; color: var(--primary);">${compactId}</td>
                    <td style="padding: 12px 8px; font-weight: 600; color: var(--text-main); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${idea.idea}</td>
                    <td style="padding: 12px 8px; color: var(--text-muted);"><i class="ri-government-line"></i> ${sectorName}</td>
                    <td style="padding: 12px 8px;"><span class="badge badge-secondary">${idea.criticality || 'Media'}</span></td>
                    <td style="padding: 12px 8px;"><span class="badge ${badgeClass}">${statusName}</span></td>
                    <td style="padding: 12px 8px; text-align: right;">
                        <button class="btn btn-action-admin" data-id="${idea.id}" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.06); color: white; border: 1px solid rgba(255,255,255,0.1);">
                            ${isDraft ? '<i class="ri-edit-line"></i> Editar' : '<i class="ri-eye-line"></i> Revisar'}
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    elements.dashboardContentArea.innerHTML = html;

    // Vincular eventos para botones de Mis Propias Ideas
    elements.dashboardContentArea.querySelectorAll('.btn-action-admin').forEach(btn => {
        btn.addEventListener('click', () => {
            const ideaId = btn.dataset.id;
            const targetIdea = myIdeas.find(idea => idea.id === ideaId);
            if (targetIdea) {
                const statusName = (targetIdea.statuses?.name || targetIdea.status || 'BORRADOR').toUpperCase();
                if (statusName === 'BORRADOR') {
                    loadIdeaIntoTriageForm(targetIdea);
                } else {
                    showProposalReadonlyModal(targetIdea);
                }
            }
        });
    });

    // Vincular eventos para botones de "Auditar y SDD"
    elements.dashboardContentArea.querySelectorAll('.btn-process-sdd').forEach(btn => {
        btn.addEventListener('click', async () => {
            const ideaId = btn.dataset.id;
            const targetIdea = assignedIdeas.find(idea => idea.id === ideaId);
            if (targetIdea) {
                showToast('Redirigiendo al panel de gobernanza...', 'info');
                
                // Importar dinámicamente el módulo de administración si fuera necesario
                const { loadAdminTriage } = await import('./admin.js');
                
                // Navegar a la sección de administración de SPA
                navigateSPA('admin');
                
                // Esperar a que se carguen las propuestas y seleccionar la deseada
                setTimeout(() => {
                    const adminListContainer = document.getElementById('admin-requests-list');
                    if (adminListContainer) {
                        const items = adminListContainer.querySelectorAll('.admin-request-item');
                        items.forEach(item => {
                            // Buscar por ID compacto o idea
                            if (item.innerHTML.includes(targetIdea.idea) || item.innerHTML.includes(targetIdea.id.slice(0, 4).toUpperCase())) {
                                item.click();
                                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        });
                    }
                }, 400);
            }
        });
    });
}

/**
 * Carga una propuesta (borrador) existente directamente en el formulario de Triage para editar
 */
export function loadIdeaIntoTriageForm(idea) {
    if (!elements.viewTriage || !elements.viewDashboard) return;

    showToast(`Cargando borrador para editar: ${idea.idea.slice(0, 20)}...`, 'info');
    
    // Registrar el ID de la solicitud actual que estamos editando en el estado global
    state.currentRequest = {
        id: idea.id,
        request_id: idea.request_id || `REQ-${idea.id.slice(0,5).toUpperCase()}`,
        sector_id: idea.sector_id,
        status_id: idea.status_id,
        objective: idea.objective || '',
        benefits: idea.benefits || '',
        roi: idea.roi || '',
        idea: idea.idea || '',
        priority: idea.criticality || 'Media',
        sample_files: idea.sample_files || []
    };

    // Poblar los inputs del DOM
    if (elements.currentRequestId) elements.currentRequestId.innerText = state.currentRequest.request_id;
    if (elements.selectSector) elements.selectSector.value = idea.sector_id || '';
    if (elements.selectCriticality) elements.selectCriticality.value = idea.criticality || 'Media';
    if (elements.selectApprover) elements.selectApprover.value = idea.approver_id || '';
    if (elements.textObjective) elements.textObjective.value = idea.objective || '';
    if (elements.textBenefits) elements.textBenefits.value = idea.benefits || '';
    if (elements.inputRoi) elements.inputRoi.value = idea.roi || '';
    if (elements.textIdea) elements.textIdea.value = idea.idea || '';
    
    if (elements.currentStatus) {
        const statusName = (idea.statuses?.name || idea.status || 'BORRADOR').toUpperCase();
        elements.currentStatus.innerText = statusName;
        elements.currentStatus.style.background = '#DEEBFF';
        elements.currentStatus.style.color = 'var(--primary)';
    }

    // Renderizar archivos adjuntos si existen
    if (elements.fileList) {
        elements.fileList.innerHTML = '';
        if (state.currentRequest.sample_files.length > 0) {
            state.currentRequest.sample_files.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <div class="file-info">
                        <i class="ri-file-text-line"></i>
                        <span class="file-name" title="${file.name}">${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div class="file-actions">
                        <span class="btn-remove-file" data-index="${index}"><i class="ri-delete-bin-line"></i></span>
                    </div>
                `;
                elements.fileList.appendChild(item);
            });
            
            // Vincular eliminador de archivos
            elements.fileList.querySelectorAll('.btn-remove-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(btn.dataset.index);
                    state.currentRequest.sample_files.splice(idx, 1);
                    loadIdeaIntoTriageForm(idea); // Recargar
                });
            });
        }
    }

    // Navegar de forma interactiva a la sección Triage
    navigateSPA('triage');
}

/**
 * Muestra un modal elegante en modo lectura para revisar una idea enviada/aprobada/rechazada
 */
function showProposalReadonlyModal(idea) {
    // Remover modal anterior si existe
    const existingModal = document.querySelector('.modal-overlay-readonly');
    if (existingModal) existingModal.remove();

    // Crear overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay modal-overlay-readonly';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(9, 30, 66, 0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1100; animation: fadeIn 0.3s ease-out;';

    // Contenedor
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: var(--dark-surface); border: 1px solid var(--dark-glass-border); color: var(--dark-text-main); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); width: 680px; max-width: 95%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; padding: 0; animation: modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);';

    const compactId = idea.offline ? idea.request_id : `REQ-${(idea.id || '0000').slice(0, 5).toUpperCase()}`;
    const sectorName = idea.sectors?.name || 'General';
    const statusName = (idea.statuses?.name || idea.status || 'PENDIENTE').toUpperCase();

    let badgeClass = 'badge-warning';
    if (statusName === 'APROBADO' || statusName === 'APROBADA') {
        badgeClass = 'badge-success';
    } else if (statusName === 'RECHAZADO') {
        badgeClass = 'badge-danger';
    }

    modalContent.innerHTML = `
        <div style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <div>
                <span style="font-size: 11px; font-weight: 700; color: var(--primary); letter-spacing: 0.5px;">${compactId} / Sector: ${sectorName}</span>
                <h3 style="font-size: 18px; font-weight: 600; margin-top: 4px; color: white;">Revisión de Propuesta</h3>
            </div>
            <span class="badge ${badgeClass}" style="padding: 6px 12px; font-size: 11px; font-weight: 700;">${statusName}</span>
        </div>
        <div style="padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px;">
            <div>
                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">La Idea (Lenguaje Natural)</div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 14px; border-radius: 8px; font-size: 13.5px; line-height: 1.6; color: rgba(255,255,255,0.95); white-space: pre-wrap;">${idea.idea}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Objetivo del Sistema</div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.8); min-height: 80px; white-space: pre-wrap;">${idea.objective || 'No especificado.'}</div>
                </div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Beneficios Esperados</div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.8); min-height: 80px; white-space: pre-wrap;">${idea.benefits || 'No especificado.'}</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">ROI Estimado</div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 13px; color: rgba(255,255,255,0.85);">${idea.roi || 'No calculado.'}</div>
                </div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Prioridad / Criticidad</div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 13px; color: rgba(255,255,255,0.85);">${idea.criticality || 'Media'}</div>
                </div>
            </div>
            
            ${idea.metadata && idea.metadata.rejection_comment ? `
                <div style="border-top: 1px solid rgba(239,68,68,0.2); padding-top: 15px;">
                    <div style="font-size: 11px; font-weight: 700; color: #ef4444; text-transform: uppercase; margin-bottom: 6px;"><i class="ri-error-warning-line"></i> Motivo del Rechazo (Auditoría)</div>
                    <div style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.15); padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: #fca5a5;">${idea.metadata.rejection_comment}</div>
                </div>
            ` : ''}

            ${idea.metadata && idea.metadata.approval_comment ? `
                <div style="border-top: 1px solid rgba(16,185,129,0.2); padding-top: 15px;">
                    <div style="font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; margin-bottom: 6px;"><i class="ri-checkbox-circle-line"></i> Feedback de Aprobación (Gobernanza)</div>
                    <div style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.15); padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: #a7f3d0;">${idea.metadata.approval_comment}</div>
                </div>
            ` : ''}
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.06); text-align: right; background: rgba(0,0,0,0.2);">
            <button class="btn btn-secondary btn-close-readonly" style="padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: white;">Entendido / Cerrar</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Bloquear scroll
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
        modalOverlay.remove();
        document.body.style.overflow = '';
    };

    modalContent.querySelector('.btn-close-readonly').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}
