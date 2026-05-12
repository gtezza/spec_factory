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
    get modalLogin() { return document.getElementById('modal-login'); },
    get loginForm() { return document.getElementById('login-form'); },
    get userName() { return document.getElementById('user-name'); },
    get selectSector() { return document.getElementById('select-sector'); },
    get selectCriticality() { return document.getElementById('select-criticality'); },
    get selectApprover() { return document.getElementById('select-approver'); },
    get displayCreator() { return document.getElementById('display-creator'); },
    get currentRequestId() { return document.getElementById('current-request-id'); },
    get currentStatus() { return document.getElementById('current-status'); },
    get textObjective() { return document.getElementById('text-objective'); },
    get textBenefits() { return document.getElementById('text-benefits'); },
    get inputRoi() { return document.getElementById('input-roi'); },
    get textIdea() { return document.getElementById('text-idea'); },
    get btnSaveRequest() { return document.getElementById('btn-save-request'); },
    get btnSubmitRequest() { return document.getElementById('btn-submit-request'); },
    get chatMessages() { return document.getElementById('chat-messages'); },
    get chatInput() { return document.getElementById('chat-input'); },
    get btnSendChat() { return document.getElementById('btn-send-chat'); },
    get auditLog() { return document.getElementById('audit-log'); },
    get auditContainer() { return document.getElementById('audit-log-container'); },
    get btnLogout() { return document.getElementById('btn-logout'); },
    get toastContainer() { return document.getElementById('toast-container'); },
    get alertContainer() { return document.getElementById('alert-banner-container'); },
    get modalWarning() { return document.getElementById('modal-warning'); },
    get btnCloseWarning() { return document.getElementById('btn-close-warning'); },
    
    // Elementos de Carga de Archivos
    get uploadArea() { return document.getElementById('upload-area'); },
    get fileInput() { return document.getElementById('file-input'); },
    get fileList() { return document.getElementById('file-list'); },

    // --- NUEVOS ELEMENTOS SPA Y GOBERNANZA ---
    // Navegación Lateral
    get navTriage() { return document.getElementById('nav-triage'); },
    get navProjects() { return document.getElementById('nav-projects'); },
    get navAdmin() { return document.getElementById('nav-admin'); },

    // Secciones de Vista Principal (SPA)
    get viewTriage() { return document.getElementById('view-triage'); },
    get viewProjects() { return document.getElementById('view-projects'); },
    get viewAdmin() { return document.getElementById('view-admin'); },

    // Dashboard de Proyectos Activos
    get projectSearch() { return document.getElementById('project-search'); },
    get projectFilterSector() { return document.getElementById('project-filter-sector'); },
    get projectFilterCriticality() { return document.getElementById('project-filter-criticality'); },
    get projectFilterStatus() { return document.getElementById('project-filter-status'); },
    get projectsGrid() { return document.getElementById('projects-grid'); },

    // Panel de Administración (Filtros y Lista Lateral)
    get adminFilterSector() { return document.getElementById('admin-filter-sector'); },
    get adminFilterCriticality() { return document.getElementById('admin-filter-criticality'); },
    get adminRequestsList() { return document.getElementById('admin-requests-list'); },

    // Panel de Administración (Contenedores Detalle)
    get adminDetailEmpty() { return document.getElementById('admin-detail-empty'); },
    get adminDetailActive() { return document.getElementById('admin-detail-active'); },

    // Detalle Activo de la Propuesta
    get detailRequestId() { return document.getElementById('detail-request-id'); },
    get detailTitle() { return document.getElementById('detail-title'); },
    get detailBadgeSector() { return document.getElementById('detail-badge-sector'); },
    get detailBadgeCriticality() { return document.getElementById('detail-badge-criticality'); },
    get detailBadgeStatus() { return document.getElementById('detail-badge-status'); },
    get detailCreatorName() { return document.getElementById('detail-creator-name'); },
    get detailCreatedDate() { return document.getElementById('detail-created-date'); },

    // Glosario de 3 Capas
    get glosarioTabs() { return document.getElementById('glosario-tabs'); },
    get badgeCountGobierno() { return document.getElementById('badge-count-gobierno'); },
    get badgeCountTecnico() { return document.getElementById('badge-count-tecnico'); },
    get badgeCountObtenido() { return document.getElementById('badge-count-obtenido'); },
    get termListContainer() { return document.getElementById('term-list-container'); },

    // Previsualización y Auditoría
    get btnDownloadMd() { return document.getElementById('btn-download-md'); },
    get markdownProposalPreview() { return document.getElementById('markdown-proposal-preview'); },
    get adminComment() { return document.getElementById('admin-comment'); },
    get btnRejectTriage() { return document.getElementById('btn-reject-triage'); },
    get btnApproveTriage() { return document.getElementById('btn-approve-triage'); },

    // Visor SDD e Inferencia
    get sddViewerContainer() { return document.getElementById('sdd-viewer-container'); },
    get btnExportPdf() { return document.getElementById('btn-export-pdf'); },
    get sddSectionsNav() { return document.getElementById('sdd-sections-nav'); },
    get sddDocumentBody() { return document.getElementById('sdd-document-body'); },

    // Sincronización Offline
    get syncOfflineBox() { return document.getElementById('sync-offline-box'); },
    get btnSyncOfflineRequest() { return document.getElementById('btn-sync-offline-request'); }
};
