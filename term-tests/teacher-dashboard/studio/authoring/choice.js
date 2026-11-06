import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';
import { openGenericBatchModal } from '.././batch-import.js';
import { escapeHtml } from '../../ui/presentation.js';
import { generateSingleChoiceTemplateCsv, parseSingleChoiceCsv } from '.././content-import.js';

export function bindChoiceAuthoring({ container, draftState, builderOwner, actions }) {
  const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
function createBatchSingleChoice(bIdx, targetEx, count = 1, optionCount = 4, defaultPoints = 1) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const startingPos = getNextPosition();
      block.items = block.items || [];
      const batchItems = [];
      const safeOptCount = Math.max(2, Math.min(4, parseInt(optionCount, 10) || 4));
      const layout = safeOptCount === 2 ? 'grid_2' : (safeOptCount === 3 ? 'grid_3' : 'grid_4');

      for (let i = 0; i < count; i++) {
        const currentPos = startingPos + i;
        const newItemId = generateUuid();
        batchItems.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: currentPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Câu hỏi ${currentPos}:`,
          helpText: '',
          interactionType: 'single_choice',
          pedagogicalTypeCode: 'multiple_choice',
          layoutType: layout,
          graderType: 'exact_option',
          required: true,
          maxScore: defaultPoints || 1,
          options: Array.from({ length: safeOptCount }, (_, oIdx) => ({
            id: String.fromCharCode(65 + oIdx),
            label: ''
          })),
          skillCodes: [],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        };
      }

      insertItemsIntoBlockExercise(block, targetEx, batchItems);
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    // Add Single Choice Question (Opens CSV / Excel import popup with single item creation option)
    const addScBtns = container.querySelectorAll('.btn-add-single-choice');
    addScBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        triggerScCsvUpload(bIdx, targetEx);
      });
    });

    function triggerScCsvUpload(bIdx, targetEx) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      openGenericBatchModal({ owner: builderOwner,
        title: 'Trắc nghiệm (Multiple Choice)',
        subtitle: `Nhập danh sách câu hỏi Trắc nghiệm cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Hỗ trợ 2, 3 hoặc 4 phương án (A, B, C, D) và tự động ánh xạ đáp án đúng.`,
        defaultCount: 5,
        minCount: 1,
        maxCount: 50,
        defaultPoints: 1.0,
        csvConfig: {
          templateFileName: 'mau_trac_nghiem_don.csv',
          columnsHint: 'Cột: Đề bài | Phương án A | B | C | D | Đáp án đúng | Giải thích | Điểm',
          placeholder: 'The cruise departs ___ Miami.,at,from,on,in,B,Cụm từ depart from,1\nShe is interested ___ marine life.,in,at,on,,A,Interested in,1',
          getTemplateCsv: generateSingleChoiceTemplateCsv,
          parseCsv: parseSingleChoiceCsv,
          renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} — <em>Đáp án: ${escapeHtml(itm.expectedOptionId.toUpperCase().replace('OPT_', ''))}</em> (${itm.options.length} phương án, ${itm.maxScore || 1} điểm)`,
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
                pedagogicalTypeCode: 'multiple_choice',
                layoutType: parsed.layoutType || 'grid_4',
                graderType: 'exact_option',
                required: true,
                maxScore: itemScore,
                options: parsed.options,
                explanation: parsed.explanation || '',
                skillCodes: [],
                releasePolicy: 'inherit'
              });
              draftState.gradingKey.items[newItemId] = {
                graderType: 'exact_option',
                expectedOptionId: parsed.expectedOptionId
              };
            });
            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            render();
          }
        },
        extraConfigHtml: `
          <div class="form-group batch-option-count-form-group" style="margin-top: 14px;">
            <label class="form-label"><strong>Số lượng phương án mỗi câu (khi tạo câu trống):</strong></label>
            <div class="batch-option-radios">
              <label class="batch-radio-label">
                <input type="radio" name="batch-single-choice-options" class="radio-batch-options" value="2" />
                <div class="batch-radio-text-wrap">
                  <span class="batch-radio-title">2 phương án</span>
                  <span class="batch-radio-sub">(A, B)</span>
                </div>
              </label>
              <label class="batch-radio-label">
                <input type="radio" name="batch-single-choice-options" class="radio-batch-options" value="3" />
                <div class="batch-radio-text-wrap">
                  <span class="batch-radio-title">3 phương án</span>
                  <span class="batch-radio-sub">(A, B, C)</span>
                </div>
              </label>
              <label class="batch-radio-label">
                <input type="radio" name="batch-single-choice-options" class="radio-batch-options" value="4" checked />
                <div class="batch-radio-text-wrap">
                  <span class="batch-radio-title">4 phương án</span>
                  <span class="batch-radio-sub">(A, B, C, D)</span>
                </div>
              </label>
            </div>
          </div>
        `,
        onConfirm: ({ count, defaultPoints = 1, modal }) => {
          let optCount = 4;
          if (modal) {
            const checked = modal.querySelector('input[name="batch-single-choice-options"]:checked') ||
                            modal.querySelector('.radio-batch-options:checked') ||
                            modal.querySelector('.select-batch-option-count');
            if (checked) optCount = parseInt(checked.value, 10) || 4;
          }
          createBatchSingleChoice(bIdx, targetEx, count, optCount, defaultPoints);
        },
        onSingle: ({ defaultPoints = 1, modal } = {}) => {
          let optCount = 4;
          if (modal) {
            const checked = modal.querySelector('input[name="batch-single-choice-options"]:checked') ||
                            modal.querySelector('.radio-batch-options:checked') ||
                            modal.querySelector('.select-batch-option-count');
            if (checked) optCount = parseInt(checked.value, 10) || 4;
          }
          createBatchSingleChoice(bIdx, targetEx, 1, optCount, defaultPoints);
        }
      });
    }

    // Add Multi-Select Group Question
    const addMgBtns = container.querySelectorAll('.btn-add-multi-group');
    addMgBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const groupId = `group_${bIdx + 1}_${Date.now().toString(36)}`;
        const newItem1Id = generateUuid();
        const newItem2Id = generateUuid();
        block.items = block.items || [];
        const optionsList = [
          { id: 'A', label: 'Phương án A' },
          { id: 'B', label: 'Phương án B' },
          { id: 'C', label: 'Phương án C' },
          { id: 'D', label: 'Phương án D' },
          { id: 'E', label: 'Phương án E' }
        ];
        const newGroupItems = [
          {
            itemFamilyId: generateUuid(),
            itemVersionId: newItem1Id,
            position: nextPos,
            exerciseId: targetEx.exerciseId,
            exerciseTitle: targetEx.title,
            prompt: `Chọn 2 đáp án chính xác (Vị trí 1):`,
            helpText: '',
            interactionType: 'multi_choice_group',
            pedagogicalTypeCode: 'multiple_choice_group',
            layoutType: 'grid_3',
            graderType: 'unordered_group_slot',
            groupId,
            required: true,
            maxScore: 1,
            options: JSON.parse(JSON.stringify(optionsList)),
            skillCodes: [],
            releasePolicy: 'inherit'
          },
          {
            itemFamilyId: generateUuid(),
            itemVersionId: newItem2Id,
            position: nextPos + 1,
            exerciseId: targetEx.exerciseId,
            exerciseTitle: targetEx.title,
            prompt: `Chọn 2 đáp án chính xác (Vị trí 2):`,
            helpText: '',
            interactionType: 'multi_choice_group',
            pedagogicalTypeCode: 'multiple_choice_group',
            layoutType: 'grid_3',
            graderType: 'unordered_group_slot',
            groupId,
            required: true,
            maxScore: 1,
            options: JSON.parse(JSON.stringify(optionsList)),
            skillCodes: [],
            releasePolicy: 'inherit'
          }
        ];
        insertItemsIntoBlockExercise(block, targetEx, newGroupItems);
        draftState.gradingKey.groups[groupId] = {
          graderType: 'unordered_group_slot',
          expectedOptionIds: ['A', 'B']
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });


}
