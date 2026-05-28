import html2pdf from 'html2pdf.js';
import { PDFDocument } from 'pdf-lib';
import type { FormAnalysis } from '@/types';

export async function generateProposalPDF(
    sections: Array<{ section_title_bs: string; content_html: string }>,
    projectTitle: string,
    donorName?: string
): Promise<void> {
    const printCSS = `
    @page {
      size: A4 portrait;
      margin: 25mm 20mm 25mm 20mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: white;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }

    h1 {
      font-size: 16pt;
      color: #003366;
      margin-bottom: 8px;
    }

    h2 {
      font-size: 13pt;
      color: #003366;
      margin: 16px 0 8px;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 8px 0;
    }

    th,
    td {
      border: 1px solid #003366;
      padding: 6px 10px;
      font-size: 10.5pt;
    }

    th,
    .section-header {
      background-color: #003366 !important;
      color: white !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .field-label {
      background-color: #d6e4f0 !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .section-container {
      page-break-inside: avoid;
      margin-bottom: 20px;
    }

    .section-header {
      page-break-after: avoid;
    }

    .disclaimer-banner {
      display: none !important;
    }

    .page-break {
      page-break-before: always;
    }

    tr {
      page-break-inside: avoid;
    }
  `;

    const headerHtml = `
    <div style="border-bottom: 3px solid #003366; padding-bottom: 16px; margin-bottom: 24px;">
      <h1 style="margin:0; color:#003366; font-size:18pt;">${projectTitle}</h1>
      ${donorName ? `<p style="margin:4px 0 0; color:#555; font-size:11pt;">Donator: ${donorName}</p>` : ''}
      <p style="margin:4px 0 0; color:#555; font-size:10pt;">
        KVS „S.C.U.B.A." | Trg grada Prato 24, 71000 Sarajevo | kvsscuba@gmail.com
      </p>
    </div>
  `;

    const bodyHtml = sections
        .map((section) => `
    <div class="section-container">
      <h2 class="section-header">${section.section_title_bs}</h2>
      <div>
        ${section.content_html
            .replace(/<div[^>]*class="[^"]*disclaimer-banner[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
            .replace(/<div[^>]*background-color:\s*#fff3cd[^>]*>[\s\S]*?<\/div>/gi, '')
        }
      </div>
    </div>
  `)
        .join('\n');

    const fullHtml = `
    <!DOCTYPE html>
    <html lang="bs">
    <head>
      <meta charset="UTF-8" />
      <style>${printCSS}</style>
    </head>
    <body>
      ${headerHtml}
      ${bodyHtml}
      <div style="margin-top:40px; border-top:1px solid #003366; padding-top:12px; font-size:9pt; color:#888; text-align:center;">
        KVS „S.C.U.B.A." | Sarajevo | kvsscuba@gmail.com | +387 62 332 082
      </div>
    </body>
    </html>
  `;

    const container = document.createElement('div');
    container.innerHTML = fullHtml;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
        await html2pdf()
            .set({
                margin: 0,
                filename: `${projectTitle.replace(/[\s/\\?%*:|"<>]/g, '_')}_prijedlog.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: {
                    scale: 1.4,
                    useCORS: true,
                    logging: false,
                    letterRendering: false,
                    backgroundColor: '#ffffff',
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true,
                },
                pagebreak: {
                    mode: ['css', 'legacy'],
                },
            })
            .from(container)
            .save();
    } finally {
        document.body.removeChild(container);
    }
}

function cleanHtmlForPdfField(html: string): string {
    const textWithTables = htmlTableToPlainText(html);
    return textWithTables
        .replace(/<div[^>]*class="[^"']*disclaimer-banner[^"']*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function summarizeForPdfField(text: string, maxLength = 1100): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    const truncated = cleaned.slice(0, maxLength);
    return truncated.replace(/\s+\S*$/, '').trim() + '...';
}

function normalizeString(value: string | undefined): string {
    return (value || '').toLowerCase().replace(/[^a-z0-9čćđšž]+/gi, ' ').trim();
}

function htmlTableToPlainText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<thead[\s\S]*?>[\s\S]*?<\/thead>/gi, '')
        .replace(/<tbody[\s\S]*?>|<\/tbody>/gi, '')
        .replace(/<tfoot[\s\S]*?>[\s\S]*?<\/tfoot>/gi, '')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<t[dh][^>]*>/gi, ' | ')
        .replace(/<[^>]+>/g, '')
        .replace(/\|\s*\|/g, '|')
        .replace(/\n{2,}/g, '\n')
        .replace(/\s*\|\s*/g, ' | ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .trim();
}

function formatPdfFieldValue(rawText: string, fieldName?: string, fieldLabel?: string): string {
    let text = rawText.trim();
    if (/<\/?(table|tr|td|th)/i.test(text)) {
        text = htmlTableToPlainText(text);
    }

    const normalizedLabel = normalizeString(fieldLabel || fieldName || '');
    if (/osoblje|instruktor|instruktora|personel|kadrovi|staff|tabela|budzet|budžet|iskustvo/.test(normalizedLabel)) {
        text = text
            .replace(/\s*[,;·•]\s*/g, '\n')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    return text.replace(/\s+\n/gi, '\n').replace(/\n\s+/gi, '\n').trim();
}

function resolveSectionKeyFromField(
    fieldName: string,
    fieldLabel: string | undefined,
    fieldSection: string | undefined,
    sections: Array<{ section_key: string; section_title_bs: string; }>,
    mapping?: Record<string, string>
): string | undefined {
    const normalizedFieldName = normalizeString(fieldName);
    const normalizedFieldLabel = normalizeString(fieldLabel);
    const normalizedFieldSection = normalizeString(fieldSection);

    if (mapping && mapping[fieldName]) {
        const mapped = normalizeString(mapping[fieldName]);
        const matched = sections.find((section) =>
            normalizeString(section.section_key) === mapped || normalizeString(section.section_title_bs) === mapped
        );
        if (matched) return matched.section_key;
        return mapping[fieldName];
    }

    if (normalizedFieldSection) {
        const matched = sections.find((section) => normalizeString(section.section_key) === normalizedFieldSection || normalizeString(section.section_title_bs) === normalizedFieldSection);
        if (matched) return matched.section_key;
    }

    const combined = `${normalizedFieldName} ${normalizedFieldLabel}`;
    const matched = sections.find((section) =>
        combined.includes(normalizeString(section.section_key)) ||
        combined.includes(normalizeString(section.section_title_bs))
    );

    return matched?.section_key;
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Neuspješno preuzimanje originalnog PDF obrasca: ${response.status}`);
    }
    return await response.arrayBuffer();
}

export async function populateOriginalPDF(
    originalPdfUrl: string,
    formAnalysis: FormAnalysis,
    approvedSections: Array<{ section_key: string; section_title_bs: string; content_html: string | null }> ,
    projectTitle: string
): Promise<void> {
    const pdfBytes = await fetchArrayBuffer(originalPdfUrl);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const approvedByKey = approvedSections.reduce<Record<string, string>>((acc, section) => {
        if (section.content_html) {
            const cleaned = cleanHtmlForPdfField(section.content_html);
            acc[section.section_key] = summarizeForPdfField(cleaned);
        }
        return acc;
    }, {});

    const fieldDefinitions = formAnalysis.fields ?? [];
    const sections = approvedSections.map((section) => ({
        section_key: section.section_key,
        section_title_bs: section.section_title_bs,
    }));

    let writtenFields = 0;
    for (const field of form.getFields()) {
        const fieldName = field.getName();
        const fieldDef = fieldDefinitions.find((candidate) => candidate.field_name === fieldName);
        const sectionKey = resolveSectionKeyFromField(
            fieldName,
            fieldDef?.label,
            fieldDef?.section,
            sections,
            formAnalysis.field_to_section_map as Record<string, string> | undefined
        );

        if (!sectionKey) continue;
        const sectionText = approvedByKey[sectionKey];
        if (!sectionText) continue;

        const textField = field as unknown as { setText?: (value: string) => void };
        if (typeof textField.setText === 'function') {
            try {
                const formattedText = formatPdfFieldValue(sectionText, fieldName, fieldDef?.label);
                textField.setText(formattedText);
                writtenFields += 1;
            } catch {
                // Skip unfillable fields
            }
        }
    }

    if (writtenFields === 0) {
        throw new Error('Nije pronađeno nijedno polje u PDF obrascu koje se može automatski popuniti. Provjerite mapu polja i form_template_analysis.');
    }

    const outputBytes = await pdfDoc.save();
    const blob = new Blob([outputBytes], { type: 'application/pdf' });
    const fileName = `${projectTitle.replace(/[\s/\\?%*:|"<>]/g, '_')}_popunjen.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
