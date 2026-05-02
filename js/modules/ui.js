/**
 * Spec Factory | Utilidades de UI
 */
import { elements } from './state.js';

export function showToast(message, type = 'info') {
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

export function populateSelect(selectElement, data, labelField = 'name') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Seleccionar...</option>';
    data.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item[labelField] || item.name;
        selectElement.appendChild(opt);
    });
}

export function toggleModal(modalElement, show = true) {
    if (modalElement) {
        modalElement.style.display = show ? 'flex' : 'none';
    }
}

export function showAlertBanner(message, type = 'info', sticky = false) {
    if (!elements.alertContainer) return;
    
    const banner = document.createElement('div');
    banner.className = `alert-banner ${type}`;
    
    const icon = type === 'success' ? 'ri-checkbox-circle-fill' : 
                 type === 'warning' ? 'ri-alert-fill' : 
                 type === 'error' ? 'ri-close-circle-fill' : 'ri-information-fill';

    banner.innerHTML = `
        <div class="banner-content">
            <i class="${icon}"></i>
            <span>${message}</span>
        </div>
        <i class="ri-close-line close-btn"></i>
    `;

    const closeBtn = banner.querySelector('.close-btn');
    const removeBanner = () => {
        banner.classList.add('removing');
        setTimeout(() => banner.remove(), 400);
    };

    closeBtn.onclick = removeBanner;
    elements.alertContainer.appendChild(banner);

    if (!sticky) {
        setTimeout(() => {
            if (banner.parentElement) removeBanner();
        }, 6000);
    }
}
