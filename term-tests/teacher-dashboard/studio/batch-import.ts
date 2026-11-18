// NGUỒN: file .ts này; batch-import.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import {
  getActiveUnsavedChangesOwner,
  releaseBuilderModal,
  trackBuilderModal,
  registerBuilderModalCleanup
} from '../navigation/unsaved-changes.js';
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  escapeHtml
} from '../ui/presentation.js';
import { blockTemplateCsv, readImport, templateWorkbookSheets, typeTemplateCsv } from './import-engine.js';
import { readBlockWorkbook } from './import-workbook.js';
import { getMediaBase, mediaBaseFieldHtml, setMediaBase } from './media-base.js';
import { guideHtml } from './import-guide.js';
import { importErrorsCsv, importPreviewHtml, typeColumnsHint, typePlaceholder } from './import-preview.js';
import type { BlockInfo, ReadResult } from './import-engine.js';
import type { TypeCode } from './import-registry.js';

declare const XLSX: any;

export interface UploadedSheet { name: string, csv: string }

// Đọc file tải lên thành danh sách sheet đã đổi sang CSV: .xlsx/.xls có nhiều sheet; CSV/TSV/văn bản chỉ có một sheet.
export function parseUploadedFileToSheets(file: File, callback: (error: Error | null | undefined, sheets?: UploadedSheet[]) => void): void {
  if (!file || typeof callback !== 'function') return;
  const fileName = (file.name || '').toLowerCase();
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const doParse = () => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array((evt.target as FileReader).result as ArrayBuffer);
          if (typeof XLSX === 'undefined') {
            callback(new Error('Thư viện Excel (XLSX) chưa được tải trên trình duyệt. Vui lòng chuyển file sang định dạng CSV UTF-8 rồi tải lại.'));
            return;
          }
          const workbook = XLSX.read(data, { type: 'array' });
          callback(null, workbook.SheetNames.map((name: string) => ({ name, csv: XLSX.utils.sheet_to_csv(workbook.Sheets[name]) })));
        } catch (err) {
          callback(err as Error);
        }
      };
      reader.onerror = () => callback(new Error('Lỗi khi đọc file Excel từ thiết bị.'));
      reader.readAsArrayBuffer(file);
    };

    if (typeof XLSX !== 'undefined') {
      doParse();
    } else {
      const script = document.createElement('script');
      script.src = './vendor/xlsx.full.min.js';
      script.onload = () => doParse();
      script.onerror = () => {
        const cdnScript = document.createElement('script');
        cdnScript.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        cdnScript.onload = () => doParse();
        cdnScript.onerror = () => callback(new Error('Không thể tải thư viện đọc file Excel (XLSX). Vui lòng lưu file sang định dạng CSV UTF-8 rồi tải lại.'));
        document.head.appendChild(cdnScript);
      };
      document.head.appendChild(script);
    }
  } else {
    const reader = new FileReader();
    reader.onload = (evt) => {
      callback(null, [{ name: 'CSV', csv: ((evt.target as FileReader).result as string) || '' }]);
    };
    reader.onerror = () => callback(new Error('Lỗi khi đọc file CSV từ thiết bị.'));
    reader.readAsText(file, 'utf-8');
  }
}

// Giữ hàm cũ cho các hộp thoại chỉ cần một CSV: sheet "Nhap_De_Thi" (mẫu cũ) hoặc sheet đầu.
export function parseUploadedFileToCsv(file: File, callback: (error: Error | null | undefined, csvText?: string) => void): void {
  parseUploadedFileToSheets(file, (error, sheets) => {
    if (error) { callback(error); return; }
    const list = sheets || [];
    const chosen = list.find(sheet => sheet.name === 'Nhap_De_Thi') || list[0];
    callback(null, chosen?.csv ?? '');
  });
}

// Tải một chuỗi CSV về máy (dùng cho mẫu và danh sách lỗi).
function downloadCsvText(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface BatchModalArgs { count: number, modal: HTMLElement, defaultPoints?: number, [key: string]: any }

export interface BatchModalOptions {
  title?: string;
  subtitle?: string;
  defaultCount?: number;
  minCount?: number;
  maxCount?: number;
  defaultPoints?: number;
  extraConfigHtml?: string;
  csvConfig?: any;
  owner?: unknown;
  onConfirm?: (args: BatchModalArgs, count?: number) => unknown;
  onSingle?: (args: Partial<BatchModalArgs>, count?: number) => unknown;
  [key: string]: any;
}

export function openGenericBatchModal({
  title = 'Tạo câu hỏi hàng loạt',
  subtitle = '',
  defaultCount = 5,
  minCount = 1,
  maxCount = 50,
  defaultPoints = 1.0,
  extraConfigHtml = '',
  csvConfig = null,
  owner = getActiveUnsavedChangesOwner(),
  onConfirm,
  onSingle
}: BatchModalOptions = {}): HTMLElement | null {
  if (typeof document === 'undefined') {
    if (typeof onSingle === 'function') onSingle({ count: 1, defaultPoints: defaultPoints || 1 });
    return null;
  }

  // Remove previous modal instance if already present to avoid dangling listeners
  let modal = document.querySelector<HTMLElement>('#generic-batch-modal');
  if (modal && modal.parentNode) {
    releaseBuilderModal(modal);
    modal.parentNode.removeChild(modal);
  }

  modal = document.createElement('div');
  modal.id = 'generic-batch-modal';
  modal.className = 'modal-generic-batch-overlay modal-batch-vocab-overlay';
  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  modal.hidden = false;

  const initialCount = Math.max(minCount, Math.min(maxCount, parseInt(String(defaultCount), 10) || minCount));
  const hasCsv = Boolean(csvConfig);

  modal.innerHTML = `
    <div class="modal-generic-batch-card modal-batch-vocab-card generic-layout-card" role="dialog" aria-modal="true" aria-labelledby="generic-batch-modal-title">
      <div class="modal-generic-batch-header modal-batch-vocab-header">
        <div class="generic-layout-heading">
          ${hasCsv ? renderSvgIcon('fileText', 'icon-inline') : renderSvgIcon('plusCircle', 'icon-inline')}
          <h3 id="generic-batch-modal-title" class="generic-layout-title">${escapeHtml(title)}</h3>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>
      <div class="modal-generic-batch-body modal-batch-vocab-body generic-layout-body">
        ${subtitle ? `<div class="alert-notice alert-info generic-layout-notice">${escapeHtml(subtitle)}</div>` : ''}

        ${hasCsv ? `
          <div class="modal-batch-tabs" role="tablist">
            <button type="button" class="modal-batch-tab-btn active" data-tab="csv" role="tab" aria-selected="true">
              ${renderSvgIcon('upload', 'icon-inline')} <span>Nhập từ CSV / Excel</span>
            </button>
            <button type="button" class="modal-batch-tab-btn" data-tab="stepper" role="tab" aria-selected="false">
              ${renderSvgIcon('plusCircle', 'icon-inline')} <span>Tạo nhanh câu trống</span>
            </button>
          </div>

          <div class="modal-batch-tab-panel active" data-panel="csv">
            <div class="generic-layout-file-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-download-template">
                ${renderSvgIcon('download', 'icon-inline')} <span>Tải file mẫu CSV</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-trigger-csv-file">
                ${renderSvgIcon('upload', 'icon-inline')} <span>Chọn file .CSV</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-view-csv-guide" title="Xem hướng dẫn chi tiết cách điền các cột mẫu">
                ${renderSvgIcon('fileText', 'icon-inline')} <span>Xem hướng dẫn điền</span>
              </button>
              <input type="file" class="input-csv-file generic-layout-hidden" accept=".csv,text/csv,text/plain,.tsv" />
              <span class="generic-layout-hint">(Hỗ trợ UTF-8 BOM, tab Excel hoặc dấu phẩy)</span>
            </div>

            <div class="form-group generic-layout-csv-field">
              <label class="form-label generic-layout-csv-label">
                <strong>Dán các cột từ Excel / Sheets hoặc nội dung CSV:</strong>
                ${csvConfig.columnsHint ? `<span class="generic-layout-hint">${escapeHtml(csvConfig.columnsHint)}</span>` : ''}
              </label>
              <textarea class="form-control textarea-batch-csv generic-layout-textarea" rows="7" placeholder="${escapeHtml(csvConfig.placeholder || 'Dán các dòng dữ liệu copy từ Excel hoặc file CSV...')}"></textarea>
            </div>

            <div class="form-group generic-layout-csv-points-group">
              <label class="form-label generic-layout-csv-points-label"><strong>Điểm mặc định mỗi câu:</strong></label>
              <input type="number" class="form-control input-batch-csv-points generic-layout-csv-points" min="0.25" max="100" step="0.25" value="${defaultPoints}" />
              <span class="generic-layout-hint">(Tự động áp dụng nếu dòng dữ liệu CSV không có điểm riêng)</span>
            </div>

            <div class="vocab-preview-summary csv-preview-summary generic-layout-preview" hidden></div>
          </div>

          <div class="modal-batch-tab-panel" data-panel="stepper" hidden>
            <div class="generic-layout-stepper-fields">
              <div class="form-group batch-count-form-group">
                <label class="form-label"><strong>Tổng số câu hỏi cần tạo:</strong></label>
                <div class="batch-count-stepper-wrap">
                  <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-down" title="Giảm 1 câu" aria-label="Giảm 1 câu">−</button>
                  <input type="number" class="form-control input-batch-count generic-layout-number" min="${minCount}" max="${maxCount}" value="${initialCount}" />
                  <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-up" title="Tăng 1 câu" aria-label="Tăng 1 câu">+</button>
                </div>
                <span class="batch-count-hint generic-layout-hint">(Tối thiểu ${minCount}, tối đa ${maxCount} câu)</span>
              </div>

              <div class="form-group batch-points-form-group">
                <label class="form-label"><strong>Điểm số mỗi câu:</strong></label>
                <div class="generic-layout-points-unit">
                  <input type="number" class="form-control input-batch-points generic-layout-number" min="0.25" max="100" step="0.25" value="${defaultPoints}" />
                  <span class="generic-layout-points-caption">điểm</span>
                </div>
                <span class="batch-points-hint generic-layout-hint">(Mặc định cho các câu được tạo)</span>
              </div>
            </div>
            ${extraConfigHtml ? `<div class="batch-extra-config">${extraConfigHtml}</div>` : ''}
          </div>
        ` : `
          <div class="generic-layout-stepper-fields">
            <div class="form-group batch-count-form-group">
              <label class="form-label"><strong>Tổng số câu hỏi cần tạo:</strong></label>
              <div class="batch-count-stepper-wrap">
                <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-down" title="Giảm 1 câu" aria-label="Giảm 1 câu">−</button>
                <input type="number" class="form-control input-batch-count generic-layout-number" min="${minCount}" max="${maxCount}" value="${initialCount}" />
                <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-up" title="Tăng 1 câu" aria-label="Tăng 1 câu">+</button>
              </div>
              <span class="batch-count-hint generic-layout-hint">(Tối thiểu ${minCount}, tối đa ${maxCount} câu)</span>
            </div>

            <div class="form-group batch-points-form-group">
              <label class="form-label"><strong>Điểm số mỗi câu:</strong></label>
              <div class="generic-layout-points-unit">
                <input type="number" class="form-control input-batch-points generic-layout-number" min="0.25" max="100" step="0.25" value="${defaultPoints}" />
                <span class="generic-layout-points-caption">điểm</span>
              </div>
              <span class="batch-points-hint generic-layout-hint">(Mặc định cho các câu được tạo)</span>
            </div>
          </div>
          ${extraConfigHtml ? `<div class="batch-extra-config">${extraConfigHtml}</div>` : ''}
        `}
      </div>
      <div class="modal-generic-batch-footer modal-batch-vocab-footer generic-layout-footer">
        <button type="button" class="btn btn-secondary btn-batch-single">
          + Chỉ tạo 1 câu thủ công
        </button>
        <div class="generic-layout-footer-actions">
          <button type="button" class="btn btn-secondary btn-close-batch-modal-btn">Hủy bỏ</button>
          ${hasCsv ? `
            <button type="button" class="btn btn-primary btn-batch-confirm btn-confirm-csv-import">
              ${renderSvgIcon('check', 'icon-inline')} <span>Xác nhận nhập dữ liệu</span>
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-batch-confirm">Tạo ${initialCount} câu hỏi</button>
          `}
        </div>
      </div>
    </div>
  `;

  const countInput = modal.querySelector<HTMLInputElement>('.input-batch-count');
  const stepDownBtn = modal.querySelector<HTMLElement>('.btn-batch-step-down');
  const stepUpBtn = modal.querySelector<HTMLElement>('.btn-batch-step-up');
  const confirmBtn = modal.querySelector<HTMLElement>('.btn-batch-confirm');
  const singleBtn = modal.querySelector<HTMLElement>('.btn-batch-single');
  const closeBtn = modal.querySelector<HTMLElement>('.btn-close-batch-modal');
  const closeCancelBtn = modal.querySelector<HTMLElement>('.btn-close-batch-modal-btn');

  let activeTab = hasCsv ? 'csv' : 'stepper';

  const getSafeCount = () => {
    const raw = parseInt(countInput?.value as string, 10);
    if (isNaN(raw)) return minCount;
    return Math.max(minCount, Math.min(maxCount, raw));
  };

  const updateConfirmButton = (cnt: any) => {
    if (!confirmBtn) return;
    if (!hasCsv) {
      confirmBtn.textContent = `Tạo ${cnt} câu hỏi`;
    } else if (activeTab === 'csv') {
      confirmBtn.className = 'btn btn-primary btn-batch-confirm btn-confirm-csv-import';
      confirmBtn.innerHTML = `${renderSvgIcon('check', 'icon-inline')} <span>Xác nhận nhập dữ liệu</span>`;
    } else {
      confirmBtn.className = 'btn btn-primary btn-batch-confirm';
      confirmBtn.innerHTML = `${renderSvgIcon('plusCircle', 'icon-inline')} <span>Tạo ${cnt} câu hỏi</span>`;
    }
  };

  if (hasCsv) {
    const tabBtns = modal.querySelectorAll<HTMLElement>('.modal-batch-tab-btn');
    const panels = modal.querySelectorAll<HTMLElement>('.modal-batch-tab-panel');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const targetTab = btn.getAttribute('data-tab');
        activeTab = targetTab as string;
        tabBtns.forEach(b => {
          const isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panels.forEach(p => {
          const isPanelActive = p.getAttribute('data-panel') === targetTab;
          p.classList.toggle('active', isPanelActive);
          p.hidden = !isPanelActive;
        });
        updateConfirmButton(getSafeCount());
      });
    });
  }

  const handleStep = (delta: any) => {
    const cur = getSafeCount();
    const next = Math.max(minCount, Math.min(maxCount, cur + delta));
    if (countInput) countInput.value = next as unknown as string;
    updateConfirmButton(next);
  };

  if (stepDownBtn) {
    stepDownBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      handleStep(-1);
    });
  }

  if (stepUpBtn) {
    stepUpBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      handleStep(1);
    });
  }

  if (countInput) {
    countInput.addEventListener('input', () => {
      const val = parseInt(countInput.value, 10);
      if (!isNaN(val)) {
        const clamped = Math.max(minCount, Math.min(maxCount, val));
        updateConfirmButton(clamped);
      }
    });

    countInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.preventDefault) e.preventDefault();
        doConfirm();
      }
    });
  }

  let parsedItems: any[] = [];
  if (hasCsv) {
    const viewGuideBtn = modal.querySelector<HTMLElement>('.btn-view-csv-guide');
    if (viewGuideBtn) {
      viewGuideBtn.addEventListener('click', () => {
        openCsvQuickGuideModal(owner, { focus: csvConfig.typeCode });
      });
    }

    const downloadBtn = modal.querySelector<HTMLElement>('.btn-download-template');
    if (downloadBtn && (csvConfig.typeCode || typeof csvConfig.getTemplateCsv === 'function')) {
      downloadBtn.addEventListener('click', () => {
        // Dạng đã khai typeCode dùng bộ cột thống nhất; cấu hình cũ (không typeCode) giữ mẫu riêng.
        const csvContent = csvConfig.typeCode ? typeTemplateCsv(csvConfig.typeCode) : csvConfig.getTemplateCsv();
        downloadCsvText(csvContent, csvConfig.templateFileName || 'mau_cau_hoi.csv');
      });
    }

    const triggerFileBtn = modal.querySelector<HTMLElement>('.btn-trigger-csv-file');
    const fileInput = modal.querySelector<HTMLElement>('.input-csv-file');
    const textarea = modal.querySelector<HTMLInputElement>('.textarea-batch-csv');
    const previewBox = modal.querySelector<HTMLElement>('.csv-preview-summary');

    const updatePreview = () => {
      if (!textarea || !previewBox) return;
      const val = textarea.value.trim();
      if (!val) {
        previewBox.hidden = true;
        return;
      }

      previewBox.hidden = false;
      if (csvConfig.typeCode) {
        // Bộ đọc thống nhất: bảng trạng thái từng dòng; chỉ dòng Hợp lệ/Cảnh báo được nhập.
        const read: ReadResult = readImport(val, { scope: 'type', typeCode: csvConfig.typeCode, defaultPoints: getSafePoints(), existingPrompts: csvConfig.existingPrompts, mediaBase: getMediaBase() });
        parsedItems = read.cards;
        previewBox.innerHTML = importPreviewHtml(read);
        previewBox.querySelector('.btn-download-import-errors')?.addEventListener('click', () => downloadCsvText(importErrorsCsv(read), 'loi_nhap_file.csv'));
        return;
      }
      const parseFn = typeof csvConfig.parseCsv === 'function' ? csvConfig.parseCsv : () => ({ items: [] });
      const parsed = parseFn(val);
      parsedItems = parsed.items || [];

      if (parsedItems.length === 0) {
        previewBox.innerHTML = `<span class="generic-layout-error">Chưa tìm thấy câu hỏi hợp lệ nào. Vui lòng kiểm tra lại cấu trúc cột hoặc bấm “Tải file mẫu CSV” để xem định dạng chuẩn.</span>`;
      } else {
        let html = `<div class="generic-layout-success">Tìm thấy ${parsedItems.length} câu hỏi hợp lệ.</div>`;
        if (parsed.invalidRows && parsed.invalidRows.length > 0) {
          html += `<div class="generic-layout-warning">Bỏ qua ${parsed.invalidRows.length} dòng không hợp lệ (Dòng: ${parsed.invalidRows.slice(0, 5).map((r: any) => r.line).join(', ')}${parsed.invalidRows.length > 5 ? '...' : ''}).</div>`;
        }
        html += `<div class="csv-preview-items generic-layout-preview-items">`;
        parsedItems.slice(0, 3).forEach((itm: any, idx: any) => {
          if (typeof csvConfig.renderPreviewRow === 'function') {
            html += `<div class="generic-layout-preview-row">${csvConfig.renderPreviewRow(itm, idx + 1)}</div>`;
          } else {
            html += `<div class="generic-layout-preview-row"><strong>Câu ${idx + 1}:</strong> ${escapeHtml(itm.prompt || '')}</div>`;
          }
        });
        if (parsedItems.length > 3) {
          html += `<div class="generic-layout-preview-more">... và ${parsedItems.length - 3} câu hỏi khác</div>`;
        }
        html += `</div>`;
        previewBox.innerHTML = html;
      }
    };

    if (triggerFileBtn && fileInput) {
      triggerFileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        parseUploadedFileToCsv(file, (err, csvText) => {
          if (err) {
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
              window.alert(err.message || 'Không thể đọc file.');
            }
            return;
          }
          if (textarea) {
            textarea.value = csvText || '';
            updatePreview();
          }
        });
      });
    }

    if (textarea) {
      textarea.addEventListener('input', updatePreview);
    }
  }

  const pointsInput = modal.querySelector<HTMLInputElement>('.input-batch-points');
  const csvPointsInput = modal.querySelector<HTMLInputElement>('.input-batch-csv-points');

  if (pointsInput && csvPointsInput) {
    pointsInput.addEventListener('input', () => {
      csvPointsInput.value = pointsInput.value;
    });
    csvPointsInput.addEventListener('input', () => {
      pointsInput.value = csvPointsInput.value;
    });
  }

  const getSafePoints = () => {
    const pInput = activeTab === 'csv'
      ? (modal.querySelector<HTMLInputElement>('.input-batch-csv-points') || modal.querySelector<HTMLInputElement>('.input-batch-points'))
      : (modal.querySelector<HTMLInputElement>('.input-batch-points') || modal.querySelector<HTMLInputElement>('.input-batch-csv-points'));
    const raw = parseFloat(pInput?.value as string);
    if (isNaN(raw) || raw <= 0) return defaultPoints || 1.0;
    return Math.round(raw * 100) / 100;
  };

  let cleanupKeydown: ((e: any) => void) | null = null;
  let focusTimer: ReturnType<typeof setTimeout> | null = null;

  const closeModal = () => {
    modal.hidden = true;
    clearTimeout(focusTimer!);
    focusTimer = null;
    if (cleanupKeydown) {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('keydown', cleanupKeydown);
      }
      cleanupKeydown = null;
    }
  };

  registerBuilderModalCleanup(modal, closeModal);

  const doConfirm = () => {
    const finalCount = getSafeCount();
    const finalPoints = getSafePoints();
    const textarea = modal.querySelector<HTMLInputElement>('.textarea-batch-csv');
    const csvVal = textarea ? textarea.value.trim() : '';

    if (hasCsv && activeTab === 'csv' && csvVal) {
      if (parsedItems.length > 0 && typeof csvConfig.onImport === 'function') {
        closeModal();
        csvConfig.onImport(parsedItems, { defaultPoints: finalPoints, items: parsedItems });
        return;
      } else if (parsedItems.length === 0) {
        if (typeof alert === 'function') {
          alert('Dữ liệu CSV không hợp lệ hoặc chưa có câu hỏi nào. Vui lòng kiểm tra lại trước khi xác nhận.');
        } else if (typeof console !== 'undefined' && console.warn) {
          console.warn('Dữ liệu CSV không hợp lệ hoặc chưa có câu hỏi nào.');
        }
        return;
      }
    }

    closeModal();
    if (typeof onConfirm === 'function') {
      const resultObj = {
        count: finalCount,
        defaultPoints: finalPoints,
        modal,
        valueOf: () => finalCount,
        [Symbol.toPrimitive]: () => finalCount
      };
      onConfirm(resultObj, finalCount);
    }
  };

  const doSingle = () => {
    const finalPoints = getSafePoints();
    closeModal();
    if (typeof onSingle === 'function') {
      const resultObj = {
        count: 1,
        defaultPoints: finalPoints,
        modal,
        valueOf: () => 1,
        [Symbol.toPrimitive]: () => 1
      };
      onSingle(resultObj, 1);
    }
  };

  if (confirmBtn) {
    confirmBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      doConfirm();
    });
  }

  if (singleBtn) {
    singleBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      doSingle();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      closeModal();
    });
  }

  if (closeCancelBtn) {
    closeCancelBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      closeModal();
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  cleanupKeydown = (e: any) => {
    if (e.key === 'Escape') {
      if (e.preventDefault) e.preventDefault();
      closeModal();
    }
  };
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', cleanupKeydown);
  }

  if (countInput) {
    focusTimer = setTimeout(() => {
      try {
        countInput.focus();
        countInput.select();
      } catch (_) {}
    }, 50);
  }

  return modal;
}

// Ghi Excel mẫu sinh từ registry (thư viện Excel có sẵn trong trang); không còn file .xlsx tĩnh.
function downloadTemplateWorkbook(): void {
  if (typeof XLSX === 'undefined') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert('Chưa tải được thư viện Excel. Hãy tải lại trang hoặc dùng mẫu .csv.');
    return;
  }
  const workbook = XLSX.utils.book_new();
  for (const sheet of templateWorkbookSheets()) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  XLSX.writeFile(workbook, 'mau_de_thi_test_studio.xlsx');
}

// Trung tâm "Mẫu và hướng dẫn": nội dung sinh từ registry. Giữ id/class cũ của hộp thoại để các nơi gọi và test không đổi.
export function openCsvQuickGuideModal(owner: unknown = getActiveUnsavedChangesOwner(), options: { focus?: TypeCode } = {}) {
  if (typeof document === 'undefined') return null;

  const existingModal = document.getElementById('modal-csv-quick-guide');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-csv-quick-guide';
  modal.className = 'candidate-sim-overlay quick-csv-guide-modal-overlay';

  modal.innerHTML = `
    <div class="candidate-sim-modal quick-csv-guide-modal csv-layout-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="csv-guide-title">
      <div class="candidate-sim-header csv-layout-header">
        <div>
          <h3 class="csv-layout-title" id="csv-guide-title">
            ${renderSvgIcon('fileText', 'icon-inline')}
            <span>Mẫu và hướng dẫn nhập đề</span>
          </h3>
          <p class="csv-layout-subtitle">Cột, ví dụ và lỗi thường gặp của từng dạng câu. Tải mẫu CSV/Excel đã điền sẵn ví dụ.</p>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-guide" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>
      <div class="modal-body csv-layout-guide-body">${guideHtml(options)}</div>
      <div class="candidate-sim-footer csv-layout-footer">
        <button type="button" class="btn btn-secondary btn-close-guide-footer">Đóng</button>
      </div>
    </div>
  `;

  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector<HTMLElement>('.btn-close-guide');
  const closeFooterBtn = modal.querySelector<HTMLElement>('.btn-close-guide-footer');
  const closeModal = () => modal.remove();

  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelectorAll<HTMLElement>('.btn-download-type-template').forEach(btn => {
    btn.addEventListener('click', () => {
      const typeCode = btn.getAttribute('data-download-type') as TypeCode;
      downloadCsvText(typeTemplateCsv(typeCode), `mau_${typeCode}.csv`);
    });
  });
  modal.querySelector('.btn-download-excel-template')?.addEventListener('click', downloadTemplateWorkbook);
  modal.querySelector('.btn-download-block-template-guide')?.addEventListener('click', () => downloadCsvText(blockTemplateCsv(), 'mau_cac_bai_tap_trong_phan.csv'));

  const jumpTo = (typeCode: string) => {
    const target = modal.querySelector<HTMLElement>(`[data-guide-type="${typeCode}"]`);
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
  };
  modal.querySelectorAll<HTMLElement>('[data-guide-jump]').forEach(chip => {
    chip.addEventListener('click', () => jumpTo(chip.getAttribute('data-guide-jump') || ''));
  });
  if (options.focus) jumpTo(options.focus);

  modal.querySelectorAll<HTMLElement>('.btn-copy-sample').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sample = btn.getAttribute('data-sample') || '';
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(sample).then(() => {
          const origText = btn.innerHTML;
          btn.textContent = 'Đã chép';
          btn.classList.add('is-copied');
          setTimeout(() => {
            btn.innerHTML = origText;
            btn.classList.remove('is-copied');
          }, 1500);
        }).catch(() => {});
      }
    });
  });

  return modal;
}

function readBlockWorkbookCsv(sheets: UploadedSheet[]): string {
  const chosen = readBlockWorkbook(sheets, {}).sheetName;
  return sheets.find(sheet => sheet.name === chosen)?.csv || '';
}

export function openBlockCsvUploadModal(opts: Record<string, any> = {}) {
  const {
    block,
    blockIdx,
    owner = getActiveUnsavedChangesOwner(),
    onImport = () => {}
  } = opts;

  if (typeof document === 'undefined') {
    if (typeof onImport === 'function') onImport({ mode: 'append', exercises: [] });
    return null;
  }

  const existingModal = document.getElementById('modal-block-csv-upload');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-block-csv-upload';
  modal.className = 'candidate-sim-overlay block-csv-modal-overlay';

  const blockTitle = (block?.title || `Phần ${blockIdx + 1}`).trim();
  const blockHeaderLine = blockTemplateCsv().replace(/^\uFEFF/, '').split(/\r?\n/)[0].split(',').join(', ');

  modal.innerHTML = `
    <div class="candidate-sim-modal block-csv-modal csv-layout-upload-dialog" role="dialog" aria-modal="true">
      <div class="candidate-sim-header csv-layout-header">
        <div>
          <h3 class="csv-layout-title">
            ${renderSvgIcon('upload', 'icon-inline')}
            <span>Nhập CSV các bài tập vào ${escapeHtml(blockTitle)}</span>
          </h3>
          <p class="csv-layout-subtitle">
            Tải lên một file CSV/Excel để tạo hàng loạt bài tập và câu hỏi cho Phần này. Cột giống hệt file của từng dạng, thêm ba cột đầu: Bài tập, Hướng dẫn bài tập, Dạng câu.
          </p>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>

      <div class="modal-body csv-layout-upload-body">
        <div class="csv-layout-schema-panel">
          <div class="csv-layout-schema-title">Các cột của file Phần thi:</div>
          <code class="csv-layout-schema-code">
            ${escapeHtml(blockHeaderLine)}
          </code>
          <div>Cột không dùng cho dạng câu đó thì để trống. File theo mẫu cũ (7 cột) vẫn nhập được và được tự chuyển đổi.</div>
        </div>

        <div class="csv-layout-file-actions">
          <button type="button" class="btn btn-primary btn-sm btn-download-excel-template csv-layout-download-link">
            ${renderSvgIcon('download', 'icon-inline')} <span>Tải mẫu Excel (.xlsx)</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-download-block-template">
            ${renderSvgIcon('download', 'icon-inline')} <span>Tải file mẫu CSV Phần</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-trigger-block-file">
            ${renderSvgIcon('upload', 'icon-inline')} <span>Chọn file từ máy (.xlsx / .csv)</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-view-csv-guide" title="Xem hướng dẫn chi tiết cách điền các cột mẫu">
            ${renderSvgIcon('fileText', 'icon-inline')} <span>Xem hướng dẫn điền</span>
          </button>
          <input type="file" class="input-block-csv-file csv-layout-file-input" accept=".csv,.tsv,.txt,.xlsx,.xls" />
        </div>

        <div class="form-group csv-layout-field">${mediaBaseFieldHtml(getMediaBase())}</div>

        <div class="form-group csv-layout-field">
          <label class="form-label csv-layout-field-label">Hoặc dán nội dung CSV vào đây:</label>
          <textarea class="form-control block-csv-textarea csv-layout-textarea" rows="6" placeholder="Dán nội dung CSV (có hàng tiêu đề) vào đây..."></textarea>
        </div>

        <div class="form-group csv-layout-mode-panel">
          <label class="form-label csv-layout-field-label">Chế độ nhập dữ liệu:</label>
          <div class="csv-layout-modes">
            <label class="csv-layout-mode-option">
              <input type="radio" name="block-import-mode" value="append" checked />
              <span><strong>Thêm nối tiếp</strong> vào sau các bài tập hiện tại</span>
            </label>
            <label class="csv-layout-overwrite-option">
              <input type="radio" name="block-import-mode" value="overwrite" />
              <span><strong>Ghi đè / Thay thế</strong> toàn bộ bài tập cũ trong Phần này</span>
            </label>
          </div>
        </div>

        <div class="block-csv-preview-box csv-layout-preview" hidden></div>
        <div class="block-csv-error-box csv-layout-error" hidden></div>
      </div>

      <div class="candidate-sim-footer csv-layout-footer">
        <button type="button" class="btn btn-secondary btn-cancel-block-csv">Hủy</button>
        <button type="button" class="btn btn-primary btn-confirm-block-csv" disabled>
          ${renderSvgIcon('check', 'icon-inline')} <span>Xác nhận nhập vào Phần thi</span>
        </button>
      </div>
    </div>
  `;

  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector<HTMLElement>('.btn-close-modal');
  const cancelBtn = modal.querySelector<HTMLElement>('.btn-cancel-block-csv');
  const downloadBtn = modal.querySelector<HTMLElement>('.btn-download-block-template');
  const triggerFileBtn = modal.querySelector<HTMLElement>('.btn-trigger-block-file');
  const fileInput = modal.querySelector<HTMLElement>('.input-block-csv-file');
  const textarea = modal.querySelector<HTMLInputElement>('.block-csv-textarea');
  const confirmBtn = modal.querySelector<HTMLInputElement>('.btn-confirm-block-csv')!;
  const previewBox = modal.querySelector<HTMLElement>('.block-csv-preview-box')!;
  const errorBox = modal.querySelector<HTMLElement>('.block-csv-error-box')!;

  const closeModal = () => {
    modal.remove();
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const viewGuideBtn = modal.querySelector<HTMLElement>('.btn-view-csv-guide');
  viewGuideBtn?.addEventListener('click', () => {
    openCsvQuickGuideModal(owner);
  });
  modal.querySelector('.btn-download-excel-template')?.addEventListener('click', downloadTemplateWorkbook);

  downloadBtn?.addEventListener('click', () => {
    downloadCsvText(blockTemplateCsv(), 'mau_cac_bai_tap_trong_phan.csv');
  });

  let parsedData: any = null;
  // Danh sách sheet khi file là Excel; sheet "Thông tin Phần" cho thông tin cả Phần.
  let workbookSheets: UploadedSheet[] | null = null;
  const existingPrompts = ((block?.items || []) as { prompt?: string }[]).map(item => String(item.prompt || '')).filter(Boolean);
  const mediaInput = modal.querySelector<HTMLInputElement>('.input-media-base');
  mediaInput?.addEventListener('input', () => { setMediaBase(mediaInput.value); updatePreview(); });

  function updatePreview() {
    const raw = (textarea?.value || '').trim();
    if (!raw) {
      previewBox.hidden = true;
      errorBox.hidden = true;
      confirmBtn.disabled = true;
      parsedData = null;
      return;
    }

    const readOptions = { existingPrompts, mediaBase: getMediaBase(), defaultLevel: opts.defaultLevel };
    let read: ReadResult;
    let info: BlockInfo | undefined;
    if (workbookSheets) {
      const workbook = readBlockWorkbook(workbookSheets, readOptions);
      read = workbook.read; info = workbook.info;
    } else {
      read = readImport(raw, { scope: 'block', ...readOptions }); info = read.blockInfo;
    }
    parsedData = { exercises: read.exercises.filter(exercise => exercise.items.length), info };
    const exCount = parsedData.exercises.length;
    const totalItems = parsedData.exercises.reduce((s: number, ex: any) => s + (ex.items?.length || 0), 0);

    if (totalItems === 0) {
      errorBox.hidden = false;
      errorBox.innerHTML = `<strong>Không nhận diện được câu hỏi nào hợp lệ!</strong> Vui lòng kiểm tra định dạng các cột.${read.summary.total ? importPreviewHtml(read) : ''}`;
      errorBox.querySelector('.btn-download-import-errors')?.addEventListener('click', () => downloadCsvText(importErrorsCsv(read), 'loi_nhap_file.csv'));
      previewBox.hidden = true;
      confirmBtn.disabled = true;
      return;
    }

    errorBox.hidden = true;
    previewBox.hidden = false;
    confirmBtn.disabled = false;

    let html = `<strong>Đã nhận diện: ${exCount} bài tập, ${totalItems} câu hỏi</strong><ul class="csv-layout-preview-list">`;
    parsedData.exercises.forEach((ex: any) => {
      html += `<li><strong>${escapeHtml(ex.title)}:</strong> ${ex.items.length} câu hỏi <em>(${escapeHtml(ex.instructions || 'Không có hướng dẫn')})</em></li>`;
    });
    if (info && (info.title || info.instructions || info.reading || info.audio)) {
      html += `<label class="csv-layout-mode-option"><input type="checkbox" class="chk-apply-block-info" checked /> <span><strong>Cập nhật thông tin Phần từ file</strong> (${[info.title && 'tiêu đề', info.instructions && 'hướng dẫn', info.reading && 'bài đọc', info.audio && 'âm thanh'].filter(Boolean).join(', ')})</span></label>`;
    }
    html += `</ul>${importPreviewHtml(read)}`;
    previewBox.innerHTML = html;
    previewBox.querySelector('.btn-download-import-errors')?.addEventListener('click', () => downloadCsvText(importErrorsCsv(read), 'loi_nhap_file.csv'));
  }

  if (triggerFileBtn && fileInput) {
    triggerFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      parseUploadedFileToSheets(file, (err, sheets) => {
        if (err) {
          if (typeof window !== 'undefined' && typeof window.alert === 'function') {
            window.alert(err.message || 'Không thể đọc file.');
          }
          return;
        }
        const list = sheets || [];
        workbookSheets = list.length > 1 || (list[0] && list[0].name !== 'CSV') ? list : null;
        if (textarea) {
          // Ô dán hiện sheet nội dung Phần để người dùng xem/sửa; Excel nhiều sheet vẫn lấy thông tin Phần từ sheet riêng.
          textarea.value = workbookSheets ? readBlockWorkbookCsv(list) : (list[0]?.csv || '');
          updatePreview();
        }
      });
    });
  }

  textarea?.addEventListener('input', () => { workbookSheets = null; updatePreview(); });

  confirmBtn?.addEventListener('click', () => {
    if (!parsedData || !parsedData.exercises.length) return;
    const mode = modal.querySelector<HTMLInputElement>('input[name="block-import-mode"]:checked')?.value || 'append';
    closeModal();
    const applyInfo = Boolean(modal.querySelector<HTMLInputElement>('.chk-apply-block-info')?.checked);
    if (typeof onImport === 'function') {
      onImport({ mode, exercises: parsedData.exercises, blockInfo: applyInfo ? parsedData.info : undefined });
    }
  });

  return modal;
}

export function openCsvUploadModal(opts: Record<string, any> = {}) {
  const {
    title = 'Nhập câu hỏi từ file CSV',
    subtitle = '',
    templateFileName = 'mau_cau_hoi.csv',
    columnsHint = '',
    placeholder = '',
    getTemplateCsv = () => '',
    parseCsv = () => ({ items: [], invalidRows: [] }),
    renderPreviewRow = null,
    onImport = () => {},
    owner = getActiveUnsavedChangesOwner(),
    onSingle = null
  } = opts;

  return openGenericBatchModal({
    owner,
    title,
    subtitle,
    defaultCount: 5,
    minCount: 1,
    maxCount: 50,
    csvConfig: {
      templateFileName,
      columnsHint,
      placeholder,
      getTemplateCsv,
      parseCsv,
      renderPreviewRow,
      onImport
    },
    onConfirm: ({ count }) => {},
    onSingle: typeof onSingle === 'function' ? onSingle : null
  });
}

export function openMultiGroupBatchModal(opts: Record<string, any> = {}) {
  const {
    blockIdx,
    targetExercise,
    owner = getActiveUnsavedChangesOwner(),
    onConfirm = () => {},
    onSingle = () => {},
    onImport = () => {}
  } = opts;

  return openGenericBatchModal({
    owner,
    title: 'Thêm câu hỏi Trắc nghiệm nhóm (Chọn nhiều đáp án)',
    subtitle: 'Tạo cụm câu hỏi chọn 2 hoặc nhiều phương án đúng hoặc nhập từ file CSV/Excel.',
    defaultCount: 2,
    minCount: 2,
    maxCount: 10,
    showPoints: true,
    defaultPoints: 2,
    csvConfig: {
      templateFileName: 'mau_cau_hoi_multi_group.csv',
      typeCode: 'multi_select_group',
      columnsHint: typeColumnsHint('multi_select_group'),
      placeholder: typePlaceholder('multi_select_group'),
      renderPreviewRow: (item: any, idx: any) => `
        <div class="batch-preview-row-text">
          <strong>Vị trí ${idx + 1}:</strong> ${escapeHtml(item.prompt)} 
          <span class="batch-preview-row-meta">(Đ/A đúng: ${escapeHtml(item.expectedOptionIds?.join(', ') || '')} - ${(item.options || []).length} lựa chọn)</span>
        </div>
      `,
      onImport
    },
    onConfirm: ({ count, defaultPoints }) => {
      if (typeof onConfirm === 'function') onConfirm({ count, defaultPoints });
    },
    onSingle: ({ defaultPoints } = {}) => {
      if (typeof onSingle === 'function') onSingle({ defaultPoints });
    }
  });
}

export function openInlineClozeBatchModal(opts: Record<string, any> = {}) {
  const {
    blockIdx,
    targetExercise,
    owner = getActiveUnsavedChangesOwner(),
    onConfirm = () => {},
    onSingle = () => {},
    onImport = () => {}
  } = opts;

  return openGenericBatchModal({
    owner,
    title: 'Thêm câu hỏi Điền từ nội tuyến (Inline Cloze)',
    subtitle: 'Tạo đoạn văn có các ô trống (1) _____ hoặc nhập hàng loạt từ file CSV/Excel.',
    defaultCount: 1,
    minCount: 1,
    maxCount: 20,
    showPoints: true,
    defaultPoints: 1,
    csvConfig: {
      templateFileName: 'mau_cau_hoi_inline_cloze.csv',
      typeCode: 'inline_cloze',
      columnsHint: typeColumnsHint('inline_cloze'),
      placeholder: typePlaceholder('inline_cloze'),
      renderPreviewRow: (item: any, idx: any) => `
        <div class="batch-preview-row-text">
          <strong>Đoạn ${idx + 1}:</strong> ${escapeHtml(item.prompt.slice(0, 80))}... 
          <span class="batch-preview-row-meta">(${Object.keys(item.clozeAnswers || {}).length} chỗ trống - ${item.maxScore} điểm)</span>
        </div>
      `,
      onImport
    },
    onConfirm: ({ count, defaultPoints }) => {
      if (typeof onConfirm === 'function') onConfirm({ count, defaultPoints });
    },
    onSingle: ({ defaultPoints } = {}) => {
      if (typeof onSingle === 'function') onSingle({ defaultPoints });
    }
  });
}
