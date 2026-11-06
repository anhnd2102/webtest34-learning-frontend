import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';
import { trackBuilderModal } from '../../navigation/unsaved-changes.js';
import { renderSvgIcon } from '../../ui/icons.js';
import { escapeHtml } from '../../ui/presentation.js';
import { openGenericBatchModal } from '.././batch-import.js';
import { generatePictorialVocabTemplateCsv, parsePictorialVocabCsv } from '.././content-import.js';
import { generateHangmanHint, expandSentenceVariants } from '.././question-content.js';
import { convertGoogleDriveImageUrl } from '.././media.js';

export function bindPictorialAuthoring({ container, draftState, builderOwner, actions }) {
  const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
function createSinglePictorialItem(bIdx, targetEx) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const nextPos = getNextPosition();
      const newItemId = generateUuid();
      block.items = block.items || [];
      const newItem = {
        itemFamilyId: generateUuid(),
        itemVersionId: newItemId,
        position: nextPos,
        exerciseId: targetEx.exerciseId,
        exerciseTitle: targetEx.title,
        prompt: `Từ vựng qua ảnh ${nextPos}`,
        helpText: '',
        interactionType: 'short_text',
        pedagogicalTypeCode: 'pictorial_vocabulary',
        layoutType: 'pictorial_card',
        graderType: 'accepted_text',
        required: true,
        maxScore: 1,
        image: `assets/test 1/vocabulary/image${nextPos}.png`,
        captionHint: '',
        letterHint: '',
        options: [],
        skillCodes: ['vocabulary'],
        releasePolicy: 'inherit'
      };
      insertItemsIntoBlockExercise(block, targetEx, newItem);
      draftState.gradingKey.items[newItemId] = {
        graderType: 'accepted_text',
        accepted: [],
        normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
      };
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    function openBatchPictorialModal(bIdx, targetEx) {
      if (typeof document === 'undefined') {
        createSinglePictorialItem(bIdx, targetEx);
        return;
      }
      const block = draftState.blocks[bIdx];
      if (!block) return;

      let modal = document.querySelector('#batch-pictorial-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'batch-pictorial-modal';
        modal.className = 'modal-batch-vocab-overlay';
        document.body.appendChild(modal);
      }
      trackBuilderModal(modal, builderOwner);

      modal.innerHTML = `
        <div class="modal-batch-vocab-card">
          <div class="modal-batch-vocab-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${renderSvgIcon('plusCircle', 'icon-inline')}
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">Tạo hàng loạt câu hỏi Thẻ từ vựng qua ảnh</h3>
            </div>
            <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
          <div class="modal-batch-vocab-body">
            <div class="alert-notice alert-info" style="margin: 0; padding: 10px 14px; font-size: 0.85rem;">
              Tạo nhanh các câu hỏi Thẻ từ vựng qua ảnh thuộc bài tập <strong>${escapeHtml(targetEx.title || 'Bài tập')}</strong>. Sau khi sinh hàng loạt, giáo viên sẽ điền hình ảnh, từ mục tiêu và sinh gợi ý Hangman trực tiếp trên từng câu.
            </div>
            <div class="form-group">
              <label class="form-label"><strong>Tổng số câu hỏi cần tạo:</strong></label>
              <input type="number" class="form-control input-batch-pictorial-count" min="1" max="100" value="25" style="max-width: 160px; font-weight: 700;" />
              <span style="font-size: 0.8rem; color: #64748b;">(Ví dụ: 25 câu hoặc 50 câu)</span>
            </div>
          </div>
          <div class="modal-batch-vocab-footer">
            <button type="button" class="btn btn-secondary btn-batch-single">
              + Chỉ tạo 1 câu
            </button>
            <button type="button" class="btn btn-primary btn-batch-confirm">
              ${renderSvgIcon('plusCircle', 'icon-inline')} <span>Tạo câu hỏi hàng loạt</span>
            </button>
          </div>
        </div>
      `;

      const closeModal = () => {
        modal.style.display = 'none';
      };

      const closeBtn = modal.querySelector('.btn-close-batch-modal');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      const singleBtn = modal.querySelector('.btn-batch-single');
      if (singleBtn) {
        singleBtn.addEventListener('click', () => {
          closeModal();
          createSinglePictorialItem(bIdx, targetEx);
        });
      }

      const confirmBtn = modal.querySelector('.btn-batch-confirm');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          const countInput = modal.querySelector('.input-batch-pictorial-count');
          const count = Math.max(1, Math.min(100, parseInt(countInput?.value, 10) || 25));

          block.items = block.items || [];
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
              prompt: `Từ vựng qua ảnh ${currentPos}`,
              helpText: '',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              required: true,
              maxScore: 1,
              image: `assets/test 1/vocabulary/image${currentPos}.png`,
              captionHint: '',
              letterHint: '',
              options: [],
              skillCodes: ['vocabulary'],
              releasePolicy: 'inherit'
            });

            draftState.gradingKey.items[newItemId] = {
              graderType: 'accepted_text',
              accepted: [],
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
          }

          insertItemsIntoBlockExercise(block, targetEx, batchItems);

          resequenceItemPositions();
          markAsDirty();
          closeModal();
          render();
        });
      }

      modal.style.display = 'flex';
    }

    // Add Pictorial Vocabulary Question
    const addPictorialBtns = container.querySelectorAll('.btn-add-pictorial');
    addPictorialBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        openGenericBatchModal({ owner: builderOwner,
          title: 'Tạo câu hỏi Thẻ từ vựng qua ảnh (Pictorial Cards)',
          subtitle: `Tạo câu hỏi từ vựng qua ảnh cho bài tập ${targetEx.title || 'bài tập'}. Hỗ trợ dán hoặc tải file CSV có URL ảnh, từ khóa và nghĩa tiếng Việt.`,
          defaultCount: 10,
          minCount: 1,
          maxCount: 50,
          csvConfig: {
            templateFileName: 'mau_tu_vung_qua_anh.csv',
            columnsHint: 'Cột: Đường dẫn ảnh (Image_URL) | Từ vựng (Target_Word) | Nghĩa tiếng Việt | Biến thể (|) | Điểm',
            placeholder: 'assets/test 1/vocabulary/image1.png,apple,quả táo,an apple|the apple,1\nassets/test 1/vocabulary/image2.png,camera,máy ảnh,a camera,1',
            getTemplateCsv: generatePictorialVocabTemplateCsv,
            parseCsv: parsePictorialVocabCsv,
            renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> [Ảnh: ${escapeHtml(itm.image)}] <strong>${escapeHtml(itm.targetWord)}</strong> (${escapeHtml(itm.captionHint || '')})`,
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
                  prompt: parsed.targetWord,
                  helpText: '',
                  interactionType: 'short_text',
                  pedagogicalTypeCode: 'pictorial_vocabulary',
                  layoutType: 'pictorial_card',
                  graderType: 'accepted_text',
                  required: true,
                  maxScore: itemScore,
                  image: parsed.image || `assets/test 1/vocabulary/image${startingPos + idx}.png`,
                  captionHint: parsed.captionHint || '',
                  letterHint: generateHangmanHint(parsed.targetWord),
                  options: [],
                  skillCodes: ['vocabulary'],
                  releasePolicy: 'inherit'
                });
                draftState.gradingKey.items[newItemId] = {
                  graderType: 'accepted_text',
                  accepted: parsed.accepted || [parsed.targetWord],
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
                prompt: `Từ vựng qua ảnh ${currentPos}`,
                helpText: '',
                interactionType: 'short_text',
                pedagogicalTypeCode: 'pictorial_vocabulary',
                layoutType: 'pictorial_card',
                graderType: 'accepted_text',
                required: true,
                maxScore: 1,
                image: `assets/test 1/vocabulary/image${currentPos}.png`,
                captionHint: '',
                letterHint: '',
                options: [],
                skillCodes: ['vocabulary'],
                releasePolicy: 'inherit'
              });
              draftState.gradingKey.items[newItemId] = {
                graderType: 'accepted_text',
                accepted: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            }
            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            render();
          },
          onSingle: () => {
            const startingPos = getNextPosition();
            const newItemId = generateUuid();
            const newItem = {
              itemFamilyId: generateUuid(),
              itemVersionId: newItemId,
              position: startingPos,
              exerciseId: targetEx.exerciseId,
              exerciseTitle: targetEx.title,
              prompt: `Từ vựng qua ảnh ${startingPos}`,
              helpText: '',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              required: true,
              maxScore: 1,
              image: `assets/test 1/vocabulary/image${startingPos}.png`,
              captionHint: '',
              letterHint: '',
              options: [],
              skillCodes: ['vocabulary'],
              releasePolicy: 'inherit'
            };
            draftState.gradingKey.items[newItemId] = {
              graderType: 'accepted_text',
              accepted: [],
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
            insertItemsIntoBlockExercise(block, targetEx, newItem);
            resequenceItemPositions();
            markAsDirty();
            render();
          }
        });
      });
    });

    // Generate Hangman Hint from target word
    const genHangmanBtns = container.querySelectorAll('.btn-generate-hangman');
    genHangmanBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const targetInput = card?.querySelector('.input-pictorial-target');
        const targetVal = targetInput?.value?.trim() || '';
        if (!targetVal) {
          alert('Vui lòng nhập từ hoặc cụm từ mục tiêu trước khi tạo gợi ý Hangman.');
          return;
        }
        item.letterHint = generateHangmanHint(targetVal);
        const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
          graderType: 'accepted_text',
          accepted: [],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        const generated = expandSentenceVariants([targetVal]);
        const prevAccepted = Array.isArray(currentKey.accepted) ? currentKey.accepted : [];
        currentKey.accepted = Array.from(new Set([...prevAccepted, ...generated]));
        draftState.gradingKey.items[item.itemVersionId] = currentKey;
        render();
      });
    });

    // Pictorial Drive image conversion & preview listeners
    const pictorialImageInputs = container.querySelectorAll('.input-pictorial-image');
    pictorialImageInputs.forEach(input => {
      const updatePreview = () => {
        const raw = input.value ? input.value.trim() : '';
        const converted = convertGoogleDriveImageUrl(raw);
        if (converted !== raw) {
          input.value = converted;
        }
        const bIdx = Number(input.getAttribute('data-block-idx'));
        const iIdx = Number(input.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item) {
          item.image = converted || null;
          item.stimulusImageUrl = converted || null;
        }
        const card = input.closest ? (input.closest('.builder-item-card') || input.parentElement?.parentElement) : null;
        const previewImg = card?.querySelector ? card.querySelector('.pictorial-preview-img') : null;
        const previewErr = card?.querySelector ? card.querySelector('.pictorial-preview-error') : null;
        if (previewImg) {
          if (converted) {
            previewImg.src = converted;
            previewImg.style.display = 'inline-block';
            if (previewErr) previewErr.style.display = 'none';
          } else {
            previewImg.src = '';
            previewImg.style.display = 'none';
            if (previewErr) previewErr.style.display = 'none';
          }
        }
      };
      input.addEventListener('input', updatePreview);
      input.addEventListener('change', updatePreview);
      input.addEventListener('paste', () => {
        setTimeout(updatePreview, 20);
      });
    });

    const previewDriveBtns = container.querySelectorAll('.btn-preview-drive-image');
    previewDriveBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest ? (btn.closest('.builder-item-card') || btn.parentElement?.parentElement) : null;
        const input = card?.querySelector ? card.querySelector('.input-pictorial-image') : null;
        if (input) {
          const raw = input.value ? input.value.trim() : '';
          const converted = convertGoogleDriveImageUrl(raw);
          if (converted !== raw) input.value = converted;
          const bIdx = Number(btn.getAttribute('data-block-idx'));
          const iIdx = Number(btn.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (item) {
            item.image = converted || null;
            item.stimulusImageUrl = converted || null;
          }
          const previewImg = card?.querySelector ? card.querySelector('.pictorial-preview-img') : null;
          const previewErr = card?.querySelector ? card.querySelector('.pictorial-preview-error') : null;
          if (previewImg) {
            if (converted) {
              previewImg.src = converted;
              previewImg.style.display = 'inline-block';
              if (previewErr) previewErr.style.display = 'none';
            } else {
              previewImg.src = '';
              previewImg.style.display = 'none';
            }
          }
        }
      });
    });


}
