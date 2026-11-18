import { parseClozeBlanks } from '../draft-model.js';
import { generateAnswerVariants } from '../answer-variants.js';
import { upgradeNormalization } from '../normalization-policy.js';
import { confirmReplaceVariants, truncationNotice } from '../variant-regeneration.js';
export function bindChoiceVariantActions({ container, draftState, markAsDirty, render, syncInputs }) {
    // Add Option to single/multi choice
    const addOptBtns = container.querySelectorAll('.btn-add-option');
    addOptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const nextId = alphabet[item.options.length] || `OPT${item.options.length + 1}`;
            item.options.push({ id: nextId, label: `Phương án ${nextId}` });
            markAsDirty();
            render();
        });
    });
    // Delete Option
    const delOptBtns = container.querySelectorAll('.btn-del-option');
    delOptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const optId = btn.getAttribute('data-option-id');
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (item && item.options && item.options.length > 2) {
                item.options = item.options.filter((o) => o.id !== optId);
                markAsDirty();
                render();
            }
            else {
                alert('Một câu hỏi lựa chọn phải có ít nhất 2 phương án.');
            }
        });
    });
    // Generate variants button for FITB
    const genVariantBtns = container.querySelectorAll('.btn-generate-variants');
    genVariantBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const blankNum = btn.getAttribute('data-blank-num');
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const card = btn.closest('.builder-item-card');
            const blankCard = btn.closest('.cloze-blank-config-card');
            const rawInput = blankCard ? blankCard.querySelector('.input-cloze-blank-target') : card?.querySelector('.input-fitb-raw');
            const rawVal = rawInput?.value?.trim() || '';
            if (!rawVal) {
                alert('Vui lòng nhập đáp án chuẩn trước khi sinh biến thể.');
                return;
            }
            const regenerated = generateAnswerVariants(rawVal);
            const generated = regenerated.variants.map(variant => variant.text);
            const previousList = blankNum && item.layoutType === 'inline_cloze'
                ? (Array.isArray(item.clozeAnswers?.[blankNum]?.accepted) ? item.clozeAnswers[blankNum].accepted : [])
                : (Array.isArray(draftState.gradingKey.items[item.itemVersionId]?.accepted) ? draftState.gradingKey.items[item.itemVersionId].accepted : []);
            if (!confirmReplaceVariants(previousList, generated))
                return;
            const upgraded = upgradeNormalization(draftState.gradingKey.items[item.itemVersionId]?.normalization);
            if (blankNum && item.layoutType === 'inline_cloze') {
                item.clozeAnswers = item.clozeAnswers || {};
                const merged = generated;
                item.clozeAnswers[blankNum] = {
                    targetWord: rawVal,
                    accepted: merged
                };
                const detected = parseClozeBlanks(item.prompt || '');
                const firstNum = detected.length ? detected[0].number : (item.position || 1);
                if (Number(blankNum) === firstNum) {
                    draftState.gradingKey.items[item.itemVersionId] = {
                        graderType: 'accepted_text',
                        accepted: merged,
                        normalization: upgraded
                    };
                }
                else if (draftState.gradingKey.items[item.itemVersionId]) {
                    draftState.gradingKey.items[item.itemVersionId].normalization = upgraded;
                }
            }
            else {
                draftState.gradingKey.items[item.itemVersionId] = {
                    graderType: 'accepted_text',
                    accepted: generated,
                    normalization: upgraded
                };
            }
            markAsDirty();
            render();
            const notice = truncationNotice(regenerated.truncated);
            if (notice && typeof alert === 'function')
                alert(notice);
        });
    });
    // Remove single variant chip
    const removeChipBtns = container.querySelectorAll('.btn-remove-chip');
    removeChipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const blankNum = btn.getAttribute('data-blank-num');
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            const variantToRemove = btn.getAttribute('data-variant');
            if (!item)
                return;
            if (blankNum && item.layoutType === 'inline_cloze') {
                item.clozeAnswers = item.clozeAnswers || {};
                if (item.clozeAnswers[blankNum] && Array.isArray(item.clozeAnswers[blankNum].accepted)) {
                    item.clozeAnswers[blankNum].accepted = item.clozeAnswers[blankNum].accepted.filter((v) => v !== variantToRemove);
                }
                const detected = parseClozeBlanks(item.prompt || '');
                const firstNum = detected.length ? detected[0].number : (item.position || 1);
                if (Number(blankNum) === firstNum) {
                    const currentKey = draftState.gradingKey.items[item.itemVersionId];
                    if (currentKey && Array.isArray(currentKey.accepted)) {
                        currentKey.accepted = currentKey.accepted.filter(v => v !== variantToRemove);
                    }
                }
                markAsDirty();
                render();
                return;
            }
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            if (currentKey && Array.isArray(currentKey.accepted)) {
                currentKey.accepted = currentKey.accepted.filter(v => v !== variantToRemove);
                if (!currentKey.accepted.length)
                    currentKey.accepted = ['answer'];
                markAsDirty();
                render();
            }
        });
    });
}
