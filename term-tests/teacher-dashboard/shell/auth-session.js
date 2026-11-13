// NGUỒN: file .ts này; auth-session.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { authLoginPath, authLogoutPath } from '../api/teacher.js';
import { resetDashboardState } from './dashboard-state.js';
export function createAuthSession({ lifecycle, queryCoordinator, authState, scopeState, document, classFilterToolbar, classSearchInput, classStatusFilter, classCountBadge, classSelect, assignmentSelect, selectedAssignmentCard, examRoom, assignments, results, resultsContent, status, classSkillSummary, disposeOwnedBuilder, searchInput, statusFilter, skillFilter, minScoreInput, maxScoreInput, sortBySelect, sortDirSelect, attemptDetail, drawerBackdrop, detailScores, detailAttemptHistory, detailItemsBody, state, loginForm, loginBtn, loginEmail, loginPhone, togglePasswordBtn, loginError, teacherProfile, roleCapabilitiesPopover, logoutBtn, request, stopExamRoomEvents, resetPortal, setUrl, loadClasses, renderTeacherProfile }) {
    function handleLogout() {
        disposeOwnedBuilder();
        for (const scope of ['sessionRestore', 'classes', 'assignments', 'results', 'attemptDetail', 'testStudio', 'testStudioBuilder', 'examRoom', 'examRoomTimeline', 'reports', 'itemAnalysis']) {
            queryCoordinator.cancel(scope);
        }
        stopExamRoomEvents();
        resetPortal();
        if (roleCapabilitiesPopover)
            roleCapabilitiesPopover.hidden = true;
        document.body.classList.add('login-page');
        authState.sessionToken = '';
        authState.currentTeacher = null;
        scopeState.rawClassesList = [];
        if (classFilterToolbar)
            classFilterToolbar.hidden = true;
        if (classSearchInput)
            classSearchInput.value = '';
        if (classStatusFilter)
            classStatusFilter.value = '';
        if (classCountBadge)
            classCountBadge.textContent = '0 lớp';
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('izone_teacher_token');
            sessionStorage.removeItem('izone_teacher_profile');
        }
        if (teacherProfile)
            teacherProfile.hidden = true;
        if (loginForm)
            loginForm.hidden = false;
        if (classSelect)
            classSelect.replaceChildren(new Option('-- Chọn lớp --', ''));
        if (assignmentSelect) {
            assignmentSelect.replaceChildren(new Option('-- Chọn bài test --', ''));
            assignmentSelect.disabled = true;
        }
        if (selectedAssignmentCard)
            selectedAssignmentCard.hidden = true;
        scopeState.currentAssignmentsList = [];
        if (results)
            results.hidden = true;
        if (resultsContent)
            resultsContent.replaceChildren();
        if (classSkillSummary)
            classSkillSummary.replaceChildren();
        if (attemptDetail) {
            attemptDetail.classList.remove('drawer-open');
            attemptDetail.hidden = true;
        }
        if (drawerBackdrop)
            drawerBackdrop.hidden = true;
        if (detailScores)
            detailScores.replaceChildren();
        if (detailItemsBody)
            detailItemsBody.replaceChildren();
        if (detailAttemptHistory)
            detailAttemptHistory.replaceChildren();
        if (searchInput)
            searchInput.value = '';
        if (statusFilter)
            statusFilter.value = '';
        if (skillFilter)
            skillFilter.value = '';
        if (minScoreInput)
            minScoreInput.value = '';
        if (maxScoreInput)
            maxScoreInput.value = '';
        if (sortBySelect)
            sortBySelect.value = 'submitted_at';
        if (sortDirSelect)
            sortDirSelect.value = 'desc';
        resetDashboardState(state);
        setUrl();
        if (status)
            status.textContent = 'Đã đăng xuất. Vui lòng đăng nhập lại.';
    }
    if (togglePasswordBtn && loginPhone) {
        lifecycle.listen(togglePasswordBtn, 'click', () => {
            const isPassword = loginPhone.type === 'password';
            loginPhone.type = isPassword ? 'text' : 'password';
            togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            togglePasswordBtn.setAttribute('title', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            togglePasswordBtn.setAttribute('aria-pressed', String(isPassword));
        });
    }
    if (loginPhone && loginForm) {
        lifecycle.listen(loginPhone, 'keydown', e => {
            const event = e;
            if (event.key === 'Enter') {
                event.preventDefault();
                if (typeof loginForm.requestSubmit === 'function') {
                    loginForm.requestSubmit();
                }
                else {
                    loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }
        });
    }
    if (loginForm) {
        lifecycle.listen(loginForm, 'submit', async (event) => {
            event.preventDefault();
            if (loginBtn.disabled)
                return;
            if (loginError)
                loginError.hidden = true;
            const email = loginEmail?.value.trim() || '';
            const phone = loginPhone?.value.trim() || '';
            if (!email || !phone) {
                if (loginError) {
                    loginError.hidden = false;
                    loginError.textContent = 'Vui lòng nhập đầy đủ Email và Số điện thoại.';
                }
                return;
            }
            loginBtn.disabled = true;
            loginBtn.textContent = 'Đang đăng nhập…';
            loginForm.setAttribute('aria-busy', 'true');
            try {
                if (status)
                    status.textContent = 'Đang xác thực tài khoản…';
                const payload = await request(authLoginPath(), {
                    method: 'POST',
                    anonymous: true,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, phone }),
                    errorMessage: 'Email hoặc số điện thoại không chính xác.'
                });
                authState.sessionToken = payload.token;
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('izone_teacher_token', payload.token);
                    sessionStorage.setItem('izone_teacher_profile', JSON.stringify(payload.teacher));
                }
                renderTeacherProfile(payload.teacher);
                await loadClasses();
            }
            catch (err) {
                if (loginError) {
                    loginError.hidden = false;
                    loginError.textContent = err.message;
                }
                if (status)
                    status.textContent = `Lỗi đăng nhập: ${err.message}`;
            }
            finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Đăng nhập';
                loginForm.removeAttribute('aria-busy');
            }
        });
    }
    if (logoutBtn) {
        lifecycle.listen(logoutBtn, 'click', async () => {
            stopExamRoomEvents();
            try {
                if (authState.sessionToken) {
                    await request(authLogoutPath(), { method: 'POST', handleUnauthorized: false }).catch(() => { });
                }
            }
            finally {
                handleLogout();
            }
        });
    }
    return { handleLogout };
}
