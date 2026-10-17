// Module thuần dựng Màn hình xem kết quả (view model + HTML), mobile-first, một cột.
// Chưa nối vào index.html. Dữ liệu vào: kết quả từ /attempts/result và định nghĩa đề.
import { resultViewModel } from '../webtest-34-demo/content-preview.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const round = value => Number(value.toFixed(2));
const isPending = item => item.verdict === 'pending' || item.verdict === 'manual_review';

const VERDICT_LABELS = { correct: 'Đúng', incorrect: 'Sai', partial: 'Một phần', pending: 'Đang chờ', manual_review: 'Cần giảng viên' };
const verdictLabel = verdict => VERDICT_LABELS[verdict] || 'Chưa chấm';
const verdictTone = verdict => (VERDICT_LABELS[verdict] ? verdict : 'ungraded');

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return String(value ?? '');
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
}

// Dùng lại bộ nhóm câu theo phần của learning-result.js (IIFE gắn vào window); có thể tiêm để test/ghi đè.
function defaultGroupResultItems() {
  const groupResultItems = globalThis.WEBTEST34_LEARNING_RESULT?.groupResultItems;
  if (!groupResultItems) throw new Error('WEBTEST34_LEARNING_RESULT_MISSING');
  return groupResultItems;
}

function itemViewModel(item) {
  const fb = item.feedback || {};
  const hasExpected = item.expectedAnswer !== null && item.expectedAnswer !== undefined;
  const hasScores = fb.structureScore !== undefined || fb.accuracyScore !== undefined;
  return {
    position: item.position,
    verdict: item.verdict,
    verdictLabel: verdictLabel(item.verdict),
    tone: verdictTone(item.verdict),
    answer: item.rawAnswer || 'Chưa trả lời',
    expected: hasExpected ? (Array.isArray(item.expectedAnswer) ? item.expectedAnswer.join(', ') : String(item.expectedAnswer)) : '',
    essay: hasScores ? `Structure ${fb.structureScore ?? 0} / ${fb.structureMaxScore ?? 2} · Accuracy ${fb.accuracyScore ?? 0} / ${fb.accuracyMaxScore ?? 2}` : '',
    errors: (fb.errors || []).map(error => error.message || error.code || '').filter(Boolean)
  };
}

// input: { state: 'loading'|'error'|'no_submission'|'locked'|'not_released'|'ready',
//          meta: { testTitle, studentName, className, submittedAt }, result, definition, error, groupResultItems }
export function reviewViewModel({ state, meta = {}, result, definition, error, groupResultItems = defaultGroupResultItems() } = {}) {
  const base = { header: { testTitle: meta.testTitle, studentName: meta.studentName, className: meta.className, submittedAt: meta.submittedAt ? formatDate(meta.submittedAt) : '' } };
  if (state === 'not_released') return { ...base, kind: 'not_released', message: `Đã ghi nhận bài nộp${meta.submittedAt ? ` lúc ${formatDate(meta.submittedAt)}` : ''}. Kết quả chưa được công bố, vui lòng quay lại sau.` };
  if (state === 'error') return { kind: 'error', message: error?.status === 429 ? 'Hệ thống đang bận, vui lòng thử lại sau ít giây.' : 'Không tải được kết quả. Kiểm tra kết nối mạng rồi thử lại.' };
  if (state === 'no_submission') return { kind: 'no_submission', message: 'Bạn chưa có bài nộp cho bài test này. Hãy kiểm tra lại tên đã chọn.' };
  if (state === 'locked') return { kind: 'locked', message: 'Bài làm đang bị khoá vì được mở ở máy khác. Vui lòng liên hệ giảng viên.' };
  if (state !== 'ready') return { kind: 'loading', message: 'Đang tải kết quả…' };

  const groups = groupResultItems({ blocks: definition?.blocks, sections: definition?.sections, items: result?.items });
  if (!groups.length || groups.incomplete) {
    return { ...base, kind: 'incomplete', message: 'Kết quả chưa đầy đủ: không ghép được một số câu với cấu trúc đề. Vui lòng liên hệ giảng viên.' };
  }
  const allItems = groups.flatMap(group => group.items);
  const score = round(groups.reduce((sum, group) => sum + group.score, 0));
  const gradedMax = round(groups.reduce((sum, group) => sum + group.gradedMaxScore, 0));
  const pendingCount = allItems.filter(isPending).length;
  const view = resultViewModel(result);
  return {
    ...base,
    kind: 'ready',
    tone: view.tone,
    title: view.title,
    scoreLabel: pendingCount ? 'Điểm tạm tính' : view.scoreLabel,
    score: `${score} / ${gradedMax}`,
    provisionalLabel: pendingCount ? `Chưa chốt, còn ${pendingCount} câu đang chấm` : '',
    sections: groups.map(group => ({
      id: group.id,
      label: group.label,
      scoreText: `${round(group.score)} / ${round(group.maxScore)} điểm`,
      correctText: `${group.correct}/${group.items.length} câu đúng`,
      items: group.items.map(itemViewModel)
    }))
  };
}

const PRINT_CSS = '<style>.review-screen{max-width:640px;margin:0 auto;padding:16px;font-size:16px}.review-section-toggle{min-height:44px}@media print{.review-screen button,.review-retry{display:none}.review-section-items[hidden]{display:block}}</style>';

function itemHtml(item) {
  const expected = item.expected ? `<div class="review-expected"><strong>Đáp án:</strong> ${escape(item.expected)}</div>` : '<div class="review-expected muted">Đáp án chưa được mở</div>';
  const errors = item.errors.length ? `<div><strong>Lỗi</strong><ul>${item.errors.map(error => `<li>${escape(error)}</li>`).join('')}</ul></div>` : '';
  const feedback = item.essay || errors ? `<div class="review-feedback">${item.essay ? `<strong>${escape(item.essay)}</strong>` : ''}${errors}</div>` : '';
  return `<li class="review-item"><span class="review-verdict ${escape(item.tone)}">${escape(item.verdictLabel)}</span><div><strong>Câu ${escape(item.position)}</strong><div class="review-answer">${escape(item.answer)}</div>${expected}${feedback}</div></li>`;
}

export function reviewHtml(vm) {
  const header = vm.header ? `<header class="review-header"><h1>${escape(vm.header.testTitle)}</h1><p>${escape(vm.header.studentName)} · ${escape(vm.header.className)}</p>${vm.header.submittedAt ? `<p>Nộp lúc: ${escape(vm.header.submittedAt)}</p>` : ''}</header>` : '';
  if (vm.kind !== 'ready') {
    const retry = vm.kind === 'error' ? '<button type="button" class="review-retry" data-review-retry>Thử lại</button>' : '';
    return `${PRINT_CSS}<main class="review-screen review-${escape(vm.kind)}" role="status">${header}<p>${escape(vm.message)}</p>${retry}</main>`;
  }
  const sections = vm.sections.map(section => `<article class="review-section"><button type="button" class="review-section-toggle" data-review-section="review-${escape(section.id)}" aria-expanded="false"><h3>${escape(section.label)}</h3><span>${escape(section.scoreText)} · ${escape(section.correctText)}</span></button><ul class="review-section-items" id="review-${escape(section.id)}" hidden>${section.items.map(itemHtml).join('')}</ul></article>`).join('');
  return `${PRINT_CSS}<main class="review-screen review-ready ${escape(vm.tone)}">${header}<section class="review-total"><div>${escape(vm.scoreLabel)}</div><strong>${escape(vm.score)}</strong>${vm.provisionalLabel ? `<div class="review-provisional">${escape(vm.provisionalLabel)}</div>` : ''}<div>${escape(vm.title)}</div></section>${sections}</main>`;
}
