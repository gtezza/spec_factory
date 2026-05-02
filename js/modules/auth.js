import { state, elements } from './state.js';
import { showToast, toggleModal, showAlertBanner } from './ui.js';
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
            updateUserUI(true); // true indica que es un login fresco
            toggleModal(elements.modalLogin, false);
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

function updateUserUI(isNewLogin = false) {
    if (!state.user) return;
    elements.userName.innerText = state.user.full_name;
    elements.displayCreator.value = state.user.full_name;
    
    const role = state.user.role_name?.toLowerCase();
    const canCreate = ['administrador', 'aprovador', 'creador', 'solicitante'].includes(role);
    
    if (isNewLogin) {
        const welcomeMsg = role === 'administrador' ? 
            `Sesión Iniciada: Modo Administrador (Acceso Total)` : 
            `Bienvenido, ${state.user.full_name}`;
        showAlertBanner(welcomeMsg, 'success');
    }

    // El rol administrador habilita secciones especiales si existen
    const adminNavItem = document.getElementById('nav-admin');
    if (adminNavItem) {
        adminNavItem.style.display = (role === 'administrador') ? 'flex' : 'none';
    }
    
    if (!canCreate) {
        showAlertBanner('Modo Lectura: Tu rol actual no permite crear nuevas solicitudes.', 'info', true);
        if (elements.btnSaveRequest) {
            elements.btnSaveRequest.disabled = true;
            elements.btnSaveRequest.style.opacity = '0.5';
            elements.btnSaveRequest.title = 'No tienes permisos de creación';
        }
    } else {
        if (elements.btnSaveRequest) {
            elements.btnSaveRequest.disabled = false;
            elements.btnSaveRequest.style.opacity = '1';
            elements.btnSaveRequest.title = 'Guardar cambios';
        }
    }
}
