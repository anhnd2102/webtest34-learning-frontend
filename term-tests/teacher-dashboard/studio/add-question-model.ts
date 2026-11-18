// NGUỒN: file .ts này; add-question-model.js do `npm run build` sinh ra.
//
// Phần thuần (không DOM) của hộp thoại "Thêm câu hỏi" (spec #91, GĐ 3): chọn dạng, form từng câu sinh từ registry,
// dán hàng loạt từ Excel, gõ nhanh, và xem trước câu hỏi. Kiểm thử bằng Node.
import { escapeHtml } from '../ui/presentation.js';
import { COLUMNS, COLUMN_LABEL, FIELD_NOTES, OPTION_FIELDS, TYPES, TYPE_BY_CODE, resolveHeader } from './import-registry.js';
import type { FieldId, ImportRecord, TypeCode } from './import-registry.js';
import { parseDelimited } from './import-engine.js';

const FAMILY_ORDER = ['Trắc nghiệm', 'Điền từ', 'Từ vựng', 'Viết câu', 'Nghe', 'Đọc', 'Viết / Tự luận'];

export function typeChoices(): { family: string, types: { code: TypeCode, label: string }[] }[] {
  const families = new Map<string, { code: TypeCode, label: string }[]>();
  for (const spec of TYPES) families.set(spec.family, [...(families.get(spec.family) || []), { code: spec.code, label: spec.label }]);
  const known = FAMILY_ORDER.filter(family => families.has(family));
  const extra = [...families.keys()].filter(family => !FAMILY_ORDER.includes(family));
  return [...known, ...extra].map(family => ({ family, types: families.get(family) as { code: TypeCode, label: string }[] }));
}

// Cách tạo từng câu của mỗi dạng: form riêng, trình hướng dẫn riêng (tự luận), hay chỉ làm theo bộ (nghe sắp xếp).
export type SingleMode = 'form' | 'wizard' | 'batch-only';
export function singleMode(typeCode: TypeCode): SingleMode {
  if (typeCode === 'rubric_async') return 'wizard';
  if (typeCode === 'listening_order') return 'batch-only';
  return 'form';
}

export interface FormField { id: FieldId, label: string, required: boolean, note: string, multiline: boolean, placeholder: string }

const MULTILINE: FieldId[] = ['prompt', 'context', 'explanation'];

export function formFields(typeCode: TypeCode): FormField[] {
  const spec = TYPE_BY_CODE[typeCode];
  const example = spec.examples[0] || {};
  return COLUMNS.map(column => column.id).filter(id => spec.columns.includes(id)).map(id => ({
    id,
    label: COLUMN_LABEL[id] || id,
    required: spec.required.includes(id),
    note: spec.help.columnNotes[id] || FIELD_NOTES[id] || '',
    multiline: MULTILINE.includes(id),
    placeholder: String(example[id] ?? '')
  }));
}

export function emptyRecord(typeCode: TypeCode): ImportRecord {
  const record: ImportRecord = {};
  for (const field of formFields(typeCode)) record[field.id] = '';
  return record;
}

// ---------------------------------------------------------------- dán hàng loạt từ Excel / Sheets / Word

// Dán nhiều dòng (ô cách nhau bằng tab hoặc phẩy): có hàng tiêu đề thì ghép theo tên cột, không có thì theo thứ tự cột của dạng.
export function pasteToRecords(typeCode: TypeCode, text: string): ImportRecord[] {
  const rows = parseDelimited(text);
  if (!rows.length) return [];
  const spec = TYPE_BY_CODE[typeCode];
  const canonical = COLUMNS.map(column => column.id).filter(id => spec.columns.includes(id));
  const headerFields = rows[0].cells.map(cell => resolveHeader(cell, typeCode));
  const hasHeader = headerFields.filter(Boolean).length >= 2;
  const columns: (FieldId | undefined)[] = hasHeader ? headerFields : canonical;
  const body = hasHeader ? rows.slice(1) : rows;
  return body.map(({ cells }) => {
    const record = emptyRecord(typeCode);
    columns.forEach((field, index) => {
      if (!field || field === 'optionsList') return;
      const value = String(cells[index] ?? '').trim();
      if (value) record[field] = value;
    });
    return record;
  });
}

// ---------------------------------------------------------------- gõ nhanh (mỗi dòng một câu)

export const QUICK_TYPES: TypeCode[] = ['vocabulary_pair', 'fitb', 'single_choice'];

export const QUICK_HINT: { [K in TypeCode]?: string } = {
  vocabulary_pair: 'Mỗi dòng một từ: destination - điểm đến',
  fitb: 'Mỗi dòng một câu: She was born ___ 1995. | in | during (đáp án đầu là đáp án chính, các đáp án sau cũng được tính)',
  single_choice: 'Mỗi dòng một câu: She is interested ___ marine biology. | in* | at | on (dấu * đánh dấu đáp án đúng)'
};

export interface QuickResult { records: ImportRecord[], problems: { line: number, text: string }[] }

export function quickTextToRecords(typeCode: TypeCode, text: string): QuickResult {
  const result: QuickResult = { records: [], problems: [] };
  String(text || '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const record = emptyRecord(typeCode);
    if (typeCode === 'vocabulary_pair') {
      const match = line.match(/^(.*?)(?:\t|\s[-–—]\s|\s?=\s?|\s:\s)(.+)$/);
      if (!match) { result.problems.push({ line: index + 1, text: 'Cần có từ tiếng Anh và nghĩa, cách nhau bằng " - ", "=" hoặc tab.' }); return; }
      record.prompt = match[1].trim(); record.correct = match[2].trim();
    } else if (typeCode === 'fitb') {
      const [prompt, correct, ...rest] = line.split('|').map(part => part.trim());
      if (!prompt || !correct) { result.problems.push({ line: index + 1, text: 'Cần có câu và đáp án, cách nhau bằng dấu |.' }); return; }
      record.prompt = prompt; record.correct = correct; record.accepted = rest.filter(Boolean).join(' | ');
    } else if (typeCode === 'single_choice') {
      const [prompt, ...tail] = line.split('|').map(part => part.trim());
      // Sau câu hỏi: các lựa chọn cách nhau bằng | (hoặc dấu phẩy nếu chỉ có một cụm).
      const options = (tail.length === 1 ? tail[0].split(',') : tail).map(part => part.trim()).filter(Boolean);
      if (!prompt || options.length < 2) { result.problems.push({ line: index + 1, text: 'Cần có câu hỏi và ít nhất 2 lựa chọn; đánh dấu đáp án đúng bằng *.' }); return; }
      const correct = options.findIndex(option => option.endsWith('*'));
      if (correct < 0) { result.problems.push({ line: index + 1, text: 'Chưa đánh dấu đáp án đúng bằng dấu * sau lựa chọn.' }); return; }
      record.prompt = prompt;
      options.slice(0, OPTION_FIELDS.length).forEach((option, position) => { record[OPTION_FIELDS[position]] = option.replace(/\*$/, '').trim(); });
      record.correct = 'ABCDEFGH'[correct];
    } else {
      result.problems.push({ line: index + 1, text: 'Dạng này chưa hỗ trợ gõ nhanh.' });
      return;
    }
    result.records.push(record);
  });
  return result;
}

// ---------------------------------------------------------------- xem trước nhanh

const optionList = (options: { id: string, label: string }[]): string => `<ol class="aq-preview-options" type="A">${options.map(option => `<li>${escapeHtml(option.label)}</li>`).join('')}</ol>`;

// Xem trước gần đúng cách học viên thấy câu hỏi (không hiện đáp án đúng). Bản đầy đủ: "Xem trước bài thi" của Test Studio.
export function cardPreviewHtml(card: { [key: string]: any }): string {
  const prompt = `<p class="aq-preview-prompt">${escapeHtml(String(card.prompt ?? ''))}</p>`;
  const type = card.pedagogicalTypeCode;
  let body = '';
  if (type === 'sentence_reorder') body = `<div class="aq-preview-tokens">${(card.tokens || []).map((token: string) => `<span class="aq-preview-token">${escapeHtml(token)}</span>`).join('')}</div>`;
  else if (type === 'sentence_rewrite') body = `<p class="aq-preview-meta">Từ khóa: <strong>${escapeHtml(card.mandatoryKeyword || '')}</strong></p><p class="aq-preview-meta">${escapeHtml(card.targetSentence || '')}</p>`;
  else if (type === 'error_correction') body = '<p class="aq-preview-meta">Học viên bấm vào từ sai và gõ cách sửa.</p>';
  else if (type === 'pictorial_vocabulary') body = `<p class="aq-preview-meta">Ảnh: ${escapeHtml(card.image || '(chưa có)')}</p><p class="aq-preview-meta">Gợi ý: ${escapeHtml(card.captionHint || '')}</p><div class="aq-preview-input"></div>`;
  else if (type === 'vocabulary_pair') body = '<p class="aq-preview-meta">Học viên chọn nghĩa tiếng Việt đúng cho từ này.</p>';
  else if (type === 'listening_order') body = `<ol class="aq-preview-options">${(card.listeningEvents || []).map((event: { text: string }) => `<li>${escapeHtml(event.text)}</li>`).join('')}</ol>`;
  else if (type === 'inline_cloze') body = '<p class="aq-preview-meta">Học viên điền từng chỗ trống ngay trong đoạn văn.</p>';
  else if (card.graderType === 'rubric_async') body = '<div class="aq-preview-input aq-preview-textarea"></div>';
  else if (Array.isArray(card.options) && card.options.length) body = optionList(card.options);
  else body = '<div class="aq-preview-input"></div>';
  const points = card.maxScore ? `<p class="aq-preview-points">${escapeHtml(String(card.maxScore))} điểm</p>` : '';
  return `<div class="aq-preview-card">${prompt}${body}${points}</div>`;
}
