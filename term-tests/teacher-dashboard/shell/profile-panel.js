// NGUỒN: file .ts này; profile-panel.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { readDashboardTab } from './dashboard-state.js';
import { teacherRoleLabel, getRoleCapabilities } from '../results/presentation.js';
export function createProfilePanel({ root, lifecycle, authState, document, window, loadAndRenderTestStudio, loginForm, loginError, teacherProfile, teacherProfileName, teacherProfileMeta, teacherRoleBadge, roleBadgeWrap, roleInfoBtn, roleCapabilitiesPopover, closeRolePopoverBtn, setupClassFilterToolbar }) {
    function renderTeacherProfile(teacher) {
        if (!teacher)
            return;
        document.body.classList.remove('login-page');
        authState.currentTeacher = teacher;
        setupClassFilterToolbar();
        if (teacherProfileName)
            teacherProfileName.textContent = teacher.name || teacher.email;
        const popoverUserName = root.querySelector('#popover-user-name');
        if (popoverUserName)
            popoverUserName.textContent = teacher.name || teacher.email;
        if (teacherProfileMeta)
            teacherProfileMeta.textContent = `${teacher.email} · SĐT: ${teacher.phone || '—'}`;
        const teacherProfileAvatar = root.querySelector('#teacher-profile-avatar');
        if (teacherProfileAvatar) {
            const name = (teacher.name || teacher.email || '').trim();
            const parts = name.split(/\s+/).filter(Boolean);
            let initials = 'GV';
            if (parts.length >= 2) {
                initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            else if (parts.length === 1) {
                initials = parts[0].slice(0, 2).toUpperCase();
            }
            teacherProfileAvatar.textContent = initials;
        }
        if (teacherRoleBadge) {
            teacherRoleBadge.textContent = teacherRoleLabel(teacher.role, teacher.courseCodes);
            teacherRoleBadge.className = `role-badge ${teacher.role || 'teacher'}`;
        }
        if (loginForm)
            loginForm.hidden = true;
        if (teacherProfile)
            teacherProfile.hidden = false;
        if (loginError)
            loginError.hidden = true;
        const currentTab = readDashboardTab(window.location.hash);
        if (currentTab === 'test-studio' || currentTab === 'exams') {
            loadAndRenderTestStudio();
        }
    }
    function toggleRoleCapabilitiesPopover(show) {
        if (!roleCapabilitiesPopover)
            return;
        const shouldShow = typeof show === 'boolean' ? show : roleCapabilitiesPopover.hidden;
        roleCapabilitiesPopover.hidden = !shouldShow;
        if (roleInfoBtn)
            roleInfoBtn.setAttribute('aria-expanded', String(shouldShow));
        if (teacherRoleBadge)
            teacherRoleBadge.setAttribute('aria-expanded', String(shouldShow));
        if (shouldShow && authState.currentTeacher) {
            const popoverUserName = root.querySelector('#popover-user-name');
            if (popoverUserName)
                popoverUserName.textContent = authState.currentTeacher.name || authState.currentTeacher.email;
            if (teacherRoleBadge) {
                teacherRoleBadge.textContent = teacherRoleLabel(authState.currentTeacher.role, authState.currentTeacher.courseCodes);
                teacherRoleBadge.className = `role-badge ${authState.currentTeacher.role || 'teacher'}`;
            }
            const roleCapsList = root.querySelector('#role-caps-list');
            if (roleCapsList) {
                const caps = getRoleCapabilities(authState.currentTeacher.role, authState.currentTeacher.courseCodes);
                roleCapsList.replaceChildren(...caps.map(cap => {
                    const li = document.createElement('li');
                    const strong = document.createElement('strong');
                    strong.textContent = `${cap.title}: `;
                    li.appendChild(strong);
                    li.appendChild(document.createTextNode(cap.description));
                    return li;
                }));
            }
        }
    }
    if (roleInfoBtn) {
        lifecycle.listen(roleInfoBtn, 'click', (e) => {
            e.stopPropagation();
            toggleRoleCapabilitiesPopover();
        });
    }
    if (teacherRoleBadge) {
        lifecycle.listen(teacherRoleBadge, 'click', (e) => {
            e.stopPropagation();
            toggleRoleCapabilitiesPopover();
        });
        lifecycle.listen(teacherRoleBadge, 'keydown', (ev) => {
            const e = ev;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleRoleCapabilitiesPopover();
            }
        });
    }
    if (closeRolePopoverBtn) {
        lifecycle.listen(closeRolePopoverBtn, 'click', () => {
            toggleRoleCapabilitiesPopover(false);
        });
    }
    lifecycle.listen(document, 'click', (e) => {
        if (roleCapabilitiesPopover && !roleCapabilitiesPopover.hidden) {
            if (!roleCapabilitiesPopover.contains(e.target) && !roleBadgeWrap?.contains(e.target)) {
                toggleRoleCapabilitiesPopover(false);
            }
        }
    });
    lifecycle.listen(document, 'keydown', (ev) => {
        const e = ev;
        if (e.key === 'Escape' && roleCapabilitiesPopover && !roleCapabilitiesPopover.hidden) {
            toggleRoleCapabilitiesPopover(false);
        }
    });
    return { renderTeacherProfile, toggleRoleCapabilitiesPopover };
}
