import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';
import { openGenericBatchModal } from '.././batch-import.js';
import { generateSentenceReorderTemplateCsv, parseSentenceReorderCsv, generateSentenceTransformationTemplateCsv, parseSentenceTransformationCsv } from '.././content-import.js';
import { escapeHtml } from '../../ui/presentation.js';
import { expandSentenceVariants, tokenizeSentence } from '.././question-content.js';
export function bindSentenceAuthoring({ container, draftState, builderOwner, actions }) {
    const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
    function createBatchSentenceReorder(bIdx, targetEx, count = 1) {
        const block = draftState.blocks[bIdx];
        if (!block)
            return;
        const startingPos = getNextPosition();
        block.items = block.items || [];
        const batchItems = [];
        const defaultTokens = ['She', 'has worked', 'at the company', 'for five years'];
        const defaultSentence = 'She has worked at the company for five years.';
        for (let i = 0; i < count; i++) {
            const currentPos = startingPos + i;
            const newItemId = generateUuid();
            batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: currentPos,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:',
                helpText: '',
                interactionType: 'short_text',
                pedagogicalTypeCode: 'sentence_reorder',
                layoutType: 'token_scramble',
                graderType: 'accepted_text',
                required: true,
                maxScore: 1,
                tokens: [...defaultTokens],
                distractors: [],
                targetSentence: defaultSentence,
                options: [],
                skillCodes: ['grammar'],
                releasePolicy: 'inherit'
            });
            draftState.gradingKey.items[newItemId] = {
                graderType: 'accepted_text',
                accepted: [defaultSentence],
                tokens: [...defaultTokens],
                distractors: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
        }
        insertItemsIntoBlockExercise(block, targetEx, batchItems);
        resequenceItemPositions();
        markAsDirty();
        render();
    }
    // Add Sentence Reorder Question
    const addSentenceReorderBtns = container.querySelectorAll('.btn-add-sentence-reorder');
    addSentenceReorderBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            const targetEx = resolveTargetExercise(block, btn);
            openGenericBatchModal({ owner: builderOwner,
                title: 'Tạo hàng loạt câu hỏi Sắp xếp câu',
                subtitle: `Tạo nhanh các câu hỏi Sắp xếp từ/cụm từ thuộc bài tập ${targetEx.title || 'bài tập'}.`,
                defaultCount: 5,
                minCount: 1,
                maxCount: 50,
                csvConfig: {
                    templateFileName: 'mau_sap_xep_cau.csv',
                    columnsHint: 'Cột: Câu cần sắp xếp (Sentence_Text) | Điểm (Score) | Gợi ý (Help_Text)',
                    placeholder: '"She / has worked / at the company / for five years",1,"Thì hiện tại hoàn thành"\n"They / will travel / to Japan / next summer",1,"Thì tương lai đơn"',
                    getTemplateCsv: generateSentenceReorderTemplateCsv,
                    parseCsv: parseSentenceReorderCsv,
                    renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.tokens.join(' / '))} [${itm.maxScore}đ]`,
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
                                prompt: parsed.prompt || 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:',
                                helpText: parsed.helpText || '',
                                interactionType: 'short_text',
                                pedagogicalTypeCode: 'sentence_reorder',
                                layoutType: 'token_scramble',
                                graderType: 'accepted_text',
                                required: true,
                                maxScore: itemScore,
                                tokens: parsed.tokens,
                                distractors: parsed.distractors || [],
                                targetSentence: parsed.targetSentence,
                                options: [],
                                skillCodes: ['grammar'],
                                releasePolicy: 'inherit'
                            });
                            draftState.gradingKey.items[newItemId] = {
                                graderType: 'accepted_text',
                                accepted: parsed.accepted || [parsed.targetSentence],
                                tokens: parsed.tokens,
                                distractors: parsed.distractors || [],
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
                    createBatchSentenceReorder(bIdx, targetEx, count);
                },
                onSingle: () => {
                    createBatchSentenceReorder(bIdx, targetEx, 1);
                } });
        });
    });
    function createBatchSentenceTransformation(bIdx, targetEx, count = 1) {
        const block = draftState.blocks[bIdx];
        if (!block)
            return;
        const startingPos = getNextPosition();
        block.items = block.items || [];
        const batchItems = [];
        const defaultKw = 'PREVENTED';
        const defaultPrefix = 'His severe illness';
        const defaultSuffix = 'from going to the conference.';
        const defaultAnswer = 'prevented him';
        const defaultPrompt = 'He could not go to the conference because he was severely ill.';
        for (let i = 0; i < count; i++) {
            const currentPos = startingPos + i;
            const newItemId = generateUuid();
            batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: currentPos,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: defaultPrompt,
                helpText: '',
                interactionType: 'short_text',
                pedagogicalTypeCode: 'sentence_rewrite',
                layoutType: 'keyword_transformation',
                graderType: 'accepted_text',
                required: true,
                maxScore: 1,
                keyword: defaultKw,
                framePrefix: defaultPrefix,
                frameSuffix: defaultSuffix,
                targetAnswer: defaultAnswer,
                options: [],
                skillCodes: ['grammar'],
                releasePolicy: 'inherit'
            });
            draftState.gradingKey.items[newItemId] = {
                graderType: 'accepted_text',
                keyword: defaultKw,
                framePrefix: defaultPrefix,
                frameSuffix: defaultSuffix,
                accepted: [defaultAnswer],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
        }
        insertItemsIntoBlockExercise(block, targetEx, batchItems);
        resequenceItemPositions();
        markAsDirty();
        render();
    }
    // Add Sentence Transformation Question (Opens CSV / Excel import popup with single item creation option)
    const addSentenceTransformationBtns = container.querySelectorAll('.btn-add-sentence-transformation');
    addSentenceTransformationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            const targetEx = resolveTargetExercise(block, btn);
            openGenericBatchModal({ owner: builderOwner,
                title: 'Nhập câu hỏi Biến đổi câu vào Exercise (CSV / Excel)',
                subtitle: `Nhập danh sách câu hỏi Biến đổi câu có từ gợi ý cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Hỗ trợ nhập từ khóa bắt buộc và các đáp án đúng phân tách bằng dấu gạch đứng (|).`,
                defaultCount: 5,
                minCount: 1,
                maxCount: 50,
                csvConfig: {
                    templateFileName: 'mau_viet_lai_cau.csv',
                    columnsHint: 'Cột: Câu gốc | Từ khóa bắt buộc | Câu gợi ý / Chỗ trống | Các phương án đúng (|) | Giải thích',
                    placeholder: 'He could not go because of illness.,PREVENTED,His severe illness (1) __________ from going.,prevented him,Cấu trúc prevent someone from doing\nIt is not necessary for you to come.,NEED,You (1) __________ come tomorrow.,need not|do not need to|don\'t need to,Need not do sth',
                    getTemplateCsv: generateSentenceTransformationTemplateCsv,
                    parseCsv: parseSentenceTransformationCsv,
                    renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} [Từ khóa: <strong>${escapeHtml(itm.mandatoryKeyword)}</strong> → Đáp án: <em>${escapeHtml(itm.accepted[0] || '')}</em>]`,
                    onImport: (items) => {
                        const startingPos = getNextPosition();
                        const batchItems = [];
                        items.forEach((parsed, idx) => {
                            const newItemId = generateUuid();
                            batchItems.push({
                                itemFamilyId: generateUuid(),
                                itemVersionId: newItemId,
                                position: startingPos + idx,
                                exerciseId: targetEx.exerciseId,
                                exerciseTitle: targetEx.title,
                                prompt: parsed.prompt,
                                helpText: '',
                                interactionType: 'short_text',
                                pedagogicalTypeCode: 'sentence_rewrite',
                                layoutType: 'keyword_transformation',
                                graderType: 'accepted_text',
                                required: true,
                                maxScore: 1,
                                keyword: parsed.mandatoryKeyword,
                                framePrefix: '',
                                frameSuffix: '',
                                targetAnswer: parsed.accepted?.[0] || '',
                                targetSentence: parsed.targetSentence || '(1) __________',
                                options: [],
                                skillCodes: ['grammar'],
                                releasePolicy: 'inherit'
                            });
                            draftState.gradingKey.items[newItemId] = {
                                graderType: 'accepted_text',
                                keyword: parsed.mandatoryKeyword,
                                accepted: parsed.accepted || [],
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
                    createBatchSentenceTransformation(bIdx, targetEx, count);
                },
                onSingle: () => {
                    createBatchSentenceTransformation(bIdx, targetEx, 1);
                } });
        });
    });
    // Generate Sentence Transformation Variants
    const genTransformationVariantsBtns = container.querySelectorAll('.btn-generate-transformation-variants');
    genTransformationVariantsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const ans = item.targetAnswer || '';
            if (!ans) {
                alert('Vui lòng nhập đáp án mẫu trong chỗ trống trước khi sinh biến thể.');
                return;
            }
            const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'accepted_text',
                accepted: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
            const expanded = expandSentenceVariants([ans]);
            currentKey.accepted = Array.from(new Set([...(currentKey.accepted || []), ...expanded]));
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
        });
    });
    // Add manual transformation variant on Enter
    const addTransformationVariantInputs = container.querySelectorAll('.input-add-transformation-variant');
    addTransformationVariantInputs.forEach(input => {
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
                    graderType: 'accepted_text',
                    accepted: [],
                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                };
                currentKey.accepted = currentKey.accepted || [];
                if (!currentKey.accepted.includes(val)) {
                    currentKey.accepted.push(val);
                    draftState.gradingKey.items[item.itemVersionId] = currentKey;
                    render();
                }
            }
        });
    });
    // Tokenize Sentence
    const tokenizeBtns = container.querySelectorAll('.btn-tokenize-sentence');
    tokenizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const card = btn.closest('.builder-item-card');
            const targetInput = card?.querySelector('.input-target-sentence');
            const rawTokensInput = card?.querySelector('.input-raw-tokens');
            const textToTokenize = (targetInput?.value?.trim() || rawTokensInput?.value?.trim() || item.targetSentence || '');
            if (!textToTokenize) {
                alert('Vui lòng nhập câu hoàn chỉnh hoặc chuỗi mảnh từ trước khi phân rã.');
                return;
            }
            item.tokens = tokenizeSentence(textToTokenize);
            if (targetInput && targetInput.value.trim()) {
                item.targetSentence = targetInput.value.trim();
            }
            else {
                item.targetSentence = item.tokens.join(' ');
            }
            const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'accepted_text',
                accepted: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
            currentKey.tokens = item.tokens;
            if (!currentKey.accepted || !currentKey.accepted.length) {
                currentKey.accepted = [item.targetSentence];
            }
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
        });
    });
    // Add Distractor button click
    const addDistractorBtns = container.querySelectorAll('.btn-add-distractor-btn');
    addDistractorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const card = btn.closest('.builder-item-card');
            const input = card?.querySelector('.input-add-distractor');
            const val = input?.value?.trim() || '';
            if (!val)
                return;
            item.distractors = item.distractors || [];
            if (!item.distractors.includes(val)) {
                item.distractors.push(val);
            }
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            if (currentKey)
                currentKey.distractors = item.distractors;
            render();
        });
    });
    // Add Distractor on Enter
    const addDistractorInputs = container.querySelectorAll('.input-add-distractor');
    addDistractorInputs.forEach(input => {
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
                item.distractors = item.distractors || [];
                if (!item.distractors.includes(val)) {
                    item.distractors.push(val);
                }
                const currentKey = draftState.gradingKey.items[item.itemVersionId];
                if (currentKey)
                    currentKey.distractors = item.distractors;
                render();
            }
        });
    });
    // Remove Distractor chip
    const removeDistractorChipBtns = container.querySelectorAll('.btn-remove-distractor-chip');
    removeDistractorChipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const dIdx = Number(btn.getAttribute('data-distractor-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item || !item.distractors)
                return;
            item.distractors.splice(dIdx, 1);
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            if (currentKey)
                currentKey.distractors = item.distractors;
            render();
        });
    });
    // Generate Sentence Reorder Variants
    const genReorderVariantsBtns = container.querySelectorAll('.btn-generate-reorder-variants');
    genReorderVariantsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const target = item.targetSentence || (item.tokens ? item.tokens.join(' ') : '');
            if (!target) {
                alert('Vui lòng nhập câu hoàn chỉnh trước khi sinh biến thể.');
                return;
            }
            const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'accepted_text',
                accepted: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
            const generated = expandSentenceVariants([target]);
            const prevAccepted = Array.isArray(currentKey.accepted) ? currentKey.accepted : [];
            currentKey.accepted = Array.from(new Set([...prevAccepted, ...generated]));
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
        });
    });
}
