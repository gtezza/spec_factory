/**
 * Spec Factory | Analista de Triage y Gobernanza
 * Lógica Central v3.0 - Modular y Groq Powered
 */

import { state, elements } from './modules/state.js';
import { showToast, populateSelect, toggleModal } from './modules/ui.js';
import { checkSession, login, logout } from './modules/auth.js';
import { generateRequestId, saveRequest, runQualityAudit } from './modules/triage.js';
import { sendChatMessage } from './modules/ia.js';
import { apiFetch, endpoints } from './modules/api.js';
import { initAttachmentEvents } from './modules/attachments.js';
import { sbClient } from './modules/supabase.js';
import { initProjects, loadProjects } from './modules/projects.js';
import { initAdmin, loadAdminTriage } from './modules/admin.js';
import { initDashboard, loadDashboard } from './modules/dashboard.js';

function withTimeout(promise, timeoutMs = 1500) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), timeoutMs))
    ]);
}

async function loadInitialData() {
    // Cargar Sectores
    try {
        const { data: sectors, error: errS } = await withTimeout(sbClient.from('sectors').select('*').order('name'), 1500);
        if (errS) throw errS;
        state.sectors = sectors || [];
    } catch (error) {
        console.warn('Error cargando sectores de Supabase, utilizando fallback local:', error);
        state.sectors = [
            { id: '11111111-1111-1111-1111-111111111111', name: 'Arquitectura', code: 'ARQ' },
            { id: '22222222-2222-2222-2222-222222222222', name: 'Frontend', code: 'FRO' },
            { id: '33333333-3333-3333-3333-333333333333', name: 'Backend', code: 'BAC' },
            { id: '44444444-4444-4444-4444-444444444444', name: 'Seguridad', code: 'SEG' },
            { id: '55555555-5555-5555-5555-555555555555', name: 'QA', code: 'QAS' },
            { id: '66666666-6666-6666-6666-666666666666', name: 'DevOps', code: 'OPS' }
        ];
    }
    populateSelect(elements.selectSector, state.sectors);

    // Cargar Estados
    try {
        const { data: statuses, error: errSt } = await withTimeout(sbClient.from('statuses').select('*').order('name'), 1500);
        if (errSt) throw errSt;
        state.statuses = statuses || [];
    } catch (error) {
        console.warn('Error cargando estados de Supabase, utilizando fallback local:', error);
        state.statuses = [
            { id: '10101010-1010-1010-1010-101010101010', name: 'BORRADOR', color: '#94a3b8', is_initial: true },
            { id: 'd07e6f25-b619-4f30-a83a-040ba4deeab4', name: 'A APROBAR', color: '#3b82f6', is_initial: false },
            { id: '20202020-2020-2020-2020-202020202020', name: 'EN ANALISIS', color: '#6366f1', is_initial: false },
            { id: '30303030-3030-3030-3030-303030303030', name: 'PENDIENTE APROBACION', color: '#f59e0b', is_initial: false },
            { id: '40404040-4040-4040-4040-404040404040', name: 'APROBADO', color: '#10b981', is_initial: false },
            { id: '50505050-5050-5050-5050-505050505050', name: 'RECHAZADO', color: '#ef4444', is_initial: false }
        ];
    }

    // Cargar Aprobadores
    try {
        const result = await apiFetch(endpoints.approvers);
        if (result.status === 'success') {
            state.approvers = result.data;
        } else {
            throw new Error('Fallo en la respuesta de aprobadores');
        }
    } catch (errA) {
        console.warn('Error cargando aprobadores via API, utilizando fallback local:', errA);
        state.approvers = [
            { id: '00000000-0000-0000-0000-000000000000', full_name: 'Administrador Local (Modo Offline)' }
        ];
    }
    populateSelect(elements.selectApprover, state.approvers, 'full_name');
}

export function navigateSPA(targetViewId) {
    if (!state.user) {
        showToast('Debes iniciar sesión para navegar', 'error');
        return;
    }

    const views = [
        { id: 'dashboard', el: elements.viewDashboard, nav: elements.navDashboard },
        { id: 'triage', el: elements.viewTriage, nav: elements.navTriage },
        { id: 'projects', el: elements.viewProjects, nav: elements.navProjects },
        { id: 'admin', el: elements.viewAdmin, nav: elements.navAdmin }
    ];

    views.forEach(v => {
        if (v.el) v.el.style.display = 'none';
        if (v.nav) v.nav.classList.remove('active');
    });

    const activeView = views.find(v => v.id === targetViewId);
    if (activeView) {
        if (activeView.el) activeView.el.style.display = 'block';
        if (activeView.nav) activeView.nav.classList.add('active');

        // Actualizar Breadcrumb
        const breadcrumbSpan = document.getElementById('current-request-id');
        if (breadcrumbSpan) {
            breadcrumbSpan.innerText = targetViewId.toUpperCase();
        }

        // Disparar cargas según corresponda
        if (targetViewId === 'projects') {
            loadProjects();
        } else if (targetViewId === 'admin') {
            loadAdminTriage();
        } else if (targetViewId === 'dashboard') {
            loadDashboard();
        }
    }
}

function setupEventListeners() {
    elements.loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await login(email, password);
        if (state.user) {
            await loadInitialData();
            initDashboard();
            initProjects();
            initAdmin();
            navigateSPA('dashboard');
        }
    });

    elements.btnLogout?.addEventListener('click', logout);

    // Navegación SPA
    elements.navDashboard?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateSPA('dashboard');
    });
    elements.navTriage?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateSPA('triage');
    });
    elements.navProjects?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateSPA('projects');
    });
    elements.navAdmin?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateSPA('admin');
    });

    // Triage
    elements.selectSector?.addEventListener('change', generateRequestId);
    elements.btnSaveRequest?.addEventListener('click', () => saveRequest('BORRADOR'));
    elements.btnSubmitRequest?.addEventListener('click', () => saveRequest('A APROBAR'));
    
    [elements.textObjective, elements.textBenefits, elements.inputRoi, elements.textIdea].forEach(el => {
        el?.addEventListener('blur', runQualityAudit);
    });

    elements.btnCloseWarning?.addEventListener('click', () => toggleModal(elements.modalWarning, false));

    // IA
    elements.btnSendChat?.addEventListener('click', sendChatMessage);
    elements.chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Adjuntos
    initAttachmentEvents();
}

async function init() {
    console.log('Iniciando Sistema de Triage v3.0...');
    
    // CRÍTICO: Atar eventos primero para evitar la recarga de página por submit GET del form
    setupEventListeners();
    
    // Verificar si hay sesión guardada
    await checkSession();
    
    // Si ya está autenticado, cargar datos e inicializar vistas
    if (state.user) {
        await loadInitialData();
        initDashboard();
        initProjects();
        initAdmin();
        navigateSPA('dashboard');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
