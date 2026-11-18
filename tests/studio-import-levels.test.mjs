import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readImport, resolveMedia, templateWorkbookSheets, typeTemplateCsv } from '../term-tests/teacher-dashboard/studio/import-engine.js';
import { classifySheet, parseInfoSheet, readBlockWorkbook, readTestWorkbook, sheetForType } from '../term-tests/teacher-dashboard/studio/import-workbook.js';
import { appendExercisesToBlock } from '../term-tests/teacher-dashboard/studio/card-to-item.js';
import { restoreDraft, snapshotDraft } from '../term-tests/teacher-dashboard/studio/import-undo.js';
import { TYPES } from '../term-tests/teacher-dashboard/studio/import-registry.js';

// Ba mức tải lên, thông tin Phần, câu trùng, thư mục media, hoàn tác (spec #91, GĐ 4). Seam: văn bản/sheet vào, kết quả ra.
const here = dirname(fileURLToPath(import.meta.url));
const HEAD = 'Bài tập,Hướng dẫn bài tập,Dạng câu,Đề bài,Lựa chọn A,Lựa chọn B,Đáp án đúng,Âm thanh,Điểm';
const block = rows => [HEAD, ...rows].join('\n');
const mc = (title, prompt, correct = 'A') => `${title},,Trắc nghiệm một đáp án,${prompt},x,y,${correct},,1`;

test('dòng "Thông tin Phần" trong CSV cả Phần: lấy tiêu đề, hướng dẫn, bài đọc, âm thanh; không thành câu hỏi', () => {
  const csv = block([
    'Phần Đọc,Đọc rồi trả lời,Thông tin Phần,Cities are growing.,,,,bai1.mp3,',
    mc('Bài 1', 'Q1?')
  ]);
  const result = readImport(csv, { scope: 'block' });
  assert.deepEqual(result.blockInfo, { title: 'Phần Đọc', instructions: 'Đọc rồi trả lời', reading: 'Cities are growing.', audio: 'bai1.mp3' });
  assert.equal(result.summary.error, 0);
  assert.equal(result.cards.length, 1);
  assert.equal(result.exercises.length, 1);
  assert.equal(result.exercises[0].title, 'Bài 1');
});

test('không có dòng thông tin thì không có blockInfo', () => {
  assert.equal(readImport(block([mc('Bài 1', 'Q?')]), { scope: 'block' }).blockInfo, undefined);
});

test('câu trùng đề bài với câu đã có trong bài tập, hoặc trùng ngay trong file, bị cảnh báo nhưng vẫn nhập được', () => {
  const csv = block([mc('Bài 1', 'Câu  trùng?'), mc('', 'Câu mới?'), mc('', 'câu trùng?')]);
  const result = readImport(csv, { scope: 'block', existingPrompts: ['Câu mới?'] });
  assert.deepEqual(result.rows.map(row => row.status), ['ok', 'warning', 'warning']);
  assert.match(result.rows[1].messages[0].text, /trùng/i);
  assert.equal(result.rows[1].messages[0].column, 'Đề bài');
  assert.equal(result.cards.length, 3, 'cảnh báo không chặn nhập');
});

test('trùng đề bài áp dụng cả khi nhập một dạng', () => {
  const result = readImport('Đề bài,Đáp án đúng\nQ1,a', { scope: 'type', typeCode: 'fitb', existingPrompts: ['q1'] });
  assert.equal(result.rows[0].status, 'warning');
});

test('media: đường dẫn/URL/link Drive giữ nguyên; chỉ có tên file thì ghép với thư mục đã khai, không có thư mục thì cảnh báo', () => {
  assert.equal(resolveMedia('apple.png', 'https://cdn.example/img/'), 'https://cdn.example/img/apple.png');
  assert.equal(resolveMedia('apple.png', 'assets/vocabulary'), 'assets/vocabulary/apple.png');
  assert.equal(resolveMedia('trái cây.png', 'assets/v'), 'assets/v/tr%C3%A1i%20c%C3%A2y.png');
  for (const kept of ['assets/v/apple.png', 'https://x.test/a.png', 'http://x.test/a.png', '/a.png', 'data:image/png;base64,AAA', 'https://drive.google.com/file/d/ABC/view']) assert.equal(resolveMedia(kept, 'assets/v'), kept);
  assert.equal(resolveMedia('apple.png', ''), 'apple.png');

  const csv = 'Ảnh,Đáp án đúng,Gợi ý\napple.png,apple,táo\nassets/v/pear.png,pear,lê';
  const bare = readImport(csv, { scope: 'type', typeCode: 'pictorial_vocabulary' });
  assert.deepEqual(bare.rows.map(row => row.status), ['warning', 'ok']);
  assert.match(bare.rows[0].messages[0].text, /tên file/i);
  const based = readImport(csv, { scope: 'type', typeCode: 'pictorial_vocabulary', mediaBase: 'https://cdn.example/img' });
  assert.deepEqual(based.rows.map(row => row.status), ['ok', 'ok']);
  assert.equal(based.cards[0].image, 'https://cdn.example/img/apple.png');
  assert.equal(based.cards[1].image, 'assets/v/pear.png');
});

test('mẫu tải về không còn dòng cảnh báo (ví dụ ảnh dùng đường dẫn đầy đủ)', () => {
  const result = readImport(typeTemplateCsv('pictorial_vocabulary'), { scope: 'type', typeCode: 'pictorial_vocabulary' });
  assert.deepEqual(result.rows.map(row => row.status), ['ok', 'ok']);
});

test('phân loại sheet: Thông tin Phần, Hướng dẫn, sheet theo dạng, sheet Phần thi', () => {
  assert.equal(classifySheet('Thông tin Phần'), 'info');
  assert.equal(classifySheet('Hướng dẫn'), 'guide');
  assert.equal(classifySheet(TYPES[0].label), 'type');
  assert.equal(classifySheet('Phần thi'), 'block');
  assert.equal(classifySheet('Reading 1'), 'block');
});

test('sheet Thông tin Phần: nhận Audio hoặc Âm thanh, nhiều dòng theo tiêu đề', () => {
  const rows = parseInfoSheet('Tiêu đề,Hướng dẫn,Bài đọc,Audio\nPhần A,Làm A,Bài đọc A,a.mp3\nPhần B,,,\n');
  assert.deepEqual(rows[0], { title: 'Phần A', instructions: 'Làm A', reading: 'Bài đọc A', audio: 'a.mp3' });
  assert.equal(rows[1].title, 'Phần B');
  assert.equal(parseInfoSheet('Tiêu đề,Âm thanh\nX,y.mp3')[0].audio, 'y.mp3');
  assert.deepEqual(parseInfoSheet(''), []);
});

test('cả Phần từ Excel: lấy sheet Phần thi (hoặc sheet Phần đầu tiên) và thông tin Phần từ sheet Thông tin Phần', () => {
  const sheets = [
    { name: 'Hướng dẫn', csv: 'Dạng câu,Cột\nx,y' },
    { name: 'Thông tin Phần', csv: 'Tiêu đề,Hướng dẫn,Bài đọc,Audio\nPhần Đọc,Đọc kỹ,Passage,p.mp3' },
    { name: 'Phần thi', csv: block([mc('Bài 1', 'Q1?')]) },
    { name: TYPES[0].label, csv: typeTemplateCsv(TYPES[0].code) }
  ];
  const result = readBlockWorkbook(sheets);
  assert.equal(result.read.cards.length, 1);
  assert.deepEqual(result.info, { title: 'Phần Đọc', instructions: 'Đọc kỹ', reading: 'Passage', audio: 'p.mp3' });
  assert.equal(result.sheetName, 'Phần thi');
  const noInfo = readBlockWorkbook([{ name: 'Reading', csv: block([mc('B', 'Q?')]) }]);
  assert.equal(noInfo.info, undefined);
  assert.equal(noInfo.sheetName, 'Reading');
});

test('một dạng từ Excel: ưu tiên sheet đặt tên theo dạng, không có thì sheet đầu', () => {
  const sheets = [{ name: 'Phần thi', csv: 'a' }, { name: 'Điền từ', csv: 'b' }];
  assert.equal(sheetForType(sheets, 'fitb').name, 'Điền từ');
  assert.equal(sheetForType([{ name: 'Sheet1', csv: 'z' }], 'fitb').name, 'Sheet1');
  assert.equal(sheetForType([], 'fitb'), undefined);
});

test('cả đề từ Excel: mỗi sheet Phần là một Phần; bỏ sheet hướng dẫn/dạng/thông tin; thông tin ghép theo tiêu đề', () => {
  const sheets = [
    { name: 'Thông tin Phần', csv: 'Tiêu đề,Hướng dẫn,Bài đọc,Audio\nReading,Đọc,Passage R,\nListening,Nghe,,l.mp3' },
    { name: 'Reading', csv: block([mc('Bài 1', 'R1?'), mc('', 'R2?')]) },
    { name: 'Listening', csv: block([mc('Bài 1', 'L1?', 'Z')]) },
    { name: 'Hướng dẫn', csv: 'a,b' },
    { name: TYPES[1].label, csv: typeTemplateCsv(TYPES[1].code) }
  ];
  const result = readTestWorkbook(sheets);
  assert.deepEqual(result.blocks.map(entry => entry.title), ['Reading', 'Listening']);
  assert.equal(result.blocks[0].info.reading, 'Passage R');
  assert.equal(result.blocks[1].info.audio, 'l.mp3');
  assert.equal(result.blocks[0].read.cards.length, 2);
  assert.equal(result.summary.blocks, 2);
  assert.equal(result.summary.error, 1, 'lỗi ở sheet Listening được cộng dồn');
  assert.equal(result.summary.importable, 2);
});

test('cả đề: quá 10 Phần thì báo lỗi rõ (hợp đồng đề cho phép tối đa 10 Phần)', () => {
  const sheets = Array.from({ length: 11 }, (_unused, index) => ({ name: `P${index + 1}`, csv: block([mc('B', `Q${index}?`)]) }));
  const result = readTestWorkbook(sheets);
  assert.ok(result.notices.some(notice => /tối đa 10 Phần/.test(notice)));
  assert.equal(result.blocks.length, 10, 'chỉ nhận 10 Phần đầu');
});

test('Excel mẫu cả đề ghi ra file thật rồi đọc lại bằng bộ đọc cả đề: các sheet dạng và hướng dẫn không thành Phần', () => {
  const vendor = readFileSync(join(here, '../term-tests/teacher-dashboard/vendor/xlsx.full.min.js'), 'utf8');
  const XLSX = new Function('window', 'global', `${vendor}; return window.XLSX || global.XLSX;`)(globalThis, globalThis);
  const workbook = XLSX.utils.book_new();
  for (const sheet of templateWorkbookSheets()) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  const reread = XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
  const sheets = reread.SheetNames.map(name => ({ name, csv: XLSX.utils.sheet_to_csv(reread.Sheets[name]) }));
  const test = readTestWorkbook(sheets);
  assert.deepEqual(test.blocks.map(entry => entry.title), ['Phần thi']);
  assert.equal(test.summary.error, 0);
  assert.equal(test.blocks[0].read.exercises.length, TYPES.length);
  assert.ok(test.blocks[0].info, 'thông tin Phần của mẫu được đọc');
});

test('thêm bài tập vào Phần: tạo bài tập đánh số tiếp, câu có đáp án chấm, vị trí liên tiếp; chế độ thay thế xóa bài cũ và đáp án cũ', () => {
  let n = 0;
  const newId = () => `id${++n}`;
  const draftState = { gradingKey: { items: { old1: { graderType: 'exact_option' } } } };
  const block = { items: [{ itemVersionId: 'old1', exerciseId: 'eOld' }], exercises: [{ exerciseId: 'eOld', exerciseNumber: 1, title: 'Cũ' }] };
  const exercises = readImport(block0(), { scope: 'block' }).exercises;
  appendExercisesToBlock({ draftState, block, exercises, getNextPosition: () => 10 + block.items.length, newId });
  assert.deepEqual(block.exercises.map(exercise => [exercise.exerciseNumber, exercise.title]), [[1, 'Cũ'], [2, 'Bài A'], [3, 'Bài B']]);
  assert.equal(block.items.length, 4);
  assert.equal(block.exercises[1].instructions, 'Làm A');
  assert.ok(block.items.slice(1).every(item => draftState.gradingKey.items[item.itemVersionId]));
  assert.ok(draftState.gradingKey.items.old1, 'chế độ thêm nối tiếp giữ câu cũ');

  appendExercisesToBlock({ draftState, block, exercises: readImport(block0(), { scope: 'block' }).exercises, getNextPosition: () => 10, newId, mode: 'overwrite' });
  assert.equal(block.exercises.length, 2);
  assert.equal(draftState.gradingKey.items.old1, undefined, 'thay thế xóa đáp án chấm của câu cũ');
  assert.equal(block.items.length, 3);
});

function block0() {
  return block(['Bài A,Làm A,Trắc nghiệm một đáp án,Q1?,x,y,A,,1', ',,Trắc nghiệm một đáp án,Q2?,x,y,B,,1', 'Bài B,,Trắc nghiệm một đáp án,Q3?,x,y,A,,1']);
}

test('hoàn tác: ảnh chụp bản nháp trước khi nhập, khôi phục lại đúng, không dính tham chiếu với bản đang sửa', () => {
  const draftState = { blocks: [{ blockId: 'b1', title: 'P1', items: [{ itemVersionId: 'i1', prompt: 'A' }] }], gradingKey: { items: { i1: { graderType: 'exact_option', expectedOptionId: 'A' } } }, extra: 1 };
  const snapshot = snapshotDraft(draftState);
  draftState.blocks[0].items.push({ itemVersionId: 'i2', prompt: 'B' });
  draftState.blocks.push({ blockId: 'b2' });
  draftState.gradingKey.items.i2 = { graderType: 'accepted_text' };
  draftState.blocks[0].items[0].prompt = 'đã sửa';
  restoreDraft(draftState, snapshot);
  assert.equal(draftState.blocks.length, 1);
  assert.equal(draftState.blocks[0].items.length, 1);
  assert.equal(draftState.blocks[0].items[0].prompt, 'A');
  assert.equal(draftState.gradingKey.items.i2, undefined);
  assert.equal(draftState.extra, 1, 'trường khác của bản nháp không bị đụng');
  draftState.blocks[0].items[0].prompt = 'lại sửa';
  restoreDraft(draftState, snapshot);
  assert.equal(draftState.blocks[0].items[0].prompt, 'A', 'ảnh chụp dùng lại được, không bị đổi theo bản nháp');
});
