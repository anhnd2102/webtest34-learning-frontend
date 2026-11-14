import { generateUuid, insertItemsIntoBlockExercise } from './draft-model.js';
import { generateHangmanHint, expandSentenceVariants } from './question-content.js';
import { openBlockCsvUploadModal } from './batch-import.js';
export function bindBlockCsvImport({ container, builderOwner, draftState, markAsDirty, resequenceItemPositions, render, syncInputs, getNextPosition, options }) {
    // Import Block CSV (All Exercises in Block)
    const importBlockCsvBtns = container.querySelectorAll('.btn-import-block-csv');
    importBlockCsvBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            openBlockCsvUploadModal({ owner: builderOwner,
                block,
                blockIdx: bIdx,
                onImport: ({ mode, exercises }) => {
                    if (!exercises || !exercises.length)
                        return;
                    if (mode === 'overwrite') {
                        (block.items || []).forEach(it => {
                            if (it.itemVersionId) {
                                delete draftState.gradingKey.items[it.itemVersionId];
                            }
                        });
                        block.exercises = [];
                        block.items = [];
                    }
                    block.exercises = block.exercises || [];
                    block.items = block.items || [];
                    exercises.forEach((parsedEx) => {
                        const newExId = generateUuid();
                        const newExNumber = block.exercises.length + 1;
                        const targetEx = {
                            exerciseId: newExId,
                            exerciseNumber: newExNumber,
                            title: parsedEx.title || `Exercise ${newExNumber}`,
                            instructions: parsedEx.instructions || ''
                        };
                        block.exercises.push(targetEx);
                        const startingPos = getNextPosition();
                        const batchItems = [];
                        (parsedEx.items || []).forEach((parsedItem, idx) => {
                            const newItemId = generateUuid();
                            const itemScore = parsedItem.maxScore != null && !isNaN(parsedItem.maxScore) && parsedItem.maxScore > 0 ? parsedItem.maxScore : 1;
                            const itmObj = {
                                itemFamilyId: generateUuid(),
                                itemVersionId: newItemId,
                                position: startingPos + idx,
                                exerciseId: targetEx.exerciseId,
                                exerciseTitle: targetEx.title,
                                prompt: parsedItem.prompt,
                                helpText: parsedItem.helpText || '',
                                interactionType: parsedItem.interactionType || 'short_text',
                                pedagogicalTypeCode: parsedItem.pedagogicalTypeCode || 'short_text',
                                layoutType: parsedItem.layoutType || 'default',
                                graderType: parsedItem.graderType || 'accepted_text',
                                required: true,
                                maxScore: itemScore,
                                options: parsedItem.options || [],
                                skillCodes: [],
                                releasePolicy: 'inherit'
                            };
                            if (parsedItem.pedagogicalTypeCode === 'sentence_reorder') {
                                itmObj.tokens = parsedItem.tokens;
                                itmObj.distractors = parsedItem.distractors || [];
                                itmObj.targetSentence = parsedItem.targetSentence;
                            }
                            else if (parsedItem.pedagogicalTypeCode === 'sentence_rewrite') {
                                itmObj.mandatoryKeyword = parsedItem.mandatoryKeyword;
                                itmObj.targetSentence = parsedItem.targetSentence;
                            }
                            else if (parsedItem.pedagogicalTypeCode === 'error_correction' || parsedItem.interactionType === 'correction_pair' || parsedItem.graderType === 'correction_pair') {
                                const errs = (parsedItem.expectedErrors && parsedItem.expectedErrors.length)
                                    ? parsedItem.expectedErrors
                                    : (parsedItem.targetWord ? [parsedItem.targetWord] : ['error']);
                                const corrs = (parsedItem.expectedCorrections && parsedItem.expectedCorrections.length)
                                    ? parsedItem.expectedCorrections
                                    : (parsedItem.accepted && parsedItem.accepted.length ? parsedItem.accepted : ['correction']);
                                itmObj.targetWord = parsedItem.targetWord || errs[0];
                                itmObj.expectedErrors = errs;
                                itmObj.expectedCorrections = corrs;
                                itmObj.accepted = corrs;
                                itmObj.scoringRule = parsedItem.scoringRule || 'split_points';
                                itmObj.interactionType = 'correction_pair';
                                itmObj.pedagogicalTypeCode = 'error_correction';
                                itmObj.graderType = 'correction_pair';
                                itmObj.layoutType = 'correction_inline';
                            }
                            else if (parsedItem.pedagogicalTypeCode === 'pictorial_vocabulary') {
                                itmObj.image = parsedItem.image;
                                itmObj.targetWord = parsedItem.targetWord;
                                itmObj.captionHint = parsedItem.captionHint || '';
                                itmObj.letterHint = generateHangmanHint(parsedItem.targetWord);
                            }
                            else if (parsedItem.pedagogicalTypeCode === 'pronunciation_choice') {
                                itmObj.targetWord = parsedItem.targetWord || '';
                            }
                            else if (parsedItem.pedagogicalTypeCode === 'listening_order') {
                                itmObj.listeningEvents = parsedItem.listeningEvents || [];
                                itmObj.events = parsedItem.events || [];
                            }
                            else if (parsedItem.pedagogicalTypeCode === 'vocabulary_pair' || parsedItem.interactionType === 'text_select_pair') {
                                itmObj.targetWord = parsedItem.targetWord || parsedItem.prompt;
                                itmObj.options = parsedItem.options || [];
                                itmObj.captionHint = parsedItem.captionHint || parsedItem.vietnameseMeaning || '';
                            }
                            batchItems.push(itmObj);
                            if (parsedItem.graderType === 'exact_option') {
                                draftState.gradingKey.items[newItemId] = {
                                    graderType: 'exact_option',
                                    expectedOptionId: parsedItem.expectedOptionId || 'A'
                                };
                                if (parsedItem.pedagogicalTypeCode === 'listening_order') {
                                    draftState.gradingKey.items[newItemId].events = itmObj.events;
                                }
                            }
                            else if (parsedItem.graderType === 'rubric_async') {
                                draftState.gradingKey.items[newItemId] = {
                                    graderType: 'rubric_async',
                                    rubricCode: parsedItem.rubricCode || 'rubric_async_custom',
                                    rubricVersion: 1,
                                    rubric: parsedItem.rubric || {
                                        scoringVersion: 'rubric_async_custom',
                                        maxScore: itemScore,
                                        criteria: [
                                            { id: 'crit_1', label: 'Ý nghĩa & Nội dung', maxScore: itemScore / 2, requiredConcepts: [] },
                                            { id: 'crit_2', label: 'Ngữ pháp & Diễn đạt', maxScore: itemScore / 2, requiredConcepts: [] }
                                        ]
                                    }
                                };
                            }
                            else if (parsedItem.graderType === 'accepted_text_exact_option' || parsedItem.interactionType === 'text_select_pair' || parsedItem.pedagogicalTypeCode === 'vocabulary_pair') {
                                draftState.gradingKey.items[newItemId] = {
                                    graderType: 'accepted_text_exact_option',
                                    accepted: expandSentenceVariants([itmObj.targetWord || itmObj.prompt || '']),
                                    expectedOptionId: parsedItem.expectedOptionId || (itmObj.options?.[0]?.id || 'meaning-01'),
                                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                                };
                            }
                            else if (parsedItem.graderType === 'inline_cloze' || parsedItem.layoutType === 'inline_cloze') {
                                itmObj.clozeAnswers = parsedItem.clozeAnswers || {};
                                draftState.gradingKey.items[newItemId] = {
                                    graderType: 'inline_cloze',
                                    blanks: itmObj.clozeAnswers,
                                    accepted: parsedItem.accepted || [itmObj.targetWord || ''],
                                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                                };
                            }
                            else if (parsedItem.graderType === 'correction_pair' || parsedItem.pedagogicalTypeCode === 'error_correction' || parsedItem.interactionType === 'correction_pair') {
                                const errs = itmObj.expectedErrors || (parsedItem.targetWord ? [parsedItem.targetWord] : ['error']);
                                const corrs = itmObj.expectedCorrections || (parsedItem.accepted && parsedItem.accepted.length ? parsedItem.accepted : ['correction']);
                                draftState.gradingKey.items[newItemId] = {
                                    graderType: 'correction_pair',
                                    expectedErrors: errs,
                                    expectedCorrections: corrs,
                                    accepted: corrs,
                                    scoringRule: parsedItem.scoringRule || 'split_points',
                                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                                };
                            }
                            else {
                                draftState.gradingKey.items[newItemId] = {
                                    graderType: 'accepted_text',
                                    accepted: parsedItem.accepted || [parsedItem.targetAnswer || ''],
                                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                                };
                                if (parsedItem.pedagogicalTypeCode === 'sentence_reorder') {
                                    draftState.gradingKey.items[newItemId].tokens = parsedItem.tokens;
                                    draftState.gradingKey.items[newItemId].distractors = parsedItem.distractors || [];
                                }
                                else if (parsedItem.pedagogicalTypeCode === 'sentence_rewrite') {
                                    draftState.gradingKey.items[newItemId].keyword = parsedItem.mandatoryKeyword;
                                }
                                else if (parsedItem.pedagogicalTypeCode === 'error_correction') {
                                    draftState.gradingKey.items[newItemId].targetWord = parsedItem.targetWord;
                                }
                            }
                        });
                        insertItemsIntoBlockExercise(block, targetEx, batchItems);
                    });
                    resequenceItemPositions();
                    markAsDirty();
                    render();
                }
            });
        });
    });
}
