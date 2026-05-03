/**
 * Spec Factory | Glosario y Diccionario
 */
import { state, elements } from './state.js';
import { showToast, toggleModal } from './ui.js';

// Cliente Supabase inyectado desde el core o globalmente
const SUPABASE_URL = APP_CONFIG.SUPABASE.URL;
const SUPABASE_KEY = APP_CONFIG.SUPABASE.ANON_KEY;
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export async function updateDictionary(terms) {
    for (const term of terms) {
        if (!state.dictionary.find(d => d.term === term.term)) {
            state.dictionary.push(term);
            try {
                await sbClient.from('glossary_v2').upsert([{
                    term: term.term,
                    definition: term.definition,
                    layer: term.layer,
                    origin: term.origin || 'IA_DETECTION',
                    permission: term.layer === 'GOBIERNO' ? 'INTOCABLE' : 'MODIFICABLE'
                }], { onConflict: 'term, layer' });
            } catch (err) {
                console.warn(`No se pudo persistir el término ${term.term}:`, err);
            }
        }
    }
    renderDictionary();
}

export function renderDictionary() {
    if (!elements.dictionaryList) return;
    
    if (state.dictionary.length === 0) {
        elements.dictionaryList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Ningún término técnico detectado aún.</p>';
        return;
    }

    elements.dictionaryList.innerHTML = state.dictionary.map(t => `
        <div class="dictionary-item">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: var(--primary);">${t.term}</strong>
                <span class="layer-badge layer-${t.layer.toLowerCase()}">${t.layer}</span>
            </div>
            <div style="color: var(--text-muted); font-size: 12px; line-height: 1.2;">${t.definition}</div>
        </div>
    `).join('');
}

export function handleNewTermSubmit(e) {
    e.preventDefault();
    const newTerm = {
        term: document.getElementById('new-term-name').value,
        layer: document.getElementById('new-term-layer').value,
        definition: document.getElementById('new-term-definition').value,
        origin: 'MANUAL'
    };
    updateDictionary([newTerm]);
    toggleModal(elements.modalTerm, false);
    showToast('Término agregado correctamente.', 'success');
}
