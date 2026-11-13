// NGUỒN: file .ts này; class-directory.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { ICONS } from '../ui/icons.js';
import { filterClasses, formatClassFilterCountLabel, formatClassOptionLabel } from './dashboard-state.js';
import type { AuthState, DashboardRequest, DashboardState, ScopeState, TeacherActor } from './dashboard-state.js';
import type { Lifecycle } from './lifecycle.js';
import type { QueryHandle } from './query-coordinator.js';

export interface ClassDirectoryParams {
  lifecycle: Lifecycle;
  queryCoordinator?: { begin(scopeKey: string): QueryHandle | null } | null;
  authState: AuthState;
  scopeState: ScopeState;
  classFilterToolbar?: HTMLElement | null;
  adminCourseFilters?: HTMLElement | null;
  leadScopeFilters?: HTMLElement | null;
  classSearchInput?: HTMLInputElement | null;
  classStatusFilter?: HTMLSelectElement | null;
  classCountBadge?: HTMLElement | null;
  classSelect: HTMLSelectElement;
  status: HTMLElement;
  state: DashboardState;
  request: DashboardRequest;
  setUrl: () => void;
  loadAssignments: (classId: string, assignmentId?: string) => Promise<unknown>;
}

export function createClassDirectory({ lifecycle, queryCoordinator, authState, scopeState, classFilterToolbar, adminCourseFilters, leadScopeFilters, classSearchInput, classStatusFilter, classCountBadge, classSelect, status, state, request, setUrl, loadAssignments }: ClassDirectoryParams) {
  function updateFilterPillsUI() {
    if (adminCourseFilters) {
      const activeCourse = state.course || 'all';
      adminCourseFilters.querySelectorAll<HTMLElement>('.filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.course === activeCourse);
      });
    }
    if (leadScopeFilters) {
      const activeScope = state.scope || 'all';
      leadScopeFilters.querySelectorAll<HTMLElement>('.filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scope === activeScope);
      });
    }
    if (classStatusFilter) {
      classStatusFilter.value = state.classStatus || '';
    }
    if (classSearchInput) {
      classSearchInput.value = state.classQ || '';
    }
  }

  function renderFilteredClasses() {
    if (!classSelect) return;
    const userClassIds = authState.currentTeacher?.classIds || [];
    const filtered = filterClasses(scopeState.rawClassesList, {
      course: state.course,
      scope: state.scope,
      classStatus: state.classStatus,
      q: state.classQ,
      userRole: authState.currentTeacher?.role,
      userClassIds
    });

    if (classCountBadge) {
      classCountBadge.textContent = formatClassFilterCountLabel({
        count: filtered.length,
        course: state.course,
        scope: state.scope,
        classStatus: state.classStatus,
        userRole: authState.currentTeacher?.role
      });
    }

    classSelect.replaceChildren(new Option(filtered.length > 0 ? `-- Chọn lớp (${filtered.length}) --` : '-- Không có lớp phù hợp --', ''));
    for (const item of filtered) {
      classSelect.add(new Option(formatClassOptionLabel(item as { name?: unknown, courseCode?: unknown, assignmentCount?: unknown }), item.classId));
    }

    const matchingClass = filtered.find(c => c.classId === state.classId);
    if (matchingClass) {
      classSelect.value = state.classId!;
    } else {
      classSelect.value = '';
    }

    if (status) {
      status.textContent = `${filtered.length}/${scopeState.rawClassesList.length} lớp phù hợp bộ lọc`;
    }
  }

  function setupClassFilterToolbar() {
    if (!classFilterToolbar || !authState.currentTeacher) return;
    classFilterToolbar.hidden = false;

    const role = authState.currentTeacher.role;
    if (role === 'admin' || role === 'qm') {
      if (adminCourseFilters) adminCourseFilters.hidden = false;
      if (leadScopeFilters) leadScopeFilters.hidden = true;
    } else if (role === 'lead') {
      if (adminCourseFilters) adminCourseFilters.hidden = true;
      if (leadScopeFilters) {
        leadScopeFilters.hidden = false;
        const allBtn = leadScopeFilters.querySelector<HTMLElement>('[data-scope="all"]');
        if (allBtn && authState.currentTeacher.courseCodes?.length) {
          allBtn.innerHTML = `${ICONS.classes} <span>Toàn bộ khối</span>`;
        }
      }
    } else {
      if (adminCourseFilters) adminCourseFilters.hidden = true;
      if (leadScopeFilters) leadScopeFilters.hidden = true;
    }

    updateFilterPillsUI();
  }

  if (adminCourseFilters) {
    lifecycle.listen(adminCourseFilters, 'click', event => {
      const pill = (event.target as Element).closest<HTMLElement>('.filter-pill');
      if (!pill) return;
      const course = pill.dataset.course || 'all';
      state.course = course === 'all' ? '' : course;
      setUrl();
      updateFilterPillsUI();
      renderFilteredClasses();
    });
  }

  if (leadScopeFilters) {
    lifecycle.listen(leadScopeFilters, 'click', event => {
      const pill = (event.target as Element).closest<HTMLElement>('.filter-pill');
      if (!pill) return;
      const scope = pill.dataset.scope || 'all';
      state.scope = scope === 'all' ? '' : scope;
      setUrl();
      updateFilterPillsUI();
      renderFilteredClasses();
    });
  }

  if (classStatusFilter) {
    lifecycle.listen(classStatusFilter, 'change', () => {
      state.classStatus = classStatusFilter.value;
      setUrl();
      renderFilteredClasses();
    });
  }

  let classSearchTimeout: ReturnType<typeof setTimeout> | undefined;
  if (classSearchInput) {
    lifecycle.listen(classSearchInput, 'input', () => {
      state.classQ = classSearchInput.value.trim();
      lifecycle.clearTimeout(classSearchTimeout);
      classSearchTimeout = lifecycle.timeout(() => {
        setUrl();
        renderFilteredClasses();
      }, 250);
    });
  }

  async function loadClasses() {
    const query = queryCoordinator?.begin?.('classes');
    if (queryCoordinator && !query) return;

    status.textContent = 'Đang kiểm tra quyền…';
    try {
      const payload = await request('/api/teacher/classes', { signal: query?.signal });
      if (query && !query.isCurrent()) return;
      if (payload.actor) {
        const teacher: TeacherActor = { ...(authState.currentTeacher || {}), ...payload.actor };
        authState.currentTeacher = teacher;
        if (Array.isArray(payload.actor.classIds) && payload.actor.classIds.length > 0) {
          teacher.classIds = payload.actor.classIds;
        }
      }
      scopeState.rawClassesList = payload.classes || [];
      setupClassFilterToolbar();
      renderFilteredClasses();
      if (query && !query.isCurrent()) return;
      await loadAssignments(classSelect.value, state.assignmentId);
    } catch (error) {
      if (query && (!query.isCurrent() || (error as Error).name === 'AbortError')) return;
      status.textContent = (error as Error).message;
    }
  }

  return { loadClasses, renderFilteredClasses, setupClassFilterToolbar, updateFilterPillsUI };
}
