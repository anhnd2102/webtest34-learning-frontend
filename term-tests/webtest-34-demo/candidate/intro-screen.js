// Màn hình đầu: mã lớp, roster, chọn học viên, kiểm tra âm thanh và bắt đầu lượt (tách nguyên văn từ content-preview.mjs).
import { getTotalItemCount, ICONS } from '../dynamic-exam-renderer.mjs?rev=20261113-audio-a';
import { escape, formatCandidateOptionLabel } from './text-utils.js?rev=20261113-audio-a';
import { examPhase, resetLocalAttemptState } from './learning-api.js?rev=20261113-audio-a';

export function createIntroScreen({ config, testToken, paramClassCode, state, learningState, apiRequest, createUuid, requestFullscreen, connectExamEvents, renderExamWaitingRoom, mountExamGuard, applyServerDraft, renderExamInterface, classInput, loadBtn, classStatus, studentSelect, studentStatus, startBtn }) {
    // Thiết bị cảm ứng; iPad đời mới tự nhận là Macintosh nên nhận qua số điểm chạm.
    const isTouchDevice = matchMedia('(pointer: coarse)').matches || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    document.querySelector('#mobileExamNotice').hidden = !isTouchDevice;

    async function handleLoadRoster() {
      const code = classInput.value.trim().toUpperCase();
      if (!code) {
        classStatus.textContent = 'Vui lòng nhập mã lớp.';
        classStatus.style.color = '#db0829';
        return;
      }
      loadBtn.disabled = true;
      loadBtn.textContent = 'Đang tải…';
      classStatus.textContent = 'Đang kiểm tra mã lớp…';
      classStatus.style.color = '#64748b';
      studentSelect.disabled = true;
      studentSelect.innerHTML = '<option value="">— Đang tải danh sách —</option>';

      try {
        const res = await apiRequest('/test-access/resolve', {
          testToken,
          courseCode: code
        });
        const assignment = res.assignment;
        if (!assignment || !assignment.roster || !assignment.roster.length) {
          throw new Error('Không tìm thấy học viên nào trong lớp này.');
        }
        learningState.assignment = assignment;
        learningState.definition = assignment.definition;
        learningState.courseCode = code;
        document.querySelector('#longWritingHint').hidden = !assignment.definition?.blocks?.some(block => block.items?.some(item => item.interactionType === 'long_text'));
        learningState.className = assignment.class?.name || code;

        studentSelect.innerHTML = '<option value="">— Chọn tên của bạn —</option>' + assignment.roster.map(s => {
          return `<option value="${escape(s.studentRef)}">${escape(formatCandidateOptionLabel(s))}</option>`;
        }).join('');
        studentSelect.disabled = false;
        studentSelect.style.background = 'white';
        classInput.disabled = true;
        loadBtn.textContent = 'Đã tải';
        classStatus.textContent = `Lớp ${escape(learningState.className)} · ${assignment.roster.length} học viên.`;
        classStatus.style.color = '#16a34a';
        studentStatus.textContent = 'Hãy chọn tên của bạn trong danh sách trên.';
        if (assignment.title) {
          const h1 = document.querySelector('h1');
          if (h1) h1.textContent = assignment.title;
          const brandSub = document.querySelector('.brand-sub');
          if (brandSub) brandSub.textContent = assignment.title;
          document.title = assignment.title;
        }

        if (assignment.definition?.blocks?.length) {
          const dynTotal = getTotalItemCount(assignment.definition);
          const dynMinutes = Number(assignment.definition.timing?.totalMinutes || assignment.definition.durationMinutes) || 120;
          const introP = document.querySelector('.cbt-intro-sub') || document.querySelector('main.demo-width p') || document.querySelector('main p');
          if (introP) {
            introP.innerHTML = `Thời gian làm bài: <strong>${dynMinutes} phút</strong> · Tổng số câu hỏi: <strong>${dynTotal} câu</strong>.<br>Vui lòng nhập <strong>Mã lớp</strong> và chọn <strong>Họ tên của bạn</strong> để bắt đầu làm bài.`;
          }
          const timerSpan = document.querySelector('.top-actions .timer');
          if (timerSpan) {
            timerSpan.textContent = `${dynMinutes}:00`;
          }
        }
      } catch (err) {
        loadBtn.disabled = false;
        loadBtn.textContent = 'Thử lại';
        classStatus.textContent = `Không tải được danh sách: ${err.message}`;
        classStatus.style.color = '#db0829';
        studentSelect.innerHTML = '<option value="">— Vui lòng tải lại —</option>';
      }
    }

    loadBtn.addEventListener('click', handleLoadRoster);
    classInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleLoadRoster(); } });

    if (paramClassCode) {
      void handleLoadRoster();
    }

    studentSelect.addEventListener('change', () => {
      const ref = studentSelect.value;
      if (ref) {
        const student = learningState.assignment?.roster?.find(s => s.studentRef === ref);
        learningState.studentRef = ref;
        learningState.studentName = student?.name || '';

        if (student?.retakeGrant) {
          const grant = student.retakeGrant;
          const now = Date.now();
          const expiresAtMs = grant.expiresAt ? new Date(grant.expiresAt).getTime() : 0;
          const availableFromMs = grant.availableFrom ? new Date(grant.availableFrom).getTime() : 0;

          if (grant.status === 'expired' || (expiresAtMs && expiresAtMs <= now)) {
            startBtn.disabled = true;
            const expTime = new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Asia/Ho_Chi_Minh'
            }).format(new Date(grant.expiresAt));
            studentStatus.textContent = `Quyền làm lại đã hết hạn (hạn chót: ${expTime}). Hãy liên hệ giáo viên để được cấp lại.`;
            studentStatus.style.color = '#e11d48';
            return;
          } else if (availableFromMs && availableFromMs > now) {
            startBtn.disabled = true;
            const openTime = new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Asia/Ho_Chi_Minh'
            }).format(new Date(grant.availableFrom));
            studentStatus.textContent = `Quyền làm lại chưa tới thời gian mở (bắt đầu lúc: ${openTime}).`;
            studentStatus.style.color = '#e11d48';
            return;
          } else {
            const defMinutes = Number(learningState.assignment?.definition?.timing?.totalMinutes) || 120;
            const remainingMinutes = Math.min(defMinutes, Math.max(0, Math.floor((expiresAtMs - now) / 60000)));
            const expTime = new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Asia/Ho_Chi_Minh'
            }).format(new Date(grant.expiresAt));
            studentStatus.textContent = `Đã chọn: ${escape(learningState.studentName)}. Quyền làm lại: Thời gian làm bài thực tế là ${remainingMinutes} phút (hạn chót nộp bài: ${expTime}).`;
            studentStatus.style.color = '#16a34a';
            startBtn.disabled = false;
            return;
          }
        }

        startBtn.disabled = false;
        studentStatus.textContent = `Đã chọn: ${escape(learningState.studentName)}.`;
        studentStatus.style.color = '#16a34a';
      } else {
        startBtn.disabled = true;
        studentStatus.textContent = 'Chọn đúng tên của bạn trong danh sách lớp.';
        studentStatus.style.color = '#64748b';
      }
    });

    const soundcheckUrl = config.AUDIO?.soundcheck?.remote || 'https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/soundcheck.mp3';
    let soundcheckAudio = null;
    const soundcheckPlayBtn = document.querySelector('#soundcheckPlayBtn');
    const soundcheckStatus = document.querySelector('#soundcheckStatus');
    const soundcheckVolume = document.querySelector('#soundcheckVolume');
    const soundcheckVolumeLabel = document.querySelector('#soundcheckVolumeLabel');

    if (soundcheckPlayBtn) {
      soundcheckPlayBtn.addEventListener('click', () => {
        if (!soundcheckAudio) {
          soundcheckAudio = new Audio(soundcheckUrl);
          soundcheckAudio.volume = parseFloat(soundcheckVolume?.value || '1');
          soundcheckAudio.addEventListener('ended', () => {
            soundcheckPlayBtn.innerHTML = `${ICONS.volume} Nghe thử lại`;
            if (soundcheckStatus) {
              soundcheckStatus.textContent = 'Âm thanh hoạt động tốt';
              soundcheckStatus.style.background = '#dcfce7';
              soundcheckStatus.style.color = '#15803d';
            }
          });
          soundcheckAudio.addEventListener('error', () => {
            soundcheckPlayBtn.innerHTML = `${ICONS.volume} Nghe thử`;
            if (soundcheckStatus) {
              soundcheckStatus.textContent = 'Lỗi tải audio';
              soundcheckStatus.style.background = '#fee2e2';
              soundcheckStatus.style.color = '#e11d48';
            }
          });
        }
        if (soundcheckAudio.paused) {
          soundcheckAudio.currentTime = 0;
          soundcheckAudio.play().then(() => {
            soundcheckPlayBtn.innerHTML = 'Dừng nghe thử';
            if (soundcheckStatus) {
              soundcheckStatus.textContent = 'Đang phát âm thanh…';
              soundcheckStatus.style.background = '#dbeafe';
              soundcheckStatus.style.color = '#1d4ed8';
            }
          }).catch(err => {
            console.warn('Audio play error:', err);
            soundcheckPlayBtn.innerHTML = `${ICONS.volume} Nghe thử`;
          });
        } else {
          soundcheckAudio.pause();
          soundcheckAudio.currentTime = 0;
          soundcheckPlayBtn.innerHTML = `${ICONS.volume} Nghe thử lại`;
          if (soundcheckStatus) {
            soundcheckStatus.textContent = 'Âm thanh hoạt động';
            soundcheckStatus.style.background = '#dcfce7';
            soundcheckStatus.style.color = '#15803d';
          }
        }
      });
    }

    if (soundcheckVolume) {
      soundcheckVolume.addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        if (soundcheckVolumeLabel) soundcheckVolumeLabel.textContent = `${Math.round(val * 100)}%`;
        if (soundcheckAudio) soundcheckAudio.volume = val;
      });
    }

    startBtn.addEventListener('click', async () => {
      if (soundcheckAudio) {
        soundcheckAudio.pause();
        soundcheckAudio.currentTime = 0;
      }
      // Exam Mode: vào toàn màn hình ngay trong cú bấm (trình duyệt chỉ cho phép trong user gesture).
      if (learningState.assignment?.exam?.enabled) requestFullscreen().catch(() => {});
      startBtn.disabled = true;
      startBtn.textContent = 'Đang mở đề thi…';
      try {
        const startRes = await apiRequest('/attempts/start', {
          testToken,
          courseCode: learningState.courseCode,
          studentRef: learningState.studentRef,
          identityConfirmed: true,
          clientIdempotencyKey: createUuid()
        });
        learningState.attemptToken = startRes.attempt.attemptToken;
        learningState.definitionHash = startRes.attempt.definitionHash;
        learningState.draftRevision = startRes.attempt.draftRevision || 0;
        learningState.status = startRes.attempt.status || 'active';
        learningState.expiresAt = startRes.attempt.expiresAt ? Date.parse(startRes.attempt.expiresAt) : null;
        resetLocalAttemptState(state);
        if (startRes.attempt.draft) {
          applyServerDraft(startRes.attempt.draft);
        }
        if (startRes.attempt.status === 'submitted') {
          state.submittedAt = state.submittedAt || Date.now();
        }
        learningState.exam = startRes.attempt.exam || null;
        learningState.selfProctoring = startRes.attempt.selfProctoring || null;
        if (startRes.attempt.definition) learningState.definition = startRes.attempt.definition;
        const phase = examPhase(startRes.attempt);
        if (phase === 'waiting') {
          renderExamWaitingRoom();
          mountExamGuard();
          void connectExamEvents();
          return;
        }
        await renderExamInterface();
        if (learningState.selfProctoring && learningState.status === 'active') mountExamGuard();
        if (phase === 'running') {
          mountExamGuard();
          void connectExamEvents();
        }
      } catch (err) {
        startBtn.disabled = false;
        startBtn.textContent = 'Bắt đầu làm bài →';
        alert(`Không mở được phiên làm bài: ${err.message}`);
      }
    });

  return { handleLoadRoster };
}
