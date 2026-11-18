import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFromRecord, readImport, readRecords, typeTemplateCsv } from '../term-tests/teacher-dashboard/studio/import-engine.js';
import { RUBRIC_VARIANTS, columnsForVariant } from '../term-tests/teacher-dashboard/studio/import-rubric.js';
import { formFields, pasteToRecords, singleMode } from '../term-tests/teacher-dashboard/studio/add-question-model.js';
import { COLUMN_LABEL } from '../term-tests/teacher-dashboard/studio/import-registry.js';

// Tự luận chấm AI "theo dạng mới" trong hộp thoại Thêm câu hỏi: chọn Dạng chấm và Khối trước, rồi form/bảng/mẫu chỉ có
// các cột của dạng chấm đó; dòng không ghi Dạng chấm/Khối thì dùng lựa chọn này (spec #91, GĐ 5).
const labels = ids => ids.map(id => COLUMN_LABEL[id]);

test('mỗi Dạng chấm có bộ cột riêng, không có cột Dạng chấm/Khối (đã chọn ở trên), luôn có Đề bài và Điểm', () => {
  assert.equal(RUBRIC_VARIANTS.length, 6);
  for (const variant of RUBRIC_VARIANTS) {
    const columns = columnsForVariant(variant.variant);
    assert.ok(columns.includes('prompt') && columns.includes('points'), variant.variant);
    assert.ok(!columns.includes('variant') && !columns.includes('level'), variant.variant);
  }
  assert.deepEqual(labels(columnsForVariant('translation')), ['Đề bài', 'Điểm', 'Yêu cầu bắt buộc', 'Đáp án mẫu', 'Điểm Grammar/Vocab', 'Hướng dẫn chấm thêm']);
  assert.ok(columnsForVariant('reading_comprehension').includes('context'));
  assert.ok(columnsForVariant('sentence_role').includes('correct'));
  assert.ok(!columnsForVariant('sentence_role').includes('requirements'), 'vai trò câu không có danh sách yêu cầu');
  const writing = columnsForVariant('writing');
  for (const id of ['requirements', 'hint', 'wordMin', 'sample']) assert.ok(writing.includes(id), `Writing cần ${id}`);
  assert.ok(!writing.includes('languageScore'), 'Writing không chấm Grammar/Vocab riêng');
});

test('Dạng chấm có Khối khả dụng đúng: Writing chỉ 34 và 45', () => {
  const byVariant = Object.fromEntries(RUBRIC_VARIANTS.map(entry => [entry.variant, entry.levels]));
  assert.deepEqual(byVariant.writing, ['34', '45']);
  assert.deepEqual(byVariant.translation, ['03', '34', '45']);
  for (const entry of RUBRIC_VARIANTS) assert.ok(entry.label && entry.hint, entry.variant);
});

test('form từng câu của dạng chấm: chỉ các cột của dạng, tên cột rõ nghĩa theo dạng', () => {
  const fields = formFields('rubric_async', 'writing');
  assert.deepEqual(fields.map(field => field.id), columnsForVariant('writing'));
  assert.equal(fields.find(field => field.id === 'requirements').multiline, true, 'dàn ý nhập nhiều dòng');
  assert.equal(formFields('rubric_async', 'sentence_role').find(field => field.id === 'correct').label, 'Đáp án đúng');
  assert.ok(formFields('rubric_async').length > formFields('rubric_async', 'translation').length, 'chưa chọn dạng thì giữ đủ cột');
});

test('cách tạo từng câu của Tự luận: chọn dạng chấm rồi thì có form; chưa chọn thì dùng trình hướng dẫn', () => {
  assert.equal(singleMode('rubric_async'), 'wizard');
  assert.equal(singleMode('rubric_async', 'translation'), 'form');
  assert.equal(singleMode('single_choice', 'translation'), 'form');
});

test('mẫu tải về theo dạng chấm: chỉ cột của dạng, ví dụ của đúng dạng đó, đọc lại không lỗi', () => {
  for (const variant of RUBRIC_VARIANTS) {
    const csv = typeTemplateCsv('rubric_async', variant.variant);
    const header = csv.replace(/^﻿/, '').split(/\r?\n/)[0].split(',');
    const expected = [...new Set(['variant', 'level', ...columnsForVariant(variant.variant)])].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
    assert.deepEqual(header, labels(expected), variant.variant);
    const result = readImport(csv, { scope: 'type', typeCode: 'rubric_async', rubricVariant: variant.variant });
    assert.equal(result.summary.error, 0, `${variant.variant}: ${JSON.stringify(result.rows.map(row => row.messages))}`);
    assert.ok(result.summary.total >= 1, variant.variant);
    assert.ok(result.cards.every(card => card.rubricVariant === variant.variant), variant.variant);
  }
});
const ORDER = ['prompt', 'context', 'variant', 'level', 'hint', 'correct', 'points', 'requirements', 'sample', 'wordMin', 'languageScore', 'guidance'];

test('dòng không ghi Dạng chấm dùng dạng đã chọn và Khối đã chọn; dòng có Dạng chấm riêng thì thắng', () => {
  const csv = 'Đề bài,Yêu cầu bắt buộc,Đáp án mẫu,Điểm\nDịch câu một,Cấu trúc A (1.5) | Cấu trúc B (1),Answer one,4';
  const result = readImport(csv, { scope: 'type', typeCode: 'rubric_async', rubricVariant: 'translation', defaultLevel: '03' });
  assert.equal(result.summary.error, 0, JSON.stringify(result.rows[0].messages));
  assert.equal(result.cards[0].pendingRubric.variant, 'translation');
  assert.equal(result.cards[0].pendingRubric.level, '03');
  const mixed = readImport('Đề bài,Dạng chấm,Yêu cầu bắt buộc\nX,Đọc hiểu,Ý một (2) | Ý hai (2)', { scope: 'type', typeCode: 'rubric_async', rubricVariant: 'translation', defaultLevel: '34' });
  assert.equal(mixed.cards[0].pendingRubric.variant, 'reading_comprehension');
});

test('không chọn dạng chấm và dòng không ghi Dạng chấm: vẫn là kiểu cũ như trước (không phá file cũ)', () => {
  const result = readImport('Prompt,Max_Score\nCâu cũ,4', { scope: 'type', typeCode: 'rubric_async' });
  assert.equal(result.cards[0].pendingRubric, undefined);
  assert.equal(result.cards[0].rubric.criteria.length, 2);
});

test('lỗi theo dạng đã chọn: thiếu yêu cầu của Dịch, thiếu vai trò đúng của Writing đọc hiểu, Writing không có Khối 03', () => {
  const noReq = readImport('Đề bài,Điểm\nDịch,4', { scope: 'type', typeCode: 'rubric_async', rubricVariant: 'translation' });
  assert.ok(noReq.rows[0].messages.some(message => message.column === 'Yêu cầu bắt buộc'));
  const noRole = readImport('Đề bài,Điểm\nVai trò?,2', { scope: 'type', typeCode: 'rubric_async', rubricVariant: 'sentence_role' });
  assert.ok(noRole.rows[0].messages.some(message => message.column === 'Đáp án đúng'));
  const writing03 = readImport('Đề bài,Yêu cầu bắt buộc\nEssay,Ý một', { scope: 'type', typeCode: 'rubric_async', rubricVariant: 'writing', defaultLevel: '03' });
  assert.ok(writing03.rows[0].messages.some(message => message.column === 'Khối'));
});

test('dán từ Excel không tiêu đề: ghép theo thứ tự cột của dạng chấm đã chọn', () => {
  const records = pasteToRecords('rubric_async', 'Dịch câu một\t4\tCấu trúc A (1.5) | Cấu trúc B (1)\tAnswer one', 'translation');
  assert.deepEqual([records[0].prompt, records[0].points, records[0].requirements, records[0].sample], ['Dịch câu một', '4', 'Cấu trúc A (1.5) | Cấu trúc B (1)', 'Answer one']);
  const result = readRecords('rubric_async', records, { rubricVariant: 'translation', defaultLevel: '34' });
  assert.equal(result.summary.error, 0, JSON.stringify(result.rows[0].messages));
});

test('form từng câu theo dạng chấm: nhập đủ thì dựng được thẻ chờ quy tắc chấm', () => {
  const built = buildFromRecord('rubric_async', { prompt: 'Dịch', points: '4', requirements: 'A (2) | B (1)', sample: 'ans' }, { rubricVariant: 'translation', defaultLevel: '45' });
  assert.equal(built.status, 'ok', JSON.stringify(built.messages));
  assert.equal(built.cards[0].pendingRubric.level, '45');
  assert.equal(built.cards[0].pendingRubric.variant, 'translation');
});
