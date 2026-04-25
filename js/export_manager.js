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

    async handleExport(type) {
        const content = document.getElementById('spec-preview');
        const title = content.querySelector('h2')?.innerText || 'especificacion';
        
        this.statusEl.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Preparando ${type.toUpperCase()}...`;

        try {
            switch (type) {
                case 'pdf':
                    await this.exportToPDF(content, title);
                    break;
                case 'pptx':
                    await this.exportToPPTX(content, title);
                    break;
                case 'drive':
                    this.statusEl.innerText = 'Funcionalidad en desarrollo: Requiere Client ID de Google.';
                    break;
                case 'server':
                    await this.exportToServer(content, title);
                    break;
            }
            this.statusEl.innerHTML = `<span style="color: var(--accent-green)">¡${type.toUpperCase()} completado con éxito!</span>`;
        } catch (error) {
            console.error('Error al exportar:', error);
            this.statusEl.innerHTML = `<span style="color: var(--accent-red)">Error: ${error.message}</span>`;
        }
    },

    async exportToPDF(element, filename) {
        const opt = {
            margin: 10,
            filename: `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
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
