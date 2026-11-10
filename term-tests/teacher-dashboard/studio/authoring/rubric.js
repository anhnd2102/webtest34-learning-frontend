import { renderSvgIcon } from '../../ui/icons.js';
import { findPrecedingClozeScript } from '../draft-model.js';
import { openGenericBatchModal } from '.././batch-import.js';
import { generateRubricAsyncTemplateCsv, parseRubricAsyncCsv } from '.././content-import.js';
import { escapeHtml } from '../../ui/presentation.js';
import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';

export function bindRubricAuthoring({ container, draftState, builderOwner, actions }) {
  const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
// Add AI-Graded Open Text (rubric_async)
    function getRubricConfigForType(selectedType, points = 4) {
      const p = Math.max(0.25, Math.round(Number(points) * 100) / 100);
      if (selectedType === 'comprehension') {
        const s1 = Math.round(p * 0.7 * 100) / 100;
        const s2 = Math.round((p - s1) * 100) / 100;
        return {
          rubricCode: 'rubric_comprehension_v1',
          scoringVersion: 'rubric-comprehension-v1',
          defaultPrompt: '1. Từ "..." ở dòng thứ ... có nghĩa là gì? Thay thế cho từ/cụm từ nào?',
          criteria: [
            { id: 'comprehension', label: 'Mức độ hiểu nội dung (Comprehension)', maxScore: s1, requiredConcepts: [] },
            { id: 'keywords', label: 'Từ khóa & Khái niệm cốt lõi (Keywords)', maxScore: s2, requiredConcepts: [] }
          ]
        };
      }
      if (selectedType === 'speaking') {
        const s1 = Math.round(p * 0.4 * 100) / 100;
        const s2 = Math.round(p * 0.3 * 100) / 100;
        const s3 = Math.round((p - s1 - s2) * 100) / 100;
        return {
          rubricCode: 'rubric_speaking_v1',
          scoringVersion: 'rubric-speaking-v1',
          defaultPrompt: 'Answer the question in spoken or written format:',
          criteria: [
            { id: 'idea', label: 'Ý tưởng & Phát triển (Idea Development)', maxScore: s1, requiredConcepts: [] },
            { id: 'vocabulary', label: 'Từ vựng & Diễn đạt (Vocabulary)', maxScore: s2, requiredConcepts: [] },
            { id: 'coherence', label: 'Ngữ pháp & Mạch lạc (Grammar & Coherence)', maxScore: s3, requiredConcepts: [] }
          ]
        };
      }
      const s1 = Math.round(p * 0.5 * 100) / 100;
      const s2 = Math.round((p - s1) * 100) / 100;
      return {
        rubricCode: 'rubric_translation_v1',
        scoringVersion: 'rubric-translation-v1',
        defaultPrompt: 'Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi:',
        criteria: [
          { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: s1, requiredConcepts: [] },
          { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: s2, requiredConcepts: [] }
        ]
      };
    }

    const addRubricBtns = container.querySelectorAll('.btn-add-rubric-async');
    addRubricBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const rubricBatchModal = openGenericBatchModal({ owner: builderOwner,
          title: 'Tạo câu hỏi Tự luận chấm AI (AI Rubric)',
          subtitle: `Tạo câu hỏi tự luận có tiêu chí chấm AI thuộc bài tập ${targetEx.title || 'bài tập'}.`,
          defaultCount: 2,
          minCount: 1,
          maxCount: 10,
          defaultPoints: 4.0,
          extraConfigHtml: `
            <div class="form-group batch-rubric-type-form-group">
              <label class="form-label"><strong>Dạng câu hỏi tự luận (Question Type / Rubric Preset):</strong></label>
              <select class="form-control select-batch-rubric-type">
                <option value="translation">Dịch thuật (Translation) — Rubric 50% Ý nghĩa + 50% Ngữ pháp</option>
                <option value="comprehension" selected>Đọc hiểu Khối 03 (Reading Comprehension) — Rubric 70% Đọc hiểu + 30% Từ khóa</option>
                <option value="speaking">Speaking dạng văn bản (Speaking Text Response) — Rubric 40% Ý tưởng + 30% Từ vựng + 30% Ngữ pháp</option>
              </select>
              <span class="batch-rubric-type-hint">(Hệ thống sẽ tự động cấu hình các tiêu chí chấm AI phù hợp theo dạng bài được chọn)</span>
            </div>
            <div class="form-group batch-rubric-context-group" id="batch-rubric-context-group">
              <div class="batch-rubric-context-header">
                <label class="form-label">
                  ${renderSvgIcon('book', 'icon-inline')}
                  <span>Ngữ cảnh bài đọc / Script tham chiếu chung cho AI:</span>
                  <span class="badge badge-info batch-rubric-context-badge">Ẩn với học viên</span>
                </label>
                <button type="button" class="btn btn-secondary btn-sm btn-modal-pull-cloze-script" title="Tự động lấy đoạn văn từ bài Điền từ nội tuyến hoặc bài nghe phía trước">
                  ${renderSvgIcon('clipboard', 'icon-inline')} Lấy Script từ bài Điền từ phía trước
                </button>
              </div>
              <textarea class="form-control form-control-sm batch-rubric-context-input" rows="3" placeholder="Dán đoạn văn bài đọc hoặc Script bài nghe dùng chung cho các câu hỏi Đọc hiểu Khối 03 trong phần này...">${escapeHtml(targetEx.referenceContext || '')}</textarea>
              <div class="batch-rubric-context-hint">
                ${renderSvgIcon('lock', 'icon-inline')} <strong>Ẩn với học viên:</strong> AI sẽ đối chiếu văn bản này khi chấm các câu hỏi tự luận con trong bài tập.
              </div>
            </div>
          `,
          csvConfig: {
            templateFileName: 'mau_tu_luan_cham_ai.csv',
            columnsHint: 'Cột: Đề bài câu hỏi | Ngữ cảnh tham chiếu (nếu có) | Điểm tối đa | Loại rubric | Tiêu chí 1 | Tiêu chí 2',
            placeholder: '"Translate into English: Chuyến tàu rời cảng lúc 8 giờ sáng.",,4,translation,"Độ chính xác ý nghĩa (2đ)","Cấu trúc ngữ pháp (2đ)"\n"Từ \"innovative\" ở dòng 3 có nghĩa là gì?","Đoạn trích thông tin bài đọc...",4,comprehension,"Mức độ hiểu nội dung (2.8đ)","Từ khóa cốt lõi (1.2đ)"',
            getTemplateCsv: generateRubricAsyncTemplateCsv,
            parseCsv: parseRubricAsyncCsv,
            renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} (${itm.maxScore} điểm)`,
            onImport: (items, { defaultPoints = 4 } = {}) => {
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
                  helpText: parsed.helpText || '',
                  interactionType: 'long_text',
                  pedagogicalTypeCode: 'writing',
                  layoutType: 'default',
                  graderType: 'rubric_async',
                  required: true,
                  maxScore: itemScore,
                  options: [],
                  skillCodes: [],
                  releasePolicy: 'inherit'
                });
                draftState.gradingKey.items[newItemId] = {
                  graderType: 'rubric_async',
                  rubricCode: parsed.rubricCode || 'rubric_translation_v1',
                  rubricVersion: 1,
                  rubric: parsed.rubric || {
                    scoringVersion: 'rubric_translation_v1',
                    maxScore: itemScore,
                    criteria: [
                      { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: itemScore / 2, requiredConcepts: [] },
                      { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: itemScore / 2, requiredConcepts: [] }
                    ]
                  }
                };
              });
              insertItemsIntoBlockExercise(block, targetEx, batchItems);
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          },
          onConfirm: ({ count, defaultPoints = 4, modal }) => {
            const selectedType = modal?.querySelector?.('.select-batch-rubric-type')?.value || 'comprehension';
            if (selectedType === 'comprehension') {
              targetEx.exerciseType = 'comprehension';
              const modalContextInput = modal?.querySelector?.('.batch-rubric-context-input');
              if (modalContextInput && modalContextInput.value.trim()) {
                targetEx.referenceContext = modalContextInput.value.trim();
              }
            }
            const rubCfg = getRubricConfigForType(selectedType, defaultPoints);
            const startingPos = getNextPosition();
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
                prompt: rubCfg.defaultPrompt.includes('1.') ? `${i + 1}. Từ "..." ở dòng thứ ... có nghĩa là gì? Thay thế cho từ/cụm từ nào?` : `${rubCfg.defaultPrompt} ${currentPos}:`,
                helpText: '',
                interactionType: 'long_text',
                pedagogicalTypeCode: 'writing',
                layoutType: 'default',
                graderType: 'rubric_async',
                required: true,
                maxScore: defaultPoints,
                options: [],
                skillCodes: [],
                releasePolicy: 'inherit'
              });
              draftState.gradingKey.items[newItemId] = {
                graderType: 'rubric_async',
                rubricCode: rubCfg.rubricCode,
                rubricVersion: 1,
                rubric: {
                  scoringVersion: rubCfg.scoringVersion,
                  maxScore: defaultPoints,
                  criteria: rubCfg.criteria.map(c => ({ ...c }))
                }
              };
            }
            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            render();
          },
          onSingle: ({ modal, defaultPoints = 4 } = {}) => {
            const selectedType = modal?.querySelector?.('.select-batch-rubric-type')?.value || 'comprehension';
            if (selectedType === 'comprehension') {
              targetEx.exerciseType = 'comprehension';
              const modalContextInput = modal?.querySelector?.('.batch-rubric-context-input');
              if (modalContextInput && modalContextInput.value.trim()) {
                targetEx.referenceContext = modalContextInput.value.trim();
              }
            }
            const rubCfg = getRubricConfigForType(selectedType, defaultPoints);
            const nextPos = getNextPosition();
            const newItemId = generateUuid();
            const newItem = {
              itemFamilyId: generateUuid(),
              itemVersionId: newItemId,
              position: nextPos,
              exerciseId: targetEx.exerciseId,
              exerciseTitle: targetEx.title,
              prompt: `${rubCfg.defaultPrompt} ${nextPos}:`,
              helpText: '',
              interactionType: 'long_text',
              pedagogicalTypeCode: 'writing',
              layoutType: 'default',
              graderType: 'rubric_async',
              required: true,
              maxScore: defaultPoints,
              options: [],
              skillCodes: [],
              releasePolicy: 'inherit'
            };
            draftState.gradingKey.items[newItemId] = {
              graderType: 'rubric_async',
              rubricCode: rubCfg.rubricCode,
              rubricVersion: 1,
              rubric: {
                scoringVersion: rubCfg.scoringVersion,
                maxScore: defaultPoints,
                criteria: rubCfg.criteria.map(c => ({ ...c }))
              }
            };
            insertItemsIntoBlockExercise(block, targetEx, newItem);
            resequenceItemPositions();
            markAsDirty();
            render();
          }
        });

        if (rubricBatchModal) {
          const typeSel = rubricBatchModal.querySelector('.select-batch-rubric-type');
          const ctxGroup = rubricBatchModal.querySelector('#batch-rubric-context-group');
          const pullModalBtn = rubricBatchModal.querySelector('.btn-modal-pull-cloze-script');
          const ctxInput = rubricBatchModal.querySelector('.batch-rubric-context-input');

          const updateCtxVisibility = () => {
            if (!typeSel || !ctxGroup) return;
            if (typeSel.value === 'comprehension') {
              ctxGroup.style.display = 'block';
            } else {
              ctxGroup.style.display = 'none';
            }
          };

          if (typeSel) {
            typeSel.addEventListener('change', updateCtxVisibility);
            updateCtxVisibility();
          }

          if (pullModalBtn && ctxInput) {
            pullModalBtn.addEventListener('click', () => {
              const script = findPrecedingClozeScript(draftState, bIdx);
              if (script) {
                ctxInput.value = script;
              } else {
                alert('Không tìm thấy bài điền từ nội tuyến hoặc đoạn văn nào ở các phần phía trước.');
              }
            });
          }
        }
      });
    });


}
