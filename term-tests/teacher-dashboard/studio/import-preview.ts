// NGUỒN: file .ts này; import-preview.js do `npm run build` sinh ra.
//
// Bảng xem trước kết quả đọc file cho người ra đề (spec #91, GĐ 1): trạng thái từng dòng, lỗi kèm số dòng/cột/cách sửa,
// và tệp danh sách lỗi để sửa ngoài hệ thống. Chỉ dựng chuỗi HTML/CSV, không đụng DOM nên kiểm thử được bằng Node.
import { escapeHtml } from '../ui/presentation.js';
import { COLUMNS, TYPE_BY_CODE } from './import-registry.js';
import type { TypeCode } from './import-registry.js';
import type { ReadResult, RowResult } from './import-engine.js';

const STATUS_LABEL: { [status: string]: string } = { ok: 'Hợp lệ', warning: 'Cảnh báo', error: 'Lỗi' };
const MAX_ROWS = 100;

// Gợi ý cột và dòng mẫu cho ô dán, sinh từ registry để không lệch với mẫu tải về.
export function typeColumnsHint(typeCode: TypeCode): string {
  const spec = TYPE_BY_CODE[typeCode];
  const labels = COLUMNS.filter(column => spec.columns.includes(column.id)).map(column => column.label);
  return `Cột: ${labels.join(' | ')}`;
}

export function typePlaceholder(typeCode: TypeCode): string {
  const spec = TYPE_BY_CODE[typeCode];
  const columns = COLUMNS.filter(column => spec.columns.includes(column.id)).map(column => column.id);
  const header = COLUMNS.filter(column => columns.includes(column.id)).map(column => column.label).join(',');
  const quote = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const rows = spec.examples.slice(0, 2).map(example => columns.map(id => quote(String(example[id] ?? ''))).join(','));
  return [header, ...rows].join('\n');
}

function rowSummary(row: RowResult): string {
  const text = String(row.record.prompt || row.record.correct || row.record.image || '').replace(/\s+/g, ' ').trim();
  return text.length > 70 ? `${text.slice(0, 70)}…` : text;
}

export function importPreviewHtml(result: ReadResult, options: { maxRows?: number } = {}): string {
  const { total, ok, warning, error } = result.summary;
  if (!total) return '<div class="import-preview-empty">Chưa tìm thấy dòng dữ liệu nào. Kiểm tra hàng tiêu đề hoặc bấm “Tải file mẫu” để xem định dạng chuẩn.</div>';
  const importable = ok + warning;
  const notices = result.notices.map(notice => `<li>${escapeHtml(notice)}</li>`).join('');
  const limit = options.maxRows ?? MAX_ROWS;
  // Hiện trước các dòng cần chú ý (Lỗi, Cảnh báo); dòng Hợp lệ chỉ hiện khi còn chỗ.
  const attention = result.rows.filter(row => row.status !== 'ok');
  const fine = result.rows.filter(row => row.status === 'ok');
  const shown = [...attention, ...fine].slice(0, limit).sort((a, b) => a.line - b.line);
  const body = shown.map(row => {
    const messages = row.messages.map(item => `<li><strong>${escapeHtml(item.column)}:</strong> ${escapeHtml(item.text)}${item.hint ? ` <span class="import-hint">${escapeHtml(item.hint)}</span>` : ''}</li>`).join('');
    return `<tr class="import-row is-${row.status}"><td class="import-line">${row.line}</td><td class="import-status"><span class="import-badge is-${row.status}">${STATUS_LABEL[row.status]}</span></td><td class="import-text">${escapeHtml(rowSummary(row))}${messages ? `<ul class="import-messages">${messages}</ul>` : ''}</td></tr>`;
  }).join('');
  const more = result.rows.length > shown.length ? `<div class="import-more">… và ${result.rows.length - shown.length} dòng Hợp lệ khác</div>` : '';
  const action = error
    ? `Sẽ nhập ${importable} dòng hợp lệ; ${error} dòng lỗi bị bỏ qua (sửa file rồi tải lại để nhập nốt).`
    : `Sẽ nhập ${importable} dòng.`;
  return `<div class="import-preview">
    <div class="import-summary"><span class="import-chip is-ok">${ok} Hợp lệ</span><span class="import-chip is-warning">${warning} Cảnh báo</span><span class="import-chip is-error">${error} Lỗi</span></div>
    <p class="import-action">${escapeHtml(action)}</p>
    ${notices ? `<ul class="import-notices">${notices}</ul>` : ''}
    <div class="import-table-wrap"><table class="import-table"><thead><tr><th>Dòng</th><th>Trạng thái</th><th>Nội dung</th></tr></thead><tbody>${body}</tbody></table></div>
    ${more}
    ${error ? '<button type="button" class="btn btn-secondary btn-sm btn-download-import-errors">Tải danh sách lỗi (.csv)</button>' : ''}
  </div>`;
}

const csvCell = (value: string): string => (/[",;\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function importErrorsCsv(result: ReadResult): string {
  const lines = ['Dòng,Cột,Vấn đề,Cách sửa'];
  for (const row of result.rows) {
    for (const item of row.messages) lines.push([String(row.line), item.column, item.text, item.hint || ''].map(csvCell).join(','));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}
