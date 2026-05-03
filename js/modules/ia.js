/**
 * Spec Factory | Inteligencia Artificial (IA)
 */
import { elements } from './state.js';
import { apiFetch, endpoints } from './api.js';
import { updateDictionary } from './glossary.js';
import { runQualityAudit } from './triage.js';

let aiTyping = false;

export async function sendChatMessage() {
    const text = elements.chatInput.value.trim();
    if (!text || aiTyping) return;

    addMessage('user', text);
    elements.chatInput.value = '';
    
    aiTyping = true;
    addMessage('ai', '<i class="ri-loader-4-line ri-spin"></i> Analizando "Vibe Coding" con Groq según políticas de GT Data...');
    
    try {
        const sourceText = elements.textIdea.value.trim() || text;
        const result = await apiFetch(endpoints.analyzeVibe, {
            method: 'POST',
            body: JSON.stringify({ text: sourceText })
        });
        
        const lastMsg = elements.chatMessages.lastElementChild;
        let htmlResponse = `He analizado tu intención técnica con Groq:
            <ul style="margin-top: 8px; padding-left: 15px; font-size: 13px;">
                <li><strong>Objetivo:</strong> ${result.goal}</li>
                <li><strong>Criticidad Sugerida:</strong> ${result.criticality}</li>
                <li><strong>ROI:</strong> ${result.roi}</li>
            </ul>`;

        if (result.questions && result.questions.length > 0) {
            htmlResponse += `
            <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                <strong style="color: var(--primary);"><i class="ri-question-line"></i> Preguntas de Clarificación:</strong>
                <ul style="margin-top: 5px; padding-left: 15px; font-size: 12px; color: #ced4da;">
                    ${result.questions.map(q => `<li>${q}</li>`).join('')}
                </ul>
            </div>`;
        }

        if (result.suggestions && result.suggestions.length > 0) {
            htmlResponse += `
            <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                <strong style="color: #2ecc71;"><i class="ri-lightbulb-line"></i> Sugerencias de Mejora:</strong>
                <ul style="margin-top: 5px; padding-left: 15px; font-size: 12px; color: #ced4da;">
                    ${result.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>`;
        }

        htmlResponse += `<p style="margin-top: 15px; font-size: 11px;">He detectado ${result.terms.length} términos de gobernanza. ¿Deseas aplicarlos?</p>`;
        
        lastMsg.innerHTML = htmlResponse;
        
        aiTyping = false;
        
        if (!elements.textObjective.value) elements.textObjective.value = result.goal;
        if (!elements.inputRoi.value) elements.inputRoi.value = result.roi;
        elements.selectCriticality.value = result.criticality;
        
        // Actualizar términos en segundo plano (aunque el widget no sea visible)
        await updateDictionary(result.terms);
        runQualityAudit();
        
    } catch (error) {
        console.error('Error en análisis IA:', error);
        const lastMsg = elements.chatMessages.lastElementChild;
        lastMsg.innerHTML = `<i class="ri-error-warning-line"></i> Error al conectar con el motor de IA de Groq.`;
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
