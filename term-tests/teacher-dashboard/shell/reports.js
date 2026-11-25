// NGUỒN: file .ts này; reports.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { assignmentResultsExportPath } from '../api/teacher.js';
import { downloadResultsXlsx } from '../results/export.js';
import { reportApiPath, renderScoreDistributionView } from './analytics/score-distribution-view.js';
import { itemAnalysisApiPath, renderItemAnalysisView } from './analytics/item-analysis-view.js';
export function createReports({ root, queryCoordinator, authState, document, window, status, assessmentTabDistribution, assessmentTabItems, switchAssessmentTab, statusFilter, state, apiBase, authHeader, endSession, request, applyFilterChange }) {
    const getReportState = () => reportState;
    let reportState = {
        mode: 'distribution', // 'distribution' | 'item_analysis'
        reportData: null,
        isLoading: false,
        error: null,
        activeSkill: 'overall',
        includeProvisional: false,
        activeBucketIndex: -1,
        itemAnalysisData: null,
        itemAnalysisLoading: false,
        itemAnalysisError: null,
        itemSelectedSkill: 'ALL',
        itemSortCriteria: 'error_rate_desc',
        expandedItemIds: new Set()
    };
    function cancelAssessmentQueries() {
        queryCoordinator.cancel('reports');
        queryCoordinator.cancel('itemAnalysis');
        reportState.isLoading = false;
        reportState.itemAnalysisLoading = false;
        reportState.error = null;
        reportState.itemAnalysisError = null;
    }
    async function loadScoreDistributionReport(classId = state.classId, assignmentId = state.assignmentId) {
        if (!assessmentTabDistribution)
            return;
        if (!classId || !assignmentId) {
            queryCoordinator?.cancel?.('reports');
            reportState = {
                ...reportState,
                reportData: null,
                isLoading: false,
                error: null,
                activeSkill: 'overall',
                activeBucketIndex: -1
            };
            renderReportsView();
            return;
        }
        const query = queryCoordinator?.begin?.('reports');
        if (queryCoordinator && !query)
            return;
        reportState.isLoading = true;
        reportState.error = null;
        renderReportsView();
        try {
            const path = reportApiPath(classId, assignmentId, {
                includeProvisional: reportState.includeProvisional
            });
            const payload = await request(path, { signal: query?.signal });
            if (query && !query.isCurrent())
                return;
            if (state.classId !== classId || state.assignmentId !== assignmentId)
                return;
            reportState.reportData = payload;
            reportState.isLoading = false;
            reportState.error = null;
            renderReportsView();
        }
        catch (error) {
            if (query && (!query.isCurrent() || error.name === 'AbortError'))
                return;
            reportState.isLoading = false;
            reportState.error = error;
            renderReportsView();
        }
    }
    async function loadItemAnalysisReport(classId = state.classId, assignmentId = state.assignmentId) {
        if (!assessmentTabItems)
            return;
        if (!classId || !assignmentId) {
            queryCoordinator?.cancel?.('itemAnalysis');
            reportState.itemAnalysisData = null;
            reportState.itemAnalysisLoading = false;
            reportState.itemAnalysisError = null;
            renderReportsView();
            return;
        }
        const query = queryCoordinator?.begin?.('itemAnalysis');
        if (queryCoordinator && !query)
            return;
        reportState.itemAnalysisLoading = true;
        reportState.itemAnalysisError = null;
        renderReportsView();
        try {
            const path = itemAnalysisApiPath(classId, assignmentId, {
                includeProvisional: true
            });
            const payload = await request(path, { signal: query?.signal });
            if (query && !query.isCurrent())
                return;
            if (state.classId !== classId || state.assignmentId !== assignmentId)
                return;
            reportState.itemAnalysisData = payload;
            reportState.itemAnalysisLoading = false;
            reportState.itemAnalysisError = null;
            renderReportsView();
        }
        catch (error) {
            if (query && (!query.isCurrent() || error.name === 'AbortError'))
                return;
            reportState.itemAnalysisLoading = false;
            reportState.itemAnalysisError = error;
            renderReportsView();
        }
    }
    function renderReportsView() {
        if (!assessmentTabDistribution && !assessmentTabItems)
            return;
        const renderDistroCallbacks = {
            onCardFilter: (filterStatus) => {
                switchAssessmentTab('details');
                if (statusFilter) {
                    statusFilter.value = filterStatus;
                }
                state.status = filterStatus;
                applyFilterChange();
            },
            onProvisionalToggle: (checked) => {
                reportState.includeProvisional = checked;
                loadScoreDistributionReport();
                if (reportState.itemAnalysisData) {
                    reportState.itemAnalysisData = null;
                }
            },
            onSkillChange: (skillCode) => {
                reportState.activeSkill = skillCode;
                reportState.activeBucketIndex = -1;
                renderReportsView();
            },
            onBucketClick: ({ index }) => {
                reportState.activeBucketIndex = reportState.activeBucketIndex === index ? -1 : index;
                renderReportsView();
            },
            onRetry: () => {
                loadScoreDistributionReport();
            },
            onExportExcel: () => {
                if (!state.classId || !state.assignmentId)
                    return;
                const exportBtn = root.querySelector('.btn-export-excel');
                downloadResultsXlsx({
                    url: `${apiBase()}${assignmentResultsExportPath(state.classId, state.assignmentId)}`,
                    headers: authHeader(),
                    button: exportBtn,
                    status,
                    onUnauthorized: () => { if (authState.sessionToken)
                        endSession(); }
                });
            },
            onPrint: () => {
                if (typeof window !== 'undefined' && typeof window.print === 'function') {
                    window.print();
                }
            }
        };
        function bindItemAnalysisEvents(target) {
            if (!target)
                return;
            target.querySelectorAll('.item-filter-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const targetTab = (e.currentTarget || tab);
                    reportState.itemSelectedSkill = targetTab.getAttribute('data-skill');
                    renderReportsView();
                });
            });
            target.querySelectorAll('.item-sort-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetBtn = (e.currentTarget || btn);
                    const sortVal = targetBtn.getAttribute('data-sort');
                    if (sortVal) {
                        reportState.itemSortCriteria = sortVal;
                        renderReportsView();
                    }
                });
            });
            target.querySelectorAll('.btn-toggle-item').forEach(cardHeader => {
                cardHeader.addEventListener('click', () => {
                    const itemId = cardHeader.getAttribute('data-item-id');
                    if (itemId) {
                        if (reportState.expandedItemIds.has(itemId)) {
                            reportState.expandedItemIds.delete(itemId);
                        }
                        else {
                            reportState.expandedItemIds.add(itemId);
                        }
                        renderReportsView();
                    }
                });
            });
            const retryBtn = target.querySelector('.btn-retry-report');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    loadItemAnalysisReport();
                });
            }
        }
        // Chỉ vẽ panel của tab đang mở (switchAssessmentTab đặt mode rồi gọi lại renderReportsView khi chuyển tab).
        // 1. Render Assessment Tab: Score Distribution Panel
        if (assessmentTabDistribution && reportState.mode !== 'item_analysis') {
            renderScoreDistributionView(assessmentTabDistribution, reportState, renderDistroCallbacks);
        }
        // 2. Render Assessment Tab: Item Analysis Panel
        if (assessmentTabItems && reportState.mode === 'item_analysis') {
            const itemsPayload = reportState.itemAnalysisData;
            const items = itemsPayload?.items || [];
            const error = reportState.itemAnalysisError;
            const loading = reportState.itemAnalysisLoading;
            assessmentTabItems.innerHTML = renderItemAnalysisView({
                items,
                loading,
                error,
                selectedSkill: reportState.itemSelectedSkill,
                sortCriteria: reportState.itemSortCriteria,
                expandedItemIds: reportState.expandedItemIds
            });
            bindItemAnalysisEvents(assessmentTabItems);
        }
    }
    return { getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, renderReportsView };
}
