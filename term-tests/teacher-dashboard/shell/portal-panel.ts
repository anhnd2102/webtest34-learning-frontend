// NGUỒN: file .ts này; portal-panel.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { DashboardRequest, DashboardState } from './dashboard-state.js';
import type { Lifecycle } from './lifecycle.js';
import type { PreviewRow } from '../portal-sync-view.js';
import { portalTestsPath, portalLinkPath, portalSyncPreviewPath, portalSyncPath, portalSyncStatusPath, portalSyncErrorView, previewRowView, selectableRefs, syncRequestBody, syncConfirmMessage, syncResultView, retryRefs, linkedPortalTest, syncSummaryText, scaleWarningText, selectAllState, shouldReloadPreviewAfterSyncError } from '../portal-sync-view.js';

type PortalError = { code?: string, message?: string, status?: number };
interface PortalTest { portalClassTestId: number | string, name: string, maxScore: number, linkedAssignmentId?: string | null }
interface PortalSyncRow { studentRef: string, status: string, reason?: string, errorCode?: string }

export interface PortalPanelParams {
  root: ParentNode;
  lifecycle: Lifecycle;
  state: DashboardState;
  request: DashboardRequest;
  document: Document;
  window: Window;
}

export function createPortalPanel({ root, lifecycle, state, request, document, window }: PortalPanelParams) {
  // ---- Đồng bộ điểm Portal: chỉ hiển thị dữ liệu backend trả về, không tính điểm hay luật ở trình duyệt.
  const portalEl = <T extends HTMLElement = HTMLElement>(id: string): T => root.querySelector<T>(`#${id}`)!;
  const portal: {
    key: string;
    tests: PortalTest[];
    link: { name: string, maxScore: number } | null;
    preview: any;
    sync: Map<string, PortalSyncRow>;
    names: Map<string, string>;
    lastSync: any;
    busy: boolean;
    pending?: string[] | null;
  } = { key: '', tests: [], link: null, preview: null, sync: new Map(), names: new Map(), lastSync: null, busy: false };

  function portalMessage(text?: string) { portalEl('portal-sync-message').textContent = text || ''; }

  function portalCell(row: HTMLElement, text: string, tone?: string) {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (tone) cell.className = `portal-tone-${tone}`;
    row.append(cell);
  }

  function renderPortalPreview() {
    const box = portalEl('portal-preview');
    const body = portalEl('portal-preview-rows');
    body.replaceChildren();
    const preview = portal.preview;
    box.hidden = !preview;
    if (!preview) return;
    for (const raw of preview.rows as PreviewRow[]) {
      const view = previewRowView(raw);
      const result = portal.sync.has(raw.studentRef) ? syncResultView(portal.sync.get(raw.studentRef)!) : null;
      const tr = document.createElement('tr');
      const pick = document.createElement('td');
      const box2 = document.createElement('input');
      box2.type = 'checkbox';
      box2.className = 'portal-pick';
      box2.value = raw.studentRef;
      box2.disabled = !view.selectable;
      box2.checked = view.selectable;
      box2.setAttribute('aria-label', `Chọn ${view.name}`);
      lifecycle.listen(box2, 'change', updatePortalSyncButton);
      pick.append(box2);
      tr.append(pick);
      portalCell(tr, view.name);
      portalCell(tr, view.webtestText);
      portalCell(tr, view.portalText);
      portalCell(tr, view.reasonText ? `${view.statusLabel}: ${view.reasonText}` : view.statusLabel, view.tone);
      portalCell(tr, result ? [result.statusLabel, result.errorText].filter(Boolean).join(': ') : '', result?.tone);
      body.append(tr);
    }
    const writable = preview.mode === 'write';
    portalEl<HTMLButtonElement>('portal-sync-btn').disabled = !writable;
    portalEl<HTMLButtonElement>('portal-sync-btn').title = writable ? '' : 'Đang ở chế độ chỉ xem trước.';
    portalEl<HTMLButtonElement>('portal-retry-btn').hidden = !retryRefs([...portal.sync.values()]).length;
    updatePortalSyncButton();
  }

  const pickedRefs = () => [...root.querySelectorAll<HTMLInputElement>('.portal-pick:checked')].map(i => i.value);

  function updatePortalSyncButton() {
    const count = pickedRefs().length;
    const btn = portalEl<HTMLButtonElement>('portal-sync-btn');
    btn.textContent = count ? `Đồng bộ điểm Portal (${count})` : 'Đồng bộ điểm Portal';
    if (portal.preview?.mode === 'write') btn.disabled = !count || portal.busy;
    const all = portalEl<HTMLInputElement>('portal-select-all');
    const state = selectAllState(root.querySelectorAll('.portal-pick:not(:disabled)').length, count);
    Object.assign(all, state);
  }

  // Khóa nút thao tác trong lúc một thao tác Portal đang chạy.
  function applyPortalBusy() {
    for (const id of ['portal-unlink-btn', 'portal-preview-btn', 'portal-retry-btn', 'portal-reload-btn']) portalEl<HTMLButtonElement>(id).disabled = portal.busy;
    portalEl<HTMLButtonElement>('portal-link-btn').disabled = portal.busy || !portal.tests.some(t => !t.linkedAssignmentId);
    updatePortalSyncButton();
  }

  function resetPortal() {
    Object.assign(portal, { key: '', tests: [], link: null, preview: null, sync: new Map(), lastSync: null, pending: null });
    const section = portalEl('portal-sync');
    if (section) section.hidden = true;
  }

  function renderPortalLastSync() {
    const last = portal.lastSync;
    portalEl('portal-last-sync').textContent = last
      ? `Lần đồng bộ gần nhất: ${new Date(last.startedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · ${last.actorEmail} · ${syncSummaryText(last.summary)}`
      : '';
  }

  function renderPortalPanel() {
    const linked = portal.link;
    portalEl('portal-sync-link').hidden = !!linked;
    portalEl('portal-sync-linked').hidden = !linked;
    if (linked) portalEl('portal-linked-name').textContent = `${linked.name} (thang ${linked.maxScore})`;
    else {
      const select = portalEl<HTMLSelectElement>('portal-test-select');
      select.replaceChildren();
      for (const t of portal.tests) {
        const option = document.createElement('option');
        option.value = String(t.portalClassTestId);
        option.textContent = `${t.name} (thang ${t.maxScore})${t.linkedAssignmentId ? ' — đã gắn với đợt khác' : ''}`;
        option.disabled = !!t.linkedAssignmentId;
        select.append(option);
      }
      portalEl<HTMLButtonElement>('portal-link-btn').disabled = !portal.tests.some(t => !t.linkedAssignmentId);
    }
    renderPortalLastSync();
    renderPortalPreview();
    const warning = portalEl('portal-scale-warning');
    warning.textContent = scaleWarningText(portal.preview?.scaleWarning);
    warning.hidden = !warning.textContent;
    applyPortalBusy();
  }

  async function loadPortalLastSync(key: string) {
    const { sync } = await request(portalSyncStatusPath(state.classId!, state.assignmentId!));
    if (portal.key !== key) return;
    portal.lastSync = null;
    if (!sync) return;
    // Backend không trả họ tên trong vết; tên chỉ lấy từ bản xem trước đang hiển thị.
    const summary: Record<string, number> = {};
    for (const r of sync.rows as PortalSyncRow[]) summary[r.status] = (summary[r.status] || 0) + 1;
    portal.lastSync = { ...sync, summary };
    for (const r of sync.rows as PortalSyncRow[]) if (!portal.sync.has(r.studentRef)) portal.sync.set(r.studentRef, r);
  }

  // keepResults: giữ kết quả từng dòng của lần ghi vừa xong khi tải lại bản xem trước (vân tay mới).
  async function loadPortalPreview({ keepResults = false, message = '' }: { keepResults?: boolean, message?: string } = {}): Promise<void> {
    const key = portal.key;
    portalMessage('Đang xem trước điểm Portal…');
    if (!keepResults) portal.sync = new Map();
    portal.preview = null;
    try {
      const { preview } = await request(portalSyncPreviewPath(state.classId!, state.assignmentId!));
      if (portal.key !== key) return;
      portal.preview = preview;
      await loadPortalLastSync(key);
      if (portal.key !== key) return;
      portalMessage(message || (preview.mode === 'write' ? '' : 'Chế độ chỉ xem trước: chưa thể ghi điểm sang Portal.'));
    } catch (error) {
      if (portal.key !== key) return;
      portalMessage(portalSyncErrorView(error as PortalError).message);
    }
    renderPortalPanel();
  }

  async function loadPortalPanel() {
    const section = portalEl('portal-sync');
    if (!section) return;
    const key = `${state.classId}/${state.assignmentId}`;
    portal.key = key;
    portal.link = null; portal.preview = null; portal.tests = []; portal.sync = new Map(); portal.lastSync = null;
    portalEl('portal-sync-link').hidden = true;
    portalEl('portal-sync-linked').hidden = true;
    portalEl('portal-preview').hidden = true;
    portalEl<HTMLButtonElement>('portal-reload-btn').hidden = true;
    portalEl('portal-last-sync').textContent = '';
    section.hidden = false;
    portalMessage('Đang tải bài test Portal…');
    try {
      const { portalTests } = await request(portalTestsPath(state.classId!));
      if (portal.key !== key) return;
      portal.tests = Array.isArray(portalTests) ? portalTests : [];
      const linked = linkedPortalTest(portal.tests, state.assignmentId!);
      portal.link = linked ? { name: linked.name, maxScore: linked.maxScore } : null;
      portalMessage(linked ? '' : 'Chưa gắn bài test Portal cho đợt giao bài này.');
      renderPortalPanel();
      if (linked) await loadPortalPreview();
    } catch (error) {
      if (portal.key !== key) return;
      const view = portalSyncErrorView(error as PortalError);
      portalMessage(view.message);
      renderPortalPanel();
      portalEl('portal-sync-link').hidden = true;
      portalEl('portal-sync-linked').hidden = true;
      // Chỉ chế độ tắt mới ẩn hết điều khiển; lỗi khác cho tải lại và chọn lại đợt sẽ tự tải lại.
      if (!view.disabled) { portal.key = ''; portalEl<HTMLButtonElement>('portal-reload-btn').hidden = false; }
    }
  }

  function ensurePortalPanel() {
    if (!state.classId || !state.assignmentId) { portalEl('portal-sync').hidden = true; portal.key = ''; return; }
    if (portal.key !== `${state.classId}/${state.assignmentId}`) loadPortalPanel();
  }

  async function runPortalAction(action: () => Promise<unknown>) {
    if (portal.busy) return;
    portal.busy = true;
    applyPortalBusy();
    try { await action(); } catch (error) { portalMessage(portalSyncErrorView(error as PortalError).message); } finally { portal.busy = false; applyPortalBusy(); }
  }

  async function doPortalSync(refs: string[]) {
    const preview = portal.preview;
    const key = portal.key;
    portalMessage('Đang ghi điểm sang Portal và đọc lại để xác nhận…');
    let sync: any;
    try {
      ({ sync } = await request(portalSyncPath(state.classId!, state.assignmentId!), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncRequestBody(preview.fingerprint, refs))
      }));
    } catch (error) {
      if (!shouldReloadPreviewAfterSyncError(error as PortalError)) throw error;
      // Không giữ vân tay cũ: tải lại bản xem trước và kết quả lần đồng bộ gần nhất.
      const suffix = (error as PortalError).code === 'PORTAL_PREVIEW_STALE' ? '' : ' Kết quả ghi chưa rõ, hãy kiểm tra lại bên dưới.';
      await loadPortalPreview({ message: `${portalSyncErrorView(error as PortalError).message}${suffix}` });
      return;
    }
    if (portal.key !== key) return;
    portal.sync = new Map(sync.rows.map((r: PortalSyncRow) => [r.studentRef, r] as [string, PortalSyncRow]));
    const text = syncSummaryText(sync.summary);
    // Lần ghi vừa xong làm vân tay cũ hết hiệu lực: tải lại bản xem trước, giữ kết quả từng dòng.
    await loadPortalPreview({ keepResults: true, message: sync.stopped ? `Đã dừng: ${portalSyncErrorView({ code: sync.stopped }).message} ${text}` : text });
  }

  function askPortalConfirm(refs: string[]) {
    const dialog = portalEl<HTMLDialogElement>('portal-sync-confirm');
    portalEl('portal-sync-confirm-text').textContent = syncConfirmMessage(refs.length);
    portal.pending = refs;
    dialog.showModal();
  }

  lifecycle.listen(portalEl<HTMLButtonElement>('portal-link-btn'), 'click', () => runPortalAction(async () => {
    const id = Number(portalEl<HTMLSelectElement>('portal-test-select').value);
    if (!id) return;
    await request(portalLinkPath(state.classId!, state.assignmentId!), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClassTestId: id })
    });
    portal.key = '';
    await loadPortalPanel();
  }));
  lifecycle.listen(portalEl<HTMLButtonElement>('portal-unlink-btn'), 'click', () => runPortalAction(async () => {
    if (!window.confirm('Gỡ gắn bài test Portal khỏi đợt giao bài này?')) return;
    await request(portalLinkPath(state.classId!, state.assignmentId!), { method: 'DELETE' });
    portal.key = '';
    await loadPortalPanel();
  }));
  lifecycle.listen(portalEl<HTMLButtonElement>('portal-preview-btn'), 'click', () => runPortalAction(loadPortalPreview));
  lifecycle.listen(portalEl<HTMLButtonElement>('portal-reload-btn'), 'click', () => runPortalAction(loadPortalPanel));
  lifecycle.listen(portalEl<HTMLInputElement>('portal-select-all'), 'change', event => {
    root.querySelectorAll<HTMLInputElement>('.portal-pick:not(:disabled)').forEach(i => { i.checked = (event.target as HTMLInputElement).checked; });
    updatePortalSyncButton();
  });
  lifecycle.listen(portalEl<HTMLButtonElement>('portal-sync-btn'), 'click', () => { const refs = pickedRefs(); if (refs.length) askPortalConfirm(refs); });
  lifecycle.listen(portalEl<HTMLButtonElement>('portal-retry-btn'), 'click', () => runPortalAction(async () => {
    const wanted = new Set(retryRefs([...portal.sync.values()]));
    await loadPortalPreview();   // vân tay mới; chỉ dòng còn "Điền được" mới thử lại được
    const refs = selectableRefs(portal.preview?.rows || []).filter(r => wanted.has(r));
    if (refs.length) askPortalConfirm(refs); else portalMessage('Không còn dòng nào có thể thử lại.');
  }));
  lifecycle.listen(portalEl('portal-sync-cancel'), 'click', () => portalEl<HTMLDialogElement>('portal-sync-confirm').close());
  lifecycle.listen(portalEl('portal-sync-confirm-btn'), 'click', event => {
    event.preventDefault();
    portalEl<HTMLDialogElement>('portal-sync-confirm').close();
    runPortalAction(() => doPortalSync(portal.pending || []));
  });

  return { ensurePortalPanel, resetPortal };
}
