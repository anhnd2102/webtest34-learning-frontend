import { escapeHtml } from '../ui/presentation.js';
import { sanitizeRichContent, renderInlineClozeMarkup, generateTableHtml } from '../ui/rich-content.js';
import { convertGoogleDriveImageUrl, validateImageUrl } from './media.js';
export function bindRichEditorControls({ container, draftState, markAsDirty, isBuilderDisposed, addCleanup, render }) {
    // Rich HTML Editor interactive controls in builder item cards
    const richWraps = container.querySelectorAll('.rich-html-editor-wrap');
    if (richWraps && typeof richWraps.forEach === 'function') {
        richWraps.forEach(wrap => {
            const visualEl = wrap.querySelector ? wrap.querySelector('.rich-editor-visual') : null;
            const codeEl = wrap.querySelector ? wrap.querySelector('.rich-editor-code, textarea') : null;
            const toggleBtn = wrap.querySelector ? wrap.querySelector('.btn-toggle-html-mode') : null;
            const tableBtn = wrap.querySelector ? wrap.querySelector('.btn-rich-insert-table') : null;
            const tableMenu = wrap.querySelector ? wrap.querySelector('.table-presets-menu') : null;
            const imageBtn = wrap.querySelector ? wrap.querySelector('.btn-rich-insert-image') : null;
            const imagePopup = wrap.querySelector ? wrap.querySelector('.image-insert-popup') : null;
            const imageLinkInput = wrap.querySelector ? wrap.querySelector('.input-image-link') : null;
            const confirmImageBtn = wrap.querySelector ? wrap.querySelector('.btn-confirm-insert-image') : null;
            const imageErrorEl = wrap.querySelector ? wrap.querySelector('.popup-image-error') : null;
            const generalErrorEl = wrap.querySelector ? wrap.querySelector('.general-editor-error') : null;
            let savedRange = null;
            const saveSelection = () => {
                if (typeof window !== 'undefined' && window.getSelection) {
                    const sel = window.getSelection();
                    if (!visualEl || !sel?.rangeCount)
                        return;
                    const range = sel.getRangeAt(0);
                    if (visualEl.contains && visualEl.contains(range.commonAncestorContainer)) {
                        savedRange = range.cloneRange();
                    }
                }
            };
            const closeAllPopups = () => {
                if (tableMenu)
                    tableMenu.hidden = true;
                if (imagePopup) {
                    imagePopup.hidden = true;
                    if (imageErrorEl)
                        imageErrorEl.hidden = true;
                }
            };
            const showError = (msg) => {
                if (generalErrorEl) {
                    generalErrorEl.textContent = msg;
                    if (generalErrorEl)
                        generalErrorEl.hidden = false;
                    setTimeout(() => {
                        if (generalErrorEl)
                            generalErrorEl.hidden = true;
                    }, 5000);
                }
            };
            const clearError = () => {
                if (generalErrorEl)
                    generalErrorEl.hidden = true;
                if (imageErrorEl)
                    imageErrorEl.hidden = true;
            };
            const syncToCode = () => {
                if (!visualEl || !codeEl)
                    return;
                const clean = sanitizeRichContent(visualEl.innerHTML || '');
                codeEl.value = clean;
                markAsDirty();
                // Real-time sync to draftState and live preview
                const bIdx = wrap.getAttribute ? wrap.getAttribute('data-block-idx') : null;
                const iIdx = wrap.getAttribute ? wrap.getAttribute('data-item-idx') : null;
                if (bIdx !== null && iIdx !== null) {
                    const blockIndex = Number(bIdx);
                    const itemIndex = Number(iIdx);
                    const item = draftState.blocks?.[blockIndex]?.items?.[itemIndex];
                    if (item) {
                        item.prompt = clean;
                        const itemCard = (typeof wrap.closest === 'function') ? wrap.closest('.builder-item-card') : (wrap.parentElement || null);
                        const previewEl = itemCard?.querySelector ? itemCard.querySelector('.cloze-preview-content') : null;
                        if (previewEl) {
                            previewEl.innerHTML = renderInlineClozeMarkup(clean, [item], {}, { disabled: true }) || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>';
                        }
                        const charCountEl = wrap.querySelector ? wrap.querySelector('.prompt-char-count') : null;
                        if (charCountEl) {
                            charCountEl.textContent = `${clean.length} ký tự`;
                        }
                    }
                }
            };
            const syncToVisual = () => {
                if (!visualEl || !codeEl)
                    return;
                const clean = sanitizeRichContent(codeEl.value || '');
                visualEl.innerHTML = clean;
                markAsDirty();
                const bIdx = wrap.getAttribute ? wrap.getAttribute('data-block-idx') : null;
                const iIdx = wrap.getAttribute ? wrap.getAttribute('data-item-idx') : null;
                if (bIdx !== null && iIdx !== null) {
                    const blockIndex = Number(bIdx);
                    const itemIndex = Number(iIdx);
                    const item = draftState.blocks?.[blockIndex]?.items?.[itemIndex];
                    if (item) {
                        item.prompt = clean;
                        const itemCard = (typeof wrap.closest === 'function') ? wrap.closest('.builder-item-card') : (wrap.parentElement || null);
                        const previewEl = itemCard?.querySelector ? itemCard.querySelector('.cloze-preview-content') : null;
                        if (previewEl) {
                            previewEl.innerHTML = renderInlineClozeMarkup(clean, [item], {}, { disabled: true }) || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>';
                        }
                    }
                }
            };
            const insertHtmlAtCursor = (htmlToInsert) => {
                if (!htmlToInsert)
                    return;
                const isCodeVisible = Boolean(codeEl) && !codeEl.hidden;
                if (isCodeVisible) {
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
                    }
                    else {
                        visualEl.innerHTML += htmlToInsert;
                    }
                    syncToCode();
                }
            };
            if (toggleBtn && visualEl && codeEl && toggleBtn.addEventListener) {
                toggleBtn.addEventListener('click', () => {
                    closeAllPopups();
                    const isCurrentlyVisual = !visualEl.hidden;
                    if (isCurrentlyVisual) {
                        syncToCode();
                        if (visualEl)
                            visualEl.hidden = true;
                        if (codeEl)
                            codeEl.hidden = false;
                        toggleBtn.classList?.add?.('active');
                        toggleBtn.textContent = 'Trực quan';
                    }
                    else {
                        syncToVisual();
                        if (codeEl)
                            codeEl.hidden = true;
                        if (visualEl)
                            visualEl.hidden = false;
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
                    if (!cd)
                        return;
                    const html = cd.getData?.('text/html');
                    if (html && typeof DOMParser !== 'undefined') {
                        const parsed = new DOMParser().parseFromString(html, 'text/html');
                        const embeddedImages = Array.from(parsed.body.querySelectorAll('img')).filter(img => !/^https:/i.test(img.getAttribute('src') || ''));
                        const hasImageFile = Array.from(cd.files || []).some(file => file.type && file.type.startsWith('image/'));
                        if (embeddedImages.length || hasImageFile) {
                            event.preventDefault?.();
                            saveSelection();
                            embeddedImages.forEach(img => img.remove());
                            if (html) {
                                insertHtmlAtCursor(parsed.body.innerHTML);
                            }
                            else {
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
                    const hasImage = Array.from(event.dataTransfer?.files || []).some(file => file.type && file.type.startsWith('image/'));
                    if (hasImage) {
                        event.preventDefault?.();
                        showError('Hãy dùng nút “Chèn ảnh” để nhập link ảnh.');
                    }
                });
            }
            if (codeEl && codeEl.addEventListener) {
                codeEl.addEventListener('input', syncToVisual);
            }
            // Heading format dropdown
            const headingSelect = wrap.querySelector ? wrap.querySelector('.select-format-heading') : null;
            if (headingSelect && headingSelect.addEventListener) {
                headingSelect.addEventListener('change', () => {
                    const tag = headingSelect.value;
                    visualEl?.focus?.();
                    if (typeof document !== 'undefined' && document.execCommand) {
                        document.execCommand('formatBlock', false, tag === 'p' ? '<p>' : `<${tag}>`);
                    }
                    syncToCode();
                });
            }
            // Formatting action buttons (Bold, Italic, Underline, Strikethrough, Lists, Alignment, Clear)
            const formatBtnConfigs = [
                { sel: '.btn-format-bold', cmd: 'bold' },
                { sel: '.btn-format-italic', cmd: 'italic' },
                { sel: '.btn-format-underline', cmd: 'underline' },
                { sel: '.btn-format-strike', cmd: 'strikeThrough' },
                { sel: '.btn-format-ul', cmd: 'insertUnorderedList' },
                { sel: '.btn-format-ol', cmd: 'insertOrderedList' },
                { sel: '.btn-format-align-left', cmd: 'justifyLeft' },
                { sel: '.btn-format-align-center', cmd: 'justifyCenter' },
                { sel: '.btn-format-align-right', cmd: 'justifyRight' },
                { sel: '.btn-format-clear', cmd: 'removeFormat' }
            ];
            formatBtnConfigs.forEach(({ sel, cmd }) => {
                const btn = wrap.querySelector ? wrap.querySelector(sel) : null;
                if (btn && btn.addEventListener) {
                    btn.addEventListener('mousedown', (e) => {
                        e.preventDefault?.(); // Prevent loss of selection
                    });
                    btn.addEventListener('click', (e) => {
                        e.preventDefault?.();
                        visualEl?.focus?.();
                        if (typeof document !== 'undefined' && document.execCommand) {
                            document.execCommand(cmd, false, null);
                        }
                        syncToCode();
                    });
                }
            });
            if (tableBtn && tableMenu && tableBtn.addEventListener) {
                tableBtn.addEventListener?.('mousedown', saveSelection);
                tableBtn.addEventListener('click', (e) => {
                    e.stopPropagation?.();
                    saveSelection();
                    const isVisible = !tableMenu.hidden;
                    closeAllPopups();
                    if (tableMenu)
                        tableMenu.hidden = isVisible;
                });
                const gridBtns = tableMenu.querySelectorAll?.('.btn-table-grid') || [];
                if (gridBtns.forEach) {
                    gridBtns.forEach(btn => {
                        btn.addEventListener?.('click', (e) => {
                            e.stopPropagation?.();
                            const r = Number(btn.getAttribute('data-rows')) || 2;
                            const c = Number(btn.getAttribute('data-cols')) || 2;
                            closeAllPopups();
                            const tblHtml = generateTableHtml(r, c) + '<p><br></p>';
                            insertHtmlAtCursor(tblHtml);
                        });
                    });
                }
                const presetBtns = tableMenu.querySelectorAll?.('.btn-table-preset') || [];
                if (presetBtns.forEach) {
                    presetBtns.forEach(btn => {
                        btn.addEventListener?.('click', (e) => {
                            e.stopPropagation?.();
                            const preset = btn.getAttribute('data-preset');
                            closeAllPopups();
                            const tblHtml = generateTableHtml(null, null, preset) + '<p><br></p>';
                            insertHtmlAtCursor(tblHtml);
                        });
                    });
                }
            }
            if (imageBtn && imagePopup) {
                imageBtn.addEventListener?.('mousedown', saveSelection);
                imageBtn.addEventListener('click', (e) => {
                    e.stopPropagation?.();
                    saveSelection();
                    const isVisible = !imagePopup.hidden;
                    closeAllPopups();
                    if (imagePopup) {
                        imagePopup.hidden = isVisible;
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
                            if (imageErrorEl)
                                imageErrorEl.hidden = false;
                        }
                        return;
                    }
                    const converted = convertGoogleDriveImageUrl(urlVal);
                    if (!validateImageUrl(converted)) {
                        if (imageErrorEl) {
                            imageErrorEl.textContent = 'Link không hợp lệ. Hãy dùng link HTTPS hoặc Google Drive.';
                            if (imageErrorEl)
                                imageErrorEl.hidden = false;
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
        });
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        const onDocClick = (e) => {
            if (isBuilderDisposed())
                return;
            const openMenus = container.querySelectorAll ? container.querySelectorAll('.table-presets-menu, .image-insert-popup') : [];
            if (openMenus.forEach) {
                openMenus.forEach(m => {
                    if (!e.target || !m.contains?.(e.target)) {
                        if (m)
                            m.hidden = true;
                    }
                });
            }
        };
        document.addEventListener('click', onDocClick);
        addCleanup(() => {
            document.removeEventListener?.('click', onDocClick);
        });
    }
}
