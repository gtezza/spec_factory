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
        lastMsg.innerHTML = `He analizado tu intención técnica con Groq:
            <ul style="margin-top: 8px; padding-left: 15px;">
                <li><strong>Objetivo:</strong> ${result.goal}</li>
                <li><strong>Criticidad Sugerida:</strong> ${result.criticality}</li>
                <li><strong>ROI:</strong> ${result.roi}</li>
            </ul>
            He detectado ${result.terms.length} términos de gobernanza. ¿Deseas aplicarlos al requerimiento?`;
        
        aiTyping = false;
        
        if (!elements.textObjective.value) elements.textObjective.value = result.goal;
        if (!elements.inputRoi.value) elements.inputRoi.value = result.roi;
        elements.selectCriticality.value = result.criticality;
        
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
