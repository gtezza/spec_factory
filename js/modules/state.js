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
    fileList: document.getElementById('file-list'),

    // --- NUEVOS ELEMENTOS SPA Y GOBERNANZA ---
    // Navegación Lateral
    navTriage: document.getElementById('nav-triage'),
    navProjects: document.getElementById('nav-projects'),
    navAdmin: document.getElementById('nav-admin'),

    // Secciones de Vista Principal (SPA)
    viewTriage: document.getElementById('view-triage'),
    viewProjects: document.getElementById('view-projects'),
    viewAdmin: document.getElementById('view-admin'),

    // Dashboard de Proyectos Activos
    projectSearch: document.getElementById('project-search'),
    projectFilterSector: document.getElementById('project-filter-sector'),
    projectFilterCriticality: document.getElementById('project-filter-criticality'),
    projectFilterStatus: document.getElementById('project-filter-status'),
    projectsGrid: document.getElementById('projects-grid'),

    // Panel de Administración (Filtros y Lista Lateral)
    adminFilterSector: document.getElementById('admin-filter-sector'),
    adminFilterCriticality: document.getElementById('admin-filter-criticality'),
    adminRequestsList: document.getElementById('admin-requests-list'),

    // Panel de Administración (Contenedores Detalle)
    adminDetailEmpty: document.getElementById('admin-detail-empty'),
    adminDetailActive: document.getElementById('admin-detail-active'),

    // Detalle Activo de la Propuesta
    detailRequestId: document.getElementById('detail-request-id'),
    detailTitle: document.getElementById('detail-title'),
    detailBadgeSector: document.getElementById('detail-badge-sector'),
    detailBadgeCriticality: document.getElementById('detail-badge-criticality'),
    detailBadgeStatus: document.getElementById('detail-badge-status'),
    detailCreatorName: document.getElementById('detail-creator-name'),
    detailCreatedDate: document.getElementById('detail-created-date'),

    // Glosario de 3 Capas
    glosarioTabs: document.getElementById('glosario-tabs'),
    badgeCountGobierno: document.getElementById('badge-count-gobierno'),
    badgeCountTecnico: document.getElementById('badge-count-tecnico'),
    badgeCountObtenido: document.getElementById('badge-count-obtenido'),
    termListContainer: document.getElementById('term-list-container'),

    // Previsualización y Auditoría
    btnDownloadMd: document.getElementById('btn-download-md'),
    markdownProposalPreview: document.getElementById('markdown-proposal-preview'),
    adminComment: document.getElementById('admin-comment'),
    btnRejectTriage: document.getElementById('btn-reject-triage'),
    btnApproveTriage: document.getElementById('btn-approve-triage'),

    // Visor SDD e Inferencia
    sddViewerContainer: document.getElementById('sdd-viewer-container'),
    btnExportPdf: document.getElementById('btn-export-pdf'),
    sddSectionsNav: document.getElementById('sdd-sections-nav'),
    sddDocumentBody: document.getElementById('sdd-document-body')
};
