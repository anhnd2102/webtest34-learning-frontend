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
  parseBlockExercisesCsv
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
        csvConfig.onImport(parsedItems, { defaultPoints: finalPoints });
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
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '10050';
  modal.style.padding = '20px';

  modal.innerHTML = `
    <div class="candidate-sim-modal" role="dialog" aria-modal="true" style="max-width: 760px; width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="candidate-sim-header" style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px;">
        <div>
          <h3 style="margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
            ${renderSvgIcon('fileText', 'icon-inline')}
            <span>Hướng dẫn điền file CSV tạo đề thi (Test Studio)</span>
          </h3>
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Hệ thống hỗ trợ tiếng Việt có dấu (UTF-8 BOM), phân tách bằng dấu phẩy hoặc tab Excel.
          </p>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-guide" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>

      <div class="modal-body" style="overflow-y: auto; flex: 1; padding-right: 6px; font-size: 13px; color: #334155; line-height: 1.5;">
        <h4 style="margin: 0 0 6px; font-size: 14px; color: #0f172a; font-weight: 700;">1. CSV gộp cả Phần thi (Block CSV - 7 cột đa năng)</h4>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-family: monospace; font-size: 12px;">
          Exercise_Title, Exercise_Instructions, Question_Type, Prompt, Correct_Answer, Options_Or_Details, Score
        </div>
        <ul style="margin: 0 0 14px; padding-left: 20px;">
          <li><strong>Exercise_Title</strong>: Tiêu đề bài tập. Các dòng tiếp theo cùng bài tập có thể để trống.</li>
          <li><strong>Question_Type</strong>: Nhận diện cả tiếng Anh và tiếng Việt: <code>single_choice</code> (trắc nghiệm), <code>fitb</code> (điền từ), <code>vocabulary_pair</code> (từ vựng), <code>sentence_reorder</code> (sắp xếp câu), <code>listening_order</code> (sắp xếp nghe), <code>error_correction</code> (sửa lỗi), <code>sentence_transformation</code> (viết lại câu), <code>pictorial_vocabulary</code> (từ vựng qua ảnh), <code>pronunciation_choice</code> (phát âm), <code>reading_matching</code> (ghép nối), <code>rubric_async</code> (tự luận).</li>
        </ul>

        <h4 style="margin: 0 0 6px; font-size: 14px; color: #0f172a; font-weight: 700;">2. Hướng dẫn các dạng bài riêng lẻ</h4>
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 14px;">
        <table class="quick-guide-table" style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 0;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left;">
              <th style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">Dạng bài</th>
              <th style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">Cấu trúc các cột</th>
              <th style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">Ví dụ mẫu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 600;">Trắc nghiệm đơn</td>
              <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Prompt, Option_A, Option_B, Option_C, Option_D, Correct_Answer, Explanation, Points</td>
              <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">The ship departs ___ Miami.,at,from,on,in,B,,1</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 600;">Điền từ nội tuyến (Đoạn văn)</td>
              <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Prompt (chứa các ô (1) _____), Correct_Answer (ngăn cách bằng |), Score</td>
              <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">1. I (41) _____ TV. 2. He (42) _____ up.,watch | gets,1</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Điền ô trống ngắn</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Prompt, Target_Answer, Points</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Water freezes at ___ degrees.,0,1</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Cặp từ vựng</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">English, Vietnamese</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">destination,điểm đến</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Sắp xếp trật tự từ</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Sentence_Text, Score, Help_Text</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">"She / has worked / here / for five years",1,Thì HTHT</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Sắp xếp thứ tự nghe</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Event_Text, Correct_Order, Score</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Welcome aboard meeting,1,1</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Tìm và sửa lỗi</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Original_Sentence, Error_Part, Correction, Accepted_Variants, Explanation</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">There are much people...,much,many,a lot of,Much không đếm được</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Viết lại câu có từ khóa</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Original_Sentence, Mandatory_Keyword, Target_Sentence, Expected_Answer, Variants</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">It is not necessary...,HAVE,You ___ tickets,do not have to book</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Thẻ từ vựng qua ảnh</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Image_URL, Target_Word, Vietnamese_Meaning, Accepted_Variants, Score</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">assets/.../image1.png,apple,quả táo,an apple,1</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Phát âm & Trọng âm</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Prompt, Option_A, Option_B, Option_C, Option_D, Correct_Option, Score</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">camera,/ˈkæm.ər.ə/,/kəˈmɪər.ə/,,,A,1</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">Tự luận chấm AI</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Prompt, Reference_Context, Max_Score, Preset_Type, Criterion_1, Criterion_2</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Translate into English...,,4,translation,Ý nghĩa,Ngữ pháp</td>
            </tr>
          </tbody>
        </table>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #92400e;">
          <strong>Lưu ý quan trọng khi lưu file từ Excel:</strong> Nếu câu hỏi có dấu phẩy hoặc xuống dòng, hãy bọc câu trong dấu nháy kép <code>""</code>. Khi lưu từ Excel, hãy chọn <em>CSV UTF-8 (Comma delimited) (*.csv)</em> để đảm bảo tiếng Việt không bị lỗi font.
        </div>
      </div>

      <div class="candidate-sim-footer" style="display: flex; justify-content: flex-end; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
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
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '10050';
  modal.style.padding = '20px';

  const blockTitle = (block?.title || `Phần ${blockIdx + 1}`).trim();

  modal.innerHTML = `
    <div class="candidate-sim-modal block-csv-modal" role="dialog" aria-modal="true" style="max-width: 680px; width: 95%;">
      <div class="candidate-sim-header" style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h3 style="margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
            ${renderSvgIcon('upload', 'icon-inline')}
            <span>Nhập CSV các bài tập vào ${escapeHtml(blockTitle)}</span>
          </h3>
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Tải lên file CSV gộp 7 cột đa năng để tạo hàng loạt bài tập và câu hỏi cho Phần này.
          </p>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>

      <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #475569;">
          <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">Cấu trúc 7 cột chuẩn hóa:</div>
          <code style="display: block; background: #fff; padding: 6px 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 11px; margin-bottom: 6px; word-break: break-all;">
            Exercise_Title, Exercise_Instructions, Question_Type, Prompt, Correct_Answer, Options_Or_Details, Score
          </code>
          <div>Hỗ trợ: <em>single_choice, fitb, inline_cloze, vocabulary_pair, error_correction, sentence_transformation, sentence_reorder, listening_order, pictorial_vocabulary, pronunciation_choice, rubric_async</em>.</div>
        </div>

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <a href="./assets/templates/mau_de_thi_test_studio.xlsx" download="mau_de_thi_test_studio.xlsx" class="btn btn-primary btn-sm btn-download-excel-template" style="text-decoration: none;">
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
          <input type="file" class="input-block-csv-file" accept=".csv,.tsv,.txt,.xlsx,.xls" style="display: none;" />
        </div>

        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Hoặc dán nội dung CSV vào đây:</label>
          <textarea class="form-control block-csv-textarea" rows="6" placeholder="Dán nội dung CSV theo 7 cột vào đây..." style="font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
        </div>

        <div class="form-group" style="margin: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
          <label class="form-label" style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Chế độ nhập dữ liệu:</label>
          <div style="display: flex; gap: 16px; font-size: 13px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="radio" name="block-import-mode" value="append" checked />
              <span><strong>Thêm nối tiếp</strong> vào sau các bài tập hiện tại</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #b91c1c;">
              <input type="radio" name="block-import-mode" value="overwrite" />
              <span><strong>Ghi đè / Thay thế</strong> toàn bộ bài tập cũ trong Phần này</span>
            </label>
          </div>
        </div>

        <div class="block-csv-preview-box" style="display: none; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #166534;"></div>
        <div class="block-csv-error-box" style="display: none; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #991b1b;"></div>
      </div>

      <div class="candidate-sim-footer" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
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

    let html = `<strong>Đã nhận diện: ${exCount} bài tập, ${totalItems} câu hỏi</strong><ul style="margin: 6px 0 0; padding-left: 18px;">`;
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
