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
      if (selectedType === 'writing_summary') {
        const s1 = Math.round(p * 0.5 * 100) / 100;
        const s2 = Math.round((p - s1) * 100) / 100;
        return {
          rubricCode: 'rubric_summary_v1',
          scoringVersion: 'rubric-summary-v1',
          defaultPrompt: 'Tóm tắt ý chính của đoạn văn trên trong khoảng 30-50 từ:',
          criteria: [
            { id: 'main_ideas', label: 'Ý chính đầy đủ & Khái quát chuẩn xác', maxScore: s1, requiredConcepts: [] },
            { id: 'grammar_vocab', label: 'Ngữ pháp và từ vựng phù hợp', maxScore: s2, requiredConcepts: [] }
          ]
        };
      }
      if (selectedType === 'custom') {
        const s1 = Math.round(p * 0.5 * 100) / 100;
        const s2 = Math.round((p - s1) * 100) / 100;
        return {
          rubricCode: 'rubric_custom_v1',
          scoringVersion: 'rubric-custom-v1',
          defaultPrompt: 'Viết câu trả lời tự luận cho câu hỏi sau:',
          criteria: [
            { id: 'content', label: 'Nội dung & Lập luận', maxScore: s1, requiredConcepts: [] },
            { id: 'language', label: 'Ngôn ngữ & Ngữ pháp', maxScore: s2, requiredConcepts: [] }
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
        openGenericBatchModal({ owner: builderOwner,
          title: 'Tạo câu hỏi Tự luận chấm AI (AI Rubric)',
          subtitle: `Tạo câu hỏi tự luận có tiêu chí chấm AI thuộc bài tập ${targetEx.title || 'bài tập'}.`,
          defaultCount: 2,
          minCount: 1,
          maxCount: 10,
          defaultPoints: 4.0,
          extraConfigHtml: `
            <div class="form-group batch-rubric-type-form-group" style="margin-top: 14px;">
              <label class="form-label"><strong>Dạng câu hỏi tự luận (Question Type / Rubric Preset):</strong></label>
              <select class="form-control select-batch-rubric-type" style="font-weight: 600; padding: 8px 12px; border-radius: 6px;">
                <option value="translation" selected>Dịch thuật (Translation) — Rubric 50% Ý nghĩa + 50% Ngữ pháp</option>
                <option value="comprehension">Đọc hiểu Khối 03 (Reading Comprehension) — Rubric 70% Đọc hiểu + 30% Từ khóa</option>
                <option value="writing_summary">Tóm tắt bài đọc (Writing Summary) — Rubric 50% Ý chính + 50% Ngữ pháp</option>
                <option value="custom">Tự luận mở chung (Custom Rubric) — Tự thiết lập tiêu chí</option>
              </select>
              <span style="font-size: 0.8rem; color: #64748b; margin-top: 4px; display: block;">(Hệ thống sẽ tự động cấu hình các tiêu chí chấm AI phù hợp theo dạng bài được chọn)</span>
            </div>
          `,
          csvConfig: {
            templateFileName: 'mau_tu_luan_cham_ai.csv',
            columnsHint: 'Cột: Đề bài câu hỏi | Ngữ cảnh tham chiếu (nếu có) | Điểm tối đa | Loại rubric | Tiêu chí 1 | Tiêu chí 2',
            placeholder: '"Tóm tắt ý chính của đoạn văn trên trong 50 từ.","Đoạn trích thông tin bài đọc...",4,writing_summary,"Ý chính đầy đủ (2đ)","Ngữ pháp và từ vựng (2đ)"\n"Translate into English: Chuyến tàu rời cảng lúc 8 giờ sáng.",,4,rubric_translation_v1,"Độ chính xác ý nghĩa (2đ)","Cấu trúc ngữ pháp (2đ)"',
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
            const selectedType = modal?.querySelector?.('.select-batch-rubric-type')?.value || 'translation';
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
            const selectedType = modal?.querySelector?.('.select-batch-rubric-type')?.value || 'translation';
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
      });
    });


}
