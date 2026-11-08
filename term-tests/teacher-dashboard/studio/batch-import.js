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
import {
  generateBlockExercisesTemplateCsv,
  parseBlockExercisesCsv,
  generateInlineClozeTemplateCsv,
  parseInlineClozeCsv,
  generateMultiGroupTemplateCsv,
  parseMultiGroupCsv
} from './content-import.js';

export function parseUploadedFileToCsv(file, callback) {
  if (!file || typeof callback !== 'function') return;
  const fileName = (file.name || '').toLowerCase();
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const doParse = () => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          if (typeof XLSX !== 'undefined') {
            const workbook = XLSX.read(data, { type: 'array' });
            // Luôn ưu tiên Sheet 1 (hoặc sheet có tên Nhap_De_Thi) để import
            let targetSheetName = workbook.SheetNames[0];
            if (workbook.SheetNames.includes('Nhap_De_Thi')) {
              targetSheetName = 'Nhap_De_Thi';
            }
            const worksheet = workbook.Sheets[targetSheetName];
            const csvText = XLSX.utils.sheet_to_csv(worksheet);
            callback(null, csvText);
          } else {
            callback(new Error('Thư viện Excel (XLSX) chưa được tải trên trình duyệt. Vui lòng chuyển file sang định dạng CSV UTF-8.'));
          }
        } catch (err) {
          callback(err);
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
        cdnScript.onerror = () => callback(new Error('Không thể tải thư viện đọc file Excel (XLSX). Vui lòng lưu file sang định dạng CSV UTF-8.'));
        document.head.appendChild(cdnScript);
      };
      document.head.appendChild(script);
    }
  } else {
    const reader = new FileReader();
    reader.onload = (evt) => {
      callback(null, evt.target.result || '');
    };
    reader.onerror = () => callback(new Error('Lỗi khi đọc file CSV từ thiết bị.'));
    reader.readAsText(file, 'utf-8');
  }
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
} = {}) {
  if (typeof document === 'undefined') {
    if (typeof onSingle === 'function') onSingle({ count: 1, defaultPoints: defaultPoints || 1 });
    return null;
  }

  // Remove previous modal instance if already present to avoid dangling listeners
  let modal = document.querySelector('#generic-batch-modal');
  if (modal && modal.parentNode) {
    releaseBuilderModal(modal);
    modal.parentNode.removeChild(modal);
  }

  modal = document.createElement('div');
  modal.id = 'generic-batch-modal';
  modal.className = 'modal-generic-batch-overlay modal-batch-vocab-overlay';
  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  modal.style.display = 'flex';

  const initialCount = Math.max(minCount, Math.min(maxCount, parseInt(defaultCount, 10) || minCount));
  const hasCsv = Boolean(csvConfig);

  modal.innerHTML = `
    <div class="modal-generic-batch-card modal-batch-vocab-card" style="max-width: 680px;" role="dialog" aria-modal="true" aria-labelledby="generic-batch-modal-title">
      <div class="modal-generic-batch-header modal-batch-vocab-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${hasCsv ? renderSvgIcon('fileText', 'icon-inline') : renderSvgIcon('plusCircle', 'icon-inline')}
          <h3 id="generic-batch-modal-title" style="margin: 0; font-size: 1.1rem; font-weight: 600;">${escapeHtml(title)}</h3>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>
      <div class="modal-generic-batch-body modal-batch-vocab-body" style="padding: 16px 20px;">
        ${subtitle ? `<div class="alert-notice alert-info" style="margin: 0 0 12px 0; padding: 10px 14px; font-size: 0.85rem;">${escapeHtml(subtitle)}</div>` : ''}

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
            <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm btn-download-template">
                ${renderSvgIcon('download', 'icon-inline')} <span>Tải file mẫu CSV</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-trigger-csv-file">
                ${renderSvgIcon('upload', 'icon-inline')} <span>Chọn file .CSV</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-view-csv-guide" title="Xem hướng dẫn chi tiết cách điền các cột mẫu">
                ${renderSvgIcon('fileText', 'icon-inline')} <span>Xem hướng dẫn điền</span>
              </button>
              <input type="file" class="input-csv-file" accept=".csv,text/csv,text/plain,.tsv" style="display: none;" />
              <span style="font-size: 0.8rem; color: #64748b;">(Hỗ trợ UTF-8 BOM, tab Excel hoặc dấu phẩy)</span>
            </div>

            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                <strong>Dán các cột từ Excel / Sheets hoặc nội dung CSV:</strong>
                ${csvConfig.columnsHint ? `<span style="font-size: 0.8rem; color: #64748b;">${escapeHtml(csvConfig.columnsHint)}</span>` : ''}
              </label>
              <textarea class="form-control textarea-batch-csv" rows="7" placeholder="${escapeHtml(csvConfig.placeholder || 'Dán các dòng dữ liệu copy từ Excel hoặc file CSV...')}" style="font-family: monospace; font-size: 13px;"></textarea>
            </div>

            <div class="form-group" style="margin-top: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <label class="form-label" style="margin: 0; font-size: 0.875rem;"><strong>Điểm mặc định mỗi câu:</strong></label>
              <input type="number" class="form-control input-batch-csv-points" min="0.25" max="100" step="0.25" value="${defaultPoints}" style="width: 85px; text-align: center; font-weight: 700; padding: 6px 10px;" />
              <span style="font-size: 0.8rem; color: #64748b;">(Tự động áp dụng nếu dòng dữ liệu CSV không có điểm riêng)</span>
            </div>

            <div class="vocab-preview-summary csv-preview-summary" style="margin-top: 8px; font-size: 0.85rem; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; display: none;"></div>
          </div>

          <div class="modal-batch-tab-panel" data-panel="stepper" style="display: none;">
            <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 8px;">
              <div class="form-group batch-count-form-group">
                <label class="form-label"><strong>Tổng số câu hỏi cần tạo:</strong></label>
                <div class="batch-count-stepper-wrap">
                  <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-down" title="Giảm 1 câu" aria-label="Giảm 1 câu">−</button>
                  <input type="number" class="form-control input-batch-count" min="${minCount}" max="${maxCount}" value="${initialCount}" style="width: 100px; text-align: center; font-weight: 700; font-size: 1.1rem;" />
                  <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-up" title="Tăng 1 câu" aria-label="Tăng 1 câu">+</button>
                </div>
                <span class="batch-count-hint" style="font-size: 0.8rem; color: #64748b;">(Tối thiểu ${minCount}, tối đa ${maxCount} câu)</span>
              </div>

              <div class="form-group batch-points-form-group">
                <label class="form-label"><strong>Điểm số mỗi câu:</strong></label>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <input type="number" class="form-control input-batch-points" min="0.25" max="100" step="0.25" value="${defaultPoints}" style="width: 100px; text-align: center; font-weight: 700; font-size: 1.1rem;" />
                  <span style="font-size: 0.9rem; font-weight: 600; color: #475569;">điểm</span>
                </div>
                <span class="batch-points-hint" style="font-size: 0.8rem; color: #64748b;">(Mặc định cho các câu được tạo)</span>
              </div>
            </div>
            ${extraConfigHtml ? `<div class="batch-extra-config">${extraConfigHtml}</div>` : ''}
          </div>
        ` : `
          <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 8px;">
            <div class="form-group batch-count-form-group">
              <label class="form-label"><strong>Tổng số câu hỏi cần tạo:</strong></label>
              <div class="batch-count-stepper-wrap">
                <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-down" title="Giảm 1 câu" aria-label="Giảm 1 câu">−</button>
                <input type="number" class="form-control input-batch-count" min="${minCount}" max="${maxCount}" value="${initialCount}" style="width: 100px; text-align: center; font-weight: 700; font-size: 1.1rem;" />
                <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-up" title="Tăng 1 câu" aria-label="Tăng 1 câu">+</button>
              </div>
              <span class="batch-count-hint" style="font-size: 0.8rem; color: #64748b;">(Tối thiểu ${minCount}, tối đa ${maxCount} câu)</span>
            </div>

            <div class="form-group batch-points-form-group">
              <label class="form-label"><strong>Điểm số mỗi câu:</strong></label>
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="number" class="form-control input-batch-points" min="0.25" max="100" step="0.25" value="${defaultPoints}" style="width: 100px; text-align: center; font-weight: 700; font-size: 1.1rem;" />
                <span style="font-size: 0.9rem; font-weight: 600; color: #475569;">điểm</span>
              </div>
              <span class="batch-points-hint" style="font-size: 0.8rem; color: #64748b;">(Mặc định cho các câu được tạo)</span>
            </div>
          </div>
          ${extraConfigHtml ? `<div class="batch-extra-config">${extraConfigHtml}</div>` : ''}
        `}
      </div>
      <div class="modal-generic-batch-footer modal-batch-vocab-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 8px 8px;">
        <button type="button" class="btn btn-secondary btn-batch-single">
          + Chỉ tạo 1 câu thủ công
        </button>
        <div style="display: flex; gap: 8px;">
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

  const countInput = modal.querySelector('.input-batch-count');
  const stepDownBtn = modal.querySelector('.btn-batch-step-down');
  const stepUpBtn = modal.querySelector('.btn-batch-step-up');
  const confirmBtn = modal.querySelector('.btn-batch-confirm');
  const singleBtn = modal.querySelector('.btn-batch-single');
  const closeBtn = modal.querySelector('.btn-close-batch-modal');
  const closeCancelBtn = modal.querySelector('.btn-close-batch-modal-btn');

  let activeTab = hasCsv ? 'csv' : 'stepper';

  const getSafeCount = () => {
    const raw = parseInt(countInput?.value, 10);
    if (isNaN(raw)) return minCount;
    return Math.max(minCount, Math.min(maxCount, raw));
  };

  const updateConfirmButton = (cnt) => {
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
    const tabBtns = modal.querySelectorAll('.modal-batch-tab-btn');
    const panels = modal.querySelectorAll('.modal-batch-tab-panel');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const targetTab = btn.getAttribute('data-tab');
        activeTab = targetTab;
        tabBtns.forEach(b => {
          const isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panels.forEach(p => {
          const isPanelActive = p.getAttribute('data-panel') === targetTab;
          p.classList.toggle('active', isPanelActive);
          p.style.display = isPanelActive ? 'block' : 'none';
        });
        updateConfirmButton(getSafeCount());
      });
    });
  }

  const handleStep = (delta) => {
    const cur = getSafeCount();
    const next = Math.max(minCount, Math.min(maxCount, cur + delta));
    if (countInput) countInput.value = next;
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

  let parsedItems = [];
  if (hasCsv) {
    const viewGuideBtn = modal.querySelector('.btn-view-csv-guide');
    if (viewGuideBtn) {
      viewGuideBtn.addEventListener('click', () => {
        openCsvQuickGuideModal(owner);
      });
    }

    const downloadBtn = modal.querySelector('.btn-download-template');
    if (downloadBtn && typeof csvConfig.getTemplateCsv === 'function') {
      downloadBtn.addEventListener('click', () => {
        const csvContent = csvConfig.getTemplateCsv();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', csvConfig.templateFileName || 'mau_cau_hoi.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }

    const triggerFileBtn = modal.querySelector('.btn-trigger-csv-file');
    const fileInput = modal.querySelector('.input-csv-file');
    const textarea = modal.querySelector('.textarea-batch-csv');
    const previewBox = modal.querySelector('.csv-preview-summary');

    const updatePreview = () => {
      if (!textarea || !previewBox) return;
      const val = textarea.value.trim();
      if (!val) {
        previewBox.style.display = 'none';
        return;
      }

      const parseFn = typeof csvConfig.parseCsv === 'function' ? csvConfig.parseCsv : () => ({ items: [] });
      const parsed = parseFn(val);
      parsedItems = parsed.items || [];
      previewBox.style.display = 'block';

      if (parsedItems.length === 0) {
        previewBox.innerHTML = `<span style="color: #ef4444; font-weight: 500;">Chưa tìm thấy câu hỏi hợp lệ nào. Vui lòng kiểm tra lại cấu trúc cột hoặc bấm “Tải file mẫu CSV” để xem định dạng chuẩn.</span>`;
      } else {
        let html = `<div style="color: #10b981; font-weight: 600; margin-bottom: 6px;">Tìm thấy ${parsedItems.length} câu hỏi hợp lệ.</div>`;
        if (parsed.invalidRows && parsed.invalidRows.length > 0) {
          html += `<div style="color: #f59e0b; font-size: 12px; margin-bottom: 6px;">Bỏ qua ${parsed.invalidRows.length} dòng không hợp lệ (Dòng: ${parsed.invalidRows.slice(0, 5).map(r => r.line).join(', ')}${parsed.invalidRows.length > 5 ? '...' : ''}).</div>`;
        }
        html += `<div class="csv-preview-items" style="max-height: 140px; overflow-y: auto; border-top: 1px dashed #cbd5e1; padding-top: 6px;">`;
        parsedItems.slice(0, 3).forEach((itm, idx) => {
          if (typeof csvConfig.renderPreviewRow === 'function') {
            html += `<div style="margin-bottom: 4px; font-size: 12px;">${csvConfig.renderPreviewRow(itm, idx + 1)}</div>`;
          } else {
            html += `<div style="margin-bottom: 4px; font-size: 12px;"><strong>Câu ${idx + 1}:</strong> ${escapeHtml(itm.prompt || '')}</div>`;
          }
        });
        if (parsedItems.length > 3) {
          html += `<div style="font-size: 11px; color: #64748b; font-style: italic;">... và ${parsedItems.length - 3} câu hỏi khác</div>`;
        }
        html += `</div>`;
        previewBox.innerHTML = html;
      }
    };

    if (triggerFileBtn && fileInput) {
      triggerFileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
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

  const pointsInput = modal.querySelector('.input-batch-points');
  const csvPointsInput = modal.querySelector('.input-batch-csv-points');

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
      ? (modal.querySelector('.input-batch-csv-points') || modal.querySelector('.input-batch-points'))
      : (modal.querySelector('.input-batch-points') || modal.querySelector('.input-batch-csv-points'));
    const raw = parseFloat(pInput?.value);
    if (isNaN(raw) || raw <= 0) return defaultPoints || 1.0;
    return Math.round(raw * 100) / 100;
  };

  let cleanupKeydown = null;
  let focusTimer = null;

  const closeModal = () => {
    modal.style.display = 'none';
    clearTimeout(focusTimer);
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
    const textarea = modal.querySelector('.textarea-batch-csv');
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

  cleanupKeydown = (e) => {
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

export function openCsvQuickGuideModal(owner = getActiveUnsavedChangesOwner()) {
  if (typeof document === 'undefined') return null;

  const existingModal = document.getElementById('modal-csv-quick-guide');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-csv-quick-guide';
  modal.className = 'candidate-sim-overlay quick-csv-guide-modal-overlay';

  modal.innerHTML = `
    <div class="candidate-sim-modal quick-csv-guide-modal csv-layout-guide-dialog" role="dialog" aria-modal="true">
      <div class="candidate-sim-header csv-layout-header">
        <div>
          <h3 class="csv-layout-title">
            ${renderSvgIcon('fileText', 'icon-inline')}
            <span>Hướng dẫn điền file CSV / Excel tạo đề thi (Test Studio)</span>
          </h3>
          <p class="csv-layout-subtitle">
            Hệ thống hỗ trợ tiếng Việt có dấu (UTF-8 BOM), phân tách bằng dấu phẩy hoặc tab Excel.
          </p>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-guide" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>

      <div class="modal-body csv-layout-guide-body">
        <h4 class="csv-layout-section-title">1. Cấu trúc 7 cột chuẩn hóa gộp cả Phần thi (Block CSV / Excel Sheet 1)</h4>
        <div class="csv-layout-column-schema">
          Exercise_Title, Exercise_Instructions, Question_Type, Prompt, Correct_Answer, Options_Or_Details, Score
        </div>
        <ul class="csv-layout-column-notes">
          <li><strong>Exercise_Title</strong>: Tiêu đề bài tập. Các câu tiếp theo cùng bài tập có thể để trống cột này.</li>
          <li><strong>Exercise_Instructions</strong>: Hướng dẫn làm bài tập (chỉ cần điền ở dòng đầu tiên của bài tập).</li>
          <li><strong>Question_Type</strong>: Loại câu hỏi (tiếng Anh hoặc tiếng Việt chuẩn hóa bên dưới).</li>
        </ul>

        <h4 class="csv-layout-types-title">2. Chi tiết cách điền từng dạng câu hỏi (Bấm "Chép mẫu" để dán ngay)</h4>
        <div class="csv-layout-table-frame">
        <table class="quick-guide-table csv-layout-table">
          <thead>
            <tr class="csv-layout-table-heading">
              <th class="csv-layout-type-heading">Dạng bài</th>
              <th class="csv-layout-column-heading">Quy ước các cột (Prompt, Đáp án, Chi tiết)</th>
              <th class="csv-layout-column-heading">Dòng ví dụ mẫu</th>
              <th class="csv-layout-action-heading">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="csv-layout-type-cell">Trắc nghiệm đơn<br><code class="csv-layout-type-code">single_choice</code></td>
              <td class="csv-layout-details-cell">Cột 5: Chữ cái đáp án đúng (A/B/C/D). Cột 6: Các lựa chọn cách nhau bởi <code>|</code></td>
              <td class="csv-layout-sample-cell">The cruise departs ___ Miami.,B,at | from | on | in,1</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample="Part 1: Grammar,Choose correct answer,single_choice,The cruise departs ___ Miami.,B,at | from | on | in,1">Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Trắc nghiệm nhóm<br><code class="csv-layout-type-code">multi_select_group</code></td>
              <td class="csv-layout-details-cell">Cột 5: Các đáp án đúng (VD: <code>A, C</code> hoặc <code>A|C</code>). Cột 6: Danh sách lựa chọn cách nhau bởi <code>|</code></td>
              <td class="csv-layout-sample-cell">Which TWO activities are free?,A, C,Swimming pool | Tennis court | Fitness center | Sauna | Yoga,2</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample="Part 2: Group Choice,Select correct options,multi_select_group,Which TWO activities are free of charge?,A, C,Swimming pool | Tennis court | Fitness center | Sauna | Yoga class,2">Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Điền từ nội tuyến (Đoạn văn)<br><code class="csv-layout-type-code">inline_cloze</code></td>
              <td class="csv-layout-details-cell">Cột 4: Đoạn văn chứa <code>(1) _____</code> hoặc <code>[1]</code>. Cột 5: Đáp án theo thứ tự cách nhau bởi <code>|</code> (nhiều biến thể cách nhau bởi <code>/</code>)</td>
              <td class="csv-layout-sample-cell">"She visits (1) _____ islands and arrives in (2) _____.",six | Nassau,,1</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample='Part 3: Cloze Passage,Fill in the blanks,inline_cloze,"The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) __________.",six | Nassau,,1'>Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Tìm và sửa lỗi sai<br><code class="csv-layout-type-code">error_correction</code></td>
              <td class="csv-layout-details-cell">Cột 4: Câu gốc chứa lỗi. Cột 5: Từ viết sai (Error). Cột 6: Từ sửa lại đúng (Correction) kèm biến thể cách nhau bởi <code>|</code></td>
              <td class="csv-layout-sample-cell">We have two knife in the kitchen.,knife,knives,1</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample="Part 4: Error Correction,Find and correct the mistake,error_correction,We have two knife in the kitchen.,knife,knives,1">Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Điền ô trống ngắn<br><code class="csv-layout-type-code">fitb</code></td>
              <td class="csv-layout-details-cell">Cột 4: Câu hỏi chứa <code>___</code>. Cột 5: Đáp án đúng. Cột 6: Biến thể chấp nhận cách nhau bởi <code>|</code></td>
              <td class="csv-layout-sample-cell">Water freezes at ___ degrees Celsius.,0,zero,1</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample="Part 5: Short Blank,Fill in the missing word,fitb,Water freezes at ___ degrees Celsius.,0,zero,1">Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Cặp từ vựng<br><code class="csv-layout-type-code">vocabulary_pair</code></td>
              <td class="csv-layout-details-cell">Cột 4: Từ tiếng Anh. Cột 5: Nghĩa tiếng Việt tương ứng</td>
              <td class="csv-layout-sample-cell">destination,điểm đến,,1</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample="Part 6: Vocabulary,Match meaning,vocabulary_pair,destination,điểm đến,,1">Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Viết lại câu có từ khóa<br><code class="csv-layout-type-code">sentence_transformation</code></td>
              <td class="csv-layout-details-cell">Cột 4: Câu gốc. Cột 5: Từ khóa in hoa. Cột 6: Câu đích có <code>___</code> | Đáp án đúng</td>
              <td class="csv-layout-sample-cell">It is not necessary to book.,HAVE,You ___ in advance. | do not have to book,1</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample="Part 7: Transformation,Rewrite the sentence,sentence_transformation,It is not necessary to book in advance.,HAVE,You ___ in advance. | do not have to book,1">Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Sắp xếp câu<br><code class="csv-layout-type-code">sentence_reorder</code></td>
              <td class="csv-layout-details-cell">Cột 4: Các cụm từ ngăn cách bằng <code>/</code>. Cột 5: Câu hoàn chỉnh</td>
              <td class="csv-layout-sample-cell">"She / has worked / here",She has worked here.,,1</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample='Part 8: Reorder,Arrange the words,sentence_reorder,"She / has worked / here / for five years",She has worked here for five years.,,1'>Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Sắp xếp nghe<br><code class="csv-layout-type-code">listening_order</code></td>
              <td class="csv-layout-details-cell">Cột 4: Tên sự kiện. Cột 5: Thứ tự xuất hiện (1, 2, 3...)</td>
              <td class="csv-layout-sample-cell">Safety drill and inspection,2,,1</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample="Part 9: Listening Order,Order the events,listening_order,Safety drill and lifeboat inspection,2,,1">Chép mẫu</button>
              </td>
            </tr>
            <tr>
              <td class="csv-layout-type-cell">Tự luận chấm AI<br><code class="csv-layout-type-code">rubric_async</code></td>
              <td class="csv-layout-details-cell">Cột 4: Đề bài. Cột 6: Tiêu chí chấm điểm ngăn cách bởi <code>|</code></td>
              <td class="csv-layout-sample-cell">Summarize paragraph A in 50 words.,,Ý chính (2đ) | Ngữ pháp (2đ),4</td>
              <td class="csv-layout-action-cell">
                <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample csv-layout-copy-button" data-sample="Part 10: Writing,Write a short summary,rubric_async,Summarize the main idea of Paragraph A in 50 words.,,Ý chính đầy đủ (2đ) | Ngữ pháp chuẩn (2đ),4">Chép mẫu</button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <div class="csv-layout-warning">
          <strong>Lưu ý quan trọng khi lưu file từ Excel:</strong> Nếu câu hỏi có dấu phẩy hoặc xuống dòng, hãy bọc câu trong dấu nháy kép <code>""</code>. Khi lưu từ Excel, hãy chọn <em>CSV UTF-8 (Comma delimited) (*.csv)</em> để đảm bảo tiếng Việt không bị lỗi font.
        </div>
      </div>

      <div class="candidate-sim-footer csv-layout-footer">
        <button type="button" class="btn btn-secondary btn-close-guide-footer">Đóng</button>
      </div>
    </div>
  `;

  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.btn-close-guide');
  const closeFooterBtn = modal.querySelector('.btn-close-guide-footer');
  const closeModal = () => modal.remove();

  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelectorAll('.btn-copy-sample').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sample = btn.getAttribute('data-sample') || '';
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(sample).then(() => {
          const origText = btn.innerHTML;
          btn.innerHTML = '✓ Đã chép';
          btn.style.color = '#15803d';
          btn.style.fontWeight = '600';
          setTimeout(() => {
            btn.innerHTML = origText;
            btn.style.color = '';
            btn.style.fontWeight = '';
          }, 1500);
        }).catch(() => {});
      }
    });
  });

  return modal;
}

export function openBlockCsvUploadModal(opts = {}) {
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

  modal.innerHTML = `
    <div class="candidate-sim-modal block-csv-modal csv-layout-upload-dialog" role="dialog" aria-modal="true">
      <div class="candidate-sim-header csv-layout-header">
        <div>
          <h3 class="csv-layout-title">
            ${renderSvgIcon('upload', 'icon-inline')}
            <span>Nhập CSV các bài tập vào ${escapeHtml(blockTitle)}</span>
          </h3>
          <p class="csv-layout-subtitle">
            Tải lên file CSV gộp 7 cột đa năng để tạo hàng loạt bài tập và câu hỏi cho Phần này.
          </p>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>

      <div class="modal-body csv-layout-upload-body">
        <div class="csv-layout-schema-panel">
          <div class="csv-layout-schema-title">Cấu trúc 7 cột chuẩn hóa:</div>
          <code class="csv-layout-schema-code">
            Exercise_Title, Exercise_Instructions, Question_Type, Prompt, Correct_Answer, Options_Or_Details, Score
          </code>
          <div>Hỗ trợ: <em>single_choice, multi_select_group, inline_cloze, fitb, vocabulary_pair, error_correction, sentence_transformation, sentence_reorder, listening_order, pictorial_vocabulary, pronunciation_choice, rubric_async</em>.</div>
        </div>

        <div class="csv-layout-file-actions">
          <a href="./assets/templates/mau_de_thi_test_studio.xlsx" download="mau_de_thi_test_studio.xlsx" class="btn btn-primary btn-sm btn-download-excel-template csv-layout-download-link">
            ${renderSvgIcon('download', 'icon-inline')} <span>Tải mẫu Excel 2 Sheet (.xlsx)</span>
          </a>
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

        <div class="form-group csv-layout-field">
          <label class="form-label csv-layout-field-label">Hoặc dán nội dung CSV vào đây:</label>
          <textarea class="form-control block-csv-textarea csv-layout-textarea" rows="6" placeholder="Dán nội dung CSV theo 7 cột vào đây..."></textarea>
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

        <div class="block-csv-preview-box csv-layout-preview"></div>
        <div class="block-csv-error-box csv-layout-error"></div>
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

  const closeBtn = modal.querySelector('.btn-close-modal');
  const cancelBtn = modal.querySelector('.btn-cancel-block-csv');
  const downloadBtn = modal.querySelector('.btn-download-block-template');
  const triggerFileBtn = modal.querySelector('.btn-trigger-block-file');
  const fileInput = modal.querySelector('.input-block-csv-file');
  const textarea = modal.querySelector('.block-csv-textarea');
  const confirmBtn = modal.querySelector('.btn-confirm-block-csv');
  const previewBox = modal.querySelector('.block-csv-preview-box');
  const errorBox = modal.querySelector('.block-csv-error-box');

  const closeModal = () => {
    modal.remove();
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const viewGuideBtn = modal.querySelector('.btn-view-csv-guide');
  viewGuideBtn?.addEventListener('click', () => {
    openCsvQuickGuideModal(owner);
  });

  downloadBtn?.addEventListener('click', () => {
    const csvContent = generateBlockExercisesTemplateCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'mau_cac_bai_tap_trong_phan.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  let parsedData = null;

  function updatePreview() {
    const raw = (textarea?.value || '').trim();
    if (!raw) {
      previewBox.style.display = 'none';
      errorBox.style.display = 'none';
      confirmBtn.disabled = true;
      parsedData = null;
      return;
    }

    parsedData = parseBlockExercisesCsv(raw);
    const exCount = parsedData.exercises.length;
    const totalItems = parsedData.exercises.reduce((s, ex) => s + (ex.items?.length || 0), 0);

    if (totalItems === 0) {
      errorBox.style.display = 'block';
      errorBox.innerHTML = '<strong>Không nhận diện được câu hỏi nào hợp lệ!</strong> Vui lòng kiểm tra định dạng các cột.';
      previewBox.style.display = 'none';
      confirmBtn.disabled = true;
      return;
    }

    errorBox.style.display = 'none';
    previewBox.style.display = 'block';
    confirmBtn.disabled = false;

    let html = `<strong>Đã nhận diện: ${exCount} bài tập, ${totalItems} câu hỏi</strong><ul class="csv-layout-preview-list">`;
    parsedData.exercises.forEach((ex) => {
      html += `<li><strong>${escapeHtml(ex.title)}:</strong> ${ex.items.length} câu hỏi <em>(${escapeHtml(ex.instructions || 'Không có hướng dẫn')})</em></li>`;
    });
    html += '</ul>';
    previewBox.innerHTML = html;
  }

  if (triggerFileBtn && fileInput) {
    triggerFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
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

  textarea?.addEventListener('input', updatePreview);

  confirmBtn?.addEventListener('click', () => {
    if (!parsedData || !parsedData.exercises.length) return;
    const mode = modal.querySelector('input[name="block-import-mode"]:checked')?.value || 'append';
    closeModal();
    if (typeof onImport === 'function') {
      onImport({ mode, exercises: parsedData.exercises });
    }
  });

  return modal;
}

export function openCsvUploadModal(opts = {}) {
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

export function openMultiGroupBatchModal(opts = {}) {
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
      columnsHint: 'Question_Prompt, Correct_Options, All_Options, Score',
      placeholder: '"Which TWO activities are free of charge?","A, C","Swimming pool | Tennis court | Fitness center | Sauna | Yoga class",2',
      getTemplateCsv: generateMultiGroupTemplateCsv,
      parseCsv: parseMultiGroupCsv,
      renderPreviewRow: (item, idx) => `
        <div style="font-size: 12px; margin-bottom: 4px;">
          <strong>Vị trí ${idx + 1}:</strong> ${escapeHtml(item.prompt)} 
          <span style="color: #047857; font-weight: 600;">(Đ/A đúng: ${escapeHtml(item.expectedOptionIds?.join(', ') || '')} - ${(item.options || []).length} lựa chọn)</span>
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

export function openInlineClozeBatchModal(opts = {}) {
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
      columnsHint: 'Prompt, Answers, Points',
      placeholder: '"The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) __________.",six | Nassau,1',
      getTemplateCsv: generateInlineClozeTemplateCsv,
      parseCsv: parseInlineClozeCsv,
      renderPreviewRow: (item, idx) => `
        <div style="font-size: 12px; margin-bottom: 4px;">
          <strong>Đoạn ${idx + 1}:</strong> ${escapeHtml(item.prompt.slice(0, 80))}... 
          <span style="color: #047857; font-weight: 600;">(${Object.keys(item.clozeAnswers || {}).length} chỗ trống - ${item.maxScore} điểm)</span>
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
