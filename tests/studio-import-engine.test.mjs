import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockColumnIds, blockTemplateCsv, parseDelimited, readImport, recordsToCsv, toLegacyResult, typeTemplateCsv
} from '../term-tests/teacher-dashboard/studio/import-engine.js';
import { COLUMNS, TYPES, TYPE_BY_CODE, resolveTypeCode } from '../term-tests/teacher-dashboard/studio/import-registry.js';
import * as legacy from '../term-tests/teacher-dashboard/studio/content-import.js';

// Bộ đọc/ghi CSV thống nhất (spec #91, GĐ 1). Seam: văn bản vào, câu hỏi + bảng trạng thái từng dòng ra; không DOM.
const fixedId = () => 'group_fixed';
const read = (text, options) => readImport(text, { newGroupId: fixedId, ...options });
const visible = value => JSON.stringify(value);

test('registry: đủ 13 dạng, mỗi dạng có cột, ví dụ và hướng dẫn; tên dạng tiếng Việt/Anh/mã cũ đều nhận ra', () => {
  assert.equal(TYPES.length, 13);
  for (const spec of TYPES) {
    assert.ok(spec.columns.length >= 2 && spec.examples.length >= 1, spec.code);
    for (const field of spec.required) assert.ok(spec.columns.includes(field), `${spec.code} thiếu cột bắt buộc ${field}`);
    assert.equal(resolveTypeCode(spec.label), spec.code);
    assert.equal(resolveTypeCode(spec.code), spec.code);
  }
  assert.equal(resolveTypeCode('Trắc nghiệm nhóm (Multi Select)'), 'multi_select_group');
  assert.equal(resolveTypeCode('Từ vựng qua ảnh'), 'pictorial_vocabulary');
  assert.equal(resolveTypeCode('không có dạng này'), undefined);
});

test('mẫu từng dạng: tải về, đọc lại đều Hợp lệ (ví dụ trong hướng dẫn luôn qua được bộ đọc) và ra đúng câu hỏi', () => {
  for (const spec of TYPES) {
    const csv = typeTemplateCsv(spec.code);
    assert.ok(csv.startsWith('﻿'), 'có BOM cho Excel');
    const result = read(csv, { scope: 'type', typeCode: spec.code });
    assert.equal(result.format, 'unified', spec.code);
    assert.deepEqual(result.notices, [], spec.code);
    assert.equal(result.summary.error, 0, `${spec.code}: ${visible(result.rows.map(row => row.messages))}`);
    assert.equal(result.summary.total, spec.examples.length, spec.code);
    assert.ok(result.cards.length >= 1, spec.code);
    for (const card of result.cards) assert.ok(card.maxScore > 0 && card.interactionType && card.graderType, `${spec.code}: thẻ thiếu trường`);
  }
});

test('vòng tròn: đọc → ghi → đọc cho cùng bản ghi, mọi dạng', () => {
  for (const spec of TYPES) {
    const first = read(typeTemplateCsv(spec.code), { scope: 'type', typeCode: spec.code });
    const columns = COLUMNS.map(column => column.id).filter(id => spec.columns.includes(id));
    const written = recordsToCsv(first.rows.map(row => row.record), columns);
    const second = read(written, { scope: 'type', typeCode: spec.code });
    assert.deepEqual(second.rows.map(row => row.record), first.rows.map(row => row.record), spec.code);
    assert.deepEqual(second.cards, first.cards, spec.code);
  }
});

test('mẫu cả Phần: đủ 13 dạng, mọi dòng Hợp lệ, mỗi dạng thành một bài tập', () => {
  const result = read(blockTemplateCsv(), { scope: 'block' });
  assert.equal(result.format, 'unified');
  assert.equal(result.summary.error, 0, visible(result.rows.filter(row => row.status === 'error').map(row => [row.line, row.messages])));
  assert.equal(result.exercises.length, 13);
  const typesSeen = new Set(result.rows.map(row => row.typeCode));
  assert.equal(typesSeen.size, 13);
  assert.ok(blockColumnIds().slice(0, 3).join() === 'exerciseTitle,exerciseInstructions,type');
});

test('CSV một dạng chính là CSV cả Phần bỏ ba cột đầu: cùng bản ghi ở hai mức', () => {
  const block = read(blockTemplateCsv(), { scope: 'block' });
  for (const spec of TYPES) {
    const single = read(typeTemplateCsv(spec.code), { scope: 'type', typeCode: spec.code });
    const fromBlock = block.rows.filter(row => row.typeCode === spec.code).map(row => {
      const { exerciseTitle, exerciseInstructions, type, ...rest } = row.record;
      return Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== ''));
    });
    const fromSingle = single.rows.map(row => Object.fromEntries(Object.entries(row.record).filter(([, value]) => value !== '')));
    assert.deepEqual(fromBlock, fromSingle, spec.code);
  }
});

test('mẫu cũ từng dạng vẫn đọc được, có thông báo chuyển đổi và cho cùng kết quả cốt lõi với bộ đọc cũ', () => {
  const pairs = [
    ['single_choice', legacy.generateSingleChoiceTemplateCsv(), legacy.parseSingleChoiceCsv],
    ['fitb', legacy.generateFitbTemplateCsv(), legacy.parseFitbCsv],
    ['error_correction', legacy.generateErrorCorrectionTemplateCsv(), legacy.parseErrorCorrectionCsv],
    ['sentence_transformation', legacy.generateSentenceTransformationTemplateCsv(), legacy.parseSentenceTransformationCsv],
    ['sentence_reorder', legacy.generateSentenceReorderTemplateCsv(), legacy.parseSentenceReorderCsv],
    ['pronunciation_choice', legacy.generatePronunciationTemplateCsv(), legacy.parsePronunciationCsv],
    ['pictorial_vocabulary', legacy.generatePictorialVocabTemplateCsv(), legacy.parsePictorialVocabCsv],
    ['inline_cloze', legacy.generateInlineClozeTemplateCsv(), legacy.parseInlineClozeCsv],
    ['multi_select_group', legacy.generateMultiGroupTemplateCsv(), legacy.parseMultiGroupCsv],
    ['rubric_async', legacy.generateRubricAsyncTemplateCsv(), legacy.parseRubricAsyncCsv],
    ['listening_order', legacy.generateListeningOrderTemplateCsv(), legacy.parseListeningOrderCsv],
    ['reading_matching', legacy.generateReadingMatchingTemplateCsv(), legacy.parseReadingMatchingCsv]
  ];
  for (const [typeCode, csv, oldParse] of pairs) {
    const old = oldParse(csv);
    const result = read(csv, { scope: 'type', typeCode });
    assert.equal(result.format, 'legacy-type', typeCode);
    assert.ok(result.notices.some(notice => /mẫu cũ/i.test(notice)), typeCode);
    assert.equal(result.summary.error, 0, `${typeCode}: ${visible(result.rows.map(row => row.messages))}`);
    assert.equal(result.cards.length, old.items.length, `${typeCode}: số câu`);
    result.cards.forEach((card, index) => {
      const before = old.items[index];
      assert.equal(card.prompt, before.prompt, `${typeCode} #${index}: đề bài`);
      if (before.maxScore !== undefined) assert.equal(card.maxScore, before.maxScore, `${typeCode} #${index}: điểm`);
      if (before.accepted && typeCode !== 'multi_select_group') assert.deepEqual([...card.accepted].sort(), [...before.accepted].sort(), `${typeCode} #${index}: đáp án chấp nhận`);
    });
  }
});

test('mẫu cũ trắc nghiệm: đáp án đúng khớp bộ đọc cũ (opt_b cho đáp án B)', () => {
  const result = read(legacy.generateSingleChoiceTemplateCsv(), { scope: 'type', typeCode: 'single_choice' });
  assert.equal(result.cards[0].expectedOptionId, 'opt_b');
  assert.deepEqual(result.cards[0].options.map(option => option.label), ['at', 'from', 'on', 'in']);
  assert.equal(result.cards[1].options.length, 3);
  assert.equal(result.cards[1].layoutType, 'grid_3');
});

test('mẫu 7 cột cũ cả Phần vẫn đọc được: có thông báo, không dòng lỗi, ghép tiêu đề đúng đáp án (sửa lỗi lệch id cũ)', () => {
  const result = read(legacy.generateBlockExercisesTemplateCsv(), { scope: 'block' });
  assert.equal(result.format, 'legacy-block');
  assert.ok(result.notices.some(notice => /mẫu cũ/i.test(notice)));
  assert.equal(result.summary.error, 0, visible(result.rows.filter(row => row.status === 'error').map(row => [row.line, row.messages])));
  assert.equal(result.exercises.length, 6);
  const matching = result.rows.find(row => row.typeCode === 'reading_matching').cards[0];
  assert.ok(matching.options.some(option => option.id === matching.expectedOptionId), 'đáp án đúng phải là một trong các lựa chọn');
  assert.equal(matching.expectedOptionId, 'A', 'đáp án "i" là tiêu đề đầu tiên');
  const group = result.exercises.find(exercise => exercise.title.startsWith('Part 2')).items;
  assert.equal(group.length, 2, 'chọn nhiều đáp án A, C tạo 2 ô trả lời');
  assert.deepEqual(group[0].expectedOptionIds, ['A', 'C']);
  const listening = result.exercises.find(exercise => exercise.title.startsWith('Part 4')).items;
  assert.equal(listening.length, 1);
  assert.equal(listening[0].listeningEvents.length, 3);
});

test('mẫu cũ ghép tiêu đề (nhiều dòng một đoạn) được gộp thành mỗi đoạn một câu với đáp án đúng', () => {
  const result = read(legacy.generateReadingMatchingTemplateCsv(), { scope: 'type', typeCode: 'reading_matching' });
  assert.equal(result.cards.length, 3);
  assert.deepEqual(result.cards.map(card => card.expectedOptionId), ['A', 'B', 'C']);
  assert.equal(result.cards[0].options.length, 4);
});

test('không có hàng tiêu đề: đọc theo thứ tự cột của mẫu cũ của dạng đó', () => {
  const result = read('Water boils at ___ degrees.,100,2\n', { scope: 'type', typeCode: 'fitb' });
  assert.equal(result.format, 'legacy-type');
  assert.equal(result.cards[0].targetAnswer, '100');
  assert.equal(result.cards[0].maxScore, 2);
});

test('lỗi từng dòng có số dòng, cột và cách sửa; một dòng lỗi không làm hỏng các dòng khác', () => {
  const csv = [
    'Đề bài,Lựa chọn A,Lựa chọn B,Lựa chọn C,Lựa chọn D,Đáp án đúng,Điểm',
    'Câu 1,a,b,c,d,B,1',
    'Câu 2,a,b,c,d,E,1',
    ',a,b,,,A,1',
    'Câu 4,a,,,,A,1',
    'Câu 5,a,b,,,A,abc'
  ].join('\n');
  const result = read(csv, { scope: 'type', typeCode: 'single_choice' });
  assert.deepEqual(result.rows.map(row => row.status), ['ok', 'error', 'error', 'error', 'warning']);
  assert.deepEqual(result.rows.map(row => row.line), [2, 3, 4, 5, 6]);
  const wrongLetter = result.rows[1].messages[0];
  assert.equal(wrongLetter.column, 'Đáp án đúng');
  assert.match(wrongLetter.text, /"E".*A, B, C, D/);
  assert.ok(wrongLetter.hint);
  assert.match(result.rows[2].messages[0].text, /Thiếu Đề bài/);
  assert.match(result.rows[3].messages[0].text, /Thiếu Lựa chọn B/);
  assert.match(result.rows[4].messages[0].text, /Điểm "abc" không hợp lệ/);
  assert.equal(result.rows[4].cards[0].maxScore, 1, 'điểm sai thì dùng mặc định');
  assert.deepEqual(result.summary, { total: 5, ok: 1, warning: 1, error: 3 });
  assert.equal(result.cards.length, 2, 'chỉ dòng Hợp lệ/Cảnh báo ra câu hỏi');
  assert.equal(toLegacyResult(result).invalidRows.length, 3);
});

test('cả Phần: dạng câu lạ báo lỗi, dạng để trống dùng dạng của dòng trước, bài tập để trống dùng bài tập trước', () => {
  const csv = [
    'Bài tập,Hướng dẫn bài tập,Dạng câu,Đề bài,Lựa chọn A,Lựa chọn B,Đáp án đúng,Đáp án chấp nhận thêm,Điểm',
    'Bài 1,Hướng dẫn 1,Trắc nghiệm một đáp án,Q1,x,y,A,,1',
    ',,,Q2,x,y,B,,1',
    ',,Dạng không tồn tại,Q3,x,y,A,,1',
    'Bài 2,,Điền từ,Fill ___,,,go,went,1'
  ].join('\n');
  const result = read(csv, { scope: 'block' });
  assert.equal(result.format, 'unified');
  assert.deepEqual(result.rows.map(row => row.status), ['ok', 'ok', 'error', 'ok']);
  assert.match(result.rows[2].messages[0].text, /Dạng câu "Dạng không tồn tại" không nhận ra/);
  assert.deepEqual(result.exercises.map(exercise => [exercise.title, exercise.items.length, exercise.instructions]), [['Bài 1', 2, 'Hướng dẫn 1'], ['Bài 2', 1, '']]);
});

test('dấu phân tách: phẩy, chấm phẩy và tab (dán từ Excel) đều đọc được; xuống dòng trong ô được giữ; số dòng đúng', () => {
  const rows = [['Đề bài', 'Đáp án đúng'], ['Một', 'a'], ['Hai\nba', 'b']];
  for (const delimiter of [',', ';', '\t']) {
    const text = rows.map(cells => cells.map(cell => (cell.includes('\n') ? `"${cell}"` : cell)).join(delimiter)).join('\r\n');
    const parsed = parseDelimited(text);
    assert.equal(parsed.length, 3, delimiter);
    assert.equal(parsed[2].cells[0], 'Hai\nba');
    assert.deepEqual(parsed.map(row => row.line), [1, 2, 3]);
  }
  const after = parseDelimited('a,b\n"x\ny",z\nlast,row');
  assert.deepEqual(after.map(row => row.line), [1, 2, 4]);
  const result = read('Đề bài;Đáp án đúng;Điểm\nThe sun rises in the ___;east;1', { scope: 'type', typeCode: 'fitb' });
  assert.equal(result.cards[0].targetAnswer, 'east');
});

test('cột lạ trong hàng tiêu đề được báo nhưng không làm hỏng việc đọc', () => {
  const result = read('Đề bài,Đáp án đúng,Cột lạ\nQ,A,zzz', { scope: 'type', typeCode: 'fitb' });
  assert.equal(result.summary.ok, 1);
  assert.ok(result.notices.some(notice => notice.includes('Cột lạ')));
});

test('điểm mặc định của hộp thoại thắng điểm mặc định của dạng; điểm ghi trong file thắng cả hai', () => {
  const csv = 'Đề bài,Đáp án đúng,Điểm\nQ1,a,\nQ2,b,3';
  const result = read(csv, { scope: 'type', typeCode: 'fitb', defaultPoints: 2 });
  assert.deepEqual(result.cards.map(card => card.maxScore), [2, 3]);
  assert.equal(read('Đề bài,Đáp án đúng\nQ1,a', { scope: 'type', typeCode: 'fitb' }).cards[0].maxScore, 1);
});

test('chọn nhiều đáp án: cần từ 2 đáp án đúng; chia điểm theo số ô', () => {
  const csv = 'Đề bài,Lựa chọn A,Lựa chọn B,Lựa chọn C,Đáp án đúng,Điểm\nQ,a,b,c,"A, C",2\nQ,a,b,c,A,2';
  const result = read(csv, { scope: 'type', typeCode: 'multi_select_group' });
  assert.deepEqual(result.rows.map(row => row.status), ['ok', 'error']);
  assert.equal(result.cards.length, 2);
  assert.equal(result.cards[0].maxScore, 1);
  assert.equal(result.cards[0].groupId, 'group_fixed');
  assert.match(result.rows[1].messages[0].text, /từ 2 đáp án đúng/);
});

test('điền từ nội tuyến: cảnh báo khi thiếu đáp án cho chỗ trống, lỗi khi không có chỗ trống đánh số', () => {
  const csv = 'Đề bài,Đáp án đúng,Điểm\n"Fill (1) ___ and (2) ___.",one,1\nKhông có chỗ trống,a,1';
  const result = read(csv, { scope: 'type', typeCode: 'inline_cloze' });
  assert.deepEqual(result.rows.map(row => row.status), ['warning', 'error']);
  assert.equal(result.cards[0].maxScore, 2);
});

test('từ vựng nối nghĩa: mọi câu trong bài tập dùng chung bộ nghĩa, đáp án trỏ đúng nghĩa', () => {
  const result = read('Đề bài,Đáp án đúng\ndestination,điểm đến\nitinerary,lịch trình', { scope: 'type', typeCode: 'vocabulary_pair' });
  const [first, second] = result.cards;
  assert.equal(first.options.length, 2);
  assert.equal(first.options.find(option => option.id === first.expectedOptionId).label, 'điểm đến');
  assert.equal(second.options.find(option => option.id === second.expectedOptionId).label, 'lịch trình');
});

test('tên cột lệch chữ hoa, dấu cách, gạch dưới vẫn nhận', () => {
  const result = read('đề  bài,ĐÁP_ÁN ĐÚNG\nQ,a', { scope: 'type', typeCode: 'fitb' });
  assert.equal(result.summary.ok, 1);
});

test('tệp rỗng hoặc chỉ có hàng tiêu đề: không dòng nào, không lỗi', () => {
  assert.equal(read('', { scope: 'type', typeCode: 'fitb' }).summary.total, 0);
  assert.equal(read('Đề bài,Đáp án đúng\n', { scope: 'type', typeCode: 'fitb' }).summary.total, 0);
});

test('không có emoji và không lộ mã kỹ thuật thô trong thông báo cho người ra đề', () => {
  const result = read('Đề bài,Đáp án đúng\n,x', { scope: 'type', typeCode: 'single_choice' });
  const text = JSON.stringify(result.rows.map(row => row.messages));
  assert.doesNotMatch(text, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(text, /single_choice|opt_a|undefined/);
  assert.ok(TYPE_BY_CODE.single_choice.label);
});
