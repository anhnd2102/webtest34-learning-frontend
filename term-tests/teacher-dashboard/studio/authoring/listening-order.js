import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';
import { openCsvUploadModal } from '.././batch-import.js';
import { escapeHtml } from '../../ui/presentation.js';
import { generateListeningOrderTemplateCsv, parseListeningOrderCsv } from '.././content-import.js';
export function bindListeningOrderAuthoring({ container, draftState, builderOwner, actions }) {
    const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
    // Add Listening Order Question (Opens CSV / Excel import popup with single item creation option)
    const addListeningOrderBtns = container.querySelectorAll('.btn-add-listening-order');
    addListeningOrderBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            const targetEx = resolveTargetExercise(block, btn);
            const createSingleListeningOrder = () => {
                const nextPos = getNextPosition();
                const newItemId = generateUuid();
                block.items = block.items || [];
                const defaultEvents = [
                    { label: 'A', rank: 3, text: 'Sự kiện A' },
                    { label: 'B', rank: 4, text: 'Sự kiện B' },
                    { label: 'C', rank: 1, text: 'Sự kiện C' },
                    { label: 'D', rank: 5, text: 'Sự kiện D' },
                    { label: 'E', rank: 2, text: 'Sự kiện E' }
                ];
                const newItem = {
                    itemFamilyId: generateUuid(),
                    itemVersionId: newItemId,
                    position: nextPos,
                    exerciseId: targetEx.exerciseId,
                    exerciseTitle: targetEx.title,
                    prompt: 'Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:',
                    helpText: '',
                    interactionType: 'single_choice',
                    pedagogicalTypeCode: 'listening_order',
                    layoutType: 'timeline_sequence',
                    graderType: 'ordered_sequence',
                    required: true,
                    maxScore: 5,
                    audioUrl: block.audioUrl || 'assets/34/test-1/listening.mp3',
                    events: defaultEvents,
                    options: defaultEvents.map(e => ({ id: e.label, label: `Sự kiện ${e.label}` })),
                    skillCodes: ['listening'],
                    releasePolicy: 'inherit'
                };
                insertItemsIntoBlockExercise(block, targetEx, newItem);
                const sorted = [...defaultEvents].sort((a, b) => a.rank - b.rank);
                draftState.gradingKey.items[newItemId] = {
                    graderType: 'ordered_sequence',
                    expectedSequence: sorted.map(e => e.label)
                };
                resequenceItemPositions();
                markAsDirty();
                render();
            };
            openCsvUploadModal({ owner: builderOwner,
                title: 'Nhập bài tập Sắp xếp thứ tự nghe vào Exercise (CSV / Excel)',
                subtitle: `Nhập danh sách các sự kiện bài nghe và thứ tự đúng cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}.`,
                templateFileName: 'mau_sap_xep_thu_tu_nghe.csv',
                columnsHint: 'Cột: Nội dung sự kiện (Event_Text) | Thứ tự đúng (Correct_Order: 1, 2, 3...) | Điểm (Score: mặc định 1)',
                placeholder: 'Welcome aboard meeting at main lounge,1,1\nSafety drill and lifeboat inspection,2,1\nCaptain\'s dinner in dining hall,3,1\nEvening musical performance on deck,4,1',
                getTemplateCsv: generateListeningOrderTemplateCsv,
                parseCsv: parseListeningOrderCsv,
                renderPreviewRow: (itm) => `<strong>Bài tập sắp xếp (${(itm.events || itm.listeningEvents || []).length} sự kiện):</strong> ${escapeHtml(itm.prompt)} (Điểm tối đa: ${itm.maxScore})`,
                onSingle: () => {
                    createSingleListeningOrder();
                },
                onImport: (items) => {
                    const startingPos = getNextPosition();
                    const batchItems = [];
                    items.forEach((parsed, idx) => {
                        const newItemId = generateUuid();
                        const rawEvents = parsed.events || parsed.listeningEvents || [];
                        const events = rawEvents.map((e, eIdx) => ({
                            label: e.label || String.fromCharCode(65 + eIdx),
                            rank: Number(e.correctRank || e.rank || eIdx + 1),
                            text: e.text || `Sự kiện ${e.label || String.fromCharCode(65 + eIdx)}`,
                            score: Number(e.score || 1)
                        }));
                        const sorted = [...events].sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
                        const totalScore = parsed.maxScore || events.reduce((sum, e) => sum + (e.score || 1), 0);
                        batchItems.push({
                            itemFamilyId: generateUuid(),
                            itemVersionId: newItemId,
                            position: startingPos + idx,
                            exerciseId: targetEx.exerciseId,
                            exerciseTitle: targetEx.title,
                            prompt: parsed.prompt || 'Nghe và sắp xếp thứ tự các sự kiện theo đúng trình tự thời gian',
                            helpText: '',
                            interactionType: 'single_choice',
                            pedagogicalTypeCode: 'listening_order',
                            layoutType: 'timeline_sequence',
                            graderType: 'ordered_sequence',
                            required: true,
                            maxScore: totalScore,
                            audioUrl: parsed.audioUrl || block.audioUrl || 'assets/34/test-1/listening.mp3',
                            events,
                            options: events.map((e) => ({ id: e.label, label: `Sự kiện ${e.label}` })),
                            skillCodes: ['listening'],
                            releasePolicy: 'inherit'
                        });
                        draftState.gradingKey.items[newItemId] = {
                            graderType: 'ordered_sequence',
                            expectedSequence: sorted.map(e => e.label)
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
    // Rank selector change for listening events
    const rankSelectors = container.querySelectorAll('.select-event-rank');
    rankSelectors.forEach(sel => {
        sel.addEventListener('change', () => {
            syncInputs();
            render();
        });
    });
    // Add event button
    const addEventBtns = container.querySelectorAll('.btn-add-listening-event');
    addEventBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            item.events = item.events || [];
            const nextLabel = String.fromCharCode(65 + item.events.length);
            const nextRank = item.events.length + 1;
            item.events.push({ label: nextLabel, rank: nextRank, text: `Sự kiện ${nextLabel}` });
            item.options = item.events.map(e => ({ id: e.label, label: `Sự kiện ${e.label}` }));
            item.maxScore = item.events.length;
            resequenceItemPositions();
            render();
        });
    });
    // Delete event button
    const delEventBtns = container.querySelectorAll('.btn-del-event');
    delEventBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const eIdx = Number(btn.getAttribute('data-event-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item || !item.events || item.events.length <= 2) {
                alert('Cần tối thiểu 2 sự kiện để tạo câu hỏi sắp xếp thứ tự.');
                return;
            }
            item.events.splice(eIdx, 1);
            item.events.forEach((ev, idx) => {
                ev.label = String.fromCharCode(65 + idx);
            });
            item.options = item.events.map(e => ({ id: e.label, label: `Sự kiện ${e.label}` }));
            item.maxScore = item.events.length;
            resequenceItemPositions();
            render();
        });
    });
}
