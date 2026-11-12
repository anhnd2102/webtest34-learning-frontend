import { generateUuid } from '../draft-model.js';
import { insertItemsIntoBlockExercise } from '.././draft-model.js';
import { trackBuilderModal } from '../../navigation/unsaved-changes.js';
import { renderSvgIcon } from '../../ui/icons.js';
import { escapeHtml } from '../../ui/presentation.js';
import { generateVocabPairTemplateCsv, parseVocabPairCsv } from '.././content-import.js';
import { parseUploadedFileToCsv } from '.././batch-import.js';
import { expandSentenceVariants } from '.././question-content.js';

export function bindVocabularyAuthoring({ container, draftState, builderOwner, actions }) {
  const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
function createSingleVocabItem(bIdx, targetEx) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const nextPos = getNextPosition();
      const newItemId = generateUuid();
      block.items = block.items || [];

      // Check if there is an existing vocabulary pair in this block to clone meaning options
      let inheritedOptions = null;
      for (let p = block.items.length - 1; p >= 0; p--) {
        const prev = block.items[p];
        if (prev && prev.interactionType === 'text_select_pair' && prev.options && prev.options.length >= 2) {
          inheritedOptions = prev.options.map(o => ({ id: o.id, label: o.label }));
          break;
        }
      }

      const initialOptions = inheritedOptions || [
        { id: 'opt_1', label: 'Nghĩa phương án 1' },
        { id: 'opt_2', label: 'Nghĩa phương án 2' },
        { id: 'opt_3', label: 'Nghĩa phương án 3' },
        { id: 'opt_4', label: 'Nghĩa phương án 4' }
      ];

      const newItem = {
        itemFamilyId: generateUuid(),
        itemVersionId: newItemId,
        position: nextPos,
        exerciseId: targetEx.exerciseId,
        exerciseTitle: targetEx.title,
        prompt: `Từ vựng câu ${nextPos}`,
        helpText: '',
        interactionType: 'text_select_pair',
        pedagogicalTypeCode: 'vocabulary_pair',
        layoutType: 'default',
        graderType: 'accepted_text_exact_option',
        required: true,
        maxScore: 1,
        options: initialOptions,
        skillCodes: [],
        releasePolicy: 'inherit'
      };
      insertItemsIntoBlockExercise(block, targetEx, newItem);
      draftState.gradingKey.items[newItemId] = {
        graderType: 'accepted_text_exact_option',
        accepted: [],
        expectedOptionId: initialOptions[0].id,
        normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
      };
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    function openBatchVocabPairModal(bIdx, targetEx) {
      if (typeof document === 'undefined') {
        createSingleVocabItem(bIdx, targetEx);
        return;
      }
      const block = draftState.blocks[bIdx];
      if (!block) return;

      let inheritedOptions = null;
      for (let p = (block.items || []).length - 1; p >= 0; p--) {
        const prev = block.items[p];
        if (prev && prev.interactionType === 'text_select_pair' && prev.options && prev.options.length >= 2) {
          inheritedOptions = prev.options.map(o => o.label).filter(Boolean);
          break;
        }
      }

      let modal = document.querySelector('#batch-vocab-pair-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'batch-vocab-pair-modal';
        modal.className = 'modal-batch-vocab-overlay';
        document.body.appendChild(modal);
      }
      trackBuilderModal(modal, builderOwner);

      const defaultMeanings = inheritedOptions && inheritedOptions.length >= 2
        ? inheritedOptions.join('\n')
        : '';

      modal.innerHTML = `
        <div class="modal-batch-vocab-card">
          <div class="modal-batch-vocab-header">
            <div class="vocab-batch-title">
              ${renderSvgIcon('fileText', 'icon-inline')}
              <h3>Nhập Cặp từ vựng vào Exercise (CSV / Excel)</h3>
            </div>
            <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
          <div class="modal-batch-vocab-body">
            <div class="alert-notice alert-info vocab-batch-notice">
              Nhập danh sách từ vựng cho bài tập <strong>${escapeHtml(targetEx.title || 'Bài tập')}</strong>. Cột 2 (nghĩa tiếng Việt) sẽ tự động được gộp trùng, sắp xếp tăng dần A-Z tiếng Việt và ánh xạ chính xác vào đáp án.
            </div>

            <div class="vocab-batch-file-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-download-template">
                ${renderSvgIcon('download', 'icon-inline')} <span>Tải file mẫu CSV</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-trigger-csv-file">
                ${renderSvgIcon('upload', 'icon-inline')} <span>Chọn file .CSV</span>
              </button>
              <input type="file" class="input-vocab-csv-file vocab-batch-hidden" accept=".csv,text/csv,text/plain" />
              <span class="vocab-batch-hint">(Hỗ trợ UTF-8 BOM, tab Excel hoặc dấu phẩy)</span>
            </div>

            <div class="form-group vocab-batch-csv-field">
              <label class="form-label vocab-batch-csv-label">
                <strong>Dán 2 cột từ Excel / Sheets hoặc nội dung CSV:</strong>
                <span class="vocab-batch-hint">Cột 1: Từ tiếng Anh | Cột 2: Nghĩa tiếng Việt</span>
              </label>
              <textarea class="form-control textarea-batch-vocab-csv" rows="8" placeholder="destination&#9;điểm đến&#10;itinerary&#9;lịch trình chuyến đi&#10;resilient&#9;kiên cường&#10;sustainable&#9;bền vững&#10;environment&#9;môi trường"></textarea>
            </div>

            <div class="vocab-preview-summary" style="display: none;"></div>

            <div class="vocab-batch-options">
              <label class="batch-checkbox-row">
                <input type="checkbox" class="chk-auto-variants" checked />
                <span>Tự động sinh biến thể đáp án sau khi nhập (Apostrophe, contractions, NFKC)</span>
              </label>
              <label class="batch-checkbox-row">
                <input type="checkbox" class="chk-replace-existing" />
                <span>Xóa các câu từ vựng cũ trong bài tập này trước khi nhập (Mặc định: Thêm tiếp vào sau)</span>
              </label>
            </div>
          </div>
          <div class="modal-batch-vocab-footer">
            <button type="button" class="btn btn-secondary btn-batch-single">
              + Chỉ tạo 1 câu thủ công
            </button>
            <div class="vocab-batch-footer-actions">
              <button type="button" class="btn btn-secondary btn-close-batch-modal-btn">Hủy bỏ</button>
              <button type="button" class="btn btn-primary btn-batch-confirm">
                ${renderSvgIcon('check', 'icon-inline')} <span>Xác nhận nhập dữ liệu</span>
              </button>
            </div>
          </div>
        </div>
      `;

      const closeModal = () => {
        modal.style.display = 'none';
      };

      const closeBtns = modal.querySelectorAll('.btn-close-batch-modal, .btn-close-batch-modal-btn');
      closeBtns.forEach(btn => btn.addEventListener('click', closeModal));

      // Download CSV Template
      const downloadBtn = modal.querySelector('.btn-download-template');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          const csvContent = generateVocabPairTemplateCsv();
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', 'mau_cap_tu_vung.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        });
      }

      // File Upload trigger
      const triggerFileBtn = modal.querySelector('.btn-trigger-csv-file');
      const fileInput = modal.querySelector('.input-vocab-csv-file');
      const textarea = modal.querySelector('.textarea-batch-vocab-csv');
      const previewBox = modal.querySelector('.vocab-preview-summary');

      const updatePreview = () => {
        if (!textarea || !previewBox) return;
        const val = textarea.value.trim();
        if (!val) {
          previewBox.style.display = 'none';
          return;
        }
        const parsed = parseVocabPairCsv(val);
        previewBox.style.display = 'block';
        if (parsed.validRows.length === 0) {
          previewBox.innerHTML = `<span class="vocab-batch-preview-error">Chưa tìm thấy cặp từ vựng hợp lệ nào. Vui lòng kiểm tra định dạng dữ liệu (mỗi dòng gồm 2 cột cách nhau bằng Tab hoặc phẩy).</span>`;
        } else {
          let html = `<span class="vocab-batch-preview-success">Tìm thấy ${parsed.validRows.length} cặp từ vựng hợp lệ.</span> Sắp xếp A-Z tiếng Việt và tự động ánh xạ đáp án.`;
          if (parsed.invalidRows.length > 0) {
            html += `<br/><span class="vocab-batch-preview-warning">Bỏ qua ${parsed.invalidRows.length} dòng không đủ 2 cột (Dòng: ${parsed.invalidRows.slice(0, 5).map(r => r.line).join(', ')}${parsed.invalidRows.length > 5 ? '...' : ''}).</span>`;
          }
          previewBox.innerHTML = html;
        }
      };

      if (triggerFileBtn && fileInput) {
        triggerFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          parseUploadedFileToCsv(file, (err, csvText) => {
            if (err) {
              if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                window.alert(err.message || 'Không thể đọc file.');
              }
              return;
            }
            if (textarea) {
              textarea.value = csvText || '';
              updatePreview();
            }
          });
        });
      }

      if (textarea) {
        textarea.addEventListener('input', updatePreview);
      }

      // Single item creation
      const singleBtn = modal.querySelector('.btn-batch-single');
      if (singleBtn) {
        singleBtn.addEventListener('click', () => {
          closeModal();
          createSingleVocabItem(bIdx, targetEx);
        });
      }

      // Batch creation
      const confirmBtn = modal.querySelector('.btn-batch-confirm');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          const val = textarea?.value?.trim() || '';
          const autoVariants = modal.querySelector('.chk-auto-variants')?.checked !== false;
          const replaceExisting = modal.querySelector('.chk-replace-existing')?.checked === true;

          const parsed = parseVocabPairCsv(val);

          if (parsed.validRows.length > 0) {
            if (replaceExisting) {
              block.items = (block.items || []).filter(it => !(it.exerciseId === targetEx.exerciseId && it.interactionType === 'text_select_pair'));
            }

            block.items = block.items || [];

            // Thu thập toàn bộ nghĩa tiếng Việt và sắp xếp tăng dần theo tiếng Việt (A-Z)
            const allVietnamese = Array.from(new Set(parsed.validRows.map(r => r.vietnamese))).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));

            const options = allVietnamese.map((label, idx) => ({
              id: `meaning-${String(idx + 1).padStart(2, '0')}`,
              label
            }));

            const startingPos = getNextPosition();
            const batchItems = [];

            parsed.validRows.forEach((row, i) => {
              const currentPos = startingPos + i;
              const newItemId = generateUuid();
              const matchedOpt = options.find(o => o.label === row.vietnamese) || options[0];

              batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: currentPos,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: row.english,
                targetWord: row.english,
                helpText: '',
                interactionType: 'text_select_pair',
                pedagogicalTypeCode: 'vocabulary_pair',
                layoutType: 'default',
                graderType: 'accepted_text_exact_option',
                required: true,
                maxScore: 1,
                options: options.map(o => ({ id: o.id, label: o.label })),
                skillCodes: [],
                releasePolicy: 'inherit'
              });

              const acceptedVariants = autoVariants ? expandSentenceVariants([row.english]) : [row.english];

              draftState.gradingKey.items[newItemId] = {
                graderType: 'accepted_text_exact_option',
                accepted: acceptedVariants,
                expectedOptionId: matchedOpt.id,
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            });

            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            closeModal();
            render();
            return;
          }

          // Fallback nếu không có nội dung CSV hợp lệ: tạo 1 câu đơn
          closeModal();
          createSingleVocabItem(bIdx, targetEx);
        });
      }

      modal.style.display = 'flex';
    }

    // Add Vocabulary Pair Question
    const addVocabPairBtns = container.querySelectorAll('.btn-add-vocab-pair');
    addVocabPairBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        openBatchVocabPairModal(bIdx, targetEx);
      });
    });


    // Upload Vocab Pair CSV
    const uploadVocabCsvBtns = container.querySelectorAll('.btn-upload-vocab-csv');
    if (uploadVocabCsvBtns && typeof uploadVocabCsvBtns.forEach === 'function') {
      uploadVocabCsvBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block) return;
            const targetEx = resolveTargetExercise(block, btn);
            openBatchVocabPairModal(bIdx, targetEx);
          });
        }
      });
    }

}
