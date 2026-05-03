/**
 * Spec Factory | Gestión de Adjuntos (Samples)
 */
import { state, elements } from './state.js';
import { showToast } from './ui.js';
import { sbClient } from './supabase.js';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md', 'csv'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function initAttachmentEvents() {
    if (!elements.uploadArea) return;

    // Click para abrir selector
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());

    // Cambio en input
    elements.fileInput.addEventListener('change', (e) => handleFileSelection(e.target.files));

    // Drag & Drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        handleFileSelection(e.dataTransfer.files);
    });
}

async function handleFileSelection(files) {
    for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            showToast(`Archivo no permitido: ${file.name}. Solo PDF, Word, Excel, Texto.`, 'error');
            continue;
        }

        if (file.size > MAX_FILE_SIZE) {
            showToast(`Archivo demasiado grande: ${file.name}. Máximo 5MB.`, 'error');
            continue;
        }

        // Subir a Supabase
        await uploadFile(file);
    }
}

async function uploadFile(file) {
    const fileId = crypto.randomUUID();
    const ext = file.name.split('.').pop();
    const fileName = `${state.user?.id || 'anon'}/${fileId}.${ext}`;

    // Crear ítem temporal en la lista (loading)
    const itemIndex = state.currentRequest.sample_files.length;
    renderFileItem({ name: file.name, status: 'loading' });

    try {
        const { data, error } = await sbClient.storage
            .from('triage-samples')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Obtener URL pública
        const { data: { publicUrl } } = sbClient.storage
            .from('triage-samples')
            .getPublicUrl(fileName);

        const fileMetadata = {
            id: fileId,
            name: file.name,
            url: publicUrl,
            size: file.size,
            type: file.type
        };

        state.currentRequest.sample_files.push(fileMetadata);
        updateFileList();
        showToast(`Archivo ${file.name} subido correctamente.`, 'success');

    } catch (error) {
        console.error('Error al subir archivo:', error);
        showToast(`Error al subir ${file.name}: ${error.message}`, 'error');
        // Remover el ítem fallido
        updateFileList();
    }
}

export function updateFileList() {
    elements.fileList.innerHTML = '';
    state.currentRequest.sample_files.forEach((file, index) => {
        renderFileItem(file, index);
    });
}

function renderFileItem(file, index) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const isLoader = file.status === 'loading';
    const icon = getFileIcon(file.name);

    item.innerHTML = `
        <div class="file-info">
            <i class="${isLoader ? 'ri-loader-4-line ri-spin' : icon}"></i>
            <span class="file-name" title="${file.name}">${file.name}</span>
        </div>
        ${!isLoader ? `
        <div class="file-actions">
            <i class="ri-delete-bin-line btn-remove-file" data-index="${index}"></i>
        </div>
        ` : ''}
    `;

    if (!isLoader) {
        item.querySelector('.btn-remove-file').addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            removeFile(idx);
        });
    }

    elements.fileList.appendChild(item);
}

function removeFile(index) {
    state.currentRequest.sample_files.splice(index, 1);
    updateFileList();
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
        case 'pdf': return 'ri-file-pdf-line';
        case 'xls':
        case 'xlsx':
        case 'csv': return 'ri-file-excel-line';
        case 'doc':
        case 'docx': return 'ri-file-word-line';
        case 'txt':
        case 'md': return 'ri-file-text-line';
        default: return 'ri-file-line';
    }
}
