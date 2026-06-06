/**
 * Spec Factory | Inteligencia Artificial (IA)
 */
import { elements } from './state.js';
import { apiFetch, endpoints } from './api.js';
import { runQualityAudit } from './triage.js';
import { showToast } from './ui.js';

let aiTyping = false;

export async function analyzeIdea(isRefinement = false) {
    const ideaText = elements.textIdea.value.trim();
    if (!ideaText) {
        showToast('Por favor, escribe tu idea en la columna central antes de iniciar el análisis.', 'warning');
        return;
    }
    
    if (aiTyping) return;

    // Recopilar respuestas si es un refinamiento
    let userAnswers = [];
    if (isRefinement) {
        document.querySelectorAll('.question-item').forEach(item => {
            const question = item.querySelector('.question-text').innerText;
            const answer = item.querySelector('.question-input').value.trim();
            if (answer) {
                userAnswers.push({ question, answer });
            }
        });
        
        if (userAnswers.length === 0) {
            showToast('Por favor, responde al menos una pregunta para refinar el análisis.', 'info');
            return;
        }
    }
    
    aiTyping = true;
    
    const originalBtnHTML = elements.btnAnalyzeIdea ? elements.btnAnalyzeIdea.innerHTML : '';
    if (elements.btnAnalyzeIdea) {
        elements.btnAnalyzeIdea.disabled = true;
        elements.btnAnalyzeIdea.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Procesando...`;
    }

    const loadingText = isRefinement ? 'Refinando análisis técnico con tus respuestas...' : 'Consultando Engine de Arquitectura de GT Data Consulting...';
    if (elements.analysisReportContainer) {
        elements.analysisReportContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; gap: 15px;">
                <i class="ri-loader-4-line ri-spin" style="font-size: 40px; color: var(--primary);"></i>
                <span style="font-size: 13px; color: var(--text-muted);">${loadingText}</span>
            </div>
        `;
    }
    
    try {
        const result = await apiFetch(endpoints.analyzeVibe, {
            method: 'POST',
            body: JSON.stringify({ 
                text: ideaText,
                answers: userAnswers
            })
        });
        
        if (elements.analysisReportContainer) {
            renderAnalysisReport(result, elements.analysisReportContainer);
        }
        
        // Auto-completar campos si están vacíos
        if (!elements.textObjective.value.trim()) elements.textObjective.value = result.goal;
        if (!elements.inputRoi.value.trim()) elements.inputRoi.value = result.roi;
        
        // Mapear criticidad
        const critLower = result.criticality.toLowerCase();
        if (critLower.includes('crítica')) elements.selectCriticality.value = 'Crítica';
        else if (critLower.includes('alta')) elements.selectCriticality.value = 'Alta';
        else if (critLower.includes('media')) elements.selectCriticality.value = 'Media';
        else if (critLower.includes('baja')) elements.selectCriticality.value = 'Baja';
        
        runQualityAudit();
        
    } catch (error) {
        console.error('Error en análisis IA:', error);
        if (elements.analysisReportContainer) {
            elements.analysisReportContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; gap: 12px; color: var(--danger); text-align: center;">
                    <i class="ri-error-warning-line" style="font-size: 36px;"></i>
                    <span style="font-size: 13px;">Error al conectar con el motor de IA. Por favor, reintenta.</span>
                </div>
            `;
        }
    } finally {
        if (elements.btnAnalyzeIdea) {
            elements.btnAnalyzeIdea.disabled = false;
            elements.btnAnalyzeIdea.innerHTML = originalBtnHTML;
        }
        aiTyping = false;
    }
}

export async function sendChatMessage() {
    return analyzeIdea(false);
}

function renderAnalysisReport(result, container) {
    let htmlResponse = `
        <div class="ai-analysis-report">
            <h4 style="color: var(--primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="ri-shield-check-line"></i> Reporte de Triage Técnico ${result.is_refined ? '(Refinado)' : ''}
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
        <div class="ai-section discovery-section" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
            <strong style="color: var(--primary);"><i class="ri-questionnaire-line"></i> Discovery de Ingeniería (Responde para refinar):</strong>
            <div class="questions-container" style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;">
                ${result.questions.map((q, i) => `
                    <div class="question-item" style="position: relative; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 3px solid var(--primary);">
                        <button onclick="this.parentElement.remove()" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 14px;" title="Descartar pregunta">
                            <i class="ri-close-line"></i>
                        </button>
                        <div class="question-text" style="font-size: 12px; margin-bottom: 6px; font-weight: 500; padding-right: 20px;">${q}</div>
                        <textarea class="question-input" placeholder="Tu respuesta..." style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: white; font-size: 11px; padding: 6px; resize: none;" rows="2"></textarea>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button class="btn-refine" onclick="document.dispatchEvent(new CustomEvent('requestRefinement'))" style="flex: 1; padding: 10px; background: var(--primary); border: none; border-radius: 8px; color: white; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.3s; box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);">
                    <i class="ri-refresh-line"></i> Refinar Análisis
                </button>
                <button class="btn-integrate" onclick="document.dispatchEvent(new CustomEvent('integrateAnswers', { detail: { button: this } }))" style="flex: 1; padding: 10px; background: var(--success); border: none; border-radius: 8px; color: white; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.3s; box-shadow: 0 4px 15px rgba(var(--success-rgb), 0.3);">
                    <i class="ri-chat-check-line"></i> Integrar al Vibe
                </button>
            </div>
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
    container.innerHTML = htmlResponse;
}

function integrateAnswersToIdea(event) {
    const answered = [];
    const container = document.querySelector('.questions-container');
    
    if (!container) return;

    container.querySelectorAll('.question-item').forEach(item => {
        const question = item.querySelector('.question-text').innerText;
        const answer = item.querySelector('.question-input').value.trim();
        if (answer) {
            answered.push({ question, answer });
        }
    });

    if (answered.length === 0) {
        showToast('Por favor, responde al menos una pregunta antes de integrar.', 'info');
        return;
    }

    // Evitar múltiples integraciones
    const btn = event?.detail?.button;
    if (btn && btn.disabled) return;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Integrando...';
    }

    let additionalContext = `\n\n--- DETALLES REFINADOS (IA) ---\n`;
    answered.forEach(item => {
        additionalContext += `[Fact]: ${item.question}\n[Detail]: ${item.answer}\n`;
    });

    // Añadir al campo de Idea
    const oldVal = elements.textIdea.value;
    elements.textIdea.value = oldVal.trim() + additionalContext;
    
    // Disparar evento de input para que el sistema detecte cambios (si es necesario)
    elements.textIdea.dispatchEvent(new Event('input'));

    showToast('Conocimiento consolidado en el Vibe Coding.', 'success');
    
    // Limpiar visualmente la sección de discovery
    const discoverySection = document.querySelector('.discovery-section');
    if (discoverySection) {
        discoverySection.style.opacity = '0.5';
        discoverySection.style.pointerEvents = 'none';
        discoverySection.innerHTML = `
            <div style="background: rgba(var(--success-rgb), 0.1); border: 1px dashed var(--success); color: var(--success); padding: 15px; border-radius: 8px; text-align: center;">
                <i class="ri-checkbox-circle-fill" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                <div style="font-weight: 600;">Detalles Integrados</div>
                <div style="font-size: 11px; margin-top: 4px;">La información ahora forma parte del requerimiento base.</div>
            </div>
        `;
    }
}

// Escuchar eventos
document.addEventListener('requestRefinement', () => {
    analyzeIdea(true);
});

document.addEventListener('integrateAnswers', (e) => {
    integrateAnswersToIdea(e);
});

export function addMessage(sender, text) {
    // Deprecado pero mantenido para compatibilidad
    console.warn('addMessage está obsoleto ya que se eliminó el chat de triage.');
}

