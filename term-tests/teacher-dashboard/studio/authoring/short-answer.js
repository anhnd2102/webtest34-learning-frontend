import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise, parseClozeBlanks, getItemSpanCount } from '.././draft-model.js';
import { openGenericBatchModal, openInlineClozeBatchModal } from '.././batch-import.js';
import { escapeHtml } from '../../ui/presentation.js';
import { generateFitbTemplateCsv, parseFitbCsv } from '.././content-import.js';
import { expandSentenceVariants } from '.././question-content.js';
export function bindShortAnswerAuthoring({ container, draftState, builderOwner, actions }) {
    const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
    function createBatchFitb(bIdx, targetEx, count = 1, defaultPoints = 1) {
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
                prompt: `Điền vào ô trống câu ${currentPos}:`,
                helpText: '',
                interactionType: 'short_text',
                pedagogicalTypeCode: 'fill_in_the_blank',
                layoutType: 'default',
                graderType: 'accepted_text',
                required: true,
                maxScore: defaultPoints || 1,
                options: [],
                skillCodes: [],
                releasePolicy: 'inherit'
            });
            draftState.gradingKey.items[newItemId] = {
                graderType: 'accepted_text',
                accepted: ['answer'],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
        }
        insertItemsIntoBlockExercise(block, targetEx, batchItems);
        resequenceItemPositions();
        markAsDirty();
        render();
    }
    // Add Fill In The Blank Question (Opens CSV / Excel import popup with batch & single creation)
    const addFitbBtns = container.querySelectorAll('.btn-add-fitb, .btn-add-short-text');
    addFitbBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            const targetEx = resolveTargetExercise(block, btn);
            triggerFitbBatchModal(bIdx, targetEx);
        });
    });
    function triggerFitbBatchModal(bIdx, targetEx) {
        const block = draftState.blocks[bIdx];
        if (!block)
            return;
        openGenericBatchModal({ owner: builderOwner,
            title: 'Điền ô trống (Short Text)',
            subtitle: `Nhập danh sách câu hỏi Điền từ ngắn vào ô trống cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Tự động sinh biến thể ngữ pháp và đáp án chấp nhận.`,
            defaultCount: 5,
            minCount: 1,
            maxCount: 50,
            defaultPoints: 1.0,
            csvConfig: {
                templateFileName: 'mau_dien_o_trong.csv',
                columnsHint: 'Cột: Đề bài | Đáp án đúng | Điểm',
                placeholder: 'The capital of France is ___.,Paris,1\nWater freezes at ___ degrees Celsius.,0,1\nThe Sun rises in the ___.,east,1',
                getTemplateCsv: generateFitbTemplateCsv,
                parseCsv: parseFitbCsv,
                renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} — <em>Đáp án: ${escapeHtml(itm.targetAnswer)}</em> (${itm.maxScore || 1} điểm)`,
                onImport: (items, { defaultPoints = 1 } = {}) => {
                    const startingPos = getNextPosition();
                    const batchItems = [];
                    items.forEach((parsed, idx) => {
                        const newItemId = generateUuid();
                        const itemScore = parsed.maxScore != null && !isNaN(parsed.maxScore) && parsed.maxScore > 0 ? parsed.maxScore : defaultPoints;
                        batchItems.push({
                            itemFamilyId: generateUuid(),
                            itemVersionId: newItemId,
                            position: startingPos + idx,
                            exerciseId: targetEx.exerciseId,
                            exerciseTitle: targetEx.title,
                            prompt: parsed.prompt,
                            helpText: '',
                            interactionType: 'short_text',
                            pedagogicalTypeCode: 'fill_in_the_blank',
                            layoutType: 'default',
                            graderType: 'accepted_text',
                            required: true,
                            maxScore: itemScore,
                            options: [],
                            skillCodes: [],
                            releasePolicy: 'inherit'
                        });
                        draftState.gradingKey.items[newItemId] = {
                            graderType: 'accepted_text',
                            accepted: expandSentenceVariants([parsed.targetAnswer]),
                            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                        };
                    });
                    insertItemsIntoBlockExercise(block, targetEx, batchItems);
                    resequenceItemPositions();
                    markAsDirty();
                    render();
                }
            },
            onConfirm: ({ count, defaultPoints = 1 }) => {
                createBatchFitb(bIdx, targetEx, count, defaultPoints);
            },
            onSingle: ({ defaultPoints = 1 } = {}) => {
                createBatchFitb(bIdx, targetEx, 1, defaultPoints);
            } });
    }
    // Add Inline Cloze Question
    function createSingleInlineCloze(bIdx, targetEx, defaultPoints = 1) {
        const block = draftState.blocks[bIdx];
        if (!block)
            return;
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        const newItem = {
            itemFamilyId: generateUuid(),
            itemVersionId: newItemId,
            position: nextPos,
            exerciseId: targetEx.exerciseId,
            exerciseTitle: targetEx.title,
            prompt: `The cruise departs from Miami and visits (${nextPos}) __________ Caribbean islands.`,
            helpText: '',
            interactionType: 'short_text',
            pedagogicalTypeCode: 'inline_cloze',
            layoutType: 'inline_cloze',
            graderType: 'inline_cloze',
            clozeAnswers: {
                [nextPos]: {
                    targetWord: 'six',
                    accepted: ['six']
                }
            },
            required: true,
            maxScore: defaultPoints || 1,
            options: [],
            skillCodes: ['listening'],
            releasePolicy: 'inherit'
        };
        insertItemsIntoBlockExercise(block, targetEx, newItem);
        draftState.gradingKey.items[newItemId] = {
            graderType: 'inline_cloze',
            blanks: newItem.clozeAnswers,
            accepted: ['six'],
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        resequenceItemPositions();
        markAsDirty();
        render();
    }
    const addInlineClozeBtns = container.querySelectorAll('.btn-add-inline-cloze');
    addInlineClozeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            const targetEx = resolveTargetExercise(block, btn);
            openInlineClozeBatchModal({
                owner: builderOwner,
                blockIdx: bIdx,
                targetExercise: targetEx,
                onSingle: ({ defaultPoints = 1 } = {}) => {
                    createSingleInlineCloze(bIdx, targetEx, defaultPoints);
                },
                onConfirm: ({ count = 1, defaultPoints = 1 }) => {
                    for (let c = 0; c < count; c++) {
                        createSingleInlineCloze(bIdx, targetEx, defaultPoints);
                    }
                },
                onImport: (rawItems, meta = {}) => {
                    const items = Array.isArray(rawItems) ? rawItems : (rawItems?.items || []);
                    if (!items || !items.length)
                        return;
                    const startingPos = getNextPosition();
                    const batchItems = [];
                    items.forEach((parsed, idx) => {
                        const newItemId = generateUuid();
                        const itmObj = {
                            itemFamilyId: generateUuid(),
                            itemVersionId: newItemId,
                            position: startingPos + idx,
                            exerciseId: targetEx.exerciseId,
                            exerciseTitle: targetEx.title,
                            prompt: parsed.prompt,
                            helpText: '',
                            interactionType: 'short_text',
                            pedagogicalTypeCode: 'inline_cloze',
                            layoutType: 'inline_cloze',
                            graderType: 'inline_cloze',
                            clozeAnswers: parsed.clozeAnswers || {},
                            required: true,
                            maxScore: parsed.maxScore || 1,
                            options: [],
                            skillCodes: ['listening'],
                            releasePolicy: 'inherit'
                        };
                        batchItems.push(itmObj);
                        draftState.gradingKey.items[newItemId] = {
                            graderType: 'inline_cloze',
                            blanks: itmObj.clozeAnswers,
                            accepted: parsed.accepted || [itmObj.targetWord || ''],
                            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                        };
                    });
                    insertItemsIntoBlockExercise(block, targetEx, batchItems);
                    resequenceItemPositions();
                    markAsDirty();
                    render();
                }
            });
        });
    });
    // Insert Blank Token into Cloze prompt
    const insertBlankBtns = container.querySelectorAll('.btn-insert-blank-token');
    insertBlankBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const detected = parseClozeBlanks(item.prompt || '');
            const maxNum = detected.length ? Math.max(...detected.map(b => b.number)) : 0;
            const nextNum = maxNum > 0 ? maxNum + 1 : (item.position || 1);
            const token = `(${nextNum}) __________`;
            item.prompt = item.prompt ? `${item.prompt} ${token}` : `Câu hỏi với ${token}`;
            item.clozeAnswers = item.clozeAnswers || {};
            if (!item.clozeAnswers[nextNum]) {
                item.clozeAnswers[nextNum] = { targetWord: '', accepted: [] };
            }
            item.maxScore = getItemSpanCount(item);
            resequenceItemPositions();
            render();
        });
    });
}
