import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';
import { openGenericBatchModal } from '.././batch-import.js';
import { generatePronunciationTemplateCsv, parsePronunciationCsv } from '.././content-import.js';
import { escapeHtml } from '../../ui/presentation.js';
import { formatIpaTranscription } from '.././question-content.js';
export function bindPronunciationAuthoring({ container, draftState, builderOwner, actions }) {
    const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
    function createBatchPronunciation(bIdx, targetEx, count = 1) {
        const block = draftState.blocks[bIdx];
        if (!block)
            return;
        const startingPos = getNextPosition();
        block.items = block.items || [];
        const batchItems = [];
        const defaultWord = 'camera';
        const defaultIpa = '/ˈkæm.ər.ə/';
        const defaultOptions = [
            { id: 'A', label: '/ˈkæm.ər.ə/' },
            { id: 'B', label: '/kəˈmɪər.ə/' },
            { id: 'C', label: '/ˈkæm.eɪ.rə/' }
        ];
        for (let i = 0; i < count; i++) {
            const currentPos = startingPos + i;
            const newItemId = generateUuid();
            batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: currentPos,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: `Choose the correct pronunciation for "${defaultWord}":`,
                helpText: '',
                interactionType: 'single_choice',
                pedagogicalTypeCode: 'pronunciation_choice',
                layoutType: 'ipa_card',
                graderType: 'exact_option',
                required: true,
                maxScore: 0.5,
                targetWord: defaultWord,
                ipaTranscription: defaultIpa,
                audioUrl: '',
                options: defaultOptions.map(o => ({ ...o })),
                skillCodes: ['pronunciation'],
                releasePolicy: 'inherit'
            });
            draftState.gradingKey.items[newItemId] = {
                graderType: 'exact_option',
                expectedOptionId: 'A',
                targetWord: defaultWord,
                ipaTranscription: defaultIpa
            };
        }
        insertItemsIntoBlockExercise(block, targetEx, batchItems);
        resequenceItemPositions();
        markAsDirty();
        render();
    }
    // Add Pronunciation Choice Question
    const addPronunciationChoiceBtns = container.querySelectorAll('.btn-add-pronunciation-choice, .btn-add-pronunciation');
    addPronunciationChoiceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            const targetEx = resolveTargetExercise(block, btn);
            openGenericBatchModal({ owner: builderOwner,
                title: 'Tạo hàng loạt câu hỏi Phát âm & Ký hiệu IPA',
                subtitle: `Tạo nhanh các câu hỏi Phát âm & Ký hiệu IPA thuộc bài tập ${targetEx.title || 'bài tập'}.`,
                defaultCount: 5,
                minCount: 1,
                maxCount: 50,
                csvConfig: {
                    templateFileName: 'mau_phat_am_ipa.csv',
                    columnsHint: 'Cột: Từ/Đề bài | Lựa chọn A | Lựa chọn B | Lựa chọn C | Lựa chọn D | Đáp án đúng | Điểm',
                    placeholder: 'camera,/ˈkæm.ər.ə/,/kəˈmɪər.ə/,/ˈkæm.eɪ.rə/,,A,1\ngenerous,/ˈdʒen.ər.əs/,/dʒəˈner.əs/,/ˈdʒen.eɪ.rəs/,,A,1',
                    getTemplateCsv: generatePronunciationTemplateCsv,
                    parseCsv: parsePronunciationCsv,
                    renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} — <em>Đáp án: ${escapeHtml(itm.expectedOptionId)}</em> (${itm.options.length} phương án, ${itm.maxScore}đ)`,
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
                                interactionType: 'single_choice',
                                pedagogicalTypeCode: 'pronunciation_choice',
                                layoutType: 'ipa_card',
                                graderType: 'exact_option',
                                required: true,
                                maxScore: itemScore,
                                targetWord: parsed.targetWord || '',
                                ipaTranscription: parsed.options?.[0]?.label || '',
                                audioUrl: '',
                                options: parsed.options,
                                skillCodes: ['pronunciation'],
                                releasePolicy: 'inherit'
                            });
                            draftState.gradingKey.items[newItemId] = {
                                graderType: 'exact_option',
                                expectedOptionId: parsed.expectedOptionId || 'A',
                                targetWord: parsed.targetWord || '',
                                ipaTranscription: parsed.options?.[0]?.label || ''
                            };
                        });
                        insertItemsIntoBlockExercise(block, targetEx, batchItems);
                        resequenceItemPositions();
                        markAsDirty();
                        render();
                    }
                },
                onConfirm: ({ count }) => {
                    createBatchPronunciation(bIdx, targetEx, count);
                },
                onSingle: () => {
                    createBatchPronunciation(bIdx, targetEx, 1);
                } });
        });
    });
    // IPA Symbol click to insert
    const ipaSymbolBtns = container.querySelectorAll('.btn-ipa-symbol');
    ipaSymbolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const symbol = btn.getAttribute('data-symbol');
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item || !symbol)
                return;
            const card = btn.closest('.builder-item-card');
            const ipaInput = card?.querySelector('.input-ipa-transcription');
            if (ipaInput) {
                const start = ipaInput.selectionStart ?? ipaInput.value.length;
                const end = ipaInput.selectionEnd ?? ipaInput.value.length;
                const val = ipaInput.value;
                ipaInput.value = val.slice(0, start) + symbol + val.slice(end);
                ipaInput.focus();
                const newPos = start + symbol.length;
                ipaInput.setSelectionRange?.(newPos, newPos);
                item.ipaTranscription = ipaInput.value.trim();
                const badge = card?.querySelector('.ipa-phonetic-badge');
                if (badge) {
                    badge.textContent = formatIpaTranscription(item.ipaTranscription) || '/.../';
                }
                if (draftState.gradingKey.items[item.itemVersionId]) {
                    draftState.gradingKey.items[item.itemVersionId].ipaTranscription = item.ipaTranscription;
                }
            }
        });
    });
    // Add Option to Pronunciation
    const addPronOptBtns = container.querySelectorAll('.btn-add-pronunciation-option');
    addPronOptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const nextId = alphabet[item.options.length] || `OPT${item.options.length + 1}`;
            item.options = item.options || [];
            item.options.push({ id: nextId, label: `/${item.targetWord || 'word'}/` });
            render();
        });
    });
    // Delete Option from Pronunciation
    const delPronOptBtns = container.querySelectorAll('.btn-del-pronunciation-option');
    delPronOptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const optId = btn.getAttribute('data-option-id');
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (item && item.options && item.options.length > 2) {
                item.options = item.options.filter((o) => o.id !== optId);
                render();
            }
            else {
                alert('Một câu hỏi lựa chọn phải có ít nhất 2 phương án.');
            }
        });
    });
}
