// NGUỒN: file .ts này; add-question-dialog.js do `npm run build` sinh ra.
//
// Hộp thoại "Thêm câu hỏi" (spec #91, GĐ 3): MỘT cửa vào cho mọi dạng câu, ba tab giống nhau ở mọi dạng:
// Từng câu (form + xem trước), Hàng loạt (dán từ Excel / gõ nhanh, bảng sửa tại chỗ), Tải CSV/Excel (xem trước từng dòng).
// Mọi đường đều đi qua cùng bộ đọc và cùng hàm dựng câu hỏi; hộp thoại chỉ trả về thẻ câu hỏi cho nơi gọi.
import { getActiveUnsavedChangesOwner, trackBuilderModal } from '../navigation/unsaved-changes.js';
import { renderSvgIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/presentation.js';
import { openCsvQuickGuideModal, parseUploadedFileToSheets } from './batch-import.js';
import { sheetForType } from './import-workbook.js';
import { getMediaBase, mediaBaseFieldHtml, setMediaBase } from './media-base.js';
import { buildFromRecord, readImport, readRecords, typeTemplateCsv } from './import-engine.js';
import { importErrorsCsv, importPreviewHtml } from './import-preview.js';
import { QUICK_HINT, QUICK_TYPES, cardPreviewHtml, emptyRecord, formFields, pasteToRecords, quickTextToRecords, singleMode, typeChoices } from './add-question-model.js';
import { TYPE_BY_CODE } from './import-registry.js';
import { RUBRIC_VARIANTS } from './import-rubric.js';
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
export function openAddQuestionDialog(options) {
    if (typeof document === 'undefined')
        return null;
    document.getElementById('add-question-dialog')?.remove();
    const owner = options.owner ?? getActiveUnsavedChangesOwner();
    let typeCode = options.typeCode;
    // Tự luận chấm AI: Dạng chấm và Khối chọn trước, rồi form/bảng/mẫu chỉ có cột của dạng đó.
    let rubricVariant;
    let rubricLevel = options.defaultLevel || '34';
    // true: một file có nhiều Dạng chấm (cột Dạng chấm ghi từng dòng), giữ đủ cột.
    let mixedRubric = false;
    let tab = 'single';
    let defaultPoints = options.defaultPoints && options.defaultPoints > 0 ? options.defaultPoints : 0;
    let record = {};
    let bulkRecords = [];
    let added = 0;
    let attempted = false;
    let fileText = '';
    const existingPrompts = options.existingPrompts || [];
    const readerOptions = () => ({ defaultPoints, existingPrompts, mediaBase: getMediaBase(), defaultLevel: typeCode === 'rubric_async' && rubricVariant ? rubricLevel : options.defaultLevel, rubricVariant });
    const needsRubricStep = () => typeCode === 'rubric_async' && !rubricVariant && !mixedRubric;
    const modal = document.createElement('div');
    modal.id = 'add-question-dialog';
    modal.className = 'candidate-sim-overlay aq-overlay';
    trackBuilderModal(modal, owner);
    document.body.appendChild(modal);
    const close = () => modal.remove();
    const pointsLabel = () => (defaultPoints > 0 ? String(defaultPoints) : '');
    function typeStep() {
        return typeChoices().map(group => `<section class="aq-family"><h4>${escapeHtml(group.family)}</h4><div class="aq-type-grid">${group.types.map(type => `<button type="button" class="aq-type-btn" data-aq-type="${type.code}">${escapeHtml(type.label)}</button>`).join('')}</div></section>`).join('');
    }
    function rubricStep() {
        const cards = RUBRIC_VARIANTS.map(entry => `<button type="button" class="aq-variant-card" data-aq-variant="${entry.variant}"><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.hint)}</span></button>`).join('');
        return `<section class="aq-rubric-step"><h4>Chọn dạng chấm</h4><div class="aq-variant-grid">${cards}</div>
      <p class="aq-note-text">Chọn dạng chấm trước: form, bảng hàng loạt và file mẫu sẽ chỉ có các cột của dạng đó, và Khối chọn một lần cho cả lô.</p>
      <div class="aq-rubric-links"><button type="button" class="btn btn-secondary btn-sm aq-rubric-wizard">Dùng trình hướng dẫn từng bước</button><button type="button" class="btn btn-secondary btn-sm aq-rubric-mixed">Một file có nhiều dạng chấm</button></div></section>`;
    }
    function singlePanel(code) {
        const mode = singleMode(code, rubricVariant);
        if (mode === 'wizard') {
            return `<div class="aq-note"><p>Câu Tự luận chấm AI được tạo bằng trình hướng dẫn từng bước (chọn dạng chấm, Khối, yêu cầu bắt buộc).</p><button type="button" class="btn btn-primary btn-sm aq-open-wizard">Mở trình hướng dẫn</button></div>`;
        }
        if (mode === 'batch-only') {
            return `<div class="aq-note"><p>Dạng này cần nhập theo bộ (nhiều sự kiện cùng lúc). Hãy dùng tab <strong>Hàng loạt</strong> hoặc <strong>Tải CSV/Excel</strong>.</p></div>`;
        }
        const fields = formFields(code, rubricVariant).map(field => {
            const control = field.multiline
                ? `<textarea class="form-control aq-field" data-aq-field="${field.id}" rows="3" placeholder="${escapeHtml(field.placeholder ? `Ví dụ: ${field.placeholder}` : '')}"></textarea>`
                : `<input type="text" class="form-control aq-field" data-aq-field="${field.id}" placeholder="${escapeHtml(field.placeholder ? `Ví dụ: ${field.placeholder}` : '')}" />`;
            return `<div class="aq-form-row"><label class="form-label">${escapeHtml(field.label)}${field.required ? ' <span class="aq-required">(bắt buộc)</span>' : ''}</label>${control}${field.note ? `<span class="aq-note-text">${escapeHtml(field.note)}</span>` : ''}</div>`;
        }).join('');
        return `<div class="aq-single"><div class="aq-form">${fields}</div><aside class="aq-side"><h5>Xem trước</h5><div class="aq-preview"></div><div class="aq-messages" aria-live="polite"></div></aside></div>`;
    }
    function bulkPanel(code) {
        const quick = QUICK_TYPES.includes(code);
        return `<div class="aq-bulk">
      <div class="aq-bulk-input">
        <label class="form-label"><strong>Dán nhiều dòng từ Excel / Google Sheets / Word</strong> (các ô cách nhau bằng tab; có hoặc không có hàng tiêu đề)</label>
        <textarea class="form-control aq-paste" rows="4" placeholder="${escapeHtml(formFields(code, rubricVariant).map(field => field.label).join('\t'))}"></textarea>
        ${quick ? `<label class="form-label aq-quick-label"><strong>Hoặc gõ nhanh</strong> — ${escapeHtml(QUICK_HINT[code] || '')}</label><textarea class="form-control aq-quick" rows="4"></textarea>` : ''}
      </div>
      <div class="aq-grid-wrap"><div class="aq-grid-empty">Chưa có dòng nào. Dán hoặc gõ nhanh ở trên, bảng sẽ hiện ở đây để bạn sửa trước khi thêm.</div></div>
      <div class="aq-bulk-summary" aria-live="polite"></div>
    </div>`;
    }
    function filePanel() {
        return `<div class="aq-file">
      <div class="aq-file-actions">
        <button type="button" class="btn btn-secondary btn-sm aq-download-template">${renderSvgIcon('download', 'icon-inline')} <span>Tải file mẫu</span></button>
        <button type="button" class="btn btn-secondary btn-sm aq-choose-file">${renderSvgIcon('upload', 'icon-inline')} <span>Chọn file CSV/Excel</span></button>
        <button type="button" class="btn btn-secondary btn-sm aq-open-guide">${renderSvgIcon('fileText', 'icon-inline')} <span>Xem hướng dẫn</span></button>
        <input type="file" class="aq-file-input" hidden accept=".csv,.tsv,.txt,.xlsx,.xls" />
      </div>
      <label class="form-label">Hoặc dán nội dung CSV:</label>
      <textarea class="form-control aq-file-text" rows="5"></textarea>
      <div class="aq-file-preview"></div>
    </div>`;
    }
    function paint() {
        const spec = typeCode ? TYPE_BY_CODE[typeCode] : undefined;
        const title = `Thêm câu hỏi${options.exerciseTitle ? ` vào ${escapeHtml(options.exerciseTitle)}` : ''}`;
        const tabs = [['single', 'Từng câu'], ['bulk', 'Hàng loạt'], ['file', 'Tải CSV/Excel']];
        modal.innerHTML = `<div class="candidate-sim-modal aq-dialog" role="dialog" aria-modal="true" aria-labelledby="aq-title">
      <div class="candidate-sim-header csv-layout-header">
        <h3 class="csv-layout-title" id="aq-title">${renderSvgIcon('plusCircle', 'icon-inline')} <span>${title}</span></h3>
        <button type="button" class="btn btn-icon btn-sm btn-ghost aq-close" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>
      <div class="modal-body aq-body">
        ${spec ? `<div class="aq-sticky"><div class="aq-chosen"><span><strong>${escapeHtml(spec.label)}</strong>${rubricVariant ? ` · ${escapeHtml(RUBRIC_VARIANTS.find(entry => entry.variant === rubricVariant)?.label || '')}` : ''}</span><button type="button" class="btn btn-secondary btn-sm aq-change-type">Đổi dạng</button>${typeCode === 'rubric_async' && (rubricVariant || mixedRubric) ? `<button type="button" class="btn btn-secondary btn-sm aq-change-variant">Đổi dạng chấm</button>` : ''}${rubricVariant ? `<label class="aq-points">Khối <select class="form-control aq-rubric-level">${(RUBRIC_VARIANTS.find(entry => entry.variant === rubricVariant)?.levels || ['34']).map(level => `<option value="${level}"${level === rubricLevel ? ' selected' : ''}>Khối ${level}</option>`).join('')}</select></label>` : ''}<label class="aq-points">Điểm mặc định <input type="number" class="form-control aq-default-points" min="0.25" step="0.25" value="${pointsLabel()}" placeholder="${spec.defaultPoints}" /></label></div>
${needsRubricStep() ? '' : `<div class="modal-batch-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" class="modal-batch-tab-btn${tab === id ? ' active' : ''}" aria-selected="${tab === id}" data-aq-tab="${id}">${label}</button>`).join('')}</div>`}</div>
        ${typeCode === 'pictorial_vocabulary' ? `<div class="aq-media-row">${mediaBaseFieldHtml(getMediaBase())}</div>` : ''}
        ${needsRubricStep() ? rubricStep() : `<div class="aq-panel" data-panel="single"${tab === 'single' ? '' : ' hidden'}>${singlePanel(typeCode)}</div>
        <div class="aq-panel" data-panel="bulk"${tab === 'bulk' ? '' : ' hidden'}>${bulkPanel(typeCode)}</div>
        <div class="aq-panel" data-panel="file"${tab === 'file' ? '' : ' hidden'}>${filePanel()}</div>`}` : typeStep()}
      </div>
      <div class="candidate-sim-footer csv-layout-footer aq-footer">
        <span class="aq-added" aria-live="polite">${added ? `Đã thêm ${added} câu trong lần mở này.` : ''}</span>
        <div class="aq-footer-actions">
          <button type="button" class="btn btn-secondary aq-cancel">${added ? 'Xong' : 'Hủy'}</button>
          ${spec && !needsRubricStep() ? `<button type="button" class="btn btn-secondary aq-save-next" data-aq-for="single">Lưu và thêm câu tiếp</button>
          <button type="button" class="btn btn-primary aq-save" data-aq-for="single">${renderSvgIcon('check', 'icon-inline')} <span>Lưu</span></button>
          <button type="button" class="btn btn-primary aq-bulk-add" data-aq-for="bulk" hidden disabled>Thêm các dòng hợp lệ</button>
          <button type="button" class="btn btn-primary aq-file-add" data-aq-for="file" hidden disabled>Thêm các dòng hợp lệ</button>` : ''}
        </div>
      </div>
    </div>`;
        bind();
        if (spec && !needsRubricStep()) {
            syncFooter();
            if (tab === 'single')
                refreshSingle();
        }
    }
    function syncFooter() {
        modal.querySelectorAll('[data-aq-for]').forEach(button => {
            const visible = button.getAttribute('data-aq-for') === tab;
            button.hidden = !visible;
        });
        const single = typeCode ? singleMode(typeCode, rubricVariant) : 'form';
        if (single !== 'form')
            modal.querySelectorAll('.aq-save, .aq-save-next').forEach(button => { button.disabled = true; });
    }
    // ---- Từng câu
    function readForm() {
        const next = emptyRecord(typeCode, rubricVariant);
        modal.querySelectorAll('.aq-field').forEach(input => { next[input.getAttribute('data-aq-field')] = input.value; });
        return next;
    }
    function refreshSingle() {
        if (!typeCode || singleMode(typeCode, rubricVariant) !== 'form')
            return { ok: false, cards: [] };
        record = readForm();
        const built = buildFromRecord(typeCode, record, readerOptions());
        const preview = modal.querySelector('.aq-preview');
        const messages = modal.querySelector('.aq-messages');
        const empty = Object.values(record).every(value => !String(value || '').trim());
        const shown = built.messages.filter(item => item.level === 'warning' || (attempted && !empty));
        if (preview)
            preview.innerHTML = built.cards.length ? built.cards.map(cardPreviewHtml).join('') : '<p class="aq-note-text">Điền đề bài và đáp án để xem trước.</p>';
        if (messages)
            messages.innerHTML = shown.length ? `<ul class="aq-message-list">${shown.map(item => `<li class="is-${item.level}"><strong>${escapeHtml(item.column)}:</strong> ${escapeHtml(item.text)}${item.hint ? ` <span class="import-hint">${escapeHtml(item.hint)}</span>` : ''}</li>`).join('')}</ul>` : '';
        return { ok: built.status !== 'error', cards: built.cards };
    }
    function saveSingle(next) {
        attempted = true;
        const { ok, cards } = refreshSingle();
        if (!ok || !cards.length)
            return;
        options.onCommit(cards, { typeCode: typeCode, via: 'single' });
        added += cards.length;
        if (!next) {
            close();
            return;
        }
        // Giữ nguyên dạng và điểm; xóa nội dung để nhập câu tiếp.
        attempted = false;
        modal.querySelectorAll('.aq-field').forEach(input => { input.value = ''; });
        const counter = modal.querySelector('.aq-added');
        if (counter)
            counter.textContent = `Đã thêm ${added} câu trong lần mở này.`;
        const cancel = modal.querySelector('.aq-cancel');
        if (cancel)
            cancel.textContent = 'Xong';
        refreshSingle();
        modal.querySelector('.aq-field')?.focus();
    }
    // ---- Hàng loạt
    function bulkStatus() { return readRecords(typeCode, bulkRecords, readerOptions()); }
    function paintBulkStatuses() {
        const wrap = modal.querySelector('.aq-grid-wrap');
        const summary = modal.querySelector('.aq-bulk-summary');
        const add = modal.querySelector('.aq-bulk-add');
        if (!wrap || !summary)
            return;
        const result = bulkStatus();
        result.rows.forEach((row, index) => {
            const cell = wrap.querySelector(`[data-aq-status="${index}"]`);
            if (!cell)
                return;
            cell.className = `aq-status is-${row.status}`;
            cell.innerHTML = `${row.status === 'ok' ? 'Hợp lệ' : row.status === 'warning' ? 'Cảnh báo' : 'Lỗi'}${row.messages.length ? `<div class="aq-row-messages">${row.messages.map(item => `${escapeHtml(item.column)}: ${escapeHtml(item.text)}`).join('<br>')}</div>` : ''}`;
        });
        const ready = result.summary.ok + result.summary.warning;
        summary.textContent = `${result.summary.ok} Hợp lệ · ${result.summary.warning} Cảnh báo · ${result.summary.error} Lỗi`;
        if (add) {
            add.disabled = ready === 0;
            add.textContent = ready ? `Thêm ${ready} câu hợp lệ` : 'Thêm các dòng hợp lệ';
        }
    }
    function paintGrid() {
        const wrap = modal.querySelector('.aq-grid-wrap');
        if (!wrap || !typeCode)
            return;
        if (!bulkRecords.length) {
            wrap.innerHTML = '<div class="aq-grid-empty">Chưa có dòng nào. Dán hoặc gõ nhanh ở trên, bảng sẽ hiện ở đây để bạn sửa trước khi thêm.</div>';
            paintBulkStatuses();
            return;
        }
        const fields = formFields(typeCode, rubricVariant);
        const head = `<th>#</th>${fields.map(field => `<th>${escapeHtml(field.label)}</th>`).join('')}<th>Trạng thái</th>`;
        const rows = bulkRecords.map((row, index) => `<tr><td>${index + 1}</td>${fields.map(field => `<td><input type="text" class="form-control aq-cell" data-aq-row="${index}" data-aq-col="${field.id}" value="${escapeHtml(String(row[field.id] ?? ''))}" aria-label="${escapeHtml(field.label)} dòng ${index + 1}" /></td>`).join('')}<td data-aq-status="${index}" class="aq-status"></td></tr>`).join('');
        wrap.innerHTML = `<div class="aq-table-scroll"><table class="aq-grid"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
        wrap.querySelectorAll('.aq-cell').forEach(input => {
            input.addEventListener('input', () => {
                bulkRecords[Number(input.getAttribute('data-aq-row'))][input.getAttribute('data-aq-col')] = input.value;
                paintBulkStatuses();
            });
        });
        paintBulkStatuses();
    }
    // ---- Tải CSV/Excel
    function paintFile() {
        const box = modal.querySelector('.aq-file-preview');
        const add = modal.querySelector('.aq-file-add');
        if (!box || !typeCode)
            return;
        if (!fileText.trim()) {
            box.innerHTML = '';
            if (add) {
                add.disabled = true;
                add.textContent = 'Thêm các dòng hợp lệ';
            }
            return;
        }
        const read = readImport(fileText, { scope: 'type', typeCode, ...readerOptions() });
        box.innerHTML = importPreviewHtml(read);
        box.querySelector('.btn-download-import-errors')?.addEventListener('click', () => downloadText(importErrorsCsv(read), 'loi_nhap_file.csv'));
        const ready = read.cards.length;
        if (add) {
            add.disabled = ready === 0;
            add.textContent = ready ? `Thêm ${ready} câu hợp lệ` : 'Thêm các dòng hợp lệ';
        }
    }
    function bind() {
        modal.querySelector('.aq-close')?.addEventListener('click', close);
        modal.querySelector('.aq-cancel')?.addEventListener('click', close);
        modal.querySelectorAll('[data-aq-type]').forEach(button => button.addEventListener('click', () => {
            typeCode = button.getAttribute('data-aq-type');
            tab = 'single';
            record = {};
            bulkRecords = [];
            fileText = '';
            attempted = false;
            rubricVariant = undefined;
            mixedRubric = false;
            paint();
            modal.querySelector('.aq-field')?.focus();
        }));
        modal.querySelector('.aq-change-type')?.addEventListener('click', () => { typeCode = undefined; rubricVariant = undefined; mixedRubric = false; paint(); });
        modal.querySelector('.aq-change-variant')?.addEventListener('click', () => { rubricVariant = undefined; mixedRubric = false; record = {}; bulkRecords = []; fileText = ''; paint(); });
        modal.querySelectorAll('[data-aq-variant]').forEach(button => button.addEventListener('click', () => {
            rubricVariant = button.getAttribute('data-aq-variant');
            const levels = RUBRIC_VARIANTS.find(entry => entry.variant === rubricVariant)?.levels || ['34'];
            if (!levels.includes(rubricLevel))
                rubricLevel = levels.includes('34') ? '34' : levels[0];
            tab = 'single';
            record = {};
            bulkRecords = [];
            fileText = '';
            attempted = false;
            paint();
            modal.querySelector('.aq-field')?.focus();
        }));
        modal.querySelector('.aq-rubric-wizard')?.addEventListener('click', () => { close(); options.onOpenWizard?.(); });
        modal.querySelector('.aq-rubric-mixed')?.addEventListener('click', () => { mixedRubric = true; tab = 'file'; paint(); });
        modal.querySelector('.aq-rubric-level')?.addEventListener('change', event => {
            rubricLevel = event.target.value;
            if (tab === 'single')
                refreshSingle();
            else if (tab === 'bulk')
                paintBulkStatuses();
            else
                paintFile();
        });
        modal.querySelector('.aq-default-points')?.addEventListener('input', event => {
            const value = Number(event.target.value);
            defaultPoints = Number.isFinite(value) && value > 0 ? value : 0;
            if (tab === 'single')
                refreshSingle();
            else if (tab === 'bulk')
                paintBulkStatuses();
            else
                paintFile();
        });
        const mediaInput = modal.querySelector('.input-media-base');
        mediaInput?.addEventListener('input', () => {
            setMediaBase(mediaInput.value);
            if (tab === 'single')
                refreshSingle();
            else if (tab === 'bulk')
                paintBulkStatuses();
            else
                paintFile();
        });
        modal.querySelectorAll('[data-aq-tab]').forEach(button => button.addEventListener('click', () => {
            tab = button.getAttribute('data-aq-tab');
            modal.querySelectorAll('[data-aq-tab]').forEach(other => { const active = other === button; other.classList.toggle('active', active); other.setAttribute('aria-selected', String(active)); });
            modal.querySelectorAll('.aq-panel').forEach(panel => { panel.hidden = panel.getAttribute('data-panel') !== tab; });
            syncFooter();
        }));
        modal.querySelectorAll('.aq-field').forEach(input => input.addEventListener('input', () => refreshSingle()));
        modal.querySelector('.aq-save')?.addEventListener('click', () => saveSingle(false));
        modal.querySelector('.aq-save-next')?.addEventListener('click', () => saveSingle(true));
        modal.querySelector('.aq-open-wizard')?.addEventListener('click', () => { close(); options.onOpenWizard?.(); });
        modal.querySelector('.aq-paste')?.addEventListener('input', event => {
            bulkRecords = pasteToRecords(typeCode, event.target.value, rubricVariant);
            paintGrid();
        });
        modal.querySelector('.aq-quick')?.addEventListener('input', event => {
            const quick = quickTextToRecords(typeCode, event.target.value);
            bulkRecords = quick.records;
            paintGrid();
            const summary = modal.querySelector('.aq-bulk-summary');
            if (summary && quick.problems.length)
                summary.textContent += ` · Dòng gõ nhanh chưa đọc được: ${quick.problems.map(problem => `${problem.line} (${problem.text})`).join('; ')}`;
        });
        modal.querySelector('.aq-bulk-add')?.addEventListener('click', () => {
            const result = bulkStatus();
            const cards = result.cards;
            if (!cards.length)
                return;
            options.onCommit(cards, { typeCode: typeCode, via: 'bulk' });
            close();
        });
        modal.querySelector('.aq-download-template')?.addEventListener('click', () => downloadText(typeTemplateCsv(typeCode, rubricVariant), `mau_${typeCode}${rubricVariant ? `_${rubricVariant}` : ''}.csv`));
        modal.querySelector('.aq-open-guide')?.addEventListener('click', () => openCsvQuickGuideModal(owner, { focus: typeCode }));
        const fileInput = modal.querySelector('.aq-file-input');
        modal.querySelector('.aq-choose-file')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', event => {
            const file = event.target.files?.[0];
            if (!file)
                return;
            parseUploadedFileToSheets(file, (error, sheets) => {
                if (error) {
                    window.alert?.(error.message || 'Không thể đọc file.');
                    return;
                }
                // Excel nhiều sheet: lấy sheet đặt tên theo dạng này, không có thì sheet đầu.
                fileText = sheetForType(sheets || [], typeCode)?.csv || '';
                const textarea = modal.querySelector('.aq-file-text');
                if (textarea)
                    textarea.value = fileText;
                paintFile();
            });
        });
        modal.querySelector('.aq-file-text')?.addEventListener('input', event => { fileText = event.target.value; paintFile(); });
        modal.querySelector('.aq-file-add')?.addEventListener('click', () => {
            const read = readImport(fileText, { scope: 'type', typeCode: typeCode, ...readerOptions() });
            if (!read.cards.length)
                return;
            options.onCommit(read.cards, { typeCode: typeCode, via: 'file' });
            close();
        });
    }
    // Gắn một lần (innerHTML đổi theo từng bước nhưng chính lớp phủ giữ nguyên).
    modal.addEventListener('click', event => { if (event.target === modal)
        close(); });
    modal.addEventListener('keydown', event => { if (event.key === 'Escape')
        close(); });
    paint();
    return modal;
}
