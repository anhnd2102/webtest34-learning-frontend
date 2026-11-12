// Màn hình "Xem kết quả" của học viên: chỉ đọc qua /attempts/review + /attempts/result (tách nguyên văn từ content-preview.mjs).
import { studentReviewHtml, bindResultFilters } from './result-view.js?rev=20261113-split-a';

export function createReviewScreen({ testToken, title, learningState, apiRequest, studentSelect }) {
    // --- XEM KẾT QUẢ: chỉ đọc qua /attempts/review + /attempts/result, không start, không âm thanh, không Exam Guard ---
    const viewBtn = document.querySelector('#viewResultBtn');
    const introMain = document.querySelector('main.cbt-intro-wrap');
    const reviewMain = document.querySelector('#reviewMain');
    const reviewBody = document.querySelector('#reviewBody');
    const REVIEW_POLL_MAX_MS = 45 * 60 * 1000;
    let reviewApi = null;
    let reviewModulePromise = null;
    let reviewModuleTries = 0;
    let reviewRetry = null;
    let reviewTimer = null;
    let reviewRun = 0;
    let reviewLastHtml = '';
    let reviewSubmittedAt = '';
    let reviewShown = false;

    // Lỗi nạp module không được nuốt: mỗi lần thử lại dùng URL mới để tránh cache lỗi.
    function loadReviewModule() {
      reviewModulePromise ||= import(`../../34-shared/review-module.mjs?rev=20261113-split-a${reviewModuleTries++ ? `&retry=${Date.now()}` : ''}`)
        .then(module => (reviewApi = module), error => { reviewModulePromise = null; throw error; });
      return reviewModulePromise;
    }
    loadReviewModule().catch(() => {});
    studentSelect.addEventListener('change', () => { viewBtn.disabled = !studentSelect.value; });

    function stopReviewPolling() {
      clearTimeout(reviewTimer);
      reviewTimer = null;
      reviewRun += 1;
    }

    // input: phần còn lại của reviewViewModel ({state, result, definition, error}).
    function renderReview(input) {
      if (!reviewApi) {
        loadReviewModule().then(() => renderReview(input), () => {
          reviewRetry = () => renderReview(input);
          reviewBody.innerHTML = '<section class="review-screen review-error" style="padding:16px"><p role="alert">Không tải được màn hình kết quả. Kiểm tra kết nối mạng rồi thử lại.</p><button type="button" class="review-retry" data-review-retry>Thử lại</button></section>';
          reviewLastHtml = '';
        });
        return;
      }
      const meta = {
        testTitle: document.querySelector('.brand-sub')?.textContent || title,
        studentName: learningState.studentName,
        className: learningState.className,
        submittedAt: reviewSubmittedAt
      };
      const vm = reviewApi.reviewViewModel({ meta, ...input });
      // Trạng thái sẵn sàng dùng cùng giao diện với hộp thoại sau khi nộp; các trạng thái khác giữ module review.
      const html = vm.kind === 'ready'
        ? studentReviewHtml({ header: vm.header, result: input.result, definition: input.definition, studentName: meta.studentName, className: meta.className })
        : reviewApi.reviewHtml(vm);
      if (html === reviewLastHtml) return; // polling không dựng lại khi nội dung không đổi
      const expanded = [...reviewBody.querySelectorAll('[data-review-section][aria-expanded="true"]')].map(btn => btn.dataset.reviewSection);
      reviewBody.innerHTML = reviewLastHtml = html;
      bindResultFilters(reviewBody);
      expanded.forEach(id => {
        reviewBody.querySelector(`[data-review-section="${id}"]`)?.setAttribute('aria-expanded', 'true');
        const list = document.getElementById(id);
        if (list) list.hidden = false;
      });
    }

    const reviewError = (error, retry) => { reviewRetry = retry; renderReview({ state: 'error', error }); };

    async function openReview() {
      if (!learningState.studentRef) return;
      stopReviewPolling();
      const run = reviewRun;
      reviewLastHtml = '';
      reviewSubmittedAt = '';
      reviewShown = false;
      introMain.hidden = true;
      reviewMain.hidden = false;
      renderReview({ state: 'loading' });
      try {
        const review = await apiRequest('/attempts/review', { testToken, courseCode: learningState.courseCode, studentRef: learningState.studentRef });
        if (run !== reviewRun) return;
        if (review.status === 'not_submitted') return renderReview({ state: 'no_submission' });
        if (review.status !== 'submitted_unpublished' && review.status !== 'published') throw new Error(`Trạng thái không hợp lệ: ${review.status}`);
        reviewSubmittedAt = review.submittedAt || '';
        if (review.status === 'submitted_unpublished') renderReview({ state: 'not_released' });
        pollReview(review.attemptToken, run, Date.now(), 0);
      } catch (error) {
        if (run === reviewRun) reviewError(error, openReview);
      }
    }

    // Chưa công bố: hỏi chậm 15s để tự cập nhật khi giảng viên công bố; đã công bố nhưng còn câu chờ chấm: 2s.
    async function pollReview(attemptToken, run, startedAt, delay) {
      if (delay) await new Promise(resolve => { reviewTimer = setTimeout(resolve, delay); });
      if (run !== reviewRun) return;
      let next = 15_000;
      try {
        const res = await apiRequest('/attempts/result', { attemptToken });
        if (run !== reviewRun) return;
        const result = res.result;
        if (result?.publication?.published && Array.isArray(result.items)) {
          // Chế độ thi 'waiting' không trả definition lúc resolve; dùng definition từ /attempts/result trước.
          const definition = res.definition || learningState.definition;
          reviewShown = true;
          renderReview({ state: 'ready', result, definition: { blocks: definition?.blocks, sections: definition?.sections } });
          if (['complete', 'manual_review'].includes(result.gradingStatus) && !result.summary?.pendingItemCount) return;
          next = 2000;
        }
      } catch (error) {
        if (run !== reviewRun) return;
        if (error.status === 429 && reviewShown) {
          next = 30_000; // đã có kết quả trên màn hình: chỉ giãn nhịp hỏi
        } else {
          // Chưa có gì để hiện (hoặc lỗi bền): dừng polling và hiện Thử lại.
          reviewError(error, () => { stopReviewPolling(); renderReview({ state: 'loading' }); pollReview(attemptToken, reviewRun, Date.now(), 0); });
          return;
        }
      }
      if (Date.now() - startedAt < REVIEW_POLL_MAX_MS) void pollReview(attemptToken, run, startedAt, next);
    }

    viewBtn.addEventListener('click', openReview);
    document.querySelector('#reviewBackBtn').addEventListener('click', () => {
      stopReviewPolling();
      reviewMain.hidden = true;
      introMain.hidden = false;
    });
    reviewMain.addEventListener('click', event => {
      if (event.target.closest('[data-review-retry]')) reviewRetry?.();
      const toggle = event.target.closest('[data-review-section]');
      if (toggle) {
        const list = document.getElementById(toggle.dataset.reviewSection);
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        if (list) list.hidden = expanded;
        toggle.setAttribute('aria-expanded', String(!expanded));
      }
    });
}
