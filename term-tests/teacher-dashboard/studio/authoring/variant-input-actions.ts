// NGUỒN: file .ts này; variant-input-actions.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { parseClozeBlanks } from '../draft-model.js';
import type { BinderBase } from '../draft-model.js';

export function bindVariantInputActions({ container, draftState, markAsDirty, render, syncInputs }: BinderBase) {
    // Add manual variant input
    const addVariantInputs = container.querySelectorAll<HTMLInputElement>('.input-add-variant');
    addVariantInputs.forEach(input => {
      input.addEventListener('keydown', (ev) => {
        const e = ev as KeyboardEvent;
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const blankNum = input.getAttribute('data-blank-num');
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;

          if (blankNum && item.layoutType === 'inline_cloze') {
            item.clozeAnswers = item.clozeAnswers || {};
            item.clozeAnswers[blankNum] = item.clozeAnswers[blankNum] || { accepted: [] };
            if (!item.clozeAnswers[blankNum].accepted.includes(val)) {
              item.clozeAnswers[blankNum].accepted.push(val);
              if (item.clozeAnswers[blankNum].accepted.length > 40) item.clozeAnswers[blankNum].accepted.pop();
            }
            const detected = parseClozeBlanks(item.prompt || '');
            const firstNum = detected.length ? detected[0].number : (item.position || 1);
            if (Number(blankNum) === firstNum) {
              const currentKey = draftState.gradingKey!.items![item.itemVersionId!] || {
                graderType: 'accepted_text',
                accepted: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
              if (!currentKey.accepted.includes(val)) {
                currentKey.accepted.push(val);
                if (currentKey.accepted.length > 40) currentKey.accepted.pop();
                draftState.gradingKey!.items![item.itemVersionId!] = currentKey;
              }
            }
            markAsDirty();
            render();
            return;
          }

          const currentKey = draftState.gradingKey!.items![item.itemVersionId!] || {
            graderType: 'accepted_text',
            accepted: [],
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
          if (!currentKey.accepted.includes(val)) {
            currentKey.accepted.push(val);
            if (currentKey.accepted.length > 40) currentKey.accepted.pop();
            draftState.gradingKey!.items![item.itemVersionId!] = currentKey;
            markAsDirty();
            render();
          }
        }
      });
    });
}
