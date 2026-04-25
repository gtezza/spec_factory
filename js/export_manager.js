/**
 * ExportManager - Módulo para la compartición y exportación de especificaciones.
 */
const ExportManager = {
    modal: null,
    statusEl: null,

    init() {
        this.modal = document.getElementById('share-modal');
        this.statusEl = document.getElementById('share-status');
        this.setupEventListeners();
        console.log('ExportManager inicializado.');
    },

    setupEventListeners() {
        // Cerrar modal
        document.getElementById('close-share-modal').addEventListener('click', () => this.closeModal());
        
        // Opciones de exportación
        document.querySelectorAll('.share-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                this.handleExport(type);
            });
        });
    },

    openModal() {
        if (!this.modal) return;
        this.modal.style.display = 'flex';
        this.statusEl.innerText = 'Selecciona un formato para exportar';
    },

    closeModal() {
        if (!this.modal) return;
        this.modal.style.display = 'none';
    },

    setStatus(html) {
        if (this.statusEl) {
            this.statusEl.innerHTML = html;
        } else {
            console.log('[ExportManager]', html.replace(/<[^>]*>/g, ''));
        }
    },

    async handleExport(type) {
        const content = document.getElementById('spec-preview');
        if (!content || !content.querySelector('h2')) {
            alert('Primero generá una especificación antes de exportar.');
            return;
        }
        const title = content.querySelector('h2')?.innerText || 'especificacion';
        
        this.setStatus(`<i class="ri-loader-4-line ri-spin"></i> Preparando ${type.toUpperCase()}...`);

        try {
            switch (type) {
                case 'pdf':
                    await this.exportToPDF(content, title);
                    break;
                case 'pptx':
                    await this.exportToPPTX(content, title);
                    break;
                case 'drive':
                    this.setStatus('Funcionalidad en desarrollo: Requiere Client ID de Google.');
                    break;
                case 'server':
                    await this.exportToServer(content, title);
                    break;
            }
            this.setStatus(`<span style="color: var(--accent-green)">¡${type.toUpperCase()} completado con éxito!</span>`);
        } catch (error) {
            console.error('Error al exportar:', error);
            this.setStatus(`<span style="color: var(--accent-red)">Error: ${error.message}</span>`);
        }
    },

    async exportToPDF(element, filename) {
        // Clonar el contenido con estilos limpios para PDF (fondo blanco, texto negro)
        const clone = element.cloneNode(true);
        clone.style.cssText = `
            background: #ffffff !important;
            color: #1a1a2e !important;
            padding: 30px !important;
            font-family: 'Inter', Arial, sans-serif !important;
            font-size: 13px !important;
            line-height: 1.7 !important;
            width: 750px !important;
            backdrop-filter: none !important;
            border: none !important;
            box-shadow: none !important;
        `;

        // Forzar estilos en todos los elementos hijos
        clone.querySelectorAll('*').forEach(el => {
            el.style.color = '';
            el.style.background = '';
            el.style.backdropFilter = '';
            el.style.webkitBackdropFilter = '';
            el.style.border = '';
            el.style.boxShadow = '';
        });

        // Estilos específicos para headings y badges
        clone.querySelectorAll('h1, h2').forEach(el => {
            el.style.color = '#1a1a2e';
            el.style.borderBottom = '2px solid #4361ee';
            el.style.paddingBottom = '8px';
            el.style.marginBottom = '16px';
        });
        clone.querySelectorAll('h3').forEach(el => {
            el.style.color = '#4361ee';
            el.style.marginTop = '20px';
        });
        clone.querySelectorAll('strong, b').forEach(el => {
            el.style.color = '#1a1a2e';
        });
        clone.querySelectorAll('.req-badge, .badge, [class*="badge"]').forEach(el => {
            el.style.background = '#4361ee';
            el.style.color = '#ffffff';
            el.style.padding = '2px 6px';
            el.style.borderRadius = '4px';
            el.style.fontSize = '11px';
        });

        // Insertar oculto para renderizar
        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '-9999px';
        wrapper.style.left = '-9999px';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        const opt = {
            margin: [15, 15, 15, 15],
            filename: `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            await html2pdf().set(opt).from(clone).save();
        } finally {
            document.body.removeChild(wrapper);
        }
    },

    async exportToPPTX(element, filename) {
        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();
        
        slide.addText(filename, { x: 0.5, y: 0.5, fontSize: 24, color: '363636', bold: true });
        
        // Extraer secciones básicas
        const sections = element.querySelectorAll('h3, p, li');
        let currentY = 1.2;
        
        sections.forEach(el => {
            if (currentY > 5) return; // Limitar a una slide por ahora
            const text = el.innerText;
            const fontSize = el.tagName === 'H3' ? 18 : 12;
            slide.addText(text, { x: 0.5, y: currentY, fontSize: fontSize, color: '666666' });
            currentY += 0.5;
        });

        await pptx.writeFile({ fileName: `${filename}.pptx` });
    },

    async exportToServer(element, filename) {
        // Enviar a la Edge Function 'deploy-ftp' o similar
        // Por ahora simulamos una subida a Supabase Storage
        this.statusEl.innerText = 'Subiendo a Supabase Storage...';
        
        const blob = await html2pdf().set({ margin: 10 }).from(element).output('blob');
        const filePath = `exports/${filename}_${Date.now()}.pdf`;

        const { data, error } = await window.supabaseClient.storage
            .from('dashboard-assets')
            .upload(filePath, blob);

        if (error) throw error;
        
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('dashboard-assets')
            .getPublicUrl(filePath);

        this.statusEl.innerHTML = `Disponible en: <a href="${publicUrl}" target="_blank" style="color: var(--primary)">Ver en Servidor</a>`;
    }
};
