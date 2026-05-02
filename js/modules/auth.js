/**
 * Spec Factory | Autenticación y RBAC
 */
import { state, elements } from './state.js';
import { showToast, toggleModal } from './ui.js';
import { apiFetch, endpoints } from './api.js';

export async function checkSession() {
    const session = sessionStorage.getItem('sf_session');
    if (session) {
        state.user = JSON.parse(session);
        updateUserUI();
    } else {
        toggleModal(elements.modalLogin, true);
    }
}

export async function login(email, password) {
    const loginError = document.getElementById('login-error');
    try {
        const data = await apiFetch(endpoints.login, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.status === 'success') {
            state.user = data.user;
            sessionStorage.setItem('sf_session', JSON.stringify(data.user));
            updateUserUI();
            toggleModal(elements.modalLogin, false);
            showToast(`Bienvenido, ${state.user.full_name}`, 'success');
        }
    } catch (error) {
        loginError.style.display = 'block';
        loginError.innerText = 'Credenciales inválidas o servidor no disponible.';
    }
}

export function logout() {
    sessionStorage.removeItem('sf_session');
    window.location.reload();
}

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
