import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readImport, templateWorkbookSheets } from '../term-tests/teacher-dashboard/studio/import-engine.js';
import { guideHtml } from '../term-tests/teacher-dashboard/studio/import-guide.js';
import { TYPES } from '../term-tests/teacher-dashboard/studio/import-registry.js';

// Trung tâm "Mẫu và hướng dẫn" và Excel mẫu sinh từ registry (spec #91, GĐ 2): hướng dẫn không thể lệch bộ đọc.
const here = dirname(fileURLToPath(import.meta.url));
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
const unescapeAttr = value => value.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&#10;/g, '\n').replace(/&#13;/g, '\r');

test('hướng dẫn có đủ 13 dạng: tên, họ, học viên thấy gì, bảng cột (bắt buộc/tùy chọn), ví dụ, lỗi thường gặp, nút tải mẫu', () => {
  const html = guideHtml();
  for (const spec of TYPES) {
    assert.match(html, new RegExp(`data-guide-type="${spec.code}"`), spec.code);
    const section = html.split(`data-guide-type="${spec.code}"`)[1].split('data-guide-type=')[0];
    const visible = text(section);
    assert.ok(visible.includes(spec.label), `${spec.code}: tên dạng`);
    assert.match(visible, /Học viên thấy/, spec.code);
    assert.match(visible, /Bắt buộc/, spec.code);
    assert.match(visible, /Lỗi thường gặp/, spec.code);
    assert.match(section, new RegExp(`data-download-type="${spec.code}"`), `${spec.code}: nút tải mẫu`);
    for (const mistake of spec.help.commonMistakes) assert.ok(visible.includes(mistake), `${spec.code}: lỗi thường gặp`);
  }
});

test('mọi ví dụ chép được trong hướng dẫn đều qua được bộ đọc (ví dụ sai thì test đỏ)', () => {
  const html = guideHtml();
  const samples = [...html.matchAll(/data-sample-type="(\w+)" data-sample="([^"]*)"/g)];
  assert.equal(samples.length, TYPES.length);
  for (const [, typeCode, raw] of samples) {
    const result = readImport(unescapeAttr(raw), { scope: 'type', typeCode });
    assert.equal(result.summary.error, 0, `${typeCode}: ${JSON.stringify(result.rows.map(row => row.messages))}`);
    assert.ok(result.summary.total >= 1, typeCode);
  }
});

test('mở từ hộp thoại của một dạng thì dạng đó được đánh dấu để cuộn tới', () => {
  const html = guideHtml({ focus: 'error_correction' });
  assert.match(html, /data-guide-type="error_correction"[^>]*class="[^"]*is-focus|class="[^"]*is-focus[^"]*"[^>]*data-guide-type="error_correction"/);
  assert.equal((html.match(/is-focus/g) || []).length, 1);
});

test('hướng dẫn chung: ba cách tạo câu, lưu CSV UTF-8, dấu ngoặc kép, mẫu cũ; không emoji, không lộ mã kỹ thuật thô', () => {
  const visible = text(guideHtml());
  assert.match(visible, /Từng câu/);
  assert.match(visible, /Hàng loạt/);
  assert.match(visible, /UTF-8/);
  assert.match(visible, /ngoặc kép/);
  assert.match(visible, /mẫu cũ/i);
  assert.doesNotMatch(guideHtml(), /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(visible, /single_choice|multi_select_group|rubric_async|undefined/);
});

test('nội dung người dùng không xen được thẻ vào hướng dẫn (ví dụ được escape)', () => {
  const html = guideHtml();
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<b>/);
});

test('Excel mẫu: sheet đầu là "Phần thi" (đọc được ngay), có "Thông tin Phần", mỗi dạng một sheet và "Hướng dẫn"; tên sheet hợp lệ', () => {
  const sheets = templateWorkbookSheets();
  assert.equal(sheets[0].name, 'Phần thi');
  assert.equal(sheets[1].name, 'Thông tin Phần');
  assert.equal(sheets.at(-1).name, 'Hướng dẫn');
  assert.equal(sheets.length, 2 + TYPES.length + 1);
  const names = sheets.map(sheet => sheet.name);
  assert.equal(new Set(names).size, names.length, 'tên sheet không trùng');
  for (const name of names) {
    assert.ok(name.length <= 31, `${name}: tối đa 31 ký tự`);
    assert.doesNotMatch(name, /[\\/?*\[\]:]/, name);
  }
  assert.deepEqual(sheets[1].rows[0], ['Tiêu đề', 'Hướng dẫn', 'Bài đọc', 'Audio']);
});

test('Excel mẫu ghi ra file thật rồi đọc lại: sheet "Phần thi" và từng sheet dạng đều qua bộ đọc không lỗi', () => {
  const vendor = readFileSync(join(here, '../term-tests/teacher-dashboard/vendor/xlsx.full.min.js'), 'utf8');
  const XLSX = new Function('window', 'global', `${vendor}; return window.XLSX || global.XLSX;`)(globalThis, globalThis);
  const workbook = XLSX.utils.book_new();
  for (const sheet of templateWorkbookSheets()) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const reread = XLSX.read(buffer, { type: 'buffer' });
  assert.equal(reread.SheetNames[0], 'Phần thi');

  const block = readImport(XLSX.utils.sheet_to_csv(reread.Sheets['Phần thi']), { scope: 'block' });
  assert.equal(block.format, 'unified');
  assert.equal(block.summary.error, 0, JSON.stringify(block.rows.filter(row => row.status === 'error').map(row => [row.line, row.messages])));
  assert.equal(block.exercises.length, TYPES.length);

  const sheetNames = reread.SheetNames.slice(2, 2 + TYPES.length);
  TYPES.forEach((spec, index) => {
    const result = readImport(XLSX.utils.sheet_to_csv(reread.Sheets[sheetNames[index]]), { scope: 'type', typeCode: spec.code });
    assert.equal(result.format, 'unified', spec.code);
    assert.equal(result.summary.error, 0, spec.code);
    assert.equal(result.summary.total, spec.examples.length, spec.code);
  });
});

test('sheet "Hướng dẫn" liệt kê từng dạng với cột bắt buộc và ý nghĩa', () => {
  const guide = templateWorkbookSheets().at(-1);
  assert.deepEqual(guide.rows[0], ['Dạng câu', 'Cột', 'Bắt buộc', 'Ý nghĩa']);
  for (const spec of TYPES) {
    const rows = guide.rows.filter(row => row[0] === spec.label);
    assert.equal(rows.length, spec.columns.length, spec.code);
    assert.ok(rows.some(row => row[2] === 'Có'), spec.code);
  }
});
