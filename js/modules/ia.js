/**
 * Spec Factory | Inteligencia Artificial (IA)
 */
import { elements } from './state.js';
import { apiFetch, endpoints } from './api.js';
import { runQualityAudit } from './triage.js';

let aiTyping = false;

export async function sendChatMessage() {
    const text = elements.chatInput.value.trim();
    if (!text || aiTyping) return;

    addMessage('user', text);
    elements.chatInput.value = '';
    
    aiTyping = true;
    addMessage('ai', '<i class="ri-loader-4-line ri-spin"></i> Consultando Engine de Arquitectura de GT Data Consulting...');
    
    try {
        const sourceText = elements.textIdea.value.trim() || text;
        const result = await apiFetch(endpoints.analyzeVibe, {
            method: 'POST',
            body: JSON.stringify({ text: sourceText })
        });
        
        const lastMsg = elements.chatMessages.lastElementChild;
        let htmlResponse = `
            <div class="ai-analysis-report">
                <h4 style="color: var(--primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i class="ri-shield-check-line"></i> Reporte de Triage Técnico
                </h4>
                
                <div class="ai-section">
                    <strong><i class="ri-focus-3-line"></i> Objetivo (IEEE 830):</strong>
                    <p style="font-size: 13px; margin: 4px 0 12px; color: var(--text-main);">${result.goal}</p>
                </div>

                <div class="ai-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
                    <div class="ai-section">
                        <strong><i class="ri-alert-line"></i> Criticidad:</strong>
                        <p style="font-size: 12px; margin-top: 4px;">${result.criticality}</p>
                    </div>
                    <div class="ai-section">
                        <strong><i class="ri-funds-line"></i> Viabilidad/ROI:</strong>
                        <p style="font-size: 12px; margin-top: 4px;">${result.roi}</p>
                    </div>
                </div>`;

        if (result.questions && result.questions.length > 0) {
            htmlResponse += `
            <div class="ai-section" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                <strong style="color: var(--primary);"><i class="ri-questionnaire-line"></i> Discovery de Ingeniería:</strong>
                <ul style="margin: 8px 0; padding-left: 18px; font-size: 12px; color: var(--text-main); display: flex; flex-direction: column; gap: 6px;">
                    ${result.questions.map(q => `<li>${q}</li>`).join('')}
                </ul>
            </div>`;
        }

        if (result.risks && result.risks.length > 0) {
            htmlResponse += `
            <div class="ai-section" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                <strong style="color: var(--danger);"><i class="ri-error-warning-line"></i> Riesgos y Mitigación:</strong>
                <ul style="margin: 8px 0; padding-left: 18px; font-size: 12px; color: var(--text-main); display: flex; flex-direction: column; gap: 6px;">
                    ${result.risks.map(r => `<li><strong>${r.risk}:</strong> ${r.mitigation}</li>`).join('')}
                </ul>
            </div>`;
        }

        if (result.suggestions && result.suggestions.length > 0) {
            htmlResponse += `
            <div class="ai-section" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                <strong style="color: var(--success);"><i class="ri-magic-line"></i> Evolución Arquitectónica:</strong>
                <ul style="margin: 8px 0; padding-left: 18px; font-size: 12px; color: var(--text-main); display: flex; flex-direction: column; gap: 6px;">
                    ${result.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>`;
        }

        htmlResponse += `</div>`;
        lastMsg.innerHTML = htmlResponse;
        
        aiTyping = false;
        
        // Auto-completar campos si están vacíos
        if (!elements.textObjective.value.trim()) elements.textObjective.value = result.goal;
        if (!elements.inputRoi.value.trim()) elements.inputRoi.value = result.roi;
        
        // Mapear criticidad al select (limpiar string si viene con justificación)
        const critLower = result.criticality.toLowerCase();
        if (critLower.includes('crítica')) elements.selectCriticality.value = 'Crítica';
        else if (critLower.includes('alta')) elements.selectCriticality.value = 'Alta';
        else if (critLower.includes('media')) elements.selectCriticality.value = 'Media';
        else if (critLower.includes('baja')) elements.selectCriticality.value = 'Baja';
        
        runQualityAudit();
        
    } catch (error) {
        console.error('Error en análisis IA:', error);
        const lastMsg = elements.chatMessages.lastElementChild;
        lastMsg.innerHTML = `<i class="ri-error-warning-line"></i> Error al conectar con el motor de IA de Groq. Verifique logs del servidor.`;
        aiTyping = false;
    }
}

export function addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `message message-${sender}`;
    div.innerHTML = text;
    elements.chatMessages.appendChild(div);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}
