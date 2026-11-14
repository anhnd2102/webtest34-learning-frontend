import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';
import { openGenericBatchModal } from '.././batch-import.js';
import { escapeHtml } from '../../ui/presentation.js';
import { generateErrorCorrectionTemplateCsv, parseErrorCorrectionCsv } from '.././content-import.js';
import { expandSentenceVariants } from '.././question-content.js';
export function bindErrorCorrectionAuthoring({ container, draftState, builderOwner, actions }) {
    const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
    function createBatchErrorCorrection(bIdx, targetEx, count = 1) {
        const block = draftState.blocks[bIdx];
        if (!block)
            return;
        const startingPos = getNextPosition();
        block.items = block.items || [];
        const batchItems = [];
        for (let i = 0; i < count; i++) {
            const currentPos = startingPos + i;
            const newItemId = generateUuid();
            batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: currentPos,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: '',
                helpText: '',
                interactionType: 'correction_pair',
                pedagogicalTypeCode: 'error_correction',
                layoutType: 'default',
                graderType: 'correction_pair',
                required: true,
                maxScore: 1,
                scoringRule: 'split_points',
                options: [],
                skillCodes: ['grammar'],
                releasePolicy: 'inherit'
            });
            draftState.gradingKey.items[newItemId] = {
                graderType: 'correction_pair',
                expectedErrors: [''],
                expectedCorrections: [''],
                scoringRule: 'split_points',
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
        }
        insertItemsIntoBlockExercise(block, targetEx, batchItems);
        resequenceItemPositions();
        markAsDirty();
        render();
    }
    // Add Error Correction Question (Opens CSV / Excel import popup with single item creation option)
    const addErrorCorrectionBtns = container.querySelectorAll('.btn-add-error-correction');
    addErrorCorrectionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            const targetEx = resolveTargetExercise(block, btn);
            openGenericBatchModal({ owner: builderOwner,
                title: 'Nhập câu hỏi Tìm và sửa lỗi vào Exercise (CSV / Excel)',
                subtitle: `Nhập danh sách câu hỏi Tìm và sửa lỗi cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Hỗ trợ nhập từ lỗi và các đáp án sửa đúng phân tách bằng dấu gạch đứng (|).`,
                defaultCount: 8,
                minCount: 1,
                maxCount: 50,
                csvConfig: {
                    templateFileName: 'mau_tim_sua_loi_sai.csv',
                    columnsHint: 'Cột: Đề bài câu | Từ/cụm từ lỗi | Các đáp án sửa đúng (|) | Giải thích',
                    placeholder: 'She do not like swimming in cold weather.,do,does|doesn\'t,Chủ ngữ số ít đi với does\nI have seen him yesterday morning.,have seen,saw,Hành động có mốc thời gian quá khứ',
                    getTemplateCsv: generateErrorCorrectionTemplateCsv,
                    parseCsv: parseErrorCorrectionCsv,
                    renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} [Lỗi: <span style="color:#ef4444;text-decoration:line-through;">${escapeHtml(itm.targetWord)}</span> → <span style="color:#10b981;">${escapeHtml(itm.accepted[0] || '')}</span>]`,
                    onImport: (items) => {
                        const startingPos = getNextPosition();
                        const batchItems = [];
                        items.forEach((parsed, idx) => {
                            const newItemId = generateUuid();
                            const corrs = (parsed.accepted && parsed.accepted.length) ? parsed.accepted : (parsed.expectedCorrections || ['correction']);
                            const errs = parsed.targetWord ? [parsed.targetWord] : (parsed.expectedErrors || ['error']);
                            batchItems.push({
                                itemFamilyId: generateUuid(),
                                itemVersionId: newItemId,
                                position: startingPos + idx,
                                exerciseId: targetEx.exerciseId,
                                exerciseTitle: targetEx.title,
                                prompt: parsed.prompt,
                                helpText: '',
                                interactionType: 'correction_pair',
                                pedagogicalTypeCode: 'error_correction',
                                layoutType: 'correction_inline',
                                graderType: 'correction_pair',
                                required: true,
                                maxScore: 1,
                                targetWord: parsed.targetWord || errs[0],
                                expectedErrors: errs,
                                expectedCorrections: corrs,
                                accepted: corrs,
                                scoringRule: 'split_points',
                                explanation: parsed.explanation || '',
                                skillCodes: ['grammar'],
                                releasePolicy: 'inherit'
                            });
                            draftState.gradingKey.items[newItemId] = {
                                graderType: 'correction_pair',
                                expectedErrors: errs,
                                expectedCorrections: corrs,
                                accepted: corrs,
                                scoringRule: 'split_points',
                                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                            };
                        });
                        insertItemsIntoBlockExercise(block, targetEx, batchItems);
                        resequenceItemPositions();
                        markAsDirty();
                        render();
                    }
                },
                onConfirm: ({ count }) => {
                    createBatchErrorCorrection(bIdx, targetEx, count);
                },
                onSingle: () => {
                    createBatchErrorCorrection(bIdx, targetEx, 1);
                } });
        });
    });
    // Generate Error Variants
    const genErrorVariantsBtns = container.querySelectorAll('.btn-generate-error-variants');
    genErrorVariantsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const card = btn.closest('.builder-item-card');
            const input = card?.querySelector('.input-error-token');
            const raw = input?.value?.trim() || '';
            if (!raw) {
                alert('Vui lòng nhập từ/cụm từ lỗi trước khi sinh biến thể.');
                return;
            }
            const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'correction_pair',
                expectedErrors: [],
                expectedCorrections: [],
                scoringRule: 'split_points'
            };
            const generatedErrors = expandSentenceVariants([raw]);
            const prevErrors = Array.isArray(currentKey.expectedErrors) ? currentKey.expectedErrors : [];
            currentKey.expectedErrors = Array.from(new Set([...prevErrors, ...generatedErrors]));
            item.expectedErrors = currentKey.expectedErrors;
            item.targetWord = currentKey.expectedErrors[0] || item.targetWord;
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            markAsDirty();
            render();
        });
    });
    // Generate Correction Variants
    const genCorrVariantsBtns = container.querySelectorAll('.btn-generate-correction-variants');
    genCorrVariantsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const card = btn.closest('.builder-item-card');
            const input = card?.querySelector('.input-correction-token');
            const raw = input?.value?.trim() || '';
            if (!raw) {
                alert('Vui lòng nhập từ/cụm từ sửa đúng trước khi sinh biến thể.');
                return;
            }
            const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'correction_pair',
                expectedErrors: [],
                expectedCorrections: [],
                scoringRule: 'split_points'
            };
            const generatedCorrections = expandSentenceVariants([raw]);
            const prevCorrections = Array.isArray(currentKey.expectedCorrections) ? currentKey.expectedCorrections : [];
            currentKey.expectedCorrections = Array.from(new Set([...prevCorrections, ...generatedCorrections]));
            item.expectedCorrections = currentKey.expectedCorrections;
            item.accepted = currentKey.expectedCorrections;
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            markAsDirty();
            render();
        });
    });
    // Manual add error variant on Enter
    const addErrInputs = container.querySelectorAll('.input-add-error-variant');
    addErrInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = input.value.trim();
                if (!val)
                    return;
                syncInputs();
                const bIdx = Number(input.getAttribute('data-block-idx'));
                const iIdx = Number(input.getAttribute('data-item-idx'));
                const item = draftState.blocks[bIdx]?.items?.[iIdx];
                if (!item)
                    return;
                const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                    graderType: 'correction_pair',
                    expectedErrors: [],
                    expectedCorrections: []
                };
                currentKey.expectedErrors = currentKey.expectedErrors || [];
                if (!currentKey.expectedErrors.includes(val)) {
                    currentKey.expectedErrors.push(val);
                }
                item.expectedErrors = currentKey.expectedErrors;
                item.targetWord = currentKey.expectedErrors[0] || item.targetWord;
                draftState.gradingKey.items[item.itemVersionId] = currentKey;
                markAsDirty();
                render();
            }
        });
    });
    // Manual add correction variant on Enter
    const addCorrInputs = container.querySelectorAll('.input-add-correction-variant');
    addCorrInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = input.value.trim();
                if (!val)
                    return;
                syncInputs();
                const bIdx = Number(input.getAttribute('data-block-idx'));
                const iIdx = Number(input.getAttribute('data-item-idx'));
                const item = draftState.blocks[bIdx]?.items?.[iIdx];
                if (!item)
                    return;
                const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                    graderType: 'correction_pair',
                    expectedErrors: [],
                    expectedCorrections: []
                };
                currentKey.expectedCorrections = currentKey.expectedCorrections || [];
                if (!currentKey.expectedCorrections.includes(val)) {
                    currentKey.expectedCorrections.push(val);
                }
                item.expectedCorrections = currentKey.expectedCorrections;
                item.accepted = currentKey.expectedCorrections;
                draftState.gradingKey.items[item.itemVersionId] = currentKey;
                markAsDirty();
                render();
            }
        });
    });
    // Remove error variant chip
    const removeErrChipBtns = container.querySelectorAll('.btn-remove-error-chip');
    removeErrChipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const variantToRemove = btn.getAttribute('data-variant');
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            if (currentKey && currentKey.expectedErrors) {
                currentKey.expectedErrors = currentKey.expectedErrors.filter((v) => v !== variantToRemove);
                if (!currentKey.expectedErrors.length)
                    currentKey.expectedErrors = [''];
            }
            item.expectedErrors = currentKey ? currentKey.expectedErrors : [];
            item.targetWord = (item.expectedErrors && item.expectedErrors[0]) || '';
            markAsDirty();
            render();
        });
    });
    // Remove correction variant chip
    const removeCorrChipBtns = container.querySelectorAll('.btn-remove-correction-chip');
    removeCorrChipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const variantToRemove = btn.getAttribute('data-variant');
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            if (currentKey && currentKey.expectedCorrections) {
                currentKey.expectedCorrections = currentKey.expectedCorrections.filter((v) => v !== variantToRemove);
                if (!currentKey.expectedCorrections.length)
                    currentKey.expectedCorrections = [''];
            }
            item.expectedCorrections = currentKey ? currentKey.expectedCorrections : [];
            item.accepted = item.expectedCorrections;
            markAsDirty();
            render();
        });
    });
    // Scoring rule selector change
    const scoringRuleSelectors = container.querySelectorAll('.select-scoring-rule');
    scoringRuleSelectors.forEach(sel => {
        sel.addEventListener('change', () => {
            syncInputs();
            render();
        });
    });
}
