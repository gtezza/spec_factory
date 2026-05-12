/**
 * Spec Factory | Cliente API
 */

const SERVER_ENDPOINT = APP_CONFIG.SERVER.ENDPOINT;

export async function apiFetch(path, options = {}) {
    const url = `${SERVER_ENDPOINT}${path}`;
    const defaultOptions = {
        headers: { 'Content-Type': 'application/json' },
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error en API Fetch (${path}):`, error);
        throw error;
    }
}

export const endpoints = {
    login: '/api/login',
    analyzeVibe: '/api/analyze-vibe',
    approvers: '/api/approvers',
    glossary: '/api/glossary',
    glossaryPropose: '/api/glossary/propose',
    glossaryConfirm: '/api/glossary/confirm',
    triage: '/api/triage',
    triageApprove: '/api/triage/approve',
    triageReject: '/api/triage/reject',
    specifications: '/api/specifications'
};
