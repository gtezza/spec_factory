/**
 * Spec Factory | Lógica de Triage
 */
import { state, elements } from './state.js';
import { showToast, toggleModal } from './ui.js';

import { sbClient } from './supabase.js';

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

export async function saveRequest(statusName = 'BORRADOR') {
    const isSubmit = statusName === 'A APROBAR';
    const statusObj = state.statuses.find(s => s.name === statusName);
    
    const req = {
        request_id: elements.currentRequestId.innerText,
        sector_id: elements.selectSector.value,
        status_id: statusObj?.id,
        criticality: elements.selectCriticality.value,
        objective: elements.textObjective.value,
        benefits: elements.textBenefits.value,
        roi: elements.inputRoi.value,
        idea: elements.textIdea.value,
        creator_id: state.user?.id,
        requester_id: state.user?.id,
        approver_id: elements.selectApprover.value || null,
        sample_files: state.currentRequest.sample_files || []
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

    const targetBtn = isSubmit ? elements.btnSubmitRequest : elements.btnSaveRequest;
    const originalText = isSubmit ? '<i class="ri-send-plane-fill"></i> Enviar a Aprobar' : '<i class="ri-save-3-line"></i> Guardar Borrador';
    const loadingText = isSubmit ? '<i class="ri-loader-4-line ri-spin"></i> Enviando...' : '<i class="ri-loader-4-line ri-spin"></i> Guardando...';

    if (targetBtn) {
        targetBtn.innerHTML = loadingText;
        targetBtn.disabled = true;
    }

    try {
        const { data, error } = await sbClient.from('triage_requests').insert([req]).select();
        if (error) throw error;
        
        const successMessage = isSubmit 
            ? `Solicitud ${req.request_id} enviada con éxito para la aprobación de la administración.`
            : `Solicitud ${req.request_id} guardada con éxito como BORRADOR.`;
            
        showToast(successMessage, 'success');
        
        // Si fue enviado con éxito, podemos generar un nuevo ID de requerimiento para el siguiente
        if (isSubmit) {
            generateRequestId();
            // Limpiar campos para la siguiente idea
            if (elements.textObjective) elements.textObjective.value = '';
            if (elements.textBenefits) elements.textBenefits.value = '';
            if (elements.inputRoi) elements.inputRoi.value = '';
            if (elements.textIdea) elements.textIdea.value = '';
            if (elements.fileList) elements.fileList.innerHTML = '';
            state.currentRequest.sample_files = [];
            runQualityAudit();
        }
    } catch (error) {
        console.warn('Fallo al guardar en base de datos central, guardando localmente...', error);
        try {
            const offlineRequests = JSON.parse(localStorage.getItem('sf_offline_requests') || '[]');
            offlineRequests.push({ ...req, created_at: new Date().toISOString(), offline: true });
            localStorage.setItem('sf_offline_requests', JSON.stringify(offlineRequests));
            showToast(`Modo Offline: Solicitud ${req.request_id} guardada localmente en el navegador.`, 'success');
        } catch (storageError) {
            showToast('Error al guardar localmente: ' + storageError.message, 'error');
        }
    } finally {
        if (targetBtn) {
            targetBtn.innerHTML = originalText;
            targetBtn.disabled = false;
        }
    }
}
