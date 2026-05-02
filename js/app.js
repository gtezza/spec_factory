/**
 * Spec Factory | Analista de Triage y Gobernanza
 * Lógica Central v3.0 - Modular y Groq Powered
 */

import { state, elements } from './modules/state.js';
import { showToast, populateSelect, toggleModal } from './modules/ui.js';
import { checkSession, login, logout } from './modules/auth.js';
import { generateRequestId, saveRequest, runQualityAudit } from './modules/triage.js';
import { sendChatMessage } from './modules/ia.js';
import { handleNewTermSubmit } from './modules/glossary.js';

const SUPABASE_URL = APP_CONFIG.SUPABASE.URL;
const SUPABASE_KEY = APP_CONFIG.SUPABASE.ANON_KEY;
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadInitialData() {
    try {
        // Cargar Sectores
        const { data: sectors, error: errS } = await sbClient.from('sectors').select('*').order('name');
        if (errS) throw errS;
        state.sectors = sectors;
        populateSelect(elements.selectSector, sectors);

        // Cargar Estados
        const { data: statuses, error: errSt } = await sbClient.from('statuses').select('*').order('name');
        if (errSt) throw errSt;
        state.statuses = statuses;

        // Cargar Aprobadores (Corrección: Usar la API propia para evitar bloqueos de RLS)
        try {
            const result = await apiFetch(endpoints.approvers);
            if (result.status === 'success') {
                state.approvers = result.data;
                populateSelect(elements.selectApprover, result.data, 'full_name');
            }
        } catch (errA) {
            console.warn('Error cargando aprobadores via API:', errA);
        }

    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        showToast('Error al conectar con la base de datos.', 'error');
    }
}

function setupEventListeners() {
    // Auth
    elements.loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        login(email, password);
    });

    elements.btnLogout?.addEventListener('click', logout);

    // Triage
    elements.selectSector?.addEventListener('change', generateRequestId);
    elements.btnSaveRequest?.addEventListener('click', saveRequest);
    
    [elements.textObjective, elements.textBenefits, elements.inputRoi, elements.textIdea].forEach(el => {
        el?.addEventListener('blur', runQualityAudit);
    });

    elements.btnCloseWarning?.addEventListener('click', () => toggleModal(elements.modalWarning, false));

    // IA
    elements.btnSendChat?.addEventListener('click', sendChatMessage);
    elements.chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Glosario
    elements.btnAddTerm?.addEventListener('click', () => toggleModal(elements.modalTerm, true));
    elements.btnCancelTerm?.addEventListener('click', () => toggleModal(elements.modalTerm, false));
    elements.termForm?.addEventListener('submit', handleNewTermSubmit);
}

async function init() {
    console.log('Iniciando Sistema de Triage v3.0...');
    await checkSession();
    await loadInitialData();
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
