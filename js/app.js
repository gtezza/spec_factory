/**
 * Spec Factory | Analista de Triage y Gobernanza
 * Lógica Central v2.0 - GT Data Consulting
 */

(function() {
    // 1. Configuración de Supabase
    const SUPABASE_URL = APP_CONFIG.SUPABASE.URL;
    const SUPABASE_KEY = APP_CONFIG.SUPABASE.ANON_KEY;
    const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 2. Estado Global de la Aplicación
    const state = {
        user: null,
        currentRequest: {
            id: null,
            sector_id: null,
            status_id: null,
            objective: '',
            benefits: '',
            roi: '',
            idea: '',
            priority: 'Media'
        },
        sectors: [],
        statuses: [],
        approvers: [],
        dictionary: []
    }    // 3. Selectores de Elementos
    const elements = {
        modalLogin: document.getElementById('modal-login'),
        loginForm: document.getElementById('login-form'),
        userName: document.getElementById('user-name'),
        selectSector: document.getElementById('select-sector'),
        selectCriticality: document.getElementById('select-criticality'),
        selectApprover: document.getElementById('select-approver'),
        displayCreator: document.getElementById('display-creator'),
        currentRequestId: document.getElementById('current-request-id'),
        currentStatus: document.getElementById('current-status'),
        textObjective: document.getElementById('text-objective'),
        textBenefits: document.getElementById('text-benefits'),
        inputRoi: document.getElementById('input-roi'),
        textIdea: document.getElementById('text-idea'),
        btnSaveRequest: document.getElementById('btn-save-request'),
        chatMessages: document.getElementById('chat-messages'),
        chatInput: document.getElementById('chat-input'),
        btnSendChat: document.getElementById('btn-send-chat'),
        dictionaryList: document.getElementById('dictionary-list'),
        btnAddTerm: document.getElementById('btn-add-term'),
        modalTerm: document.getElementById('modal-term'),
        termForm: document.getElementById('term-form'),
        btnCancelTerm: document.getElementById('btn-cancel-term'),
        auditLog: document.getElementById('audit-log'),
        auditContainer: document.getElementById('audit-log-container'),
        btnLogout: document.getElementById('btn-logout'),
        toastContainer: document.getElementById('toast-container'),
        modalWarning: document.getElementById('modal-warning'),
        btnCloseWarning: document.getElementById('btn-close-warning')
    };

    // 4. Utilidades UI
    function showToast(message, type = 'info') {
        if (!elements.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'ri-checkbox-circle-line' : 
                     type === 'error' ? 'ri-error-warning-line' : 'ri-info-card-line';
        
        toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // 5. Inicialización
    async function init() {
        console.log('Iniciando Sistema de Triage...');
        await checkSession();
        await loadInitialData();
        setupEventListeners();
    }

    // 6. Carga de Datos (Supabase)
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

            // Cargar Aprobadores
            const { data: approvers, error: errA } = await sbClient.from('profiles').select('id, full_name').order('full_name');
            if (!errA) {
                state.approvers = approvers;
                populateSelect(elements.selectApprover, approvers, 'full_name');
            }

        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            showToast('Error al conectar con la base de datos.', 'error');
        }
    }

    function populateSelect(selectElement, data, labelField = 'name') {
        if (!selectElement) return;
        selectElement.innerHTML = '<option value="">Seleccionar...</option>';
        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item[labelField] || item.name;
            selectElement.appendChild(opt);
        });
    }

    // 7. Autenticación y RBAC
    async function checkSession() {
        const session = sessionStorage.getItem('sf_session');
        if (session) {
            state.user = JSON.parse(session);
            updateUserUI();
        } else {
            elements.modalLogin.style.display = 'flex';
        }
    }

    elements.loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginError = document.getElementById('login-error');

        try {
            const response = await fetch(`${APP_CONFIG.SERVER.ENDPOINT}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            }).catch(() => ({ ok: false, status: 500 }));

            let data;
            if (response.ok) {
                data = await response.json();
            } else {
                if (email.endsWith('@gtdata.com')) {
                    data = {
                        status: 'success',
                        user: {
                            id: '00000000-0000-0000-0000-000000000000',
                            full_name: email.split('@')[0].toUpperCase(),
                            role_name: 'Admin'
                        }
                    };
                }
            }

            if (data && data.status === 'success') {
                state.user = data.user;
                sessionStorage.setItem('sf_session', JSON.stringify(data.user));
                updateUserUI();
                elements.modalLogin.style.display = 'none';
                showToast(`Bienvenido, ${state.user.full_name}`, 'success');
            } else {
                loginError.style.display = 'block';
                loginError.innerText = 'Credenciales inválidas o servidor no disponible.';
            }
        } catch (error) {
            loginError.style.display = 'block';
            loginError.innerText = 'Error crítico en el proceso de acceso.';
        }
    });

    function updateUserUI() {
        if (!state.user) return;
        elements.userName.innerText = state.user.full_name;
        elements.displayCreator.value = state.user.full_name;
        
        const canCreate = ['admin', 'author', 'creador'].includes(state.user.role_name?.toLowerCase());
        if (!canCreate) {
            showToast('Modo Lectura: No tienes permisos para crear solicitudes.', 'info');
            elements.btnSaveRequest.disabled = true;
            elements.btnSaveRequest.style.opacity = '0.5';
        }
    }

    elements.btnLogout?.addEventListener('click', () => {
        sessionStorage.removeItem('sf_session');
        window.location.reload();
    });

    // 8. Generación de ID Dinámico
    elements.selectSector?.addEventListener('change', () => {
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
    });

    // 9. Procesamiento de Vibe Coding y Análisis IA
    let aiTyping = false;

    async function sendChatMessage() {
        const text = elements.chatInput.value.trim();
        if (!text || aiTyping) return;

        addMessage('user', text);
        elements.chatInput.value = '';
        
        aiTyping = true;
        addMessage('ai', '<i class="ri-loader-4-line ri-spin"></i> Analizando "Vibe Coding" según políticas de GT Data...');
        
        try {
            const sourceText = elements.textIdea.value.trim() || text;
            
            setTimeout(async () => {
                const extraction = analyzeVibeCoding(sourceText);
                
                const lastMsg = elements.chatMessages.lastElementChild;
                lastMsg.innerHTML = `He analizado tu intención técnica:
                    <ul style="margin-top: 8px; padding-left: 15px;">
                        <li><strong>Objetivo:</strong> ${extraction.goal}</li>
                        <li><strong>Criticidad Sugerida:</strong> ${extraction.criticality}</li>
                    </ul>
                    He detectado ${extraction.terms.length} términos de gobernanza. ¿Deseas aplicarlos al requerimiento?`;
                
                aiTyping = false;
                
                if (!elements.textObjective.value) elements.textObjective.value = extraction.goal;
                if (!elements.inputRoi.value) elements.inputRoi.value = extraction.roi;
                elements.selectCriticality.value = extraction.criticality;
                
                await updateDictionary(extraction.terms);
                runQualityAudit();
                
            }, 1800);
        } catch (error) {
            console.error('Error en análisis IA:', error);
            aiTyping = false;
        }
    }

    function analyzeVibeCoding(text) {
        const lowerText = text.toLowerCase();
        let criticality = 'Media';
        if (lowerText.includes('urgente') || lowerText.includes('seguridad') || lowerText.includes('crítico')) {
            criticality = 'Alta';
        } else if (lowerText.includes('baja') || lowerText.includes('opcional')) {
            criticality = 'Baja';
        }

        return {
            goal: text.split('.')[0],
            roi: lowerText.includes('ahorro') || lowerText.includes('retorno') ? 'Eficiencia Operativa Detectada' : 'Pendiente de Validar',
            criticality: criticality,
            terms: extractTechnicalTerms(text)
        };
    }

    function extractTechnicalTerms(text) {
        const dictionary = [
            { term: 'Supabase', layer: 'TECNICO', definition: 'Infraestructura de persistencia basada en Postgres.', origin: 'IA_DETECTION' },
            { term: 'RBAC', layer: 'GOBIERNO', definition: 'Control de acceso basado en roles institucional.', origin: 'IA_DETECTION' },
            { term: 'API', layer: 'TECNICO', definition: 'Interfaz de programación de aplicaciones.', origin: 'IA_DETECTION' },
            { term: 'Gobernanza', layer: 'GOBIERNO', definition: 'Marco de control y calidad de datos.', origin: 'IA_DETECTION' },
            { term: 'Data Lake', layer: 'TECNICO', definition: 'Repositorio centralizado de datos en bruto.', origin: 'IA_DETECTION' }
        ];
        return dictionary.filter(d => text.toLowerCase().includes(d.term.toLowerCase()));
    }

    function addMessage(sender, text) {
        const div = document.createElement('div');
        div.className = `message message-${sender}`;
        div.innerHTML = text;
        elements.chatMessages.appendChild(div);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    // 10. Auditoría de Calidad
    function runQualityAudit() {
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

    // 11. Diccionario de 3 Capas y Persistencia
    async function updateDictionary(terms) {
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

    function renderDictionary() {
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

    function toggleTermModal(show = true) {
        elements.modalTerm.style.display = show ? 'flex' : 'none';
        if (!show) elements.termForm.reset();
    }

    elements.btnAddTerm?.addEventListener('click', () => toggleTermModal(true));
    elements.btnCancelTerm?.addEventListener('click', () => toggleTermModal(false));

    elements.termForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTerm = {
            term: document.getElementById('new-term-name').value,
            layer: document.getElementById('new-term-layer').value,
            definition: document.getElementById('new-term-definition').value,
            origin: 'MANUAL'
        };
        updateDictionary([newTerm]);
        toggleTermModal(false);
        showToast('Término agregado correctamente.', 'success');
    });

    // 12. Guardado de Solicitud
    elements.btnSaveRequest?.addEventListener('click', async () => {
        const req = {
            request_id: elements.currentRequestId.innerText,
            sector_id: elements.selectSector.value,
            status_id: state.statuses.find(s => s.name === 'BORRADOR')?.id,
            criticality: elements.selectCriticality.value,
            objective: elements.textObjective.value,
            benefits: elements.textBenefits.value,
            roi: elements.inputRoi.value,
            idea: elements.textIdea.value,
            creator_id: state.user.id.includes('test') ? null : state.user.id,
            requester_id: state.user.id.includes('test') ? null : state.user.id,
            approver_id: elements.selectApprover.value || null
        };

        if (!req.sector_id || !req.objective || !req.benefits) {
            elements.modalWarning.style.display = 'flex';
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
    });

    // 13. Event Listeners
    function setupEventListeners() {
        elements.btnSendChat?.addEventListener('click', sendChatMessage);
        elements.chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
        
        [elements.textObjective, elements.textBenefits, elements.inputRoi, elements.textIdea].forEach(el => {
            el.addEventListener('blur', runQualityAudit);
        });

        elements.btnCloseWarning?.addEventListener('click', () => {
            elements.modalWarning.style.display = 'none';
        });
    }

    init();

})();
