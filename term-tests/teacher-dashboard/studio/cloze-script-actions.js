// NGUỒN: file .ts này; cloze-script-actions.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { findPrecedingClozeScript } from './draft-model.js';
export function bindClozeScriptActions({ container, draftState, markAsDirty, render, syncInputs }) {
    // Pull Cloze Script for Exercise handler
    const pullExScriptBtns = container.querySelectorAll('.btn-pull-exercise-cloze-script');
    pullExScriptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const exIdx = Number(btn.getAttribute('data-exercise-idx'));
            const ex = draftState.blocks[bIdx]?.exercises?.[exIdx];
            if (!ex)
                return;
            const script = findPrecedingClozeScript(draftState, bIdx);
            if (script) {
                ex.referenceContext = script;
                markAsDirty();
                render();
            }
            else {
                alert('Không tìm thấy bài điền từ nội tuyến hoặc đoạn văn nào ở các phần phía trước.');
            }
        });
    });
    // Pull Cloze Script handler
    const pullScriptBtns = container.querySelectorAll('.btn-pull-cloze-script');
    pullScriptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            let extractedScript = '';
            for (let b = bIdx; b >= 0; b--) {
                const block = draftState.blocks[b];
                if (!block)
                    continue;
                const clozeItem = (block.items || []).find(it => it.layoutType === 'inline_cloze' ||
                    it.pedagogicalTypeCode === 'inline_cloze' ||
                    it.pedagogicalTypeCode === 'table_completion' ||
                    /(?:\(\d+\)\s*[_\.\u2026]{2,})|(?:\{\{\d+\}\})/i.test(it.prompt || ''));
                if (clozeItem && clozeItem.prompt) {
                    extractedScript = clozeItem.prompt
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/(?:\(\d+\)\s*[_\.\u2026]{2,})|(?:\{\{\d+\}\})/g, '...')
                        .replace(/\s+/g, ' ')
                        .trim();
                    break;
                }
                if (block.readingPassage || block.stimulusReadingPassage) {
                    extractedScript = (block.readingPassage || block.stimulusReadingPassage).trim();
                    break;
                }
            }
            if (extractedScript) {
                item.referenceContext = extractedScript;
                markAsDirty();
                render();
            }
            else {
                alert('Không tìm thấy bài điền từ nội tuyến hoặc đoạn văn nào ở các phần phía trước.');
            }
        });
    });
}
