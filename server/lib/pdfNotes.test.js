import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAutoSaveFilename,
  sanitizePdfFilename,
  generateNotesPdfBytes,
} from '../../src/lib/pdfNotes.js';

test('formatAutoSaveFilename produces (Subject Name)_Notes_1.pdf', () => {
  assert.equal(formatAutoSaveFilename('PROG 201'), '(PROG 201)_Notes_1.pdf');
  assert.equal(formatAutoSaveFilename('IT 101'), '(IT 101)_Notes_1.pdf');
  assert.equal(formatAutoSaveFilename(''), '(Session)_Notes_1.pdf');
});

test('sanitizePdfFilename appends .pdf and cleans illegal characters', () => {
  assert.equal(sanitizePdfFilename('Midterm Review', 'IT 101'), 'Midterm Review.pdf');
  assert.equal(sanitizePdfFilename('Pointers_Guide.pdf', 'PROG 201'), 'Pointers_Guide.pdf');
  assert.equal(sanitizePdfFilename('   ', 'MATH 201'), '(MATH 201)_Notes_1.pdf');
});

test('generateNotesPdfBytes produces valid %PDF-1.4 header and EOF marker', () => {
  const bytes = generateNotesPdfBytes({
    title: 'Linked Lists & Pointers',
    subject: 'PROG 201',
    topic: 'Singly Linked Lists',
    sessionCode: 'SES-001',
    studentName: 'Julian Gemelo',
    content: '1. Node has data + next pointer\n2. Head points to first node\n3. Traverse with while (curr != null)',
  });

  const text = Buffer.from(bytes).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4\n'), 'Should start with %PDF-1.4 header');
  assert.ok(text.includes('(Linked Lists & Pointers) Tj'), 'Should embed note title');
  assert.ok(text.includes('Subject: PROG 201'), 'Should embed subject metadata');
  assert.ok(text.trimEnd().endsWith('%%EOF'), 'Should end with %%EOF');
});

