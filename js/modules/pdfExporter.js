/**
 * Spec Factory | Exportador de PDFs Corporativos Premium (html2pdf)
 */

export async function exportToPDF(projectName, markdown, projectData = {}) {
    console.log(`Generando PDF Corporativo para el proyecto: ${projectName}...`);

    // Crear un contenedor temporal en memoria para estructurar el documento PDF
    const tempContainer = document.createElement('div');
    tempContainer.className = 'pdf-print-container';

    // Generar ID del documento, fecha y metadatos
    const docId = `GT-SF-${(projectData.id || '0000').slice(0, 5).toUpperCase()}`;
    const sectorName = projectData.sectors?.name || 'General';
    const dateStr = projectData.created_at ? new Date(projectData.created_at).toLocaleDateString() : new Date().toLocaleDateString();
    const creatorId = projectData.author_id ? (projectData.author_id.slice(0, 8)) : 'N/A';

    // Parsear el Markdown del cuerpo
    let bodyHtml = '';
    try {
        bodyHtml = marked.parse(markdown || '');
    } catch (e) {
        console.error('Error parseando markdown en PDF:', e);
        bodyHtml = `<pre>${markdown}</pre>`;
    }

    // Inyectar Portada Premium y Estructura del Documento
    tempContainer.innerHTML = `
        <style>
            .pdf-print-container {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #1E293B;
                line-height: 1.6;
                padding: 0;
                background: white;
            }
            
            /* Portada Corporativa */
            .pdf-cover-page {
                height: 275mm; /* Altura aproximada A4 con margen de impresión */
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 40px;
                box-sizing: border-box;
                border: 15px solid #0052CC; /* Borde corporativo azul GT */
                position: relative;
                background: #FCFDFE;
            }
            
            .pdf-cover-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #E2E8F0;
                padding-bottom: 20px;
            }
            
            .pdf-logo-box {
                font-size: 18px;
                font-weight: 800;
                color: #0052CC;
                letter-spacing: 2px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .pdf-logo-icon {
                width: 24px;
                height: 24px;
                background: #0052CC;
                border-radius: 4px;
                display: inline-block;
            }
            
            .pdf-confidential-tag {
                font-size: 11px;
                font-weight: 700;
                color: #FF5630;
                border: 1px solid #FF5630;
                padding: 4px 10px;
                border-radius: 4px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .pdf-cover-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding: 40px 20px;
            }
            
            .pdf-cover-subtitle {
                font-size: 14px;
                color: #4A5568;
                text-transform: uppercase;
                letter-spacing: 4px;
                margin-bottom: 20px;
                font-weight: 600;
            }
            
            .pdf-cover-title {
                font-size: 32px;
                font-weight: 800;
                color: #0F172A;
                margin-bottom: 15px;
                line-height: 1.25;
            }
            
            .pdf-cover-divider {
                width: 120px;
                height: 4px;
                background: linear-gradient(90deg, #0052CC, #36B37E);
                margin-bottom: 40px;
                border-radius: 2px;
            }
            
            /* Tabla de Metadatos de la Portada */
            .pdf-metadata-table {
                width: 100%;
                max-width: 550px;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 13px;
                text-align: left;
                background: white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #E2E8F0;
            }
            
            .pdf-metadata-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #F1F5F9;
            }
            
            .pdf-metadata-table tr:last-child td {
                border-bottom: none;
            }
            
            .pdf-meta-label {
                font-weight: 700;
                color: #475569;
                width: 40%;
                background: #F8FAFC;
            }
            
            .pdf-meta-value {
                color: #0F172A;
                font-weight: 500;
            }
            
            .pdf-cover-footer {
                text-align: center;
                font-size: 11px;
                color: #64748B;
                border-top: 1px solid #E2E8F0;
                padding-top: 20px;
                line-height: 1.5;
            }
            
            /* Cuerpo del Documento Impreso */
            .pdf-document-body {
                padding: 40px;
                box-sizing: border-box;
                font-size: 13.5px;
            }
            
            .pdf-document-body h1 {
                font-size: 20px;
                color: #0F172A;
                border-bottom: 2px solid #0052CC;
                padding-bottom: 8px;
                margin-top: 35px;
                margin-bottom: 15px;
                font-weight: 700;
                page-break-after: avoid;
            }
            
            .pdf-document-body h2 {
                font-size: 16px;
                color: #1E293B;
                border-bottom: 1px solid #E2E8F0;
                padding-bottom: 6px;
                margin-top: 28px;
                margin-bottom: 12px;
                font-weight: 700;
                page-break-after: avoid;
            }
            
            .pdf-document-body h3 {
                font-size: 14px;
                color: #334155;
                margin-top: 20px;
                margin-bottom: 8px;
                font-weight: 700;
                page-break-after: avoid;
            }
            
            .pdf-document-body p {
                margin-bottom: 14px;
                color: #334155;
                text-align: justify;
            }
            
            .pdf-document-body ul, .pdf-document-body ol {
                margin-left: 24px;
                margin-bottom: 14px;
                color: #334155;
            }
            
            .pdf-document-body li {
                margin-bottom: 6px;
            }
            
            .pdf-document-body table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 12.5px;
                page-break-inside: avoid;
            }
            
            .pdf-document-body th, .pdf-document-body td {
                border: 1px solid #CBD5E1;
                padding: 8px 10px;
                text-align: left;
            }
            
            .pdf-document-body th {
                background: #F1F5F9;
                color: #0F172A;
                font-weight: 700;
            }
            
            .pdf-document-body td {
                color: #334155;
            }
            
            .pdf-document-body pre {
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 6px;
                padding: 12px;
                margin: 15px 0;
                overflow: hidden;
                white-space: pre-wrap;
                font-family: monospace;
                font-size: 12px;
                color: #0F172A;
                page-break-inside: avoid;
            }
            
            .pdf-document-body code {
                font-family: monospace;
                background: #F1F5F9;
                padding: 2px 4px;
                border-radius: 3px;
                font-size: 12px;
            }
            
            .pdf-page-header {
                font-size: 10px;
                color: #94A3B8;
                border-bottom: 1px solid #E2E8F0;
                padding-bottom: 5px;
                margin-bottom: 25px;
                display: flex;
                justify-content: space-between;
            }
            
            /* Forzar saltos de página controlados */
            .page-break {
                page-break-before: always;
            }
        </style>
        
        <!-- PÁGINA 1: PORTADA -->
        <div class="pdf-cover-page">
            <div class="pdf-cover-header">
                <div class="pdf-logo-box">
                    <span class="pdf-logo-icon"></span>
                    <span>GT DATA CONSULTING</span>
                </div>
                <div class="pdf-confidential-tag">Confidencial</div>
            </div>
            
            <div class="pdf-cover-body">
                <div class="pdf-cover-subtitle">Diseño de Especificación de Software</div>
                <h1 class="pdf-cover-title">${projectName || 'Especificación Técnica Agéntica'}</h1>
                <div class="pdf-cover-divider"></div>
                
                <table class="pdf-metadata-table">
                    <tr>
                        <td class="pdf-meta-label">ID del Documento</td>
                        <td class="pdf-meta-value">${docId}</td>
                    </tr>
                    <tr>
                        <td class="pdf-meta-label">Estándar de Calidad</td>
                        <td class="pdf-meta-value">IEEE Std 830-1998 (SRS)</td>
                    </tr>
                    <tr>
                        <td class="pdf-meta-label">Sector Solicitante</td>
                        <td class="pdf-meta-value">${sectorName}</td>
                    </tr>
                    <tr>
                        <td class="pdf-meta-label">Prioridad / Criticidad</td>
                        <td class="pdf-meta-value">${projectData.criticality || 'Media'}</td>
                    </tr>
                    <tr>
                        <td class="pdf-meta-label">Autor / Analista (ID)</td>
                        <td class="pdf-meta-value">${creatorId}</td>
                    </tr>
                    <tr>
                        <td class="pdf-meta-label">Fecha de Generación</td>
                        <td class="pdf-meta-value">${dateStr}</td>
                    </tr>
                    <tr>
                        <td class="pdf-meta-label">Estado de Gobernanza</td>
                        <td class="pdf-meta-value" style="color: #36B37E; font-weight: 700;">APROBADO</td>
                    </tr>
                </table>
            </div>
            
            <div class="pdf-cover-footer">
                Este documento es propiedad exclusiva de GT Data Consulting S.A. y contiene información confidencial sujeta a políticas estrictas de gobernanza de TI.<br>
                Queda prohibida su reproducción, alteración o distribución sin autorización previa y escrita del comité de arquitectura corporativa.<br>
                <strong>© 2026 GT Data Consulting | Spec Factory Intelligent Suite</strong>
            </div>
        </div>
        
        <!-- SALTO DE PÁGINA OBLIGATORIO -->
        <div class="page-break"></div>
        
        <!-- CUERPO DEL DOCUMENTO -->
        <div class="pdf-document-body">
            <div class="pdf-page-header">
                <span>DOCUMENTO SRS: ${projectName.toUpperCase()}</span>
                <span>ID: ${docId}</span>
            </div>
            ${bodyHtml}
        </div>
    `;

    // Opciones avanzadas de html2pdf
    const options = {
        margin: [10, 15, 15, 15], // márgenes cómodos en mm
        filename: `${(projectName || 'especificacion').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_srs.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2.2, // escala alta para que el texto sea híper-nítido
            useCORS: true, 
            logging: false,
            letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { 
            mode: ['css', 'legacy'], // respeta los saltos de página declarados con .page-break
            before: '.page-break',
            avoid: ['tr', 'pre', 'h1', 'h2', 'h3'] // evita cortar títulos, bloques de código o filas de tablas a la mitad
        }
    };

    try {
        // Ejecutar la exportación PDF usando html2pdf.js cargado de forma global
        await html2pdf().set(options).from(tempContainer).save();
        console.log('PDF exportado y descargado con éxito.');
    } catch (err) {
        console.error('Error durante la generación de html2pdf:', err);
        throw err;
    }
}
