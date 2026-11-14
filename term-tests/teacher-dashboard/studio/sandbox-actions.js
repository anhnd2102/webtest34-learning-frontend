import { renderSvgIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/presentation.js';
export function bindSandboxActions({ container, draftState, syncInputs, options }) {
    // Trigger AI Sandbox handler
    const triggerSandboxBtns = container.querySelectorAll('.btn-trigger-sandbox');
    triggerSandboxBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const iIdx = Number(btn.getAttribute('data-item-idx'));
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            if (!item)
                return;
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            if (!currentKey || !currentKey.rubric)
                return;
            const card = btn.closest('.builder-item-card');
            const sampleTextarea = card?.querySelector('.input-sandbox-sample');
            const resultsContainer = card?.querySelector('.sandbox-results-container');
            const sampleAnswer = sampleTextarea?.value?.trim() || '';
            if (!sampleAnswer) {
                alert('Vui lòng nhập câu trả lời mẫu trước khi chấm thử.');
                return;
            }
            btn.disabled = true;
            btn.innerHTML = `${renderSvgIcon('rotate', 'icon-inline spin')} <span>Đang chấm AI...</span>`;
            if (resultsContainer) {
                resultsContainer.hidden = false;
                resultsContainer.innerHTML = '<div class="alert-notice"><div class="notice-text">Đang gửi yêu cầu đánh giá đến AI Gateway...</div></div>';
            }
            try {
                const parentEx = draftState.blocks[bIdx]?.exercises?.find(e => e.exerciseId === item.exerciseId);
                const referenceContext = item.referenceContext || parentEx?.referenceContext || draftState.blocks[bIdx]?.readingPassage || draftState.blocks[bIdx]?.stimulusReadingPassage || draftState.blocks[bIdx]?.referenceContext || '';
                if (typeof options.onPreviewSandbox !== 'function') {
                    throw new Error('Chấm thử AI chưa được cấu hình.');
                }
                // Gọi qua client dùng chung của dashboard (gắn token phiên, xử lý 401), không fetch trực tiếp.
                const sandboxResult = await options.onPreviewSandbox({
                    prompt: item.prompt,
                    context: referenceContext,
                    sampleAnswer,
                    interactionType: item.interactionType,
                    pedagogicalTypeCode: item.pedagogicalTypeCode,
                    rubric: currentKey.rubric
                });
                if (!sandboxResult || !sandboxResult.ok) {
                    throw new Error(sandboxResult?.message || 'Chấm thử AI thất bại.');
                }
                const criteriaRows = (sandboxResult.criteria || []).map((c) => `
            <div class="sandbox-criterion-row">
              <span><strong>${escapeHtml(c.id || '')}:</strong> ${c.maxScore !== undefined ? `(${c.score}/${c.maxScore}đ)` : ''}</span>
              <span class="sandbox-criterion-score">${c.score}đ</span>
            </div>
          `).join('');
                const errorsRows = (sandboxResult.errors || []).map((err) => `
            <div class="error-pill">
              • <strong>${escapeHtml(err.code || '')}:</strong> ${escapeHtml(err.message || '')}
            </div>
          `).join('');
                if (resultsContainer) {
                    resultsContainer.innerHTML = `
              <div class="sandbox-results-box">
                <div class="sandbox-score-summary">
                  <span>Điểm AI tạm tính:</span>
                  <span class="sandbox-score-badge">${sandboxResult.scoreEarned} / ${sandboxResult.maxScore}</span>
                </div>
                ${criteriaRows ? `<div class="sandbox-criteria-breakdown">${criteriaRows}</div>` : ''}
                ${errorsRows ? `<div class="sandbox-errors-breakdown">${errorsRows}</div>` : ''}
              </div>
            `;
                }
            }
            catch (err) {
                if (resultsContainer) {
                    resultsContainer.innerHTML = `<div class="alert-notice alert-immutable"><div class="notice-text sandbox-error-text">Lỗi: ${escapeHtml(err.message || 'Không thể chấm thử')}</div></div>`;
                }
            }
            finally {
                btn.disabled = false;
                btn.innerHTML = `${renderSvgIcon('zap', 'icon-inline')} Chấm thử AI`;
            }
        });
    });
}
