export function createExamTimer({ course, examDuration, testToken, isLearningMode, state, learningState }) {
    // Đếm ngược thời gian làm bài
    const durationMinutes = Number(examDuration) || 120;
    const durationMs = durationMinutes * 60 * 1000;
    const timerStorageKey = `izone_timer_${isLearningMode ? (learningState.attemptToken || testToken) : course}`;
    const examEndTime = learningState.expiresAt || (() => {
        let storedStart = parseInt(localStorage.getItem(timerStorageKey) || '0', 10);
        if (!storedStart || storedStart > Date.now()) {
            storedStart = Date.now();
            localStorage.setItem(timerStorageKey, String(storedStart));
        }
        return storedStart + durationMs;
    })();
    const timerDisplay = document.querySelector('#examTimerDisplay');
    let examTimerInterval = null;
    function tickExamTimer() {
        if (!timerDisplay)
            return;
        if (state.submittedAt) {
            timerDisplay.textContent = 'Đã nộp';
            timerDisplay.classList.remove('warn');
            timerDisplay.classList.add('is-submitted');
            if (examTimerInterval)
                clearInterval(examTimerInterval);
            return;
        }
        const now = Date.now();
        // Exam Mode cập nhật learningState.expiresAt khi giáo viên gia hạn.
        const remainingMs = Math.max(0, (learningState.expiresAt || examEndTime) - now);
        const remainingSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(remainingSecs / 60);
        const secs = remainingSecs % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (remainingSecs <= 600) {
            timerDisplay.classList.add('warn');
        }
        else {
            timerDisplay.classList.remove('warn');
        }
        if (remainingSecs <= 0) {
            if (examTimerInterval)
                clearInterval(examTimerInterval);
            if (!state.submittedAt) {
                // Nộp ngay, không alert(): alert chặn luồng JS nên bài chỉ được nộp sau khi học viên bấm OK.
                learningState.submitTimedOut = true;
                const confirmSubmitBtn = document.querySelector('#demo-confirm-submit');
                if (confirmSubmitBtn)
                    confirmSubmitBtn.click();
            }
        }
    }
    tickExamTimer();
    examTimerInterval = setInterval(tickExamTimer, 1000);
    // Luồng nộp bài cần dừng đồng hồ và cập nhật nhãn "Đã nộp" nên nhận đồng hồ qua đối tượng này.
    return { display: timerDisplay, stop() { if (examTimerInterval)
            clearInterval(examTimerInterval); } };
}
