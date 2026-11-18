import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFromRecord, readRecords } from '../term-tests/teacher-dashboard/studio/import-engine.js';
import { TYPES } from '../term-tests/teacher-dashboard/studio/import-registry.js';
import { commitCardsToExercise } from '../term-tests/teacher-dashboard/studio/card-to-item.js';
import {
  QUICK_TYPES, cardPreviewHtml, emptyRecord, formFields, pasteToRecords, quickTextToRecords, singleMode, typeChoices
} from '../term-tests/teacher-dashboard/studio/add-question-model.js';

// Phần thuần của hộp thoại "Thêm câu hỏi" (spec #91, GĐ 3).
const emoji = /\p{Extended_Pictographic}/u;

test('chọn dạng: 13 dạng nhóm theo họ bằng tên tiếng Việt, mỗi dạng đúng một lần', () => {
  const groups = typeChoices();
  const codes = groups.flatMap(group => group.types.map(type => type.code));
  assert.equal(codes.length, 13);
  assert.equal(new Set(codes).size, 13);
  assert.deepEqual(groups.map(group => group.family).slice(0, 3), ['Trắc nghiệm', 'Điền từ', 'Từ vựng']);
  for (const group of groups) for (const type of group.types) assert.doesNotMatch(type.label, /_/, 'không lộ mã kỹ thuật');
});

test('form từng câu sinh từ registry: đúng cột của dạng, đánh dấu bắt buộc, có ví dụ làm gợi ý', () => {
  for (const spec of TYPES) {
    const fields = formFields(spec.code);
    assert.deepEqual(fields.map(field => field.id).sort(), [...spec.columns].sort(), spec.code);
    for (const required of spec.required) assert.ok(fields.find(field => field.id === required).required, `${spec.code}: ${required}`);
    assert.ok(fields.find(field => field.id === spec.columns[0]).placeholder !== undefined);
  }
  assert.equal(formFields('single_choice').find(field => field.id === 'prompt').multiline, true);
  assert.equal(formFields('single_choice').find(field => field.id === 'optA').multiline, false);
});

test('cách tạo từng câu: form, trình hướng dẫn cho tự luận, chỉ làm theo bộ cho nghe sắp xếp', () => {
  assert.equal(singleMode('single_choice'), 'form');
  assert.equal(singleMode('vocabulary_pair'), 'form');
  assert.equal(singleMode('rubric_async'), 'wizard');
  assert.equal(singleMode('listening_order'), 'batch-only');
});

test('form từng câu đi qua đúng quy tắc kiểm tra: nhập đủ thì dựng được, thiếu hoặc sai thì báo theo cột', () => {
  const record = emptyRecord('single_choice');
  assert.deepEqual(Object.keys(record).sort(), [...TYPES.find(spec => spec.code === 'single_choice').columns].sort());
  const empty = buildFromRecord('single_choice', record);
  assert.equal(empty.status, 'error');
  assert.ok(empty.messages.some(message => message.column === 'Đề bài'));
  Object.assign(record, { prompt: 'Q?', optA: 'x', optB: 'y', correct: 'A' });
  assert.equal(buildFromRecord('single_choice', record).status, 'ok');
});

test('dán từ Excel không có tiêu đề: ghép theo thứ tự cột của dạng; có tiêu đề: ghép theo tên cột', () => {
  const plain = pasteToRecords('single_choice', 'Q1\tx\ty\t\t\tA\t\t2\nQ2\tp\tq\t\t\tB\t\t');
  assert.equal(plain.length, 2);
  assert.deepEqual([plain[0].prompt, plain[0].optA, plain[0].correct, plain[0].points], ['Q1', 'x', 'A', '2']);
  const withHeader = pasteToRecords('fitb', 'Đáp án đúng\tĐề bài\nParis\tThe capital of France is ___.');
  assert.deepEqual([withHeader[0].prompt, withHeader[0].correct], ['The capital of France is ___.', 'Paris']);
  assert.deepEqual(pasteToRecords('fitb', ''), []);
});

test('bảng hàng loạt: bản ghi đã sửa đọc lại bằng bộ đọc của file cho cùng kết quả trạng thái', () => {
  const records = pasteToRecords('single_choice', 'Q1\tx\ty\t\t\tA\nQ2\tp\tq\t\t\tZ');
  const result = readRecords('single_choice', records);
  assert.deepEqual(result.rows.map(row => row.status), ['ok', 'error']);
  records[1].correct = 'B';
  assert.deepEqual(readRecords('single_choice', records).rows.map(row => row.status), ['ok', 'ok']);
});

test('gõ nhanh từ vựng: " - ", "=" hoặc tab; dòng sai được báo theo số dòng', () => {
  assert.ok(QUICK_TYPES.includes('vocabulary_pair') && QUICK_TYPES.includes('fitb') && QUICK_TYPES.includes('single_choice'));
  const result = quickTextToRecords('vocabulary_pair', 'destination - điểm đến\nitinerary = lịch trình\nresilient\tkiên cường\nkhông có nghĩa');
  assert.deepEqual(result.records.map(record => [record.prompt, record.correct]), [['destination', 'điểm đến'], ['itinerary', 'lịch trình'], ['resilient', 'kiên cường']]);
  assert.deepEqual(result.problems.map(problem => problem.line), [4]);
});

test('gõ nhanh điền từ: đáp án đầu là chính, các đáp án sau là chấp nhận thêm', () => {
  const [record] = quickTextToRecords('fitb', 'She was born ___ 1995. | in | during').records;
  assert.deepEqual([record.prompt, record.correct, record.accepted], ['She was born ___ 1995.', 'in', 'during']);
  assert.equal(quickTextToRecords('fitb', 'chỉ có câu').problems.length, 1);
});

test('gõ nhanh trắc nghiệm: dấu * đánh dấu đáp án đúng, nhận dấu | hoặc dấu phẩy, thiếu * thì báo', () => {
  const first = quickTextToRecords('single_choice', 'She is interested ___ marine biology. | in*, at, on').records[0];
  assert.deepEqual([first.optA, first.optB, first.optC, first.correct], ['in', 'at', 'on', 'A']);
  const second = quickTextToRecords('single_choice', 'Q? | a | b* | c').records[0];
  assert.deepEqual([second.optA, second.optB, second.optC, second.correct], ['a', 'b', 'c', 'B']);
  assert.equal(quickTextToRecords('single_choice', 'Q? | a | b').problems.length, 1);
  assert.equal(quickTextToRecords('single_choice', 'Q? | chỉ một*').problems.length, 1);
  for (const record of [first, second]) assert.equal(buildFromRecord('single_choice', record).status, 'ok');
});

test('xem trước: không lộ đáp án đúng, nội dung được escape, không emoji', () => {
  const card = buildFromRecord('single_choice', { prompt: 'Chọn <b>đúng</b>', optA: 'x', optB: 'y', correct: 'B' }).cards[0];
  const html = cardPreviewHtml(card);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /<li>x<\/li><li>y<\/li>/);
  assert.doesNotMatch(html, /opt_b|đáp án đúng/i);
  assert.doesNotMatch(html, emoji);
  for (const spec of TYPES) {
    const example = spec.examples[0];
    const built = buildFromRecord(spec.code, example).cards[0];
    assert.ok(cardPreviewHtml(built).includes('aq-preview-card'), spec.code);
  }
});

test('thêm câu vào bài tập: câu mới nằm đúng bài tập, đáp án chấm khai đủ, nhóm chọn nhiều khai nhóm', () => {
  let n = 0;
  const exercise = { exerciseId: 'e1', title: 'Bài 1' };
  const block = { items: [{ itemVersionId: 'old', exerciseId: 'e1' }], exercises: [exercise] };
  const draftState = { gradingKey: { items: {} } };
  const choice = buildFromRecord('single_choice', { prompt: 'Q', optA: 'a', optB: 'b', correct: 'B' }).cards;
  const multi = buildFromRecord('multi_select_group', { prompt: 'M', optA: 'a', optB: 'b', optC: 'c', correct: 'A, C', points: '2' }, { newGroupId: () => 'g1' }).cards;
  const items = commitCardsToExercise({ draftState, block, exercise, cards: [...choice, ...multi], startPosition: 5, newId: () => `id${++n}` });
  assert.equal(items.length, 3);
  assert.equal(block.items.length, 4);
  assert.ok(items.every(item => item.exerciseId === 'e1'));
  assert.equal(draftState.gradingKey.items[items[0].itemVersionId].expectedOptionId, 'opt_b');
  assert.deepEqual(draftState.gradingKey.groups.g1.expectedOptionIds, ['A', 'C']);
});
