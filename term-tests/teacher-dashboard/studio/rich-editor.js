import {
  sanitizeRichContent,
  generateTableHtml
} from '../ui/rich-content.js';
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  escapeHtml
} from '../ui/presentation.js';
import {
  convertGoogleDriveImageUrl,
  validateImageUrl
} from './media.js';

export function renderRichHtmlEditor(container, {
  value = '',
  onChange = null,
  placeholder = '',
  onInsertBlankToken = null
} = {}) {
  if (!container) return null;

  const sanitized = sanitizeRichContent(value || '');

  container.innerHTML = `
    <div class="rich-editor rich-html-editor-wrap">
      <div class="rich-editor__toolbar rich-editor-toolbar">
        <div class="rich-editor__toolbar-left toolbar-group">
          <!-- Heading Dropdown -->
          <div class="rich-editor__control control-heading-select">
            <select class="form-select form-select-sm select-format-heading" title="Chọn cấp độ tiêu đề">
              <option value="p">Đoạn văn (Normal)</option>
              <option value="h2">Tiêu đề lớn (H2)</option>
              <option value="h3">Tiêu đề mục (H3)</option>
              <option value="h4">Tiêu đề nhỏ (H4)</option>
            </select>
          </div>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Inline Formatting Actions -->
          <button type="button" class="btn-editor-action btn-format-bold" title="Tô đậm (Bold - Ctrl+B)">
            ${renderSvgIcon('bold', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-italic" title="In nghiêng (Italic - Ctrl+I)">
            ${renderSvgIcon('italic', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-underline" title="Gạch chân (Underline - Ctrl+U)">
            ${renderSvgIcon('underline', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-strike" title="Gạch ngang (Strikethrough)">
            ${renderSvgIcon('strike', 'icon-inline')}
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Lists -->
          <button type="button" class="btn-editor-action btn-format-ul" title="Danh sách dấu chấm (Bullet List)">
            ${renderSvgIcon('listUl', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-ol" title="Danh sách số (Numbered List)">
            ${renderSvgIcon('listOl', 'icon-inline')}
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Alignment -->
          <button type="button" class="btn-editor-action btn-format-align-left" title="Căn trái">
            ${renderSvgIcon('alignLeft', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-align-center" title="Căn giữa">
            ${renderSvgIcon('alignCenter', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-align-right" title="Căn phải">
            ${renderSvgIcon('alignRight', 'icon-inline')}
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Clear Formatting -->
          <button type="button" class="btn-editor-action btn-format-clear" title="Xóa toàn bộ định dạng">
            ${renderSvgIcon('removeFormat', 'icon-inline')}
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Table Control & Popup -->
          <div class="rich-editor__control dropdown-table-wrap">
            <button type="button" class="btn-editor-action btn-rich-insert-table" title="Chèn Bảng dữ liệu">
              ${renderSvgIcon('table', 'icon-inline')} <span>Chèn bảng</span> ${renderSvgIcon('chevronDown', 'icon-inline')}
            </button>
            <div class="rich-editor__popup table-presets-menu" style="display: none;">
              <strong>Tạo bảng nhanh</strong>
              <div class="rich-editor__table-options">
                <button type="button" class="btn-table-grid" data-rows="2" data-cols="2">2 cột × 2 dòng</button>
                <button type="button" class="btn-table-grid" data-rows="3" data-cols="3">3 cột × 3 dòng</button>
                <button type="button" class="btn-table-grid" data-rows="4" data-cols="2">2 cột × 4 dòng</button>
                <button type="button" class="btn-table-grid" data-rows="5" data-cols="4">4 cột × 5 dòng</button>
              </div>
              <small>Số dòng chưa tính dòng tiêu đề.</small>
              <div class="rich-editor__presets-section">
                <small>Mẫu sư phạm IELTS</small>
                <button type="button" class="btn-table-preset" data-preset="itinerary">Lịch trình chuyến đi (Itinerary)</button>
                <button type="button" class="btn-table-preset" data-preset="notes">Ghi chú bài nghe (Note Completion)</button>
                <button type="button" class="btn-table-preset" data-preset="vocabulary">Bảng từ vựng 4 cột (Vocabulary)</button>
              </div>
            </div>
          </div>

          <!-- Image Control & Popup -->
          <div class="rich-editor__control dropdown-image-wrap">
            <button type="button" class="btn-editor-action btn-rich-insert-image" title="Chèn ảnh (URL HTTPS hoặc Google Drive)">
              ${renderSvgIcon('image', 'icon-inline')} <span>Chèn ảnh</span>
            </button>
            <div class="rich-editor__popup image-insert-popup" style="display: none;">
              <label>
                Link ảnh
                <input type="url" class="input-image-link" placeholder="https://drive.google.com/file/d/..." />
              </label>
              <small>Ảnh Drive cần chia sẻ “Bất kỳ ai có đường liên kết”.</small>
              <div class="rich-editor__error popup-image-error" style="display: none; padding: 6px 10px; font-size: 12px; margin-top: 4px;"></div>
              <div class="rich-editor__actions">
                <button type="button" class="btn-confirm-insert-image">Chèn</button>
              </div>
            </div>
          </div>

          ${onInsertBlankToken ? `
            <button type="button" class="btn-editor-action btn-rich-insert-blank" title="Chèn chỗ trống tại vị trí con trỏ">
              + Chèn chỗ trống
            </button>
          ` : ''}
        </div>

        <div class="rich-editor__toolbar-right toolbar-group toolbar-mode-toggle">
          <button type="button" class="btn-editor-action btn-toggle-html-mode" title="Chuyển chế độ [Trực quan ⇄ Mã HTML]">
            &lt;/&gt; Mã HTML
          </button>
        </div>
      </div>

      <div class="rich-editor__content-area" style="position: relative;">
        <div class="rich-editor__content rich-editor-visual" contenteditable="true" spellcheck="false" data-placeholder="${escapeHtml(placeholder)}" role="textbox" aria-label="Nội dung bài" aria-multiline="true">${sanitized}</div>
        <textarea class="rich-editor__code rich-editor-code form-control" style="display: none;" rows="8">${escapeHtml(sanitized)}</textarea>
      </div>

      <div class="rich-editor__error general-editor-error" style="display: none;" role="alert"></div>

      <div class="rich-editor__footer">
        <span>Enter để xuống dòng. Shift+Enter để ngắt dòng mềm. Nhấp vào ô bảng để chỉnh sửa.</span>
      </div>
    </div>
  `;

  const visualEl = container.querySelector ? container.querySelector('.rich-editor-visual') : null;
  const codeEl = container.querySelector ? container.querySelector('.rich-editor-code') : null;
  const toggleBtn = container.querySelector ? container.querySelector('.btn-toggle-html-mode') : null;
  const tableBtn = container.querySelector ? container.querySelector('.btn-rich-insert-table') : null;
  const tableMenu = container.querySelector ? container.querySelector('.table-presets-menu') : null;
  const imageBtn = container.querySelector ? container.querySelector('.btn-rich-insert-image') : null;
  const imagePopup = container.querySelector ? container.querySelector('.image-insert-popup') : null;
  const imageLinkInput = container.querySelector ? container.querySelector('.input-image-link') : null;
  const confirmImageBtn = container.querySelector ? container.querySelector('.btn-confirm-insert-image') : null;
  const imageErrorEl = container.querySelector ? container.querySelector('.popup-image-error') : null;
  const generalErrorEl = container.querySelector ? container.querySelector('.general-editor-error') : null;
  const blankBtn = container.querySelector ? container.querySelector('.btn-rich-insert-blank') : null;

  // New Rich Text Controls
  const headingSelect = container.querySelector ? container.querySelector('.select-format-heading') : null;
  const boldBtn = container.querySelector ? container.querySelector('.btn-format-bold') : null;
  const italicBtn = container.querySelector ? container.querySelector('.btn-format-italic') : null;
  const underlineBtn = container.querySelector ? container.querySelector('.btn-format-underline') : null;
  const strikeBtn = container.querySelector ? container.querySelector('.btn-format-strike') : null;
  const ulBtn = container.querySelector ? container.querySelector('.btn-format-ul') : null;
  const olBtn = container.querySelector ? container.querySelector('.btn-format-ol') : null;
  const alignLeftBtn = container.querySelector ? container.querySelector('.btn-format-align-left') : null;
  const alignCenterBtn = container.querySelector ? container.querySelector('.btn-format-align-center') : null;
  const alignRightBtn = container.querySelector ? container.querySelector('.btn-format-align-right') : null;
  const clearBtn = container.querySelector ? container.querySelector('.btn-format-clear') : null;

  let savedRange = null;

  const saveSelection = () => {
    if (typeof window !== 'undefined' && window.getSelection) {
      const sel = window.getSelection();
      if (!visualEl || !sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (visualEl.contains && visualEl.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
      }
    }
  };

  const closeAllPopups = () => {
    if (tableMenu && tableMenu.style) tableMenu.style.display = 'none';
    if (imagePopup && imagePopup.style) {
      imagePopup.style.display = 'none';
      if (imageErrorEl && imageErrorEl.style) imageErrorEl.style.display = 'none';
    }
  };

  const showError = (msg) => {
    if (generalErrorEl) {
      generalErrorEl.textContent = msg;
      if (generalErrorEl.style) generalErrorEl.style.display = 'flex';
      setTimeout(() => {
        if (generalErrorEl && generalErrorEl.style) generalErrorEl.style.display = 'none';
      }, 5000);
    }
  };

  const clearError = () => {
    if (generalErrorEl && generalErrorEl.style) generalErrorEl.style.display = 'none';
    if (imageErrorEl && imageErrorEl.style) imageErrorEl.style.display = 'none';
  };

  const syncToCode = () => {
    if (!visualEl) return;
    const raw = visualEl.innerHTML || '';
    const clean = sanitizeRichContent(raw);
    if (codeEl) codeEl.value = clean;
    if (typeof onChange === 'function') onChange(clean);
  };

  const syncToVisual = () => {
    if (!codeEl) return;
    const raw = codeEl.value || '';
    const clean = sanitizeRichContent(raw);
    if (visualEl) visualEl.innerHTML = clean;
    if (typeof onChange === 'function') onChange(clean);
  };

  const insertHtmlAtCursor = (htmlToInsert) => {
    if (!htmlToInsert) return;

    if (isCodeMode && codeEl) {
      const start = codeEl.selectionStart || codeEl.value.length;
      const end = codeEl.selectionEnd || codeEl.value.length;
      codeEl.value = codeEl.value.substring(0, start) + htmlToInsert + codeEl.value.substring(end);
      syncToVisual();
      return;
    }

    if (visualEl) {
      visualEl.focus?.();
      let range = savedRange;
      if (!range || (visualEl.contains && !visualEl.contains(range.commonAncestorContainer))) {
        if (typeof document !== 'undefined' && document.createRange) {
          range = document.createRange();
          range.selectNodeContents(visualEl);
          range.collapse(false);
        }
      }

      if (range && range.createContextualFragment) {
        range.deleteContents?.();
        const fragment = range.createContextualFragment(htmlToInsert);
        const lastNode = fragment.lastChild;
        range.insertNode?.(fragment);
        if (lastNode && range.setStartAfter) {
          range.setStartAfter(lastNode);
          range.collapse?.(true);
        }
        if (typeof window !== 'undefined' && window.getSelection) {
          const sel = window.getSelection();
          sel.removeAllRanges?.();
          sel.addRange?.(range);
          savedRange = range.cloneRange ? range.cloneRange() : range;
        }
      } else {
        visualEl.innerHTML += htmlToInsert;
      }
      syncToCode();
    }
  };

  let isCodeMode = false;

  if (toggleBtn) {
    toggleBtn.addEventListener?.('click', () => {
      isCodeMode = !isCodeMode;
      closeAllPopups();
      if (isCodeMode) {
        syncToCode();
        if (visualEl && visualEl.style) visualEl.style.display = 'none';
        if (codeEl && codeEl.style) codeEl.style.display = 'block';
        toggleBtn.classList?.add?.('active');
        toggleBtn.textContent = 'Trực quan';
      } else {
        syncToVisual();
        if (codeEl && codeEl.style) codeEl.style.display = 'none';
        if (visualEl && visualEl.style) visualEl.style.display = 'block';
        toggleBtn.classList?.remove?.('active');
        toggleBtn.textContent = '</> Mã HTML';
      }
    });
  }

  if (visualEl && visualEl.addEventListener) {
    visualEl.addEventListener('keyup', saveSelection);
    visualEl.addEventListener('mouseup', saveSelection);
    visualEl.addEventListener('input', syncToCode);
    visualEl.addEventListener('blur', syncToCode);

    // Advanced paste handler with DOMParser
    visualEl.addEventListener('paste', (event) => {
      const cd = event.clipboardData;
      if (!cd) return;

      const html = cd.getData?.('text/html');
      if (html && typeof DOMParser !== 'undefined') {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const embeddedImages = Array.from(parsed.body.querySelectorAll('img')).filter(
          img => !/^https:/i.test(img.getAttribute('src') || '')
        );
        const hasImageFile = Array.from(cd.files || []).some(
          file => file.type && file.type.startsWith('image/')
        );

        if (embeddedImages.length || hasImageFile) {
          event.preventDefault?.();
          saveSelection();
          embeddedImages.forEach(img => img.remove());
          if (html) {
            insertHtmlAtCursor(parsed.body.innerHTML);
          } else {
            insertHtmlAtCursor(escapeHtml(cd.getData?.('text/plain') || ''));
          }
          showError('Hãy tải ảnh lên Google Drive rồi dùng nút “Chèn ảnh”.');
          return;
        }
      }

      if (cd.items) {
        for (let i = 0; i < cd.items.length; i++) {
          if (cd.items[i].type && cd.items[i].type.indexOf('image') !== -1) {
            event.preventDefault?.();
            showError('Hệ thống không hỗ trợ dán ảnh trực tiếp base64. Vui lòng dùng Google Drive.');
            return;
          }
        }
      }
    });

    visualEl.addEventListener('drop', (event) => {
      const hasImage = Array.from(event.dataTransfer?.files || []).some(
        file => file.type && file.type.startsWith('image/')
      );
      if (hasImage) {
        event.preventDefault?.();
        showError('Hãy dùng nút “Chèn ảnh” để nhập link ảnh.');
      }
    });
  }

  if (codeEl && codeEl.addEventListener) {
    codeEl.addEventListener('input', syncToVisual);
    codeEl.addEventListener('change', syncToVisual);
  }

  if (tableBtn && tableMenu) {
    tableBtn.addEventListener?.('mousedown', saveSelection);
    tableBtn.addEventListener?.('click', (e) => {
      e.stopPropagation?.();
      saveSelection();
      const isVisible = tableMenu.style?.display !== 'none';
      closeAllPopups();
      if (tableMenu.style) tableMenu.style.display = isVisible ? 'none' : 'grid';
    });

    const gridBtns = tableMenu.querySelectorAll?.('.btn-table-grid') || [];
    gridBtns.forEach?.(btn => {
      btn.addEventListener?.('click', (e) => {
        e.stopPropagation?.();
        const r = Number(btn.getAttribute('data-rows')) || 2;
        const c = Number(btn.getAttribute('data-cols')) || 2;
        closeAllPopups();
        const tblHtml = generateTableHtml(r, c) + '<p><br></p>';
        insertHtmlAtCursor(tblHtml);
      });
    });

    const presetBtns = tableMenu.querySelectorAll?.('.btn-table-preset') || [];
    presetBtns.forEach?.(btn => {
      btn.addEventListener?.('click', (e) => {
        e.stopPropagation?.();
        const preset = btn.getAttribute('data-preset');
        closeAllPopups();
        const tblHtml = generateTableHtml(null, null, preset) + '<p><br></p>';
        insertHtmlAtCursor(tblHtml);
      });
    });
  }

  if (imageBtn && imagePopup) {
    imageBtn.addEventListener?.('mousedown', saveSelection);
    imageBtn.addEventListener?.('click', (e) => {
      e.stopPropagation?.();
      saveSelection();
      const isVisible = imagePopup.style?.display !== 'none';
      closeAllPopups();
      if (imagePopup.style) {
        imagePopup.style.display = isVisible ? 'none' : 'grid';
        if (!isVisible && imageLinkInput) {
          imageLinkInput.value = '';
          clearError();
          setTimeout(() => imageLinkInput.focus?.(), 50);
        }
      }
    });

    const executeInsertImage = () => {
      const urlVal = imageLinkInput?.value?.trim() || '';
      if (!urlVal) {
        if (imageErrorEl) {
          imageErrorEl.textContent = 'Vui lòng nhập đường dẫn ảnh.';
          if (imageErrorEl.style) imageErrorEl.style.display = 'block';
        }
        return;
      }
      const converted = convertGoogleDriveImageUrl(urlVal);
      if (!validateImageUrl(converted)) {
        if (imageErrorEl) {
          imageErrorEl.textContent = 'Link không hợp lệ. Hãy dùng link HTTPS hoặc Google Drive.';
          if (imageErrorEl.style) imageErrorEl.style.display = 'block';
        }
        return;
      }
      const imgTag = `<img src="${escapeHtml(converted)}" alt="" />`;
      insertHtmlAtCursor(imgTag);
      closeAllPopups();
    };

    confirmImageBtn?.addEventListener?.('click', (e) => {
      e.stopPropagation?.();
      executeInsertImage();
    });

    imageLinkInput?.addEventListener?.('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault?.();
        executeInsertImage();
      }
    });
  }

  if (blankBtn && typeof onInsertBlankToken === 'function') {
    blankBtn.addEventListener?.('mousedown', saveSelection);
    blankBtn.addEventListener?.('click', () => {
      saveSelection();
      onInsertBlankToken(insertHtmlAtCursor);
    });
  }

  // Formatting commands execution
  const executeFormatCommand = (command, value = null) => {
    closeAllPopups();

    if (isCodeMode && codeEl) {
      const start = codeEl.selectionStart || 0;
      const end = codeEl.selectionEnd || 0;
      const selected = codeEl.value.substring(start, end);
      let replacement = selected;

      if (command === 'bold') replacement = `<strong>${selected}</strong>`;
      else if (command === 'italic') replacement = `<em>${selected}</em>`;
      else if (command === 'underline') replacement = `<u>${selected}</u>`;
      else if (command === 'strikeThrough') replacement = `<s>${selected}</s>`;
      else if (command === 'insertUnorderedList') replacement = `\n<ul>\n  <li>${selected || 'Mục danh sách'}</li>\n</ul>\n`;
      else if (command === 'insertOrderedList') replacement = `\n<ol>\n  <li>${selected || 'Mục danh sách'}</li>\n</ol>\n`;
      else if (command === 'formatBlock' && value) replacement = `\n<${value}>${selected}</${value}>\n`;
      else if (command === 'justifyLeft') replacement = `<div style="text-align: left;">${selected}</div>`;
      else if (command === 'justifyCenter') replacement = `<div style="text-align: center;">${selected}</div>`;
      else if (command === 'justifyRight') replacement = `<div style="text-align: right;">${selected}</div>`;
      else if (command === 'removeFormat') replacement = selected.replace(/<[^>]+>/g, '');

      codeEl.value = codeEl.value.substring(0, start) + replacement + codeEl.value.substring(end);
      syncToVisual();
      return;
    }

    if (visualEl) {
      visualEl.focus?.();
      if (typeof document !== 'undefined' && document.execCommand) {
        document.execCommand(command, false, value);
      }
      saveSelection();
      syncToCode();
    }
  };

  const bindFormatButton = (btn, command, value = null) => {
    if (!btn || typeof btn.addEventListener !== 'function') return;
    btn.addEventListener('mousedown', (e) => {
      e?.preventDefault?.();
    });
    btn.addEventListener('click', (e) => {
      e?.preventDefault?.();
      executeFormatCommand(command, value);
    });
  };

  bindFormatButton(boldBtn, 'bold');
  bindFormatButton(italicBtn, 'italic');
  bindFormatButton(underlineBtn, 'underline');
  bindFormatButton(strikeBtn, 'strikeThrough');
  bindFormatButton(ulBtn, 'insertUnorderedList');
  bindFormatButton(olBtn, 'insertOrderedList');
  bindFormatButton(alignLeftBtn, 'justifyLeft');
  bindFormatButton(alignCenterBtn, 'justifyCenter');
  bindFormatButton(alignRightBtn, 'justifyRight');
  bindFormatButton(clearBtn, 'removeFormat');

  if (headingSelect && typeof headingSelect.addEventListener === 'function') {
    headingSelect.addEventListener('mousedown', (e) => {
      saveSelection();
    });
    headingSelect.addEventListener('change', () => {
      const tag = headingSelect.value || 'p';
      executeFormatCommand('formatBlock', tag);
    });
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (e) => {
      if (!container.contains?.(e.target)) {
        closeAllPopups();
      }
    });
  }

  return {
    getValue: () => (isCodeMode && codeEl ? sanitizeRichContent(codeEl.value) : sanitizeRichContent(visualEl?.innerHTML || '')),
    setValue: (val) => {
      const clean = sanitizeRichContent(val || '');
      if (visualEl) visualEl.innerHTML = clean;
      if (codeEl) codeEl.value = clean;
    },
    insertHtml: insertHtmlAtCursor
  };
}
