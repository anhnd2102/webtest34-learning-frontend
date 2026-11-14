// NGUỒN: file .ts này; vocabulary-actions.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { BinderBase } from '../draft-model.js';
import { expandSentenceVariants } from '../question-content.js';

export function bindVocabularyActions({ container, draftState, markAsDirty, render, syncInputs, options }: BinderBase & { options?: any }) {
    // Generate variants button for Vocab Pair
    const genVocabVariantBtns = container.querySelectorAll<HTMLElement>('.btn-generate-vocab-variants');
    genVocabVariantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const rawInput = card?.querySelector<HTMLInputElement>('.input-vocab-raw');
        const rawVal = rawInput?.value?.trim() || '';
        if (!rawVal) {
          alert('Vui lòng nhập từ tiếng Anh chuẩn trước khi sinh biến thể.');
          return;
        }
        const generated = expandSentenceVariants([rawVal]);
        const currentExpected = draftState.gradingKey.items[item.itemVersionId!]?.expectedOptionId || item.options?.[0]?.id || 'opt_1';
        const prevAccepted = Array.isArray(draftState.gradingKey.items[item.itemVersionId!]?.accepted)
          ? draftState.gradingKey.items[item.itemVersionId!].accepted
          : [];
        const merged = Array.from(new Set([...prevAccepted, ...generated]));
        draftState.gradingKey.items[item.itemVersionId!] = {
          graderType: 'accepted_text_exact_option',
          accepted: merged,
          expectedOptionId: currentExpected,
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        markAsDirty();
        render();
      });
    });

    // Add manual variant input for Vocab Pair
    const addVocabVariantInputs = container.querySelectorAll<HTMLInputElement>('.input-add-vocab-variant');
    addVocabVariantInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;
          const currentExpected = draftState.gradingKey.items[item.itemVersionId!]?.expectedOptionId || item.options?.[0]?.id || 'opt_1';
          const currentKey = draftState.gradingKey.items[item.itemVersionId!] || {
            graderType: 'accepted_text_exact_option',
            accepted: [],
            expectedOptionId: currentExpected,
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
          if (!currentKey.accepted.includes(val)) {
            currentKey.accepted.push(val);
            if (currentKey.accepted.length > 40) currentKey.accepted.pop();
            draftState.gradingKey.items[item.itemVersionId!] = currentKey;
            markAsDirty();
            render();
          }
        }
      });
    });

    // Add Option to Vocab Pair
    const addVocabOptBtns = container.querySelectorAll<HTMLElement>('.btn-add-vocab-option');
    addVocabOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const nextNum = (item.options?.length || 0) + 1;
        const nextId = `opt_${nextNum}`;
        item.options = item.options || [];
        item.options.push({ id: nextId, label: `Nghĩa phương án ${nextNum}` });
        markAsDirty();
        render();
      });
    });

    // Delete Option from Vocab Pair
    const delVocabOptBtns = container.querySelectorAll<HTMLElement>('.btn-del-vocab-option');
    delVocabOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const optId = btn.getAttribute('data-option-id');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item && item.options && item.options.length > 2) {
          item.options = item.options.filter((o: any) => o.id !== optId);
          // if deleted expected option, fallback to first option
          const currentExpected = draftState.gradingKey.items[item.itemVersionId!]?.expectedOptionId;
          if (currentExpected === optId) {
            draftState.gradingKey.items[item.itemVersionId!].expectedOptionId = item.options[0]?.id || 'opt_1';
          }
          markAsDirty();
          render();
        } else {
          alert('Một câu hỏi cặp từ vựng phải có ít nhất 2 nghĩa để lựa chọn.');
        }
      });
    });

    // Toggle Bulk Paste Panel for Vocab Options
    const toggleBulkVocabBtns = container.querySelectorAll<HTMLElement>('.btn-bulk-paste-vocab-options');
    toggleBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const bIdx = btn.getAttribute('data-block-idx');
        const iIdx = btn.getAttribute('data-item-idx');
        const panel = container.querySelector<HTMLElement>(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        if (panel) {
          const isHidden = panel.hidden;
          panel.hidden = !isHidden;
          if (isHidden) {
            const ta = panel.querySelector<HTMLElement>('.input-bulk-vocab-options');
            if (ta) ta.focus();
          }
        }
      });
    });

    // Cancel Bulk Paste Panel
    const cancelBulkVocabBtns = container.querySelectorAll<HTMLElement>('.btn-cancel-bulk-vocab-options');
    cancelBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const bIdx = btn.getAttribute('data-block-idx');
        const iIdx = btn.getAttribute('data-item-idx');
        const panel = container.querySelector<HTMLElement>(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        if (panel) panel.hidden = true;
      });
    });

    // Apply Bulk Paste Vocab Options
    const applyBulkVocabBtns = container.querySelectorAll<HTMLElement>('.btn-apply-bulk-vocab-options');
    applyBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const panel = container.querySelector<HTMLElement>(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        const ta = panel?.querySelector<HTMLInputElement>('.input-bulk-vocab-options');
        const rawText = ta ? ta.value : '';
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          item.options = lines.map((lbl, idx) => ({
            id: `opt_${idx + 1}`,
            label: lbl
          }));
          const currentExpected = draftState.gradingKey.items[item.itemVersionId!]?.expectedOptionId;
          if (!item.options.some((o: any) => o.id === currentExpected)) {
            draftState.gradingKey.items[item.itemVersionId!].expectedOptionId = item.options[0].id;
          }
          markAsDirty();
          render();
        } else {
          alert('Vui lòng nhập hoặc dán ít nhất 2 nghĩa tiếng Việt (mỗi dòng một nghĩa).');
        }
      });
    });

    // Copy Options from Preceding Vocab Pair Item
    const copyPrevVocabBtns = container.querySelectorAll<HTMLElement>('.btn-copy-prev-vocab-options');
    copyPrevVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;

        let prevItem = null;
        for (let p = iIdx - 1; p >= 0; p--) {
          const candidate = draftState.blocks[bIdx]?.items?.[p];
          if (candidate && candidate.interactionType === 'text_select_pair' && candidate.options && candidate.options.length >= 2) {
            prevItem = candidate;
            break;
          }
        }

        if (prevItem) {
          item.options = prevItem.options.map((o: any) => ({ id: o.id, label: o.label }));
          const currentExpected = draftState.gradingKey.items[item.itemVersionId!]?.expectedOptionId;
          if (!item.options.some((o: any) => o.id === currentExpected)) {
            draftState.gradingKey.items[item.itemVersionId!].expectedOptionId = item.options[0].id;
          }
          markAsDirty();
          render();
        } else {
          alert('Không tìm thấy câu hỏi cặp từ vựng nào trước câu này để sao chép.');
        }
      });
    });

    // Sync Vocab Options across the whole Block
    const syncVocabToBlockBtns = container.querySelectorAll<HTMLElement>('.btn-sync-vocab-options-to-block');
    syncVocabToBlockBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const sourceItem = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!sourceItem || !sourceItem.options || sourceItem.options.length < 2) return;

        const block = draftState.blocks[bIdx];
        (block.items || []).forEach(it => {
          if (it.interactionType === 'text_select_pair' && it.itemVersionId !== sourceItem.itemVersionId) {
            it.options = sourceItem.options.map((o: any) => ({ id: o.id, label: o.label }));
            const itKey = draftState.gradingKey.items[it.itemVersionId!];
            if (itKey && !it.options.some((o: any) => o.id === itKey.expectedOptionId)) {
              itKey.expectedOptionId = it.options[0].id;
            }
          }
        });

        markAsDirty();
        render();
      });
    });

    // Toggle Vocab Meaning Bank Collapsible
    const toggleVocabBankBtns = container.querySelectorAll<HTMLElement>('.btn-toggle-vocab-bank');
    toggleVocabBankBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const targetEl = container.querySelector<HTMLElement>('#' + targetId);
        if (targetEl) {
          const isHidden = targetEl.hidden;
          targetEl.hidden = !isHidden;
          btn.textContent = isHidden ? btn.textContent.replace('▼', '▲') : btn.textContent.replace('▲', '▼');
        }
      });
    });

    // Select Vocab Correct Dropdown change
    const selectVocabDropdowns = container.querySelectorAll<HTMLInputElement>('.select-vocab-correct-dropdown');
    selectVocabDropdowns.forEach(sel => {
      sel.addEventListener('change', () => {
        const bIdx = Number(sel.getAttribute('data-block-idx'));
        const iIdx = Number(sel.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item) {
          if (!draftState.gradingKey.items[item.itemVersionId!]) {
            draftState.gradingKey.items[item.itemVersionId!] = {
              graderType: 'accepted_text_exact_option',
              accepted: [item.prompt || 'word'],
              expectedOptionId: sel.value,
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
          } else {
            draftState.gradingKey.items[item.itemVersionId!].expectedOptionId = sel.value;
          }
          markAsDirty();

          // Also synchronize radio button and highlight state in bank
          const itemCard = sel.closest('.item-card');
          if (itemCard) {
            const allRadios = itemCard.querySelectorAll<HTMLInputElement>('.radio-vocab-correct');
            allRadios.forEach(r => {
              r.checked = (r.value === sel.value);
            });
            const allRows = itemCard.querySelectorAll<HTMLElement>('.vocab-meaning-row');
            allRows.forEach(r => {
              if (r.getAttribute('data-option-id') === sel.value) {
                r.classList.add('is-correct');
              } else {
                r.classList.remove('is-correct');
              }
            });
          }
        }
      });
    });

    // Radio Vocab Correct change syncs back to dropdown
    const vocabRadios = container.querySelectorAll<HTMLInputElement>('.radio-vocab-correct');
    vocabRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const itemCard = radio.closest('.item-card');
        if (itemCard) {
          const sel = itemCard.querySelector<HTMLInputElement>('.select-vocab-correct-dropdown');
          if (sel) sel.value = radio.value;
          const allRows = itemCard.querySelectorAll<HTMLElement>('.vocab-meaning-row');
          allRows.forEach(r => {
            if (r.getAttribute('data-option-id') === radio.value) {
              r.classList.add('is-correct');
            } else {
              r.classList.remove('is-correct');
            }
          });
        }
      });
    });
}
