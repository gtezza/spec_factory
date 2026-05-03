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
    
    // El rol puede venir como 'role' o 'role_name' según la versión del backend
    const role = (state.user.role || state.user.role_name || '').toLowerCase();
    console.log(`[AUTH] Usuario: ${state.user.full_name}, Rol detectado: ${role}`);

    // Roles que pueden crear solicitudes (Normalización resiliente v/b)
    const canCreate = ['admin', 'administrador', 'aprovador', 'aprobador', 'creador', 'solicitante'].includes(role);
    
    if (isNewLogin) {
        const welcomeMsg = (role === 'administrador' || role === 'admin') ? 
            `Sesión Iniciada: Acceso Total de Administrador` : 
            `Bienvenido, ${state.user.full_name}`;
        showAlertBanner(welcomeMsg, 'success');
    }

    // El rol administrador habilita secciones especiales
    const adminNavItem = document.getElementById('nav-admin');
    if (adminNavItem) {
        adminNavItem.style.display = (role === 'administrador' || role === 'admin') ? 'flex' : 'none';
    }
    
    // Solo mostrar banner de Modo Lectura si NO es administrador Y NO tiene permisos de creación
    if (!canCreate && role !== 'administrador' && role !== 'admin') {
        showAlertBanner('Modo Lectura: Tu rol actual no permite crear nuevas solicitudes.', 'info', true);
        if (elements.btnSaveRequest) {
            elements.btnSaveRequest.disabled = true;
            elements.btnSaveRequest.style.opacity = '0.5';
            elements.btnSaveRequest.title = 'No tienes permisos de creación';
        }
        if (elements.uploadArea) {
            elements.uploadArea.style.pointerEvents = 'none';
            elements.uploadArea.style.opacity = '0.5';
            const pTag = elements.uploadArea.querySelector('p');
            if (pTag) pTag.innerText = 'Solo lectura: No puedes adjuntar archivos.';
        }
    } else {
        // Habilitar controles si tiene permiso o es admin
        if (elements.btnSaveRequest) {
            elements.btnSaveRequest.disabled = false;
            elements.btnSaveRequest.style.opacity = '1';
            elements.btnSaveRequest.title = 'Guardar cambios en la base de datos';
        }
        if (elements.uploadArea) {
            elements.uploadArea.style.pointerEvents = 'auto';
            elements.uploadArea.style.opacity = '1';
            const pTag = elements.uploadArea.querySelector('p');
            if (pTag) pTag.innerText = 'Arrastra tus samples aquí o haz clic para subir';
        }
    }
}
