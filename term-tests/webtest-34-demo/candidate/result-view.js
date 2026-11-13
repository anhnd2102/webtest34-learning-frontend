// Dựng kết quả bài làm cho học viên (tách nguyên văn từ content-preview.mjs).
// NGUỒN: file .ts này; result-view.js do `npm run build` sinh ra (xem text-utils.ts).
import { scrollBehavior } from './motion.js?rev=20261113-submit-a';
import { escape } from './text-utils.js?rev=20261113-submit-a';
export function resultViewModel(result) {
    const summary = result?.summary || {};
    const gradingStatus = result?.gradingStatus || 'pending';
    const scoreFinal = summary.scoreFinal === true && gradingStatus === 'complete';
    return {
        tone: gradingStatus === 'manual_review' ? 'manual_review' : scoreFinal ? 'complete' : 'pending',
        title: gradingStatus === 'manual_review' ? 'Đang chờ giảng viên kiểm tra' : scoreFinal ? 'Đã chấm xong' : 'Đang chấm bài',
        scoreFinal,
        pendingItemCount: Number.isInteger(summary.pendingItemCount) ? summary.pendingItemCount : 0,
        scoreLabel: scoreFinal ? 'Điểm chính thức' : 'Điểm tạm tính',
        score: `${summary.scoreEarned ?? 0} / ${summary.maxScore ?? 0}`
    };
}
export function resultDetailsHtml(result, definition) {
    const itemsById = new Map((result?.items || []).map((item) => [item.itemVersionId, item]));
    const verdictLabel = (verdict) => ({ correct: 'Đúng', incorrect: 'Sai', partial: 'Một phần', pending: 'Đang chấm', manual_review: 'Chờ duyệt' }[verdict ?? ''] || verdict || 'Chưa chấm');
    return (definition?.blocks || []).map(block => {
        const items = (block.items || []).map(item => itemsById.get(item.itemVersionId)).filter((item) => Boolean(item));
        if (!items.length)
            return '';
        const score = Number(items.reduce((sum, item) => sum + (Number(item.scoreEarned) || 0), 0).toFixed(2));
        const maxScore = Number(items.reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0).toFixed(2));
        const correct = items.filter(item => item.verdict === 'correct').length;
        const details = items.map(item => {
            const tone = item.verdict === 'correct' ? 'correct' : item.verdict === 'incorrect' ? 'incorrect' : item.verdict === 'partial' ? 'partial' : 'pending';
            const errors = (item.feedback?.errors || []).map(error => `<li>${escape(error.message || error.code || '')}</li>`).join('');
            const feedback = errors ? `<div class="learning-result-feedback"><strong>Nhận xét</strong><ul>${errors}</ul></div>` : '';
            const expText = (item.expectedAnswer !== null && item.expectedAnswer !== undefined)
                ? (Array.isArray(item.expectedAnswer) ? item.expectedAnswer.join(', ') : String(item.expectedAnswer))
                : '';
            const expHtml = expText ? `<div class="learning-result-expected"><strong>Đáp án:</strong> ${escape(expText)}</div>` : '';
            return `<div class="learning-result-item"><span class="learning-result-verdict ${tone}">${escape(verdictLabel(item.verdict))}</span><div><strong>Câu ${escape(item.position)}</strong><div class="learning-result-answer">${escape(item.rawAnswer || 'Chưa trả lời')}</div>${expHtml}${feedback}</div></div>`;
        }).join('');
        return `<article class="learning-result-section"><div class="learning-result-section-header"><h3>${escape(block.title)}</h3><div class="learning-result-section-actions"><div class="learning-result-section-summary"><div class="learning-result-score">${score} / ${maxScore} điểm</div><div class="meta">${correct}/${items.length} câu đúng</div></div><button class="result-details-toggle" type="button" data-result-details="result-${escape(block.blockId)}" aria-expanded="false">Xem chi tiết</button></div></div><div class="learning-result-exercise" id="result-${escape(block.blockId)}" hidden><div class="learning-result-items">${details}</div></div></article>`;
    }).join('');
}
export const resultTypeLabel = (defItem) => defItem.pedagogicalTypeCode === 'pronunciation_choice' ? 'Phát âm'
    : defItem.pedagogicalTypeCode === 'sentence_rewrite' ? 'Biến đổi câu'
        : defItem.pedagogicalTypeCode === 'sentence_reorder' ? 'Sắp xếp câu'
            : ({ correction_pair: 'Sửa lỗi sai', text_select_pair: 'Cặp từ vựng', single_choice: 'Trắc nghiệm', multi_choice_group: 'Chọn nhiều', short_text: 'Điền từ' }[defItem.interactionType ?? ''] || 'Tự luận');
// Câu cặp từ vựng lưu "<chữ>,<mã nghĩa>" (vd. "adapt to,meaning-21"); học viên chỉ cần phần chữ.
export const cleanPairAnswer = (value) => String(value).replace(/,\s*[\w-]*\d[\w-]*$/, '');
export const RESULT_VERDICTS = {
    correct: { cls: 'correct', icon: '✓', label: 'Đúng' },
    partial: { cls: 'partial', icon: '◐', label: 'Đúng một phần' },
    incorrect: { cls: 'incorrect', icon: '✕', label: 'Chưa đúng' },
    pending: { cls: 'pending', icon: '…', label: 'Đang chấm' },
    manual_review: { cls: 'pending', icon: '…', label: 'Chờ giảng viên' }
};
// Phần thân kết quả cho học viên: tổng điểm, điểm từng phần, bộ lọc và thẻ từng câu.
export function studentResultsBodyHtml({ result, definition, studentName, className }) {
    const summary = result?.summary || {};
    const items = result?.items || [];
    const scoreFinal = summary.scoreFinal === true && result?.gradingStatus === 'complete';
    const statusText = scoreFinal ? 'Hoàn tất chấm điểm' : (result?.gradingStatus === 'manual_review' ? 'Chờ giảng viên duyệt' : 'Đang xử lý');
    const defItems = new Map((definition?.blocks || []).flatMap(block => block.items || []).map((it) => [it.itemVersionId, it]));
    const count = (verdict) => items.filter(it => it.verdict === verdict).length;
    const pendingCount = items.length - count('correct') - count('partial') - count('incorrect');
    const cardHtml = (it) => {
        const def = defItems.get(it.itemVersionId) || {};
        const verdict = RESULT_VERDICTS[it.verdict ?? ''] || { cls: 'pending', icon: '…', label: 'Chưa chấm' };
        const hasAnswer = it.rawAnswer !== undefined && it.rawAnswer !== null && String(it.rawAnswer).trim() !== '';
        const answer = !hasAnswer ? 'Chưa trả lời' : (def.interactionType === 'text_select_pair' ? cleanPairAnswer(it.rawAnswer) : String(it.rawAnswer));
        const expected = it.expectedAnswer === undefined || it.expectedAnswer === null ? ''
            : (Array.isArray(it.expectedAnswer) ? it.expectedAnswer.join(', ') : String(it.expectedAnswer));
        const errors = (it.feedback?.errors || []).map(error => error.message || error.code || '').filter(Boolean);
        const group = it.verdict === 'correct' ? 'correct' : (it.verdict === 'incorrect' || it.verdict === 'partial' ? 'wrong' : 'other');
        return `<li class="sim-card is-${verdict.cls}" data-result-group="${group}">
      <div class="sim-card-head">
        <strong>Câu ${escape(it.position)}</strong>
        <span class="sim-card-type">${escape(resultTypeLabel(def))}</span>
        <span class="sim-card-verdict ${verdict.cls}"><span aria-hidden="true">${verdict.icon}</span> ${escape(verdict.label)}</span>
        <span class="sim-card-score">${escape(it.scoreEarned ?? 0)}/${escape(it.maxScore ?? 1)}đ</span>
      </div>
      <div class="sim-card-row"><span class="sim-card-label">Bài làm của bạn</span><span class="${hasAnswer ? '' : 'is-empty'}">${escape(answer)}</span></div>
      ${expected ? `<div class="sim-card-row"><span class="sim-card-label">Đáp án đúng</span><span class="sim-card-expected">${escape(expected)}</span></div>` : ''}
      ${errors.length ? `<details class="sim-card-errors"${errors.length <= 3 ? ' open' : ''}><summary>Lỗi gặp phải (${errors.length})</summary><ul>${errors.map(error => `<li>${escape(error)}</li>`).join('')}</ul></details>` : ''}
    </li>`;
    };
    // Nhóm câu theo phần của đề; câu không ghép được vào phần nào rơi vào "Câu khác".
    const itemsById = new Map(items.map((it) => [it.itemVersionId, it]));
    const used = new Set();
    const sections = (definition?.blocks || []).map((block, index) => {
        const own = (block.items || []).map(it => itemsById.get(it.itemVersionId)).filter((it) => Boolean(it));
        own.forEach(it => used.add(it.itemVersionId));
        return { title: block.title || `Phần ${index + 1}`, items: own };
    });
    const leftover = items.filter(it => !used.has(it.itemVersionId));
    if (leftover.length)
        sections.push({ title: 'Câu khác', items: leftover });
    const sum = (list, key) => Number(list.reduce((total, it) => total + (Number(it[key]) || 0), 0).toFixed(2));
    const shown = sections.filter(section => section.items.length).map((section, index) => ({
        ...section,
        id: `sim-sec-${index}`,
        score: sum(section.items, 'scoreEarned'),
        max: sum(section.items, 'maxScore'),
        correct: section.items.filter(it => it.verdict === 'correct').length
    }));
    const sectionSummary = shown.length ? `<ul class="sim-section-list" aria-label="Điểm từng phần">${shown.map(section => `
        <li><button type="button" class="sim-section-jump" data-result-jump="${section.id}">
          <span class="sim-section-name">${escape(section.title)}</span>
          <span class="sim-section-score">${section.score}/${section.max}đ</span>
          <span class="sim-section-count">${section.correct}/${section.items.length} câu đúng</span>
        </button></li>`).join('')}</ul>` : '';
    const cards = shown.map(section => `<section class="sim-section" id="${section.id}" data-result-section>
      <h4 class="sim-section-head"><span>${escape(section.title)}</span><span>${section.score}/${section.max}đ · ${section.correct}/${section.items.length} câu đúng</span></h4>
      <ul class="sim-card-list">${section.items.map(cardHtml).join('')}</ul>
    </section>`).join('');
    const answerNote = result?.answerRelease === 'hidden' ? 'Bài này không hiển thị đáp án đúng.'
        : (result?.answerRelease === 'partial' ? 'Một số đáp án đúng chưa được giảng viên mở.' : '');
    return `<div class="sim-score-banner">
        <div class="score-banner-title">Tổng điểm đạt được</div>
        <div class="score-banner-value">${escape(summary.scoreEarned ?? 0)}/${escape(summary.maxScore ?? 0)}đ</div>
        <div class="sim-score-counts">
          <span class="correct">✓ ${count('correct')} đúng</span>
          <span class="partial">◐ ${count('partial')} đúng một phần</span>
          <span class="incorrect">✕ ${count('incorrect')} chưa đúng</span>
          ${pendingCount ? `<span class="pending">… ${pendingCount} đang chấm</span>` : ''}
        </div>
        <div class="score-banner-sub">Thí sinh: <strong>${escape(studentName || '')}</strong> · Lớp: <strong>${escape(className || '')}</strong><br>Trạng thái: <strong>${statusText}</strong></div>
      </div>
      ${sectionSummary}
      ${answerNote ? `<p class="sim-notice" role="note">${answerNote}</p>` : ''}
      <div class="sim-filter" role="group" aria-label="Lọc câu">
        <button type="button" class="sim-filter-btn is-active" data-result-filter="all" aria-pressed="true">Tất cả</button>
        <button type="button" class="sim-filter-btn" data-result-filter="wrong" aria-pressed="false">Chưa đúng</button>
        <button type="button" class="sim-filter-btn" data-result-filter="correct" aria-pressed="false">Đúng</button>
      </div>
      ${cards || '<p class="sim-card-empty">Đang cập nhật chi tiết...</p>'}`;
}
// Hộp thoại kết quả sau khi nộp bài: vỏ (tiêu đề, nút đóng) bọc phần thân dùng chung.
export function studentResultsHtml(input) {
    return `<div class="sim-results-dialog" role="dialog" aria-modal="true" aria-labelledby="sim-results-title">
    <header class="sim-results-header">
      <div class="sim-results-title-wrap">
        <span class="sim-results-badge">Kết quả bài thi</span>
        <h3 id="sim-results-title">Bảng tổng hợp chấm điểm</h3>
      </div>
      <button type="button" class="btn-close-sim-results" id="btn-close-sim-results" aria-label="Đóng">✕</button>
    </header>
    <div class="sim-results-body" id="sim-results-body">${studentResultsBodyHtml(input)}</div>
    <footer class="sim-results-footer">
      <button type="button" class="btn btn-secondary btn-sm" id="btn-retest-simulation">Xem lại trên bài thi</button>
      <button type="button" class="btn btn-primary btn-sm" id="btn-done-simulation-results">Đóng kết quả</button>
    </footer>
  </div>`;
}
// Màn "Xem kết quả" (mở lại từ màn nhập tên): cùng phần thân với hộp thoại sau khi nộp bài.
export function studentReviewHtml({ header = {}, ...bodyInput }) {
    return `<section class="sim-results-inline">
    <header class="sim-results-inline-head">
      <h2>${escape(header.testTitle)}</h2>
      ${header.submittedAt ? `<p>Nộp lúc: ${escape(header.submittedAt)}</p>` : ''}
    </header>
    ${studentResultsBodyHtml(bodyInput)}
  </section>`;
}
// Gắn bộ lọc Tất cả / Chưa đúng / Đúng cho hộp thoại do studentResultsHtml dựng.
export function bindResultFilters(root) {
    root.querySelectorAll('[data-result-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.resultFilter;
            root.querySelectorAll('[data-result-filter]').forEach(other => {
                const active = other === btn;
                other.classList.toggle('is-active', active);
                other.setAttribute('aria-pressed', String(active));
            });
            root.querySelectorAll('[data-result-group]').forEach(card => {
                card.hidden = filter !== 'all' && card.dataset.resultGroup !== filter;
            });
            // Phần không còn câu nào sau khi lọc thì ẩn cả tiêu đề.
            root.querySelectorAll('[data-result-section]').forEach(section => {
                section.hidden = !section.querySelector('[data-result-group]:not([hidden])');
            });
        });
    });
    root.querySelectorAll('[data-result-jump]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = root.querySelector(`#${btn.dataset.resultJump}`);
            // Đang lọc mà phần đích bị ẩn thì quay về "Tất cả" để cuộn tới được.
            if (target?.hidden)
                root.querySelector('[data-result-filter="all"]')?.click();
            target?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
        });
    });
}
