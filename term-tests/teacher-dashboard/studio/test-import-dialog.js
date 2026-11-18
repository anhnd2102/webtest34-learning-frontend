// NGUỒN: file .ts này; test-import-dialog.js do `npm run build` sinh ra.
//
// Nhập cả đề từ Excel (spec #91, GĐ 4, mức 3): mỗi sheet là một Phần, sheet "Thông tin Phần" cho tiêu đề/hướng dẫn/bài đọc/âm thanh.
// Hộp thoại chỉ xem trước và trả danh sách Phần đã đọc; việc dựng Phần và câu hỏi do nơi gọi làm.
import { getActiveUnsavedChangesOwner, trackBuilderModal } from '../navigation/unsaved-changes.js';
import { renderSvgIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/presentation.js';
import { parseUploadedFileToSheets } from './batch-import.js';
import { importErrorsCsv, importPreviewHtml } from './import-preview.js';
import { MAX_BLOCKS, readTestWorkbook } from './import-workbook.js';
import { getMediaBase, mediaBaseFieldHtml, setMediaBase } from './media-base.js';
const downloadText = (content, fileName) => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
export function openTestImportDialog(options) {
    if (typeof document === 'undefined')
        return null;
    document.getElementById('test-import-dialog')?.remove();
    const owner = options.owner ?? getActiveUnsavedChangesOwner();
    const room = Math.max(0, MAX_BLOCKS - options.existingBlockCount);
    let sheets = [];
    let importable = [];
    const modal = document.createElement('div');
    modal.id = 'test-import-dialog';
    modal.className = 'candidate-sim-overlay aq-overlay';
    trackBuilderModal(modal, owner);
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.innerHTML = `<div class="candidate-sim-modal aq-dialog" role="dialog" aria-modal="true" aria-labelledby="ti-title">
    <div class="candidate-sim-header csv-layout-header">
      <h3 class="csv-layout-title" id="ti-title">${renderSvgIcon('upload', 'icon-inline')} <span>Nhập cả đề từ Excel</span></h3>
      <button type="button" class="btn btn-icon btn-sm btn-ghost ti-close" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
    </div>
    <div class="modal-body aq-body">
      <p class="aq-note-text">Mỗi sheet là một Phần (tên sheet là tên Phần), dùng đúng bộ cột của file cả Phần. Sheet "Thông tin Phần" (tùy chọn) cho hướng dẫn, bài đọc và âm thanh của từng Phần. Còn chỗ cho ${room} Phần (đề có tối đa ${MAX_BLOCKS} Phần).</p>
      <div class="aq-file-actions">
        <button type="button" class="btn btn-secondary btn-sm ti-choose">${renderSvgIcon('upload', 'icon-inline')} <span>Chọn file Excel (.xlsx)</span></button>
        <input type="file" class="ti-file-input" hidden accept=".xlsx,.xls,.csv,.tsv,.txt" />
      </div>
      <div class="aq-media-row">${mediaBaseFieldHtml(getMediaBase())}</div>
      <div class="ti-preview"></div>
    </div>
    <div class="candidate-sim-footer csv-layout-footer aq-footer">
      <span class="aq-added"></span>
      <div class="aq-footer-actions">
        <button type="button" class="btn btn-secondary ti-cancel">Hủy</button>
        <button type="button" class="btn btn-primary ti-add" disabled>Thêm các Phần hợp lệ</button>
      </div>
    </div>
  </div>`;
    const preview = modal.querySelector('.ti-preview');
    const addBtn = modal.querySelector('.ti-add');
    function paint() {
        if (!sheets.length) {
            preview.innerHTML = '';
            addBtn.disabled = true;
            return;
        }
        const test = readTestWorkbook(sheets, { mediaBase: getMediaBase(), defaultLevel: options.defaultLevel });
        importable = test.blocks.filter(entry => entry.read.exercises.some(exercise => exercise.items.length)).slice(0, room);
        const cards = importable.reduce((sum, entry) => sum + entry.read.cards.length, 0);
        const notices = [...test.notices, ...(test.blocks.length > room ? [`Chỉ còn chỗ cho ${room} Phần; các Phần sau bị bỏ qua.`] : [])];
        const sections = test.blocks.map((entry, index) => {
            const skipped = !importable.includes(entry);
            const info = entry.info ? `<p class="aq-note-text">Thông tin Phần: ${[entry.info.instructions && 'hướng dẫn', entry.info.reading && 'bài đọc', entry.info.audio && 'âm thanh'].filter(Boolean).join(', ') || '(trống)'}</p>` : '';
            return `<details class="ti-block"${index === 0 ? ' open' : ''}><summary><strong>${escapeHtml(entry.title)}</strong> — ${entry.read.exercises.length} bài tập, ${entry.read.cards.length} câu hợp lệ${entry.read.summary.error ? `, ${entry.read.summary.error} dòng lỗi` : ''}${skipped ? ' (không được thêm)' : ''}</summary>${info}${importPreviewHtml(entry.read)}</details>`;
        }).join('');
        preview.innerHTML = `<div class="import-summary"><span class="import-chip is-ok">${importable.length} Phần sẽ thêm</span><span class="import-chip is-ok">${cards} câu</span><span class="import-chip is-error">${test.summary.error} dòng lỗi</span></div>${notices.length ? `<ul class="import-notices">${notices.map(notice => `<li>${escapeHtml(notice)}</li>`).join('')}</ul>` : ''}${sections || '<p class="aq-note-text">Không tìm thấy sheet Phần nào.</p>'}`;
        preview.querySelectorAll('.btn-download-import-errors').forEach((button, index) => {
            const entry = test.blocks.filter(candidate => candidate.read.summary.error > 0)[index];
            if (entry)
                button.addEventListener('click', () => downloadText(importErrorsCsv(entry.read), `loi_${entry.title}.csv`));
        });
        addBtn.disabled = importable.length === 0;
        addBtn.textContent = importable.length ? `Thêm ${importable.length} Phần (${cards} câu)` : 'Thêm các Phần hợp lệ';
    }
    const fileInput = modal.querySelector('.ti-file-input');
    modal.querySelector('.ti-choose')?.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        parseUploadedFileToSheets(file, (error, loaded) => {
            if (error) {
                window.alert?.(error.message || 'Không thể đọc file.');
                return;
            }
            const list = loaded || [];
            // CSV chỉ có một sheet: lấy tên file làm tên Phần.
            sheets = list.length === 1 && list[0].name === 'CSV' ? [{ name: file.name.replace(/\.[^.]+$/, '') || 'Phần 1', csv: list[0].csv }] : list;
            paint();
        });
    });
    const mediaInput = modal.querySelector('.input-media-base');
    mediaInput?.addEventListener('input', () => { setMediaBase(mediaInput.value); paint(); });
    modal.querySelector('.ti-close')?.addEventListener('click', close);
    modal.querySelector('.ti-cancel')?.addEventListener('click', close);
    addBtn.addEventListener('click', () => {
        if (!importable.length)
            return;
        options.onImport(importable);
        close();
    });
    modal.addEventListener('click', event => { if (event.target === modal)
        close(); });
    modal.addEventListener('keydown', event => { if (event.key === 'Escape')
        close(); });
    return modal;
}
