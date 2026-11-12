import { parseClozeBlanks } from '../draft-model.js';

export function bindVariantInputActions({ container, draftState, render, syncInputs }) {
    // Add manual variant input
    const addVariantInputs = container.querySelectorAll('.input-add-variant');
    addVariantInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
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
              const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'accepted_text',
                accepted: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
              if (!currentKey.accepted.includes(val)) {
                currentKey.accepted.push(val);
                if (currentKey.accepted.length > 40) currentKey.accepted.pop();
                draftState.gradingKey.items[item.itemVersionId] = currentKey;
              }
            }
            render();
            return;
          }

          const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
            graderType: 'accepted_text',
            accepted: [],
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
          if (!currentKey.accepted.includes(val)) {
            currentKey.accepted.push(val);
            if (currentKey.accepted.length > 40) currentKey.accepted.pop();
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
          }
        }
      });
    });
}
