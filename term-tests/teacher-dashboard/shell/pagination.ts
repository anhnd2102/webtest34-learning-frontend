// NGUỒN: file .ts này; pagination.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
export interface PaginationParams {
  lifecycle: { listen: (target: EventTarget, type: string, handler: EventListener) => void };
  status: HTMLElement;
  prevPageBtn: HTMLElement | null | undefined;
  nextPageBtn: HTMLElement | null | undefined;
  state: { page?: number, classId?: string, assignmentId?: string };
  setUrl: () => void;
  loadResults: (classId: string | undefined, assignmentId: string | undefined) => Promise<unknown>;
}

export function createPagination({ lifecycle, status, prevPageBtn, nextPageBtn, state, setUrl, loadResults }: PaginationParams) {
  if (prevPageBtn) {
    lifecycle.listen(prevPageBtn, 'click', () => {
      if ((state.page || 1) > 1) {
        state.page = (state.page || 1) - 1;
        setUrl();
        loadResults(state.classId, state.assignmentId).catch((error: Error) => { status.textContent = error.message; });
      }
    });
  }

  if (nextPageBtn) {
    lifecycle.listen(nextPageBtn, 'click', () => {
      state.page = (state.page || 1) + 1;
      setUrl();
      loadResults(state.classId, state.assignmentId).catch((error: Error) => { status.textContent = error.message; });
    });
  }
}
