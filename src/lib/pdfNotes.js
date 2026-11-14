/**
 * Zero-dependency client/isomorphic PDF 1.4 generator for session notes.
 * Produces standard A4 PDF documents with LCCB Academix header, metadata,
 * word-wrapped body text, and pagination.
 */

function toWinAnsiSafe(str) {
  return String(str ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, '');
}

export function escapePdfText(str) {
  return toWinAnsiSafe(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function wrapNoteLines(text, maxCharsPerLine = 78) {
  const lines = [];
  const rawLines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');

  for (const raw of rawLines) {
    const cleanLine = raw.replace(/\t/g, '    ');
    if (cleanLine.length <= maxCharsPerLine) {
      lines.push(cleanLine);
      continue;
    }

    const words = cleanLine.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxCharsPerLine) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (word.length > maxCharsPerLine) {
          for (let i = 0; i < word.length; i += maxCharsPerLine) {
            lines.push(word.slice(i, i + maxCharsPerLine));
          }
          current = '';
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Formats the automatic fallback filename when a student forgets to save:
 * "(Subject Name)_Notes_1.pdf"
 */
export function formatAutoSaveFilename(subjectName) {
  const cleanSubject = String(subjectName || 'Session')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'Session';
  return `(${cleanSubject})_Notes_1.pdf`;
}

/**
 * Sanitizes a user-provided custom filename and ensures it ends with .pdf
 */
export function sanitizePdfFilename(customName, fallbackSubject = 'Session') {
  const cleaned = String(customName ?? '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return formatAutoSaveFilename(fallbackSubject);
  }

  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

/**
 * Generates a Uint8Array containing a valid %PDF-1.4 document.
 */
export function generateNotesPdfBytes({
  title = 'Session Notes',
  subject = 'General',
  topic = '',
  sessionCode = '',
  studentName = 'Student',
  dateStr = new Date().toLocaleDateString(),
  content = '',
} = {}) {
  const lines = wrapNoteLines(content, 78);
  const linesPerPage = 42;
  const pagesCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
  const pages = [];

  for (let p = 0; p < pagesCount; p++) {
    pages.push(lines.slice(p * linesPerPage, (p + 1) * linesPerPage));
  }

  let objIndex = 1;
  const catalogObjNum = objIndex++;
  const pagesObjNum = objIndex++;
  const fontRegularObjNum = objIndex++;
  const fontBoldObjNum = objIndex++;

  const pageObjNums = [];
  const contentObjNums = [];

  for (let i = 0; i < pagesCount; i++) {
    pageObjNums.push(objIndex++);
    contentObjNums.push(objIndex++);
  }

  const safeTitle = (String(title || '').trim() || `${subject || 'Session'} Notes`).slice(0, 70);
  const metaLine1 = [
    `Subject: ${subject || 'General'}`,
    topic ? `Topic: ${topic}` : null,
    sessionCode ? `Session: ${sessionCode}` : null,
  ].filter(Boolean).join('   |   ');
  const metaLine2 = `Student: ${studentName || 'Student'}   |   Date: ${dateStr}   |   LCCB Academix Session Notepad`;

  const pageStreams = pages.map((pageLines, pageIdx) => {
    let stream = 'BT\n';

    // Title
    stream += '/F2 16 Tf\n';
    stream += '50 785 Td\n';
    stream += `(${escapePdfText(safeTitle)}) Tj\n`;

    // Metadata lines
    stream += '/F1 9.5 Tf\n';
    stream += '0 -18 Td\n';
    stream += `(${escapePdfText(metaLine1)}) Tj\n`;
    stream += '0 -14 Td\n';
    stream += `(${escapePdfText(metaLine2)}) Tj\n`;

    // Divider
    stream += '0 -12 Td\n';
    stream += `(_____________________________________________________________________________________) Tj\n`;

    // Note body
    stream += '/F1 10.5 Tf\n';
    stream += '0 -20 Td\n';

    for (let i = 0; i < pageLines.length; i++) {
      if (i > 0) {
        stream += '0 -14 Td\n';
      }
      stream += `(${escapePdfText(pageLines[i])}) Tj\n`;
    }

    // Footer at fixed bottom coordinate
    stream += 'ET\nBT\n';
    stream += '/F1 8.5 Tf\n';
    stream += '50 36 Td\n';
    stream += `(La Consolacion College Bacolod - LCCB Academix   |   Page ${pageIdx + 1} of ${pagesCount}) Tj\n`;
    stream += 'ET';
    return stream;
  });

  const pdfParts = [];
  const offsets = [];
  let bytePos = 0;

  const pushStr = (str) => {
    pdfParts.push(str);
    bytePos += str.length;
  };

  const addObj = (num, body) => {
    offsets[num] = bytePos;
    pushStr(`${num} 0 obj\n${body}\nendobj\n`);
  };

  pushStr('%PDF-1.4\n');

  addObj(catalogObjNum, `<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`);
  addObj(
    pagesObjNum,
    `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pagesCount} >>`
  );
  addObj(fontRegularObjNum, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  addObj(fontBoldObjNum, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

  for (let i = 0; i < pagesCount; i++) {
    const stream = pageStreams[i];
    addObj(
      pageObjNums[i],
      `<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 595.28 841.89] /Contents ${contentObjNums[i]} 0 R /Resources << /Font << /F1 ${fontRegularObjNum} 0 R /F2 ${fontBoldObjNum} 0 R >> >> >>`
    );
    addObj(contentObjNums[i], `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  const xrefOffset = bytePos;
  let xref = `xref\n0 ${objIndex}\n0000000000 65535 f \n`;
  for (let i = 1; i < objIndex; i++) {
    const off = String(offsets[i]).padStart(10, '0');
    xref += `${off} 00000 n \n`;
  }

  pushStr(xref);
  pushStr(
    `trailer\n<< /Size ${objIndex} /Root ${catalogObjNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const fullString = pdfParts.join('');
  const bytes = new Uint8Array(fullString.length);
  for (let i = 0; i < fullString.length; i++) {
    bytes[i] = fullString.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Triggers a browser download of the generated PDF notes.
 */
export function downloadNotesPdf(options = {}, fileName = '') {
  const finalName = sanitizePdfFilename(fileName, options.subject);
  const bytes = generateNotesPdfBytes(options);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return { fileName: finalName, byteLength: bytes.byteLength };
}

