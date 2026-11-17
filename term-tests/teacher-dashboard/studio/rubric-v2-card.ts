// NGUỒN: file .ts này; rubric-v2-card.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
//
// Phần rubric của thẻ câu hỏi Tự luận chấm AI dựng từ trình hướng dẫn (rubric v2): tóm tắt cách chấm bằng lời thường,
// nút chỉnh lại bằng trình hướng dẫn, ô hướng dẫn/đáp án mẫu cho AI và Sandbox chấm thử. Không có bảng tiêu chí sửa tay
// như rubric cũ: mọi thay đổi quy tắc đi qua trình hướng dẫn để backend dựng lại và kiểm tổng điểm.
import { renderSvgIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/presentation.js';
import { summarizeRubricV2 } from './rubric-wizard-model.js';

const VARIANT_LABELS: Record<string, string> = {
  translation: 'Dịch Việt–Anh',
  sentence_order: 'Điền sắp xếp và chia động từ',
  reading_comprehension: 'Đọc hiểu',
  sentence_role: 'Writing đọc hiểu',
  speaking_text: 'Speaking dạng văn bản',
  writing: 'Viết đoạn/bài (Writing)'
};

export const RUBRIC_V2_VERSION = 'izone-rubric-v2';

export function isRubricV2(rubric: unknown): boolean {
  return Boolean(rubric && typeof rubric === 'object' && (rubric as { scoringVersion?: string }).scoringVersion === RUBRIC_V2_VERSION);
}

export function renderRubricV2Section({ blockIdx, itemIdx, rubric, item }: {
  blockIdx: number;
  itemIdx: number;
  rubric: Record<string, any>;
  item: Record<string, any>;
}): string {
  const at = `data-block-idx="${blockIdx}" data-item-idx="${itemIdx}"`;
  const usesContext = ['reading_comprehension', 'sentence_role', 'speaking_text'].includes(rubric.variant);
  const summary = summarizeRubricV2(rubric).map(line => `<li>${escapeHtml(line)}</li>`).join('');
  const studentNotes = [
    item.studentOutline?.length ? `Dàn ý hiện cho học viên: ${item.studentOutline.length} ý.` : '',
    item.vocabularyHints?.length ? `Từ vựng gợi ý: ${item.vocabularyHints.length} từ/cụm.` : ''
  ].filter(Boolean).map(line => `<li>${escapeHtml(line)}</li>`).join('');
  return `
    <div class="template-section template-rubric-async template-rubric-v2">
      <div class="rw-card-head">
        <span class="rw-chip">${escapeHtml(VARIANT_LABELS[rubric.variant] || 'Tự luận chấm AI')}</span>
        <span class="rw-chip">Khối ${escapeHtml(rubric.level)}</span>
        <span class="rw-chip">${escapeHtml(rubric.maxScore)} điểm</span>
        <button type="button" class="btn btn-secondary btn-sm btn-edit-rubric-wizard" ${at}>${renderSvgIcon('edit', 'icon-inline')} <span>Chỉnh lại bằng trình hướng dẫn</span></button>
      </div>
      <h4 class="rw-subtitle">Cách chấm</h4>
      <ul class="rw-summary">${summary}${studentNotes}</ul>
      ${usesContext ? `
        <div class="form-group">
          <label class="form-label">${renderSvgIcon('book', 'icon-inline')} Ngữ cảnh bài đọc cho AI (ẩn với học viên):</label>
          <textarea class="form-control form-control-sm item-reference-context-input" ${at} rows="3">${escapeHtml(item.referenceContext || '')}</textarea>
        </div>` : ''}
      <div class="form-group">
        <label class="form-label">Hướng dẫn thêm cho AI (học viên không thấy):</label>
        <textarea class="form-control form-control-sm input-rubric-guidance" ${at} rows="3">${escapeHtml(rubric.promptGuidance || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án mẫu (chỉ AI thấy, mỗi dòng một đáp án):</label>
        <textarea class="form-control form-control-sm input-rubric-model-answers" ${at} rows="3">${escapeHtml((rubric.modelAnswers || []).join('\n'))}</textarea>
      </div>
      <div class="rubric-sandbox-panel">
        <p class="sandbox-desc">Nhập một câu trả lời mẫu của học viên để AI chấm thử (không lưu bài thi):</p>
        <div class="sandbox-input-group">
          <textarea class="form-control input-sandbox-sample" ${at} rows="3"></textarea>
          <button type="button" class="btn btn-primary btn-sm btn-trigger-sandbox" ${at}>${renderSvgIcon('zap', 'icon-inline')} Chấm thử AI</button>
        </div>
        <div class="sandbox-results-container" ${at} hidden></div>
      </div>
    </div>`;
}
