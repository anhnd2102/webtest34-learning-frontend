// NGUỒN: file .ts này; results-filters.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { Lifecycle } from './lifecycle.js';
import type { DashboardState } from './dashboard-state.js';

export interface ResultsFiltersParams {
  lifecycle: Lifecycle;
  queryCoordinator: { cancel(scopeKey: string): void };
  results?: unknown;
  status: HTMLElement;
  searchInput?: HTMLInputElement | null;
  statusFilter?: HTMLSelectElement | null;
  skillFilter?: HTMLSelectElement | null;
  minScoreInput?: HTMLInputElement | null;
  maxScoreInput?: HTMLInputElement | null;
  sortBySelect?: HTMLSelectElement | null;
  sortDirSelect?: HTMLSelectElement | null;
  resetFiltersBtn?: HTMLElement | null;
  state: DashboardState;
  setUrl: () => void;
  loadResults: (classId: string | undefined, assignmentId: string | undefined) => Promise<unknown>;
}

export function createResultsFilters({ lifecycle, queryCoordinator, results, status, searchInput, statusFilter, skillFilter, minScoreInput, maxScoreInput, sortBySelect, sortDirSelect, resetFiltersBtn, state, setUrl, loadResults }: ResultsFiltersParams) {
  // Filter and pagination event handlers
  function applyFilterChange() {
    state.page = 1;
    setUrl();
    loadResults(state.classId, state.assignmentId).catch((error: Error) => { status.textContent = error.message; });
  }

  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  if (searchInput) {
    lifecycle.listen(searchInput, 'input', () => {
      queryCoordinator.cancel('results');
      state.q = searchInput.value.trim();
      lifecycle.clearTimeout(searchTimeout);
      searchTimeout = lifecycle.timeout(applyFilterChange, 300);
    });
  }

  if (statusFilter) {
    lifecycle.listen(statusFilter, 'change', () => {
      state.status = statusFilter.value;
      applyFilterChange();
    });
  }

  if (skillFilter) {
    lifecycle.listen(skillFilter, 'change', () => {
      state.skill = skillFilter.value;
      applyFilterChange();
    });
  }

  if (minScoreInput) {
    lifecycle.listen(minScoreInput, 'change', () => {
      state.minScore = minScoreInput.value;
      applyFilterChange();
    });
  }

  if (maxScoreInput) {
    lifecycle.listen(maxScoreInput, 'change', () => {
      state.maxScore = maxScoreInput.value;
      applyFilterChange();
    });
  }

  if (sortBySelect) {
    lifecycle.listen(sortBySelect, 'change', () => {
      state.sortBy = sortBySelect.value;
      applyFilterChange();
    });
  }

  if (sortDirSelect) {
    lifecycle.listen(sortDirSelect, 'change', () => {
      state.sortDir = sortDirSelect.value;
      applyFilterChange();
    });
  }

  if (resetFiltersBtn) {
    lifecycle.listen(resetFiltersBtn, 'click', () => {
      state.q = '';
      state.status = '';
      state.minScore = '';
      state.maxScore = '';
      state.skill = '';
      state.sortBy = '';
      state.sortDir = 'asc';
      state.page = 1;
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      if (skillFilter) skillFilter.value = '';
      if (minScoreInput) minScoreInput.value = '';
      if (maxScoreInput) maxScoreInput.value = '';
      if (sortBySelect) sortBySelect.value = '';
      if (sortDirSelect) sortDirSelect.value = 'asc';
      setUrl();
      loadResults(state.classId, state.assignmentId).catch((error: Error) => { status.textContent = error.message; });
    });
  }

  return { applyFilterChange };
}
