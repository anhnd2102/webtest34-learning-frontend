import assert from 'node:assert/strict';
import test from 'node:test';
import { createAttemptReview } from '../term-tests/teacher-dashboard/grading/attempt-review.js';
import { createAddStudent } from '../term-tests/teacher-dashboard/shell/add-student.js';

// Các thao tác ghi của dashboard phải đi qua `request` dùng chung (auth, 401, lỗi thống nhất),
// không còn fetch trực tiếp, và không tự thử lại.

function fakeElement(extra = {}) {
  return { textContent: '', hidden: false, value: '', dataset: {}, ...extra };
}

function reviewHarness(requestImpl) {
  const draftStatusMsg = fakeElement();
  const conflictAlert = fakeElement({ replaceChildren() {}, append() {} });
  const elements = { '#draft-status-msg': draftStatusMsg, '#conflict-alert': conflictAlert };
  const doc = { createElement: () => fakeElement({ append() {}, addEventListener() {} }) };
  const root = { ownerDocument: doc, querySelector: sel => elements[sel] ?? null, querySelectorAll: () => [] };
  const calls = [];
  const request = async (path, options) => { calls.push({ path, options }); return requestImpl(path, options); };
  const attemptDetail = fakeElement({ querySelectorAll: () => [] });
  elements['#attempt-detail'] = attemptDetail;
  const state = { classId: 'c1', assignmentId: 'a1', attemptId: 't1' };
  const viewState = { currentAttemptDetail: { items: [], manualGrading: { revision: 3 } } };
  const loaded = [];
  const review = createAttemptReview({
    root, lifecycle: { listen() {}, timeout() {} }, state, viewState,
    queryCoordinator: { cancel() {} },
    actions: { fillIncidentTimeline() {}, loadAttemptDetail: async (...a) => { loaded.push(a); }, request, setUrl() {}, loadResults: async () => {} }
  });
  return { review, calls, draftStatusMsg, loaded };
}

test('công bố kết quả gọi request một lần với JSON và thông báo lỗi dự phòng', async () => {
  globalThis.alert = () => {};
  const { review, calls, loaded } = reviewHarness(async () => ({}));
  await review.publishAttemptResult();
  assert.equal(calls.length, 1);
  assert.match(calls[0].path, /publish/);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].options.errorMessage, 'Không thể công bố kết quả.');
  assert.equal(calls[0].options.headers.Authorization, undefined, 'auth do request thêm, không đặt ở nơi gọi');
  assert.equal(loaded.length, 1);
});

test('lỗi khi công bố hiện thông báo và không tải lại, không gọi lần hai', async () => {
  globalThis.alert = () => {};
  const { review, calls, draftStatusMsg, loaded } = reviewHarness(async () => { throw Object.assign(new Error('Không thể công bố kết quả.'), { status: 500 }); });
  await review.publishAttemptResult();
  assert.equal(calls.length, 1);
  assert.equal(draftStatusMsg.textContent, 'Lỗi công bố: Không thể công bố kết quả.');
  assert.equal(loaded.length, 0);
});

test('lưu nháp gửi baseRevision và xung đột 409 hiện cảnh báo bằng apiMessage', async () => {
  const { review, calls, draftStatusMsg } = reviewHarness(async () => {
    throw Object.assign(new Error('x'), { status: 409, apiMessage: undefined });
  });
  await review.saveManualGradingDraft();
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].options.body).baseRevision, 3);
  assert.equal(calls[0].options.errorMessage, 'Không thể lưu nháp.');
  assert.equal(draftStatusMsg.textContent, 'Đang lưu nháp...', '409 không ghi "Lỗi lưu nháp"');
});

test('lưu nháp lỗi khác 409 hiện "Lỗi lưu nháp"', async () => {
  const { review, draftStatusMsg } = reviewHarness(async () => { throw Object.assign(new Error('Máy chủ lỗi'), { status: 500 }); });
  await review.saveManualGradingDraft();
  assert.equal(draftStatusMsg.textContent, 'Lỗi lưu nháp: Máy chủ lỗi');
});

test('thêm học viên gửi JSON qua request và hiện lỗi trong modal', async () => {
  const listeners = {};
  const form = { addEventListener() {} };
  const error = fakeElement({ hidden: true });
  const nameInput = fakeElement({ value: 'An' });
  const discInput = fakeElement({ value: '' });
  const calls = [];
  let fail = false;
  createAddStudent({
    lifecycle: { listen: (el, type, fn) => { if (el === form) listeners[type] = fn; } },
    addStudentBtn: null, addStudentModal: null, addStudentForm: form, eligibleStudentSelect: null,
    addStudentRefInput: { value: ' sv1 ' }, addStudentNameInput: nameInput, addStudentDiscInput: discInput,
    addStudentError: error, cancelAddStudentBtn: null,
    state: { classId: 'c1', assignmentId: 'a1' },
    request: async (path, options) => { calls.push({ path, options }); if (fail) throw new Error('Trùng mã'); return {}; },
    loadResults: async () => {}
  });
  await listeners.submit({ preventDefault() {} });
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].options.body), { studentRef: 'sv1', name: 'An', discriminator: '' });
  assert.equal(calls[0].options.errorMessage, 'Không thể thêm học viên.');
  fail = true;
  await listeners.submit({ preventDefault() {} });
  assert.equal(calls.length, 2, 'mỗi lần gửi đúng một request, không thử lại');
  assert.equal(error.hidden, false);
  assert.equal(error.textContent, 'Trùng mã');
});
