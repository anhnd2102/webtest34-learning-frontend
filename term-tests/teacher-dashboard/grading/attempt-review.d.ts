// Khai báo tạm để tsc không kiểm kiểu cả attempt-review.js (853 dòng); xóa khi chuyển attempt-review sang .ts.
export function createAttemptReview(params: {
  root: ParentNode;
  lifecycle: unknown;
  state: unknown;
  viewState: unknown;
  queryCoordinator: unknown;
  actions: Record<string, any>;
}): {
  renderAttemptDetail(payload: any): void;
  showConflictAlert(message?: any): void;
  saveManualGradingDraft(isAuto?: boolean): Promise<void>;
  completeManualGrading(): Promise<void>;
  publishAttemptResult(): Promise<void>;
  closeAttemptDetail(): void;
};
