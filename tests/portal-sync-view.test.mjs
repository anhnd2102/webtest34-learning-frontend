import test from 'node:test';
import assert from 'node:assert/strict';
import {
  portalTestsPath, portalLinkPath, portalSyncPreviewPath, portalSyncPath, portalSyncStatusPath,
  portalSyncErrorView, previewRowView, selectableRefs, syncRequestBody, syncConfirmMessage,
  syncResultView, retryRefs, linkedPortalTest, syncSummaryText
} from '../term-tests/teacher-dashboard/portal-sync-view.js';

test('đường dẫn API Portal theo hợp đồng backend', () => {
  assert.equal(portalTestsPath('101'), '/api/teacher/classes/101/portal-tests');
  assert.equal(portalLinkPath('101', 'a b'), '/api/teacher/classes/101/assignments/a%20b/portal-link');
  assert.equal(portalSyncPreviewPath('101', 'x'), '/api/teacher/classes/101/assignments/x/portal-sync/preview');
  assert.equal(portalSyncPath('101', 'x'), '/api/teacher/classes/101/assignments/x/portal-sync');
  assert.equal(portalSyncStatusPath('101', 'x'), '/api/teacher/classes/101/assignments/x/portal-sync/status');
});

test('chế độ tắt báo rõ chưa bật; chế độ xem trước báo không ghi được', () => {
  assert.deepEqual(portalSyncErrorView({ code: 'PORTAL_SYNC_DISABLED', message: 'x' }), { disabled: true, message: 'Tính năng đồng bộ điểm Portal chưa được bật.' });
  const preview = portalSyncErrorView({ code: 'PORTAL_SYNC_WRITE_DISABLED' });
  assert.equal(preview.disabled, false);
  assert.match(preview.message, /chỉ xem trước/);
  assert.deepEqual(portalSyncErrorView({ code: 'PORTAL_PREVIEW_STALE', message: 'Dữ liệu đã thay đổi' }), { disabled: false, message: 'Dữ liệu đã thay đổi từ lúc xem trước. Hãy xem trước lại.' });
  assert.deepEqual(portalSyncErrorView({ code: 'OTHER', message: 'Lỗi gì đó' }), { disabled: false, message: 'Lỗi gì đó' });
});

test('dòng xem trước: chỉ "Điền được" mới chọn được; dòng bị chặn hiện lý do', () => {
  const ready = previewRowView({ studentRef: 'r1', name: 'HV A', status: 'ready', webtestEarned: 17, webtestMaximum: 20, convertedScore: 8.5, portalScore: null });
  assert.equal(ready.statusLabel, 'Điền được');
  assert.equal(ready.selectable, true);
  assert.equal(ready.webtestText, '17/20 → 8.5');
  assert.equal(ready.portalText, 'Trống');
  const mismatch = previewRowView({ studentRef: 'r2', status: 'mismatch', convertedScore: 8.5, portalScore: 7, webtestEarned: 17, webtestMaximum: 20 });
  assert.equal(mismatch.statusLabel, 'Điểm lệch');
  assert.equal(mismatch.selectable, false);
  assert.equal(mismatch.portalText, '7');
  const blocked = previewRowView({ studentRef: 'r3', status: 'blocked', reason: 'score_not_final' });
  assert.equal(blocked.statusLabel, 'Bị chặn');
  assert.equal(blocked.reasonText, 'Điểm chưa chung cuộc');
  assert.equal(blocked.selectable, false);
  assert.equal(blocked.webtestText, '—');
  assert.equal(previewRowView({ studentRef: 'r4', status: 'changed_after_sync' }).statusLabel, 'Đã đổi sau đồng bộ');
  assert.equal(previewRowView({ studentRef: 'r5', status: 'matched' }).statusLabel, 'Đã khớp');
  assert.equal(previewRowView({ studentRef: 'r6', status: 'blocked', reason: 'zzz' }).reasonText, 'zzz');
});

test('selectableRefs chỉ lấy dòng điền được', () => {
  assert.deepEqual(selectableRefs([{ studentRef: 'a', status: 'ready' }, { studentRef: 'b', status: 'mismatch' }, { studentRef: 'c', status: 'ready' }]), ['a', 'c']);
});

test('yêu cầu đồng bộ chỉ gồm vân tay, học viên chọn và xác nhận tường minh', () => {
  assert.deepEqual(syncRequestBody('f'.repeat(64), ['a', 'b']), { fingerprint: 'f'.repeat(64), studentRefs: ['a', 'b'], confirm: true });
  assert.match(syncConfirmMessage(3), /3 học viên/);
});

test('chỉ "synced" mới được coi là đã đồng bộ thành công', () => {
  assert.equal(syncResultView({ status: 'synced' }).confirmed, true);
  for (const status of ['failed', 'mismatch', 'skipped', 'blocked', 'not_attempted', 'processing', 'pending']) {
    assert.equal(syncResultView({ status }).confirmed, false, status);
  }
  const failed = syncResultView({ status: 'failed', errorCode: 'PORTAL_READBACK_MISMATCH' });
  assert.equal(failed.retryable, true);
  assert.match(failed.errorText, /đọc lại/i);
  assert.equal(syncResultView({ status: 'synced' }).retryable, false);
});

test('thử lại gồm dòng lỗi và dòng chưa thử', () => {
  assert.deepEqual(retryRefs([{ studentRef: 'a', status: 'failed' }, { studentRef: 'b', status: 'synced' }, { studentRef: 'c', status: 'not_attempted' }]), ['a', 'c']);
});

test('tìm bài test Portal đang gắn với đợt giao bài', () => {
  const tests = [{ portalClassTestId: 1, linkedAssignmentId: 'x' }, { portalClassTestId: 2, linkedAssignmentId: 'y' }, { portalClassTestId: 3, linkedAssignmentId: null }];
  assert.equal(linkedPortalTest(tests, 'y').portalClassTestId, 2);
  assert.equal(linkedPortalTest(tests, 'z'), null);
});

test('tóm tắt kết quả đồng bộ không báo thành công khi chưa có dòng synced', () => {
  assert.equal(syncSummaryText({ failed: 1 }), 'Đã đồng bộ 0 · Lỗi 1');
  assert.equal(syncSummaryText({ synced: 2, skipped: 1, mismatch: 1 }), 'Đã đồng bộ 2 · Bỏ qua 1 · Điểm lệch 1');
});
