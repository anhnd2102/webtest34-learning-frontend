// Hộp thoại nộp bài, nộp bài lên máy chủ, hộp kết quả và theo dõi kết quả sau nộp (tách nguyên văn từ content-preview.mjs).
// NGUỒN: file .ts này; submit-flow.js do `npm run build` sinh ra (xem text-utils.ts). Import nội bộ viết
// không có `?rev=`, bước build tự thêm rev dùng chung của shell học viên.
import { getTotalItemCount, getAnsweredCount, ICONS } from '../dynamic-exam-renderer.mjs';
import { scrollBehavior } from './motion.js';
import { escape } from './text-utils.js';
import { resultViewModel, resultDetailsHtml, studentResultsHtml, bindResultFilters, type ResultDefinition, type ResultPayload } from './result-view.js';
import { withLocalGroupLabels } from './group-render.js';
import type { IntroLearningState } from './intro-screen.js';

// Trạng thái lượt làm do shell sở hữu; luồng nộp bài ghi kết quả và bộ đếm giờ theo dõi kết quả sau nộp.
export interface SubmitLearningState extends IntroLearningState {
  definition?: ResultDefinition;
  result?: ResultPayload;
  pollTimer?: ReturnType<typeof setInterval> | null;
  submitTimedOut?: boolean;
}

export interface SubmitFlowParams {
  isLearningMode: boolean;
  form: unknown;
  items: { id: string }[];
  title: string;
  state: { answers: Record<string, unknown>, submittedAt: number | null };
  learningState: SubmitLearningState;
  apiRequest: (path: string, body: Record<string, unknown>) => Promise<any>;
  createUuid: () => string;
  stopExamConnections: () => void;
  buildResponsesPayload: () => unknown;
  isDynamic: boolean;
  examTimer: { display: HTMLElement | null, stop: () => void };
  query: <T extends HTMLElement = HTMLElement>(selector: string) => T | null;
  update: () => void;
  queueServerDraft: () => void;
  persist: () => void;
  clearDraftTimer: () => void;
}

export function createSubmitFlow({ isLearningMode, form, items, title, state, learningState, apiRequest, createUuid, stopExamConnections, buildResponsesPayload, isDynamic, examTimer, query, update, queueServerDraft, persist, clearDraftTimer }: SubmitFlowParams) {
  const timerDisplay = examTimer.display;
    function handleOpenSubmitDialog() {
      if (query('#demo-confirm-error')) query('#demo-confirm-error')!.hidden = true;
      if (isDynamic) {
        const total = getTotalItemCount(learningState.definition);
        const done = getAnsweredCount(learningState.definition, state.answers);
        const missing = total - done;
        query('#demo-confirm-text')!.textContent = missing > 0
          ? `Còn ${missing} câu chưa trả lời (đã làm ${done}/${total} câu). Bạn có chắc chắn muốn nộp bài?`
          : `Bạn đã trả lời đầy đủ ${total}/${total} câu. Bạn có chắc chắn muốn nộp bài?`;
        query<HTMLDialogElement>('#demo-confirm')!.showModal();
        return;
      }
      const missing=items.filter(item=>!String(state.answers[item.id]||'').trim()).length;
      query('#demo-confirm-text')!.textContent=`Còn ${missing} ô chưa trả lời. Bạn có chắc chắn muốn nộp bài?`;
      query<HTMLDialogElement>('#demo-confirm')!.showModal();
    }

    if (query('#demo-submit')) {
      query('#demo-submit')!.addEventListener('click', handleOpenSubmitDialog);
    }
    if (query('#demo-submit-top')) {
      query('#demo-submit-top')!.addEventListener('click', handleOpenSubmitDialog);
    }
    query('#demo-cancel')!.addEventListener('click',()=>query<HTMLDialogElement>('#demo-confirm')!.close());

    function openDynamicResultsModal(result: ResultPayload) {
      const summary = result?.summary || {};
      const scoreFinal = summary.scoreFinal === true && result.gradingStatus === 'complete';
      const items = result?.items || [];
      const definition = learningState.definition || {};

      // Mark question navigator buttons with is-correct / is-incorrect
      items.forEach(it => {
        const qnavBtn = document.querySelector(`.btn-qnav[data-item-id="${it.itemVersionId}"]`);
        if (qnavBtn) {
          qnavBtn.classList.remove('is-correct', 'is-incorrect');
          if (it.verdict === 'correct') {
            qnavBtn.classList.add('is-correct');
          } else if (it.verdict === 'incorrect' || it.verdict === 'partial') {
            qnavBtn.classList.add('is-incorrect');
          }
        }
      });

      const existingModal = document.querySelector<HTMLElement>('#simulation-results-modal');
      const modal: HTMLElement = existingModal ?? document.createElement('div');
      if (!existingModal) {
        modal.id = 'simulation-results-modal';
        modal.className = 'simulation-results-modal';
        document.body.appendChild(modal);
      }

      modal.innerHTML = studentResultsHtml({ result, definition, studentName: learningState.studentName, className: learningState.className });

      modal.style.display = 'flex';

      bindResultFilters(modal);

      const closeHandler = () => {
        modal.style.display = 'none';
      };
      modal.querySelectorAll('#btn-close-sim-results, #btn-retest-simulation, #btn-done-simulation-results').forEach(b => {
        b.addEventListener('click', closeHandler);
      });

      // Show persistent reopening card in #demo-result
      const resBanner = query('#demo-result');
      if (resBanner) {
        resBanner.hidden = false;
        resBanner.style.background = '#f0fdf4';
        resBanner.style.borderColor = '#bbf7d0';
        resBanner.style.color = '#166534';
        resBanner.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <strong>Đã hoàn tất chấm điểm!</strong> Tổng điểm đạt được: <strong>${summary.scoreEarned ?? 0}/${summary.maxScore ?? 0}đ</strong> (${scoreFinal ? 'Điểm chính thức' : 'Điểm tạm tính'}).
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-open-results-modal" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;">
              ${ICONS.barChart} Xem lại Bảng tổng hợp chấm điểm
            </button>
          </div>
        `;
        const reOpenBtn = resBanner.querySelector('#btn-open-results-modal');
        if (reOpenBtn) {
          reOpenBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
          });
        }
      }
    }

    function renderAiResultCard(result: ResultPayload) {
      const isPublished = Boolean(result?.publication?.published);
      const card = query('#demo-ai-card')!;
      card.hidden = false;

      if (isDynamic) {
        if (!isPublished) {
          card.innerHTML = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:24px;text-align:center;color:#166534">
              <div style="font-size:32px;margin-bottom:6px">✓</div>
              <h3 style="color:#15803d;margin:0 0 8px 0;font-size:19px;font-weight:700">Bài làm đã được nộp thành công!</h3>
              <p style="margin:0;font-size:14px;color:#166534;line-height:1.6">
                Hệ thống đã ghi nhận an toàn bài thi của bạn.<br>
                Điểm số sẽ được giáo viên công bố sau khi hoàn tất chấm điểm. Bạn có thể xem lại bài làm bên dưới.
              </p>
            </div>
          `;
          return;
        }

        // isPublished is true -> Show Candidate Simulation Results Modal
        openDynamicResultsModal(result);
        return;
      }

      if (!isPublished) {
        card.innerHTML = `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:28px 24px;text-align:center;color:#166534">
            <div style="font-size:36px;margin-bottom:8px">✓</div>
            <h3 style="color:#15803d;margin:0 0 10px 0;font-size:20px;font-weight:700">Bài làm đã được nộp thành công!</h3>
            <p style="margin:0;font-size:15px;color:#166534;line-height:1.6">
              Hệ thống đã ghi nhận an toàn bài thi của bạn.<br>
              Kết quả và điểm số sẽ được giáo viên công bố sau khi hoàn tất chấm điểm.
            </p>
          </div>
        `;
        return;
      }
      const vm = resultViewModel(result);
      const isComplete = vm.scoreFinal;
      const isManualReview = result.gradingStatus === 'manual_review';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;border-bottom:1px solid #f1f5f9;padding-bottom:16px;margin-bottom:16px">
          <div>
            <div style="font-size:12px;font-weight:700;color:${isComplete ? '#16a34a' : isManualReview ? '#ea580c' : '#d97706'};letter-spacing:1px;text-transform:uppercase">
              ${escape(vm.title)}
            </div>
            <h2 style="font-size:22px;color:#174266;margin:4px 0 0 0">Kết quả bài thi · ${escape(learningState.studentName || title)}</h2>
            <div style="font-size:13px;color:#64748b;margin-top:4px">Mã lớp: <strong>${escape(learningState.className || learningState.courseCode)}</strong> · Trạng thái chấm: <strong>${escape(result.gradingStatus || 'pending')}</strong></div>
          </div>
          <div style="background:${isComplete ? '#f0fdf4' : isManualReview ? '#fff7ed' : '#fffbeb'};border:1px solid ${isComplete ? '#bbf7d0' : isManualReview ? '#fed7aa' : '#fef3c7'};border-radius:12px;padding:12px 20px;text-align:right">
            <div style="font-size:12px;color:#64748b;font-weight:600">${escape(vm.scoreLabel)}</div>
            <div style="font-size:28px;font-weight:900;color:${isComplete ? '#16a34a' : isManualReview ? '#c2410c' : '#b45309'}">${escape(vm.score)}</div>
          </div>
        </div>
        ${isComplete ? `
          <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;margin-bottom:16px">
            <h4 style="margin:0 0 8px 0;font-size:14px;color:#334155">Tổng kết đánh giá bài làm</h4>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">
              Bài thi đã hoàn tất chấm điểm toàn diện các phần thi. Các câu trả lời bên dưới đã được lưu trữ vĩnh viễn trên hệ thống.
            </p>
          </div>
        ` : isManualReview ? `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <span class="cbt-card-icon" style="color:#c2410c">${ICONS.book}</span>
            <div style="font-size:13px;color:#9a3412;line-height:1.5">
              Hệ thống đã hoàn tất chấm điểm. Một số câu tự luận được chuyển sang trạng thái <strong>Chờ giảng viên kiểm tra</strong>. Điểm chính thức sẽ được cập nhật sau khi giảng viên xác nhận.
            </div>
          </div>
        ` : `
          <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <span class="cbt-card-icon" style="color:#2563eb">${ICONS.clock}</span>
            <div style="font-size:13px;color:#1e40af;line-height:1.5">
              Hệ thống đang tiến hành chấm các câu tự luận. Điểm chính thức sẽ tự động cập nhật ngay tại đây (còn lại ${vm.pendingItemCount} câu đang xử lý).
            </div>
          </div>
        `}
        <div class="learning-result-grid">${resultDetailsHtml(result, withLocalGroupLabels(learningState.definition, form))}</div>
      `;
      card.querySelectorAll<HTMLElement>('[data-result-details]').forEach(button => button.addEventListener('click', () => {
        const details = card.querySelector<HTMLElement>(`#${button.dataset.resultDetails}`);
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        button.textContent = expanded ? 'Xem chi tiết' : 'Ẩn chi tiết';
        if (details) details.hidden = expanded;
      }));
    }

    async function pollLearningResult() {
      if (!isLearningMode || !learningState.attemptToken) return;
      try {
        const res = await apiRequest('/attempts/result', { attemptToken: learningState.attemptToken });
        if (res.result) {
          learningState.result = res.result;
          renderAiResultCard(res.result);
          if (!res.result.publication?.published) {
            if (learningState.pollTimer) {
              clearInterval(learningState.pollTimer);
              learningState.pollTimer = null;
            }
          } else if (res.result.gradingStatus === 'complete' || res.result.gradingStatus === 'manual_review' || res.result.summary?.scoreFinal) {
            if (learningState.pollTimer) {
              clearInterval(learningState.pollTimer);
              learningState.pollTimer = null;
            }
          }
        }
      } catch {}
    }

    learningState.onAutoSubmitted = text => {
      state.submittedAt = Date.now();
      stopExamConnections();
      persist();
      update();
      examTimer.stop();
      if (timerDisplay) { timerDisplay.textContent = 'Đã nộp'; timerDisplay.classList.remove('warn'); }
      query('#demo-result')!.hidden = false;
      query('#demo-result')!.textContent = text;
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    };

    // Một mã nộp cho cả lượt: nộp lại sau khi mất phản hồi không bị máy chủ coi là bản nộp khác.
    let submissionId: string | null = null;

    // Dùng chung cho nộp thành công và cho trường hợp bài đã được ghi nhận từ lần nộp trước (mất phản hồi).
    function acceptSubmission(res: { result?: ResultPayload }) {
        state.submittedAt = Date.now();
        // Dừng Exam Guard và tín hiệu kết nối: lượt đã nộp không còn là thiết bị đang làm bài.
        learningState.status = 'submitted';
        stopExamConnections();
        persist();
        update();
        examTimer.stop();
        if (timerDisplay) { timerDisplay.textContent = 'Đã nộp'; timerDisplay.classList.remove('warn'); }
        query<HTMLDialogElement>('#demo-confirm')!.close();
        window.scrollTo({top: 0, behavior: scrollBehavior()});

        query('#demo-result')!.hidden = false;
        query('#demo-result')!.style.background = '#f0fdf4';
        query('#demo-result')!.style.borderColor = '#bbf7d0';
        query('#demo-result')!.style.color = '#166534';
        query('#demo-result')!.innerHTML = `${learningState.submitTimedOut ? 'Đã hết giờ làm bài. ' : ''}<strong>Nộp bài thành công!</strong> Bài làm của bạn đã được ghi nhận an toàn trên hệ thống.`;

        if (isDynamic) {
          document.querySelectorAll<HTMLInputElement>('#examMainViewport input, #examMainViewport select, #examMainViewport textarea, #examMainViewport button').forEach(el => {
            if (el.id !== 'demo-prev' && el.id !== 'demo-next') {
              el.disabled = true;
            }
          });
          const topSubmit = query<HTMLButtonElement>('#demo-submit-top');
          if (topSubmit) {
            topSubmit.disabled = true;
            topSubmit.textContent = 'Đã nộp bài';
          }
        }

        if (res.result) {
          renderAiResultCard(res.result);
        }
        if (res.result?.publication?.published && !learningState.pollTimer) {
          learningState.pollTimer = setInterval(pollLearningResult, 3500);
          void pollLearningResult();
        }
    }

    query<HTMLButtonElement>('#demo-confirm-submit')!.addEventListener('click', async () => {
      // Lệnh nộp đã mang đủ câu trả lời; bản nháp gửi chen vào sẽ làm lệch revision của lệnh nộp.
      clearDraftTimer();
      query<HTMLButtonElement>('#demo-confirm-submit')!.disabled = true;
      query<HTMLButtonElement>('#demo-confirm-submit')!.textContent = 'Đang gửi…';
      if (query('#demo-confirm-error')) query('#demo-confirm-error')!.hidden = true;
      try {
        if (isLearningMode && learningState.attemptToken) {
          const res = await apiRequest('/attempts/submit', {
            attemptToken: learningState.attemptToken,
            submissionId: (submissionId ||= createUuid()),
            definitionHash: learningState.definitionHash,
            draftRevision: Number(learningState.draftRevision || 0),
            responses: buildResponsesPayload()
          });
          acceptSubmission(res);
        } else {
          state.submittedAt=Date.now();
          persist();
          update();
          query<HTMLDialogElement>('#demo-confirm')!.close();
          window.scrollTo({top:0,behavior:scrollBehavior()});
        }
      } catch (err) {
        // Bài đã được ghi nhận từ lần nộp trước (phản hồi bị mất) nhưng bản nộp lại khác nội dung: lấy kết quả thay vì báo lỗi.
        if (isLearningMode && learningState.attemptToken && ['SUBMISSION_ALREADY_FINAL', 'ATTEMPT_ALREADY_SUBMITTED'].includes((err as { code?: string }).code ?? '')) {
          try {
            acceptSubmission(await apiRequest('/attempts/result', { attemptToken: learningState.attemptToken }));
            return;
          } catch (resultError) {
            alert(`Bài đã được nộp trước đó. Chưa tải được kết quả: ${(resultError as Error).message}`);
            return;
          }
        }
        // Báo ngay trong hộp xác nhận; nút xác nhận được bật lại ở finally để thử lại.
        // Nộp tự động lúc hết giờ chạy khi hộp đang đóng, nên mở hộp để học viên thấy lỗi.
        const confirmError = query('#demo-confirm-error');
        if (confirmError) {
          confirmError.textContent = `${learningState.submitTimedOut ? 'Đã hết giờ làm bài nhưng chưa nộp được' : 'Nộp bài không thành công'} (${(err as Error).message}). Kiểm tra mạng rồi bấm xác nhận lại.`;
          confirmError.hidden = false;
        }
        if (!query<HTMLDialogElement>('#demo-confirm')!.open) query<HTMLDialogElement>('#demo-confirm')!.showModal();
        queueServerDraft();
      } finally {
        query<HTMLButtonElement>('#demo-confirm-submit')!.disabled = false;
        query<HTMLButtonElement>('#demo-confirm-submit')!.textContent = isLearningMode ? 'Xác nhận nộp bài' : 'Xác nhận nộp thử';
      }
    });

  return { pollLearningResult };
}
