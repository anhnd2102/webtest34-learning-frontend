// NGUỒN: file .ts này; import-engine.js do `npm run build` sinh ra.
//
// Bộ đọc/ghi CSV thống nhất cho Test Studio (spec #91, GĐ 1). Một bộ đọc cho cả "một dạng trong một bài tập" (scope 'type')
// và "cả Phần" (scope 'block'); tự nhận file mới (cột tiếng Việt) lẫn file cũ (mẫu từng dạng, mẫu 7 cột, tiêu đề tiếng Anh).
// Không dừng ở lỗi đầu tiên: mỗi dòng có trạng thái Hợp lệ / Cảnh báo / Lỗi kèm số dòng, cột và cách sửa. Không đụng DOM.
import {
  COLUMNS, COLUMN_LABEL, FIELD_NOTES, OPTION_FIELDS, OPTION_LETTERS, TYPES, TYPE_BY_CODE,
  isKnownHeader, resolveHeader, resolveTypeCode
} from './import-registry.js';
import type { FieldId, ImportRecord, TypeCode, TypeSpec } from './import-registry.js';

export type Scope = 'type' | 'block';
export type RowStatus = 'ok' | 'warning' | 'error';
export interface RowMessage { level: 'error' | 'warning', column: string, text: string, hint?: string }
export interface RowResult { line: number, typeCode?: TypeCode, status: RowStatus, messages: RowMessage[], record: ImportRecord, cards: ImportCardOut[] }
export type ImportCardOut = { [key: string]: any };
export interface ImportExercise { title: string, instructions: string, items: ImportCardOut[] }
export type ImportFormat = 'empty' | 'unified' | 'legacy-type' | 'legacy-block';
export interface ReadResult {
  scope: Scope;
  format: ImportFormat;
  notices: string[];
  rows: RowResult[];
  exercises: ImportExercise[];
  // Các thẻ câu hỏi của các dòng Hợp lệ/Cảnh báo, theo thứ tự (cho nhập một dạng).
  cards: ImportCardOut[];
  summary: { total: number, ok: number, warning: number, error: number };
}
export interface ReadOptions { scope: Scope, typeCode?: TypeCode, defaultPoints?: number, newGroupId?: () => string }

// ---------------------------------------------------------------- phân tích văn bản

const countOutsideQuotes = (line: string, char: string): number => {
  let inside = false; let count = 0;
  for (const ch of line) { if (ch === '"') inside = !inside; else if (ch === char && !inside) count += 1; }
  return count;
};

export function detectDelimiter(text: string): string {
  const firstLine = text.replace(/^﻿/, '').split(/\r?\n/)[0] || '';
  const candidates = [',', ';', '\t'].map(char => ({ char, count: countOutsideQuotes(firstLine, char) }));
  const best = candidates.reduce((a, b) => (b.count > a.count ? b : a));
  return best.count > 0 ? best.char : ',';
}

export function parseDelimited(rawText: string, delimiter = detectDelimiter(rawText)): { cells: string[], line: number }[] {
  const text = String(rawText ?? '').replace(/^﻿/, '');
  const rows: { cells: string[], line: number }[] = [];
  let cells: string[] = []; let field = ''; let inside = false; let line = 1; let rowLine = 1;
  const pushRow = () => {
    cells.push(field.trim());
    if (cells.some(cell => cell.length > 0)) rows.push({ cells, line: rowLine });
    cells = []; field = '';
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (inside && text[i + 1] === '"') { field += '"'; i += 1; } else inside = !inside;
    } else if (ch === delimiter && !inside) { cells.push(field.trim()); field = ''; }
    else if ((ch === '\r' || ch === '\n') && !inside) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      pushRow(); line += 1; rowLine = line;
    } else { if (ch === '\n') line += 1; field += ch; }
  }
  if (field.length > 0 || cells.length > 0) pushRow();
  return rows;
}

// ---------------------------------------------------------------- tiện ích

const clean = (value: string | undefined): string => String(value ?? '').trim();
const splitList = (value: string | undefined, separator = /[|;]/): string[] => clean(value).split(separator).map(part => part.trim()).filter(Boolean);
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];

function optionsOf(record: ImportRecord): { letter: string, text: string }[] {
  const options: { letter: string, text: string }[] = [];
  OPTION_FIELDS.forEach((field, index) => { const text = clean(record[field]); if (text) options.push({ letter: OPTION_LETTERS[index], text }); });
  return options;
}

// Đáp án đúng có thể là chữ cái, số thứ tự (1, 2…), số La Mã (i, ii…) hoặc đúng nguyên văn một lựa chọn.
function resolveLetter(token: string, options: { letter: string, text: string }[], allowRoman: boolean): string | undefined {
  const raw = clean(token);
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  if (/^[A-H]$/.test(upper) && options.some(option => option.letter === upper)) return upper;
  const lower = raw.toLowerCase();
  if (allowRoman) {
    const roman = ROMAN.indexOf(lower.replace(/\.$/, ''));
    if (roman >= 0 && options[roman]) return options[roman].letter;
  }
  const byText = options.find(option => option.text.toLowerCase() === lower);
  if (byText) return byText.letter;
  if (/^\d+$/.test(raw)) { const index = Number(raw) - 1; if (options[index]) return options[index].letter; }
  return undefined;
}

const message = (level: RowMessage['level'], field: FieldId | string, text: string, hint?: string): RowMessage =>
  ({ level, column: (COLUMN_LABEL as { [key: string]: string | undefined })[field] || String(field), text, ...(hint ? { hint } : {}) });

// ---------------------------------------------------------------- dựng thẻ câu hỏi từ một dòng chuẩn

interface BuildContext { defaultPoints: number, newGroupId: () => string }

function readPoints(record: ImportRecord, fallback: number, messages: RowMessage[]): number {
  const raw = clean(record.points);
  if (!raw) return fallback;
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) {
    messages.push(message('warning', 'points', `"${raw}" không hợp lệ, dùng mặc định ${fallback}.`, 'Nhập một số lớn hơn 0, ví dụ 1 hoặc 0.5.'));
    return fallback;
  }
  return value;
}

function requireFields(record: ImportRecord, spec: TypeSpec, messages: RowMessage[]): boolean {
  let ok = true;
  for (const field of spec.required) {
    if (!clean(record[field])) { messages.push(message('error', field, 'Chưa điền (bắt buộc).', `Dạng "${spec.label}" bắt buộc có cột ${COLUMN_LABEL[field]}.`)); ok = false; }
  }
  return ok;
}

function buildCards(record: ImportRecord, spec: TypeSpec, ctx: BuildContext, messages: RowMessage[]): ImportCardOut[] {
  if (!requireFields(record, spec, messages)) return [];
  const prompt = clean(record.prompt);
  // Điểm mặc định người dùng chọn trong hộp thoại thắng điểm mặc định của dạng.
  const points = readPoints(record, ctx.defaultPoints > 0 ? ctx.defaultPoints : spec.defaultPoints, messages);
  const options = optionsOf(record);
  const correct = clean(record.correct);
  const accepted = splitList(record.accepted, /[|;]/);

  switch (spec.code) {
    case 'single_choice':
    case 'pronunciation_choice': {
      if (options.length < 2) { messages.push(message('error', 'optB', 'Cần ít nhất 2 lựa chọn (A và B).')); return []; }
      const letter = resolveLetter(correct, options, false);
      if (!letter) {
        messages.push(message('error', 'correct', `"${correct}" không có trong các lựa chọn ${options.map(option => option.letter).join(', ')}.`, 'Ghi đúng chữ cái của lựa chọn đúng.'));
        return [];
      }
      const pronunciation = spec.code === 'pronunciation_choice';
      const count = options.length;
      const card: ImportCardOut = {
        prompt: pronunciation && !(prompt.includes(' ') || prompt.endsWith(':') || prompt.endsWith('?')) ? `Choose the correct pronunciation for "${prompt}":` : prompt,
        interactionType: 'single_choice',
        pedagogicalTypeCode: pronunciation ? 'pronunciation_choice' : 'multiple_choice',
        layoutType: pronunciation ? 'ipa_card' : (count === 2 ? 'grid_2' : count === 3 ? 'grid_3' : 'grid_4'),
        graderType: 'exact_option',
        options: options.map(option => ({ id: pronunciation ? option.letter : `opt_${option.letter.toLowerCase()}`, label: option.text })),
        expectedOptionId: pronunciation ? letter : `opt_${letter.toLowerCase()}`,
        explanation: clean(record.explanation),
        maxScore: points
      };
      if (pronunciation) card.targetWord = prompt.includes(' ') ? '' : prompt;
      return [card];
    }
    case 'multi_select_group': {
      if (options.length < 2) { messages.push(message('error', 'optB', 'Cần ít nhất 2 lựa chọn.')); return []; }
      const letters: string[] = [];
      for (const token of correct.split(/[,|;\s]+/).filter(Boolean)) {
        const letter = resolveLetter(token, options, false);
        if (!letter) { messages.push(message('error', 'correct', `"${token}" không có trong các lựa chọn ${options.map(option => option.letter).join(', ')}.`, 'Ghi các chữ cái đúng, cách nhau bằng dấu phẩy (ví dụ A, C).')); return []; }
        if (!letters.includes(letter)) letters.push(letter);
      }
      if (letters.length < 2) { messages.push(message('error', 'correct', 'Dạng chọn nhiều cần từ 2 đáp án đúng trở lên.', 'Ghi ví dụ A, C. Nếu chỉ có một đáp án đúng, dùng dạng "Trắc nghiệm một đáp án".')); return []; }
      const slotCount = letters.length;
      const groupId = ctx.newGroupId();
      const slotScore = points >= slotCount ? Math.round((points / slotCount) * 100) / 100 : points;
      return Array.from({ length: slotCount }, (_unused, slot) => ({
        prompt: slot === 0 ? prompt : `Chọn đáp án chính xác (Vị trí ${slot + 1}):`,
        interactionType: 'multi_choice_group', pedagogicalTypeCode: 'multiple_choice_group', layoutType: 'grid_3', graderType: 'unordered_group_slot',
        groupId, options: options.map(option => ({ id: option.letter, label: option.text })), expectedOptionIds: letters, required: true, maxScore: slotScore
      }));
    }
    case 'fitb': {
      const all = Array.from(new Set([correct, ...accepted]));
      return [{ prompt, interactionType: 'short_text', pedagogicalTypeCode: 'fitb', layoutType: 'default', graderType: 'accepted_text', targetAnswer: correct, accepted: all, maxScore: points }];
    }
    case 'inline_cloze': {
      const blanks = Array.from(prompt.matchAll(/(?:\((\d+)\)\s*[_.…]{1,})|(?:\[(\d+)\]\s*[_.…]*)|(?:\{\{(\d+)\}\})|(?:\((\d+)\))/g));
      const numbers: number[] = [];
      for (const match of blanks) { const n = Number(match[1] || match[2] || match[3] || match[4]); if (!numbers.includes(n)) numbers.push(n); }
      if (!numbers.length) { messages.push(message('error', 'prompt', 'Không tìm thấy chỗ trống đánh số.', 'Đánh số chỗ trống dạng (1) ______ hoặc [1].')); return []; }
      const answers = correct.split(/[|;]/).map(answer => answer.trim());
      if (answers.filter(Boolean).length < numbers.length) messages.push(message('warning', 'correct', `Đề bài có ${numbers.length} chỗ trống nhưng chỉ có ${answers.filter(Boolean).length} đáp án.`, 'Ghi đáp án từng chỗ trống theo thứ tự, cách nhau bằng |.'));
      const clozeAnswers: { [n: number]: { targetWord: string, accepted: string[] } } = {};
      numbers.forEach((number, index) => {
        const variants = (answers[index] || '').split('/').map(part => part.trim()).filter(Boolean);
        const main = variants[0] || answers[index] || '';
        clozeAnswers[number] = { targetWord: main, accepted: variants.length ? variants : (main ? [main] : []) };
      });
      const first = clozeAnswers[numbers[0]]?.targetWord || '';
      return [{ prompt, interactionType: 'short_text', pedagogicalTypeCode: 'inline_cloze', layoutType: 'inline_cloze', graderType: 'inline_cloze', clozeAnswers, targetWord: first, accepted: first ? [first] : [], maxScore: numbers.length * points }];
    }
    case 'vocabulary_pair':
      return [{ prompt, english: prompt, vietnamese: correct, targetWord: prompt, vietnameseMeaning: correct, captionHint: correct, interactionType: 'text_select_pair', pedagogicalTypeCode: 'vocabulary_pair', layoutType: 'vocab_pair', graderType: 'accepted_text_exact_option', accepted: [prompt], options: [], expectedOptionId: '', maxScore: points }];
    case 'pictorial_vocabulary': {
      if (!clean(record.image)) messages.push(message('warning', 'image', 'Chưa điền.', 'Điền tên file ảnh (hoặc đường dẫn); không có ảnh học viên sẽ không có hình để nhìn.'));
      return [{ prompt: correct, image: clean(record.image), targetWord: correct, captionHint: clean(record.hint), accepted: Array.from(new Set([correct, ...accepted])), interactionType: 'short_text', pedagogicalTypeCode: 'pictorial_vocabulary', layoutType: 'pictorial_card', graderType: 'accepted_text', maxScore: points }];
    }
    case 'error_correction': {
      const wrong = clean(record.wrongPart);
      if (!prompt.toLowerCase().includes(wrong.toLowerCase())) messages.push(message('warning', 'wrongPart', `"${wrong}" không xuất hiện trong đề bài.`, 'Kiểm tra lại cách viết từ sai.'));
      const corrections = Array.from(new Set([...correct.split(/[|/]/).map(part => part.trim()).filter(Boolean), ...accepted]));
      return [{ prompt, explanation: clean(record.explanation), interactionType: 'correction_pair', pedagogicalTypeCode: 'error_correction', layoutType: 'correction_inline', graderType: 'correction_pair', targetWord: wrong, expectedErrors: [wrong], expectedCorrections: corrections, accepted: corrections, scoringRule: 'split_points', maxScore: points }];
    }
    case 'sentence_transformation': {
      const acceptedAll = Array.from(new Set([correct, ...accepted]));
      return [{ prompt, interactionType: 'short_text', pedagogicalTypeCode: 'sentence_rewrite', layoutType: 'keyword_transformation', graderType: 'accepted_text', mandatoryKeyword: clean(record.keyword).toUpperCase(), targetSentence: clean(record.targetSentence) || '(1) __________', accepted: acceptedAll, maxScore: points }];
    }
    case 'sentence_reorder': {
      const tokens = (prompt.includes('/') ? prompt.split('/') : prompt.split(/\s+/)).map(token => token.trim()).filter(Boolean);
      if (tokens.length < 2) { messages.push(message('error', 'prompt', 'Cần ít nhất 2 từ hoặc cụm từ.', 'Ngăn cách các cụm bằng dấu /.')); return []; }
      const target = correct || tokens.join(' ').replace(/\s+([.,!?;:])/g, '$1');
      return [{ prompt: 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:', helpText: clean(record.hint), interactionType: 'short_text', pedagogicalTypeCode: 'sentence_reorder', layoutType: 'token_scramble', graderType: 'accepted_text', tokens, distractors: [], targetSentence: target, accepted: [target], maxScore: points }];
    }
    case 'listening_order': {
      const rank = Number.parseInt(correct, 10);
      if (!Number.isFinite(rank) || rank < 1) { messages.push(message('error', 'correct', `"${correct}" không phải thứ tự hợp lệ.`, 'Ghi số thứ tự đúng: 1, 2, 3…')); return []; }
      return [{ prompt, text: prompt, correctRank: rank, rank, interactionType: 'listening_order', pedagogicalTypeCode: 'listening_order', layoutType: 'timeline_sequence', graderType: 'exact_option', maxScore: points }];
    }
    case 'reading_matching': {
      if (options.length < 2) { messages.push(message('error', 'optB', 'Cần ít nhất 2 tiêu đề (Lựa chọn A và B).')); return []; }
      const letter = resolveLetter(correct, options, true);
      if (!letter) { messages.push(message('error', 'correct', `"${correct}" không có trong các lựa chọn ${options.map(option => option.letter).join(', ')}.`, 'Ghi chữ cái của tiêu đề đúng cho đoạn này.')); return []; }
      return [{ prompt, interactionType: 'single_choice', pedagogicalTypeCode: 'reading_matching', layoutType: 'split_pane_matching', graderType: 'exact_option', options: options.map(option => ({ id: option.letter, label: option.text })), expectedOptionId: letter, maxScore: points }];
    }
    case 'rubric_async': {
      const context = clean(record.context);
      const half = Math.round((points / 2) * 10) / 10;
      const criteria = [
        { id: 'crit_1', label: clean(record.criterion1) || 'Ý nghĩa & Nội dung', maxScore: half, requiredConcepts: [] as string[] },
        { id: 'crit_2', label: clean(record.criterion2) || 'Ngữ pháp & Diễn đạt', maxScore: Math.round((points - half) * 10) / 10, requiredConcepts: [] as string[] }
      ];
      const preset = clean(record.legacyPreset);
      if (preset) messages.push(message('warning', 'legacyPreset', `Mã mẫu chấm cũ "${preset}" chỉ còn giá trị tham khảo.`, 'Tự luận chấm AI kiểu mới (theo Khối) sẽ có cột riêng ở giai đoạn sau.'));
      return [{ prompt, referenceContext: context, helpText: context, interactionType: 'long_text', pedagogicalTypeCode: 'writing', layoutType: 'default', graderType: 'rubric_async', maxScore: points, rubricCode: 'rubric_async_custom', rubricVersion: 1, rubric: { scoringVersion: 'rubric_async_custom', maxScore: points, criteria } }];
    }
    default:
      return [];
  }
}

// ---------------------------------------------------------------- nhận diện định dạng và chuyển dòng thành bản ghi chuẩn

const LEGACY_BLOCK_HEADER = ['exercise title', 'exercise instructions', 'question type', 'prompt', 'correct answer', 'options or details', 'score'];
const foldHeader = (text: string): string => clean(text).toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');

// Mẫu 7 cột cũ: hai cột "Correct_Answer" và "Options_Or_Details" đổi nghĩa theo dạng; đổi sang cột có tên rõ nghĩa.
function legacyBlockRecord(cells: string[], typeCode: TypeCode): ImportRecord {
  const record: ImportRecord = { exerciseTitle: clean(cells[0]), exerciseInstructions: clean(cells[1]), prompt: clean(cells[3]), points: clean(cells[6]) };
  let answer = clean(cells[4]);
  let details = clean(cells[5]);
  // Dòng chọn nhiều bị tách thừa cột khi đáp án "A, C" không được đặt trong ngoặc kép.
  if (cells.length >= 8 && /^[A-Za-z]$/.test(answer) && /^[A-Za-z]$/.test(details) && clean(cells[6]).includes('|')) {
    answer = `${answer}, ${details}`; details = clean(cells[6]); record.points = clean(cells[7]);
  }
  const fillOptions = (list: string[]) => { OPTION_FIELDS.forEach((field, index) => { if (list[index]) record[field] = list[index]; }); };
  switch (typeCode) {
    case 'single_choice': case 'multi_select_group': case 'pronunciation_choice': case 'reading_matching':
      fillOptions(splitList(details)); record.correct = answer; break;
    case 'fitb': record.correct = answer; record.accepted = details; break;
    case 'inline_cloze': record.correct = answer; break;
    case 'vocabulary_pair': record.prompt = record.prompt || details; record.correct = answer; break;
    case 'pictorial_vocabulary': record.image = record.prompt; record.prompt = ''; record.correct = answer; record.accepted = details; break;
    case 'error_correction': {
      let wrong = answer; let right = details;
      const arrow = /->|=>|→/;
      if (!right && arrow.test(wrong)) { [wrong, right] = wrong.split(arrow).map(part => part.trim()); }
      else if (!wrong && arrow.test(right)) { [wrong, right] = right.split(arrow).map(part => part.trim()); }
      // Mẫu cũ đôi khi viết ngược (từ đúng nằm trong câu, từ sai không): đổi chỗ để khớp.
      const promptLower = (record.prompt || '').toLowerCase();
      if (right && promptLower.includes(right.toLowerCase()) && !promptLower.includes((wrong || '').toLowerCase())) [wrong, right] = [right, wrong];
      record.wrongPart = wrong; record.correct = right; break;
    }
    case 'sentence_transformation': { const parts = splitList(details); record.keyword = parts[0] || ''; record.targetSentence = parts[1] || ''; record.correct = answer; break; }
    case 'sentence_reorder': record.correct = answer; record.hint = details; break;
    case 'listening_order': record.correct = answer; break;
    case 'rubric_async': { record.context = answer; const criteria = splitList(details); record.criterion1 = criteria[0] || ''; record.criterion2 = criteria[1] || ''; break; }
  }
  return record;
}

function mapByColumns(cells: string[], columns: (FieldId | undefined)[]): ImportRecord {
  const record: ImportRecord = {};
  columns.forEach((field, index) => {
    if (!field) return;
    const value = clean(cells[index]);
    if (field === 'optionsList') {
      splitList(value).forEach((option, position) => { if (OPTION_FIELDS[position]) record[OPTION_FIELDS[position]] = option; });
    } else if (value || record[field] === undefined) {
      record[field] = value;
    }
  });
  return record;
}

// Mẫu "ghép tiêu đề" cũ: nhiều dòng cho một đoạn văn (Paragraph_Label, Heading_Code, Heading_Text, Is_Correct, Score).
function convertLegacyMatching(rows: { cells: string[], line: number }[]): { record: ImportRecord, line: number }[] {
  const headings: { code: string, text: string }[] = [];
  const paragraphs = new Map<string, { line: number, correctCode?: string, points: string }>();
  for (const { cells, line } of rows) {
    const label = clean(cells[0]); const code = clean(cells[1]); const text = clean(cells[2]);
    if (!label || !code) continue;
    if (!headings.some(heading => heading.code === code)) headings.push({ code, text: text || code });
    const flag = clean(cells[3]).toLowerCase();
    const flagged = flag === 'true' || flag === '1' || flag === 'false' || flag === '0';
    const isCorrect = flagged ? (flag === 'true' || flag === '1') : true;
    const points = flagged ? clean(cells[4]) : clean(cells[3]);
    const current = paragraphs.get(label) || { line, points };
    if (isCorrect) { current.correctCode = code; if (points) current.points = points; }
    paragraphs.set(label, current);
  }
  const out: { record: ImportRecord, line: number }[] = [];
  paragraphs.forEach((paragraph, label) => {
    const record: ImportRecord = { prompt: label, points: paragraph.points };
    headings.slice(0, OPTION_FIELDS.length).forEach((heading, index) => { record[OPTION_FIELDS[index]] = heading.text; });
    const index = headings.findIndex(heading => heading.code === paragraph.correctCode);
    record.correct = index >= 0 && index < OPTION_FIELDS.length ? OPTION_LETTERS[index] : '';
    out.push({ record, line: paragraph.line });
  });
  return out;
}

// ---------------------------------------------------------------- bộ đọc chính

export function readImport(rawText: string, options: ReadOptions): ReadResult {
  const scope = options.scope;
  const result: ReadResult = { scope, format: 'empty', notices: [], rows: [], exercises: [], cards: [], summary: { total: 0, ok: 0, warning: 0, error: 0 } };
  const lines = parseDelimited(rawText);
  if (!lines.length) return result;
  if (scope === 'type' && !options.typeCode) throw new Error('Đọc một dạng cần chỉ rõ typeCode.');
  const ctx: BuildContext = {
    defaultPoints: options.defaultPoints || 0,
    newGroupId: options.newGroupId || (() => `group_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`)
  };

  const first = lines[0].cells;
  const headerFields = first.map(cell => resolveHeader(cell, options.typeCode));
  const recognized = headerFields.filter(Boolean).length;
  const looksLikeHeader = recognized >= 2 || (first.length === 1 && recognized === 1);
  const records: { record: ImportRecord, line: number, typeCode?: TypeCode, typeError?: string }[] = [];

  const dataLines = looksLikeHeader ? lines.slice(1) : lines;
  const hasTypeColumn = headerFields.includes('type') || first.some(cell => foldHeader(cell) === 'question type');
  // Chỉ coi là mẫu mới khi mọi tiêu đề đúng tên cột chuẩn tiếng Việt; còn lại là mẫu cũ (tiêu đề tiếng Anh).
  const canonicalOnly = looksLikeHeader && first.every(cell => !clean(cell) || COLUMNS.some(column => foldHeader(column.label) === foldHeader(cell)));
  const isLegacyBlockHeader = scope === 'block' && first.length >= 7 && LEGACY_BLOCK_HEADER.every((name, index) => foldHeader(first[index]) === name);

  if (scope === 'block') {
    const unified = looksLikeHeader && hasTypeColumn && !isLegacyBlockHeader;
    result.format = unified && canonicalOnly ? 'unified' : 'legacy-block';
    if (result.format === 'legacy-block') result.notices.push('Đây là mẫu cũ (7 cột), đã tự chuyển đổi sang bộ cột mới. Tải mẫu mới để dùng các cột có tên rõ nghĩa.');
    let lastType: TypeCode | undefined;
    for (const { cells, line } of dataLines) {
      let record: ImportRecord; let typeCode: TypeCode | undefined; let typeError: string | undefined;
      if (unified) {
        record = mapByColumns(cells, headerFields);
        const rawType = clean(record.type);
        typeCode = rawType ? resolveTypeCode(rawType) : lastType;
        if (rawType && !typeCode) typeError = `Dạng câu "${rawType}" không nhận ra.`;
        else if (!rawType && !typeCode) typeError = 'Thiếu Dạng câu.';
      } else {
        const rawType = clean(cells[2]);
        typeCode = rawType ? resolveTypeCode(rawType) : (lastType || 'single_choice');
        if (rawType && !typeCode) typeError = `Dạng câu "${rawType}" không nhận ra.`;
        record = typeCode ? legacyBlockRecord(cells, typeCode) : { exerciseTitle: clean(cells[0]), exerciseInstructions: clean(cells[1]), prompt: clean(cells[3]) };
      }
      if (typeCode) lastType = typeCode;
      records.push({ record, line, typeCode, typeError });
    }
  } else {
    const typeCode = options.typeCode as TypeCode;
    const spec = TYPE_BY_CODE[typeCode];
    const isLegacyMatching = typeCode === 'reading_matching' && first.some(cell => foldHeader(cell) === 'heading code');
    const sectionHeader = typeCode === 'listening_order' && foldHeader(first[0]) === 'section title';
    if (isLegacyMatching) {
      result.format = 'legacy-type';
      result.notices.push('Đây là mẫu cũ (nhiều dòng cho một đoạn văn), đã tự chuyển đổi. Tải mẫu mới để dùng một dòng cho mỗi đoạn.');
      for (const converted of convertLegacyMatching(dataLines)) records.push({ ...converted, typeCode });
    } else {
      let columns: (FieldId | undefined)[];
      if (looksLikeHeader) {
        columns = headerFields;
        result.format = canonicalOnly ? 'unified' : 'legacy-type';
      } else {
        // Không có hàng tiêu đề: đọc theo thứ tự cột của mẫu cũ của dạng này.
        const sectionPositional = typeCode === 'listening_order' && lines[0].cells.length >= 3 && Number.isNaN(Number.parseInt(lines[0].cells[1], 10)) && !Number.isNaN(Number.parseInt(lines[0].cells[2], 10));
        columns = sectionPositional ? ['exerciseTitle', 'prompt', 'correct'] : spec.legacy.order;
        result.format = 'legacy-type';
      }
      if (sectionHeader) columns = ['exerciseTitle', 'prompt', 'correct'];
      if (result.format === 'legacy-type') result.notices.push('Đây là mẫu cũ, đã tự chuyển đổi sang bộ cột mới. Tải mẫu mới để dùng các cột có tên rõ nghĩa.');
      for (const { cells, line } of dataLines) records.push({ record: mapByColumns(cells, columns), line, typeCode });
    }
  }

  // Cảnh báo cột lạ trong hàng tiêu đề.
  if (looksLikeHeader) {
    first.forEach((cell, index) => {
      if (clean(cell) && !headerFields[index] && !isKnownHeader(cell)) result.notices.push(`Cột "${clean(cell)}" không được nhận ra nên bị bỏ qua.`);
    });
  }

  // Dựng từng dòng.
  const exerciseOrder: string[] = [];
  const exerciseMap = new Map<string, ImportExercise>();
  let currentExercise = '';
  for (const entry of records) {
    const messages: RowMessage[] = [];
    let cards: ImportCardOut[] = [];
    if (entry.typeError || !entry.typeCode) {
      messages.push(message('error', 'type', entry.typeError || 'Thiếu Dạng câu.', 'Dùng tên dạng trong hướng dẫn, ví dụ "Trắc nghiệm một đáp án".'));
    } else {
      cards = buildCards(entry.record, TYPE_BY_CODE[entry.typeCode], ctx, messages);
    }
    const status: RowStatus = messages.some(m => m.level === 'error') ? 'error' : (messages.length ? 'warning' : 'ok');
    result.rows.push({ line: entry.line, typeCode: entry.typeCode, status, messages, record: entry.record, cards: status === 'error' ? [] : cards });
    result.summary[status] += 1; result.summary.total += 1;
    if (status === 'error') continue;
    const title = clean(entry.record.exerciseTitle);
    if (title) currentExercise = title;
    const key = currentExercise || 'Bài tập 1';
    let exercise = exerciseMap.get(key);
    if (!exercise) { exercise = { title: key, instructions: '', items: [] }; exerciseMap.set(key, exercise); exerciseOrder.push(key); }
    if (clean(entry.record.exerciseInstructions) && !exercise.instructions) exercise.instructions = clean(entry.record.exerciseInstructions);
    exercise.items.push(...cards);
  }

  // Gộp theo bài tập: các sự kiện nghe liên tiếp thành một câu sắp xếp; từ vựng nối nghĩa chia chung bộ nghĩa.
  for (const key of exerciseOrder) {
    const exercise = exerciseMap.get(key) as ImportExercise;
    finalizeVocabulary(exercise);
    finalizeListening(exercise);
    result.exercises.push(exercise);
    result.cards.push(...exercise.items);
  }
  return result;
}

function finalizeVocabulary(exercise: ImportExercise): void {
  const vocab = exercise.items.filter(item => item.pedagogicalTypeCode === 'vocabulary_pair');
  if (!vocab.length) return;
  const meanings = Array.from(new Set(vocab.map(item => item.vietnameseMeaning as string).filter(Boolean)));
  meanings.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
  const options = meanings.map((meaning, index) => ({ id: `meaning-${String(index + 1).padStart(2, '0')}`, label: meaning }));
  for (const item of vocab) {
    item.options = options.map(option => ({ ...option }));
    item.expectedOptionId = options.find(option => option.label === item.vietnameseMeaning)?.id || options[0]?.id || '';
  }
}

function finalizeListening(exercise: ImportExercise): void {
  const events = exercise.items.filter(item => item.pedagogicalTypeCode === 'listening_order');
  if (!events.length) return;
  const sorted = [...events].sort((a, b) => a.correctRank - b.correctRank);
  const listeningEvents = sorted.map((event, index) => ({ id: `ev_${index + 1}`, label: String.fromCharCode(65 + index), text: event.text || event.prompt, correctRank: event.correctRank, rank: event.correctRank, score: event.maxScore || 1 }));
  const card: ImportCardOut = {
    prompt: exercise.instructions || 'Nghe và sắp xếp thứ tự các sự kiện theo đúng trình tự thời gian',
    interactionType: 'listening_order', pedagogicalTypeCode: 'listening_order', layoutType: 'timeline_sequence', graderType: 'exact_option',
    listeningEvents, events: listeningEvents.map(event => ({ ...event })), maxScore: listeningEvents.reduce((sum, event) => sum + event.score, 0)
  };
  exercise.items = [...exercise.items.filter(item => item.pedagogicalTypeCode !== 'listening_order'), card];
}

// ---------------------------------------------------------------- bộ ghi và mẫu

const needsQuote = /[",;\t\r\n]/;
const csvCell = (value: string): string => (needsQuote.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function recordsToCsv(records: ImportRecord[], columnIds: FieldId[]): string {
  const header = columnIds.map(id => COLUMN_LABEL[id] || id).map(csvCell).join(',');
  const body = records.map(record => columnIds.map(id => csvCell(clean(record[id]))).join(','));
  return `﻿${[header, ...body].join('\r\n')}\r\n`;
}

const BLOCK_HEAD: FieldId[] = ['exerciseTitle', 'exerciseInstructions', 'type'];

export function blockColumnIds(): FieldId[] {
  const used = new Set<FieldId>(TYPES.flatMap(spec => spec.columns));
  return [...BLOCK_HEAD, ...COLUMNS.map(column => column.id).filter(id => used.has(id) && !BLOCK_HEAD.includes(id))];
}

// Mẫu một dạng = cột của dạng đó theo thứ tự chuẩn (đúng bộ cột cả Phần bỏ ba cột đầu và bỏ cột không dùng).
export function typeTemplateRecords(typeCode: TypeCode): ImportRecord[] { return TYPE_BY_CODE[typeCode].examples.map(example => ({ ...example })); }

export function typeTemplateCsv(typeCode: TypeCode): string {
  const spec = TYPE_BY_CODE[typeCode];
  const columns = [...COLUMNS.map(column => column.id).filter(id => spec.columns.includes(id))];
  return recordsToCsv(typeTemplateRecords(typeCode), columns);
}

export function blockTemplateRecords(): ImportRecord[] {
  const records: ImportRecord[] = [];
  TYPES.forEach((spec, index) => {
    spec.examples.forEach((example, position) => {
      records.push({
        ...example,
        type: spec.label,
        exerciseTitle: position === 0 ? `Phần ${index + 1}: ${spec.label}` : '',
        exerciseInstructions: position === 0 ? `Hướng dẫn làm bài cho dạng ${spec.label.toLowerCase()}.` : ''
      });
    });
  });
  return records;
}

export function blockTemplateCsv(): string { return recordsToCsv(blockTemplateRecords(), blockColumnIds()); }

// Chuyển kết quả đọc sang dạng {items, invalidRows} mà các hộp thoại nhập một dạng hiện có đang dùng.
export function toLegacyResult(result: ReadResult): { items: ImportCardOut[], invalidRows: { line: number, row: string[], reason: string }[] } {
  return {
    items: result.cards,
    invalidRows: result.rows.filter(row => row.status === 'error').map(row => ({ line: row.line, row: Object.values(row.record).map(String), reason: row.messages.filter(m => m.level === 'error').map(m => `${m.column}: ${m.text}`).join(' ') }))
  };
}

// Excel mẫu (sinh lúc tải, không còn file nhị phân tĩnh): "Phần thi" đứng đầu để tải lên được ngay, "Thông tin Phần",
// mỗi dạng một sheet có ví dụ điền sẵn, và "Hướng dẫn" liệt kê cột từng dạng. Dữ liệu thuần; ghi file ở lớp giao diện.
export interface SheetData { name: string, rows: string[][] }

const SHEET_FORBIDDEN = /[\\/?*[\]:]/g;
const sheetName = (label: string, taken: Set<string>): string => {
  let name = label.replace(SHEET_FORBIDDEN, ' ').replace(/\s+/g, ' ').trim().slice(0, 31);
  let suffix = 2;
  while (taken.has(name)) { const tail = ` ${suffix}`; name = `${label.slice(0, 31 - tail.length)}${tail}`; suffix += 1; }
  taken.add(name);
  return name;
};
const toRows = (records: ImportRecord[], columnIds: FieldId[]): string[][] => [columnIds.map(id => COLUMN_LABEL[id] || id), ...records.map(record => columnIds.map(id => clean(record[id])))];

export function templateWorkbookSheets(): SheetData[] {
  const taken = new Set<string>();
  const sheets: SheetData[] = [];
  sheets.push({ name: sheetName('Phần thi', taken), rows: toRows(blockTemplateRecords(), blockColumnIds()) });
  sheets.push({ name: sheetName('Thông tin Phần', taken), rows: [
    ['Tiêu đề', 'Hướng dẫn', 'Bài đọc', 'Audio'],
    ['Phần 1: Reading', 'Đọc bài đọc rồi trả lời các câu hỏi.', 'Dán bài đọc dài của Phần vào đây (tùy chọn).', 'bai-nghe-1.mp3']
  ] });
  for (const spec of TYPES) {
    const columns = COLUMNS.map(column => column.id).filter(id => spec.columns.includes(id));
    sheets.push({ name: sheetName(spec.label, taken), rows: toRows(typeTemplateRecords(spec.code), columns) });
  }
  const guide: string[][] = [['Dạng câu', 'Cột', 'Bắt buộc', 'Ý nghĩa']];
  for (const spec of TYPES) {
    for (const id of COLUMNS.map(column => column.id).filter(columnId => spec.columns.includes(columnId))) {
      guide.push([spec.label, COLUMN_LABEL[id] || id, spec.required.includes(id) ? 'Có' : 'Không', spec.help.columnNotes[id] || FIELD_NOTES[id] || '']);
    }
  }
  sheets.push({ name: sheetName('Hướng dẫn', taken), rows: guide });
  return sheets;
}
