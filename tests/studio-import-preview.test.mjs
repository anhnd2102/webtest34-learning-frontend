import test from 'node:test';
import assert from 'node:assert/strict';
import { readImport } from '../term-tests/teacher-dashboard/studio/import-engine.js';
import { importErrorsCsv, importPreviewHtml, typeColumnsHint, typePlaceholder } from '../term-tests/teacher-dashboard/studio/import-preview.js';
import { TYPES } from '../term-tests/teacher-dashboard/studio/import-registry.js';

// Bảng xem trước cho người ra đề: trạng thái từng dòng, lỗi kèm số dòng/cột/cách sửa, tệp danh sách lỗi (spec #91, GĐ 1).
const csv = [
  'Đề bài,Lựa chọn A,Lựa chọn B,Lựa chọn C,Đáp án đúng,Điểm',
  'Câu <b>1</b>,a,b,c,B,1',
  'Câu 2,a,b,c,E,1',
  'Câu 3,a,b,,A,xyz'
].join('\n');
const read = () => readImport(csv, { scope: 'type', typeCode: 'single_choice' });
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

test('bảng xem trước: tóm tắt, hành động sẽ làm, trạng thái và lỗi từng dòng với số dòng và cách sửa', () => {
  const html = importPreviewHtml(read());
  const visible = text(html);
  assert.match(visible, /1 Hợp lệ/);
  assert.match(visible, /1 Cảnh báo/);
  assert.match(visible, /1 Lỗi/);
  assert.match(visible, /Sẽ nhập 2 dòng hợp lệ; 1 dòng lỗi bị bỏ qua/);
  assert.match(html, /<td class="import-line">3<\/td>/);
  assert.match(visible, /Đáp án đúng: "E" không có trong các lựa chọn A, B, C/);
  assert.match(visible, /Ghi đúng chữ cái/);
  assert.match(visible, /Điểm: "xyz" không hợp lệ/);
  assert.match(html, /btn-download-import-errors/);
});

test('nội dung người dùng được escape; dòng cần chú ý hiện trước dòng Hợp lệ khi bị giới hạn số dòng', () => {
  const html = importPreviewHtml(read(), { maxRows: 2 });
  assert.doesNotMatch(html, /<b>1<\/b>/);
  assert.match(html, /import-row is-error/);
  assert.match(html, /import-row is-warning/);
  assert.match(text(html), /và 1 dòng Hợp lệ khác/);
});

test('không có lỗi thì không có nút tải danh sách lỗi; rỗng thì hướng dẫn tải mẫu', () => {
  const clean = readImport('Đề bài,Đáp án đúng\nQ,a', { scope: 'type', typeCode: 'fitb' });
  assert.doesNotMatch(importPreviewHtml(clean), /btn-download-import-errors/);
  assert.match(importPreviewHtml(clean), /Sẽ nhập 1 dòng\./);
  const empty = readImport('', { scope: 'type', typeCode: 'fitb' });
  assert.match(text(importPreviewHtml(empty)), /Tải file mẫu/);
});

test('mẫu cũ có thông báo chuyển đổi trong bảng xem trước', () => {
  const html = importPreviewHtml(readImport('Prompt,Target_Answer,Points\nQ,a,1', { scope: 'type', typeCode: 'fitb' }));
  assert.match(text(html), /mẫu cũ/i);
});

test('danh sách lỗi tải về: Dòng, Cột, Vấn đề, Cách sửa; có BOM', () => {
  const report = importErrorsCsv(read());
  const lines = report.replace(/^﻿/, '').trim().split(/\r\n/);
  assert.equal(lines[0], 'Dòng,Cột,Vấn đề,Cách sửa');
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^3,Đáp án đúng,/);
  assert.ok(report.startsWith('﻿'));
});

test('gợi ý cột và dòng mẫu cho ô dán sinh từ registry cho mọi dạng, và dòng mẫu đọc lại được', () => {
  for (const spec of TYPES) {
    assert.match(typeColumnsHint(spec.code), /^Cột: Đề bài|^Cột: Ảnh/, spec.code);
    const result = readImport(typePlaceholder(spec.code), { scope: 'type', typeCode: spec.code });
    assert.equal(result.summary.error, 0, spec.code);
    assert.ok(result.summary.total >= 1, spec.code);
  }
});

test('thông báo và nhãn không chứa emoji hay mã kỹ thuật thô', () => {
  const html = importPreviewHtml(read());
  assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(text(html), /single_choice|opt_a|undefined|NaN/);
});
