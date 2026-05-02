/**
 * Spec Factory | Lógica de Triage
 */
import { state, elements } from './state.js';
import { showToast, toggleModal } from './ui.js';

const SUPABASE_URL = APP_CONFIG.SUPABASE.URL;
const SUPABASE_KEY = APP_CONFIG.SUPABASE.ANON_KEY;
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export function generateRequestId() {
    const sectorId = elements.selectSector.value;
    const sector = state.sectors.find(s => s.id === sectorId);
    if (sector && sector.code) {
        const randomId = Math.floor(Math.random() * 90000) + 10000;
        const cleanCode = sector.code.trim().toUpperCase();
        const newId = `${cleanCode}-${randomId}`;
        elements.currentRequestId.innerText = newId;
        state.currentRequest.request_id = newId;
        state.currentRequest.sector_id = sectorId;
    } else {
        elements.currentRequestId.innerText = 'NUEVA SOLICITUD';
        state.currentRequest.request_id = null;
    }
}

export function runQualityAudit() {
    const alerts = [];
    if (!elements.textObjective.value.trim()) alerts.push('El Objetivo es mandatorio para la gobernanza.');
    if (!elements.inputRoi.value.trim()) alerts.push('Falta el cálculo de ROI estimado.');
    if (elements.textIdea.value.length < 50) alerts.push('La idea es muy breve, podría ser ambigua.');

    if (alerts.length > 0) {
        elements.auditContainer.style.display = 'block';
        elements.auditLog.innerHTML = alerts.map(a => `<li><i class="ri-error-warning-fill"></i> ${a}</li>`).join('');
    } else {
        elements.auditContainer.style.display = 'none';
    }
}

export async function saveRequest() {
    const req = {
        request_id: elements.currentRequestId.innerText,
        sector_id: elements.selectSector.value,
        status_id: state.statuses.find(s => s.name === 'BORRADOR')?.id,
        criticality: elements.selectCriticality.value,
        objective: elements.textObjective.value,
        benefits: elements.textBenefits.value,
        roi: elements.inputRoi.value,
        idea: elements.textIdea.value,
        creator_id: state.user?.id,
        requester_id: state.user?.id,
        approver_id: elements.selectApprover.value || null
    };

    if (!req.sector_id || !req.objective || !req.benefits) {
        toggleModal(elements.modalWarning, true);
        const missing = [];
        if (!req.sector_id) missing.push('Sector');
        if (!req.objective) missing.push('Objetivo');
        if (!req.benefits) missing.push('Beneficios');
        
        document.getElementById('warning-message').innerText = 
            `Para cumplir con la Gobernanza de GT Data, es obligatorio completar: ${missing.join(', ')}.`;
        return;
    }

    elements.btnSaveRequest.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Guardando...';
    elements.btnSaveRequest.disabled = true;

    try {
        const { data, error } = await sbClient.from('triage_requests').insert([req]).select();
        if (error) throw error;
        
        showToast(`Solicitud ${req.request_id} guardada con éxito.`, 'success');
    } catch (error) {
        showToast('Error al guardar: ' + error.message, 'error');
    } finally {
        elements.btnSaveRequest.innerHTML = '<i class="ri-save-3-line"></i> Guardar Borrador';
        elements.btnSaveRequest.disabled = false;
    }
}
