/**
 * Spec Factory | Estado Global
 */
export const state = {
    user: null,
    currentRequest: {
        id: null,
        sector_id: null,
        status_id: null,
        objective: '',
        benefits: '',
        roi: '',
        idea: '',
        priority: 'Media',
        sample_files: []
    },
    sectors: [],
    statuses: [],
    approvers: []
};

export const elements = {
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
    btnSendChat: document.getElementById('btn-send-chat'),
    auditLog: document.getElementById('audit-log'),
    auditContainer: document.getElementById('audit-log-container'),
    btnLogout: document.getElementById('btn-logout'),
    toastContainer: document.getElementById('toast-container'),
    alertContainer: document.getElementById('alert-banner-container'),
    modalWarning: document.getElementById('modal-warning'),
    btnCloseWarning: document.getElementById('btn-close-warning'),
    // Elementos de Carga de Archivos
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    fileList: document.getElementById('file-list')
};
