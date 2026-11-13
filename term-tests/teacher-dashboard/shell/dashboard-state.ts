// NGUỒN: file .ts này; dashboard-state.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { renderSvgIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/presentation.js';
import type { ApiRequestOptions } from '../api/client.js';
import type { ExamSession } from '../exam-room/presentation.js';

export type DashboardState = {
  classId?: string;
  assignmentId?: string;
  attemptId?: string;
  q?: string;
  status?: string;
  minScore?: string;
  maxScore?: string;
  skill?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  course?: string;
  scope?: string;
  classStatus?: string;
  classQ?: string;
};

export interface ClassRecord {
  classId?: string;
  class_id?: string;
  name?: string;
  courseCode?: string;
  status?: string;
  classStatus?: string;
  isTeaching?: boolean;
  is_teaching?: boolean;
  [key: string]: unknown;
}

export interface AssignmentChip { assignmentId: string, title: string, phase?: unknown, status: string }

export interface AssignmentRecord extends AssignmentChip {
  id?: string;
  classId?: string;
  examMode?: boolean;
  exitLimit?: number | null;
  examSession?: ExamSession | null;
  className?: string;
  courseCode?: string;
  studentUrl?: string;
  [key: string]: unknown;
}

// Giáo viên đang đăng nhập (payload `actor` của /api/teacher/classes hoặc `teacher` của đăng nhập).
export interface TeacherActor { role?: string, classIds?: string[], courseCodes?: string[], name?: string, email?: string, phone?: string, [key: string]: unknown }

export interface AuthState { sessionToken: string, currentTeacher: TeacherActor | null }

export interface ScopeState {
  rawClassesList: ClassRecord[];
  currentAssignmentsList: AssignmentRecord[];
  currentServerNow: string | null;
  isSwitchingAssignment: boolean;
  currentSelectedAssignment?: AssignmentRecord | null;
}

export interface ReportState {
  mode?: string;
  reportData: unknown;
  itemAnalysisData: unknown;
  expandedItemIds: Set<string>;
  isLoading?: boolean;
  itemAnalysisLoading?: boolean;
}

export type DashboardRequest = (path: string, options?: ApiRequestOptions) => Promise<any>;

export function localStudentUrl(studentUrl: string | null | undefined, location: { hostname?: string, origin: string } | null | undefined, apiBase = ''): string | null | undefined {
  if (!studentUrl || !location || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(location?.hostname || '')) return studentUrl;
  const url = new URL(studentUrl);
  const index = url.pathname.indexOf('/term-tests/');
  if (index < 0) return studentUrl;
  const isLocalApi = Boolean(apiBase && (apiBase.includes('127.0.0.1') || apiBase.includes('localhost')));
  if (isLocalApi) {
    url.searchParams.delete('prod');
  } else if (!url.searchParams.has('prod') && !apiBase) {
    url.searchParams.set('prod', '1');
  } else if (apiBase && (apiBase.includes('webtest.ducanhdev.com') || apiBase.includes('production'))) {
    url.searchParams.set('prod', '1');
  }
  return `${location.origin}${url.pathname.slice(index)}${url.search}${url.hash}`;
}

export function readDashboardState(input: string | URL): DashboardState {
  const url = input instanceof URL ? input : new URL(input);
  const state: DashboardState = {
    classId: url.searchParams.get('classId') || '',
    assignmentId: url.searchParams.get('assignmentId') || ''
  };
  const attemptId = url.searchParams.get('attemptId');
  if (attemptId !== null && attemptId !== '') state.attemptId = attemptId;
  const q = url.searchParams.get('q');
  if (q !== null && q !== '') state.q = q;
  const status = url.searchParams.get('status');
  if (status !== null && status !== '') state.status = status;
  const minScore = url.searchParams.get('minScore');
  if (minScore !== null && minScore !== '') state.minScore = minScore;
  const maxScore = url.searchParams.get('maxScore');
  if (maxScore !== null && maxScore !== '') state.maxScore = maxScore;
  const skill = url.searchParams.get('skill');
  if (skill !== null && skill !== '') state.skill = skill;
  const sortBy = url.searchParams.get('sortBy');
  if (sortBy !== null && sortBy !== '') state.sortBy = sortBy;
  const sortDir = url.searchParams.get('sortDir');
  if (sortDir !== null && sortDir !== '') state.sortDir = sortDir;
  const page = url.searchParams.get('page');
  if (page !== null && page !== '') {
    const parsedPage = Number.parseInt(page, 10);
    state.page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  }
  const course = url.searchParams.get('course');
  if (course !== null && course !== '') state.course = course;
  const scope = url.searchParams.get('scope');
  if (scope !== null && scope !== '') state.scope = scope;
  const classStatus = url.searchParams.get('classStatus');
  if (classStatus !== null && classStatus !== '') state.classStatus = classStatus;
  const classQ = url.searchParams.get('classQ');
  if (classQ !== null && classQ !== '') state.classQ = classQ;
  return state;
}

export const SUPPORTED_DASHBOARD_TABS = ['dashboard', 'exams', 'grading', 'reports'];

export const DEFAULT_DASHBOARD_TAB = 'dashboard';

export function readDashboardTab(input?: string | URL | { hash?: string } | null): string {
  if (!input) return DEFAULT_DASHBOARD_TAB;
  let hash = '';
  if (typeof input === 'string') {
    if (input.includes('#')) {
      hash = input.slice(input.indexOf('#') + 1);
    } else {
      hash = input;
    }
  } else if (input instanceof URL) {
    hash = input.hash ? input.hash.replace(/^#/, '') : '';
  } else if (typeof input === 'object' && input.hash) {
    hash = input.hash.replace(/^#/, '');
  }
  hash = hash.split('?')[0].trim().toLowerCase();
  if (hash === 'test-studio') return 'test-studio';
  return SUPPORTED_DASHBOARD_TABS.includes(hash) ? hash : DEFAULT_DASHBOARD_TAB;
}

export interface SwitchDashboardTabOptions {
  views?: Record<string, { hidden: boolean } | null | undefined>;
  navItems?: (Element | null | undefined)[];
  onTabChange?: (tab: string) => void;
}

export function switchDashboardTab(tabId: Parameters<typeof readDashboardTab>[0], options: SwitchDashboardTabOptions = {}): string {
  const targetTab = readDashboardTab(tabId);
  const views = options.views || {};
  const navItems = options.navItems || [];

  const isTestStudio = targetTab === 'test-studio' || targetTab === 'exams';

  for (const tab of SUPPORTED_DASHBOARD_TABS) {
    const view = views[tab];
    if (view) {
      if (tab === 'exams') {
        view.hidden = !isTestStudio;
      } else {
        view.hidden = tab !== targetTab;
      }
    }
  }
  if (views['test-studio']) {
    views['test-studio'].hidden = !isTestStudio;
  }

  for (const navItem of navItems) {
    if (!navItem) continue;
    const href = navItem.getAttribute('href') || '';
    const linkTab = href.replace(/^#/, '');
    const isActive = linkTab === targetTab || (isTestStudio && (linkTab === 'exams' || linkTab === 'test-studio'));
    if (isActive) {
      if (navItem.classList && typeof navItem.classList.add === 'function') {
        navItem.classList.add('active');
      }
      if (typeof navItem.setAttribute === 'function') {
        navItem.setAttribute('aria-current', 'page');
      }
    } else {
      if (navItem.classList && typeof navItem.classList.remove === 'function') {
        navItem.classList.remove('active');
      }
      if (typeof navItem.removeAttribute === 'function') {
        navItem.removeAttribute('aria-current');
      }
    }
  }

  if (typeof options.onTabChange === 'function') {
    options.onTabChange(targetTab);
  }
  return targetTab;
}

export function assignmentUrl(input: string | URL, state: Record<string, unknown>): URL {
  const url = input instanceof URL ? new URL(input) : new URL(input);
  const keys = ['classId', 'assignmentId', 'attemptId', 'q', 'status', 'minScore', 'maxScore', 'skill', 'sortBy', 'sortDir', 'page', 'course', 'scope', 'classStatus', 'classQ'];
  for (const key of keys) {
    if (state[key] !== undefined && state[key] !== null && state[key] !== '' && (key !== 'page' || Number(state[key]) > 1)) {
      url.searchParams.set(key, String(state[key]));
    } else {
      url.searchParams.delete(key);
    }
  }
  return url;
}

export function resetDashboardState(state: DashboardState = {}): DashboardState {
  state.classId = '';
  state.assignmentId = '';
  state.attemptId = '';
  state.q = '';
  state.status = '';
  state.minScore = '';
  state.maxScore = '';
  state.skill = '';
  state.sortBy = '';
  state.sortDir = '';
  state.page = 1;
  state.course = '';
  state.scope = '';
  state.classStatus = '';
  state.classQ = '';
  return state;
}

export interface ClassFilterOptions { course?: string, scope?: string, classStatus?: string, q?: string, userRole?: string, userClassIds?: unknown[] }

export function filterClasses(classes: ClassRecord[] = [], { course = '', scope = '', classStatus = '', q = '', userRole = '', userClassIds = [] }: ClassFilterOptions = {}): ClassRecord[] {
  let list = Array.isArray(classes) ? [...classes] : [];

  // Exclude completed or cancelled classes
  list = list.filter(c => {
    const st = String(c.status || c.classStatus || '').toLowerCase();
    return st !== 'completed' && st !== 'cancelled';
  });

  // 1. Role-specific filters
  if (userRole === 'lead' && scope === 'my_classes') {
    const classIdSet = new Set((userClassIds || []).map(String));
    list = list.filter(c => {
      const cid = String(c.classId || c.class_id || '');
      const hasTeachingProp = typeof c.isTeaching === 'boolean' || typeof c.is_teaching === 'boolean';
      if (hasTeachingProp) {
        return Boolean(c.isTeaching || c.is_teaching);
      }
      return classIdSet.has(cid);
    });
  } else if (course && course !== 'all') {
    const normCourse = String(course).replace(/^[^\d]*/, '').trim().toUpperCase();
    list = list.filter(c => {
      const cCode = String(c.courseCode || '').replace(/^[^\d]*/, '').trim().toUpperCase();
      return cCode === normCourse;
    });
  }

  // 2. Status filter
  if (classStatus && classStatus !== 'all') {
    list = list.filter(c => {
      const st = String(c.status || c.classStatus || '').toLowerCase();
      return st === classStatus.toLowerCase();
    });
  }

  // 3. Search query
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter(c => {
      const name = String(c.name || '').toLowerCase();
      const id = String(c.classId || '').toLowerCase();
      return name.includes(term) || id.includes(term);
    });
  }

  return list;
}

export function formatClassFilterCountLabel({ count = 0, course = '', scope = '', classStatus = '', userRole = '' }: { count?: number } & ClassFilterOptions = {}): string {
  let statusText = '';
  if (classStatus === 'on_going') statusText = ' đang học';
  else if (classStatus === 'pending') statusText = ' chờ mở';

  if (userRole === 'lead' && scope === 'my_classes') {
    return `${count} lớp bạn đang dạy${statusText}`;
  }

  if (course && course !== 'all') {
    const courseNum = String(course).replace(/^[^\d]*/, '');
    return `${count} lớp Khối ${courseNum || course}${statusText}`;
  }

  return `${count} lớp${statusText}`;
}

export function formatClassOptionLabel({ name, courseCode, assignmentCount }: { name?: unknown, courseCode?: unknown, assignmentCount?: unknown }): string {
  const normName = String(name || '').trim();
  const normCode = String(courseCode || '').trim();
  const count = Number(assignmentCount || 0);

  // If courseCode is the same as class name or looks like a class code (e.g. IC2283)
  if (normCode && normCode.toLowerCase() !== normName.toLowerCase()) {
    const courseNum = normCode.replace(/^[^\d]*/, '');
    const cleanCourse = courseNum ? `Khối ${courseNum}` : `Khối ${normCode}`;
    return `Lớp ${normName} · ${cleanCourse} · ${count} bài`;
  }
  return `Lớp ${normName} · ${count} bài`;
}

export function extractPhase(phase: unknown, title: unknown = ''): string | null {
  if (phase !== null && phase !== undefined && phase !== '') {
    const num = Number(phase);
    if (Number.isFinite(num)) return `Phase ${num}`;
  }
  if (typeof title === 'string' && title) {
    const match = title.match(/Phase\s*(\d+)/i);
    if (match) return `Phase ${match[1]}`;
  }
  return null;
}

export function formatAssignmentMeta({ className, courseCode, phase, title }: { className?: unknown, courseCode?: unknown, phase?: unknown, title?: unknown }) {
  const normClass = String(className || '').trim();
  let normCourse = String(courseCode || '').trim();

  // If courseCode is identical to className or is a class name, infer from title
  if (!normCourse || normCourse.toLowerCase() === normClass.toLowerCase()) {
    if (typeof title === 'string') {
      const match = title.match(/Khối\s*(\d+)/i);
      if (match) normCourse = match[1];
    }
  }

  const classLabel = normClass ? (normClass.startsWith('Lớp') ? normClass : `Lớp ${normClass}`) : '—';
  const courseLabel = normCourse && normCourse.toLowerCase() !== normClass.toLowerCase()
    ? (normCourse.startsWith('Khối') ? normCourse : `Khối ${normCourse}`)
    : '—';
  const phaseLabel = extractPhase(phase, title);

  return { classLabel, courseLabel, phaseLabel };
}

export interface AssignmentChipsViewOptions {
  assignmentsList?: AssignmentChip[];
  selectedAssignmentId?: string;
  isSwitching?: boolean;
  onSelect?: (assignmentId: string) => void;
  onToggleSwitch?: (switching: boolean) => void;
}

export function renderAssignmentChipsView(container: HTMLElement | null | undefined, {
  assignmentsList = [],
  selectedAssignmentId = '',
  isSwitching = false,
  onSelect = () => {},
  onToggleSwitch = () => {}
}: AssignmentChipsViewOptions = {}) {
  if (!container) return;
  container.replaceChildren();
  if (!assignmentsList || assignmentsList.length === 0) return;

  const selectedAssignment = assignmentsList.find(a => a.assignmentId === selectedAssignmentId);

  // Mode 1: An assignment is selected and NOT in expanded switching mode:
  // Render ONLY 1 card representing the active test, plus compact switcher button
  if (selectedAssignment && !isSwitching) {
    const focusContainer = document.createElement('div');
    focusContainer.className = 'assignment-focus-container';

    const chip = document.createElement('div');
    chip.className = 'assignment-chip selected assignment-active-focus';
    chip.dataset.assignmentId = selectedAssignment.assignmentId;
    chip.setAttribute('role', 'status');
    chip.setAttribute('aria-label', `Bài test đang chọn: ${selectedAssignment.title}`);

    const phaseLabel = extractPhase(selectedAssignment.phase, selectedAssignment.title);
    chip.innerHTML = `
      <div class="chip-header">
        <span class="active-badge">${renderSvgIcon('check', 'icon-inline')} Đang chọn</span>
        <span class="chip-meta">${escapeHtml(phaseLabel ? `${phaseLabel} · ${selectedAssignment.status}` : selectedAssignment.status)}</span>
      </div>
      <span class="chip-title">${escapeHtml(selectedAssignment.title)}</span>
    `;

    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.id = 'switch-assignment-btn';
    switchBtn.className = 'btn-switch-assignment';
    switchBtn.innerHTML = `
      ${renderSvgIcon('rotate', 'icon-inline')}
      <span>Đổi bài test (${assignmentsList.length} bài)</span>
    `;
    switchBtn.title = 'Xem và chọn bài kiểm tra khác trong lớp';
    switchBtn.addEventListener('click', () => {
      onToggleSwitch(true);
    });

    focusContainer.append(chip, switchBtn);
    container.append(focusContainer);
    return;
  }

  // Mode 2: Expanded switching mode (user clicked "Đổi bài test")
  if (selectedAssignment && isSwitching) {
    const switcherHeader = document.createElement('div');
    switcherHeader.className = 'assignment-switcher-header';
    switcherHeader.innerHTML = `
      <span class="switcher-title">${renderSvgIcon('book', 'icon-inline')} <span>Chọn bài test (${assignmentsList.length} bài)</span></span>
    `;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close-switcher';
    closeBtn.id = 'close-switcher-btn';
    closeBtn.innerHTML = `
      ${renderSvgIcon('close', 'icon-inline')}
      <span>Đóng</span>
    `;
    closeBtn.addEventListener('click', () => {
      onToggleSwitch(false);
    });
    switcherHeader.append(closeBtn);
    container.append(switcherHeader);
  }

  // Mode 3: Render all cards (either no assignment selected, or expanded switching mode)
  const chipsList = document.createElement('div');
  chipsList.className = 'assignment-chips-list';

  for (const assignment of assignmentsList) {
    const isSelected = assignment.assignmentId === selectedAssignmentId;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `assignment-chip${isSelected ? ' selected' : ''}`;
    chip.dataset.assignmentId = assignment.assignmentId;

    const phaseLabel = extractPhase(assignment.phase, assignment.title);
    chip.innerHTML = `
      <span class="chip-title">${escapeHtml(assignment.title)}</span>
      <span class="chip-meta">${escapeHtml(phaseLabel ? `${phaseLabel} · ${assignment.status}` : assignment.status)}</span>
    `;
    chip.addEventListener('click', () => {
      onSelect(assignment.assignmentId);
    });
    chipsList.append(chip);
  }
  container.append(chipsList);
}
