import { openGenericBatchModal } from '.././batch-import.js';
import { generateReadingMatchingTemplateCsv, parseReadingMatchingCsv } from '.././content-import.js';
import { escapeHtml } from '../../ui/presentation.js';
import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';
import { extractParagraphLabels } from '.././question-content.js';

export function bindReadingMatchingAuthoring({ container, draftState, builderOwner, actions }) {
  const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
// Add Reading Split-Pane & Matching Question
    const addReadingMatchingBtns = container.querySelectorAll('.btn-add-reading-matching');
    addReadingMatchingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        openGenericBatchModal({ owner: builderOwner,
          title: 'Tạo câu hỏi Ghép nối đoạn văn (Reading Matching)',
          subtitle: `Tạo câu hỏi ghép Heading cho từng đoạn văn thuộc bài tập ${targetEx.title || 'bài tập'}.`,
          defaultCount: 4,
          minCount: 1,
          maxCount: 20,
          csvConfig: {
            templateFileName: 'mau_ghep_noi_doan_van.csv',
            columnsHint: 'Cột: Tên đoạn văn (Paragraph_Label) | Mã Heading | Nội dung Heading | Đáp án đúng (true/false) | Điểm',
            placeholder: 'Paragraph A,i,The spy in the sky,true,1\nParagraph A,ii,The spread of technology,false,0\nParagraph B,ii,The spread of technology,true,1',
            getTemplateCsv: generateReadingMatchingTemplateCsv,
            parseCsv: parseReadingMatchingCsv,
            renderPreviewRow: (itm, idx) => `<strong>${escapeHtml(itm.prompt)}:</strong> Đáp án mã <em>${escapeHtml(itm.expectedOptionId)}</em> (${itm.options.length} headings, ${itm.maxScore}đ)`,
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
                  pedagogicalTypeCode: 'reading_matching',
                  layoutType: 'split_pane_matching',
                  graderType: 'exact_option',
                  required: true,
                  maxScore: itemScore,
                  readingPassage: block.readingPassage || '',
                  options: parsed.options,
                  skillCodes: ['reading'],
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
          onConfirm: ({ count }) => {
            const startingPos = getNextPosition();
            const batchItems = [];
            const defaultHeadings = [
              { id: 'i', label: 'i. The spy in the sky' },
              { id: 'ii', label: 'ii. The spread of technology' },
              { id: 'iii', label: 'iii. The limitations of cameras' },
              { id: 'iv', label: 'iv. The cost of cameras' },
              { id: 'v', label: 'v. Advantages and disadvantages' }
            ];
            for (let i = 0; i < count; i++) {
              const newItemId = generateUuid();
              batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: startingPos + i,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: `Paragraph ${String.fromCharCode(65 + i)}`,
                helpText: '',
                interactionType: 'single_choice',
                pedagogicalTypeCode: 'reading_matching',
                layoutType: 'split_pane_matching',
                graderType: 'exact_option',
                required: true,
                maxScore: 1,
                readingPassage: block.readingPassage || '',
                options: defaultHeadings,
                skillCodes: ['reading'],
                releasePolicy: 'inherit'
              });
              draftState.gradingKey.items[newItemId] = {
                graderType: 'exact_option',
                expectedOptionId: defaultHeadings[i % defaultHeadings.length].id
              };
            }
            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            render();
          },
          onSingle: () => {
            const nextPos = getNextPosition();
            const newItemId = generateUuid();
            const defaultHeadings = [
              { id: 'i', label: 'i. The spy in the sky' },
              { id: 'ii', label: 'ii. The spread of technology' }
            ];
            const newItem = {
              itemFamilyId: generateUuid(),
              itemVersionId: newItemId,
              position: nextPos,
              exerciseId: targetEx.exerciseId,
              exerciseTitle: targetEx.title,
              prompt: `Paragraph A`,
              helpText: '',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'reading_matching',
              layoutType: 'split_pane_matching',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              readingPassage: block.readingPassage || '',
              options: defaultHeadings,
              skillCodes: ['reading'],
              releasePolicy: 'inherit'
            };
            insertItemsIntoBlockExercise(block, targetEx, newItem);
            draftState.gradingKey.items[newItemId] = {
              graderType: 'exact_option',
              expectedOptionId: 'i'
            };
            resequenceItemPositions();
            markAsDirty();
            render();
          }
        });
      });
    });

    // Extract paragraph labels from reading passage
    const extractParaBtns = container.querySelectorAll('.btn-extract-paragraphs');
    extractParaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const passage = block.readingPassage || '';
        const labels = extractParagraphLabels(passage);
        if (labels.length) {
          alert(`Đã nhận diện thành công ${labels.length} đoạn văn trong bài đọc: [${labels.join(', ')}]`);
        } else {
          alert('Chưa tìm thấy nhãn đoạn văn dạng "Paragraph A" hoặc "[A]" trong bài đọc. Vui lòng thêm tiền tố nhãn vào các đoạn văn.');
        }
        render();
      });
    });

    // Add matching option button
    const addMatchingOptBtns = container.querySelectorAll('.btn-add-matching-option');
    addMatchingOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        item.options = item.options || [];
        const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
        const nextId = romanNumerals[item.options.length] || `h${item.options.length + 1}`;
        item.options.push({ id: nextId, label: `${nextId}. Tiêu đề mới` });
        render();
      });
    });

    // Delete matching option button
    const delMatchingOptBtns = container.querySelectorAll('.btn-del-matching-option');
    delMatchingOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const optId = btn.getAttribute('data-option-id');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item || !item.options || item.options.length <= 2) {
          alert('Mỗi câu hỏi ghép nối cần tối thiểu 2 phương án lựa chọn.');
          return;
        }
        item.options = item.options.filter(o => o.id !== optId);
        render();
      });
    });


}
