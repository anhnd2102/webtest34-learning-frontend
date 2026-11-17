import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRequirementBreakdown, requirementReviewHtml, collectRequirementScores, previewRequirementTotal } from '../term-tests/teacher-dashboard/grading/requirement-review.js';

// Giáo viên xem bằng chứng và sửa điểm từng yêu cầu của câu rubric v2 (spec #40, GĐ 5).
const emoji = /\p{Extended_Pictographic}/u;
const feedback = () => ({
  requiredStructures: [
    { id: 'req_1', label: 'Particularly + enjoy + V-ing', achieved: false, credit: 0, maxScore: 1, scoreEarned: 0, evidence: ['especially enjoy <i>'], comment: 'Dùng especially.' },
    { id: 'req_2', label: 'Cấu trúc song song', achieved: true, credit: 1, maxScore: 1, scoreEarned: 1, evidence: ['running, swimming'] }
  ],
  criteria: [{ id: 'task', label: 'Task achievement', score: 5, maxScore: 7.5, evidence: [] }],
  language: { maxScore: 2, scoreEarned: 1, independentErrors: 1 },
  errors: [{ code: 'agreement', message: 'Sai hòa hợp chủ vị', evidence: ['he go'], requiredStructureIds: [] }],
  evidence: []
});

test('chỉ câu có điểm từng yêu cầu (rubric v2) mới sửa theo yêu cầu', () => {
  assert.equal(hasRequirementBreakdown(feedback()), true);
  assert.equal(hasRequirementBreakdown({ structureScore: 1, requiredStructures: [{ id: 'a', achieved: true, evidence: [] }] }), false);
  assert.equal(hasRequirementBreakdown(null), false);
});

test('bảng yêu cầu: tên, bằng chứng (đã escape), nhận xét AI, ô nhập điểm theo mã, Grammar/Vocab và tiêu chí; điểm dạng đạt/tối đa', () => {
  const html = requirementReviewHtml(feedback(), { req_1: 0.5 });
  const text = html.replace(/<[^>]+>/g, ' ');
  assert.match(text, /Particularly \+ enjoy \+ V-ing/);
  assert.match(html, /especially enjoy &lt;i&gt;/);
  assert.doesNotMatch(html, /<i>/);
  assert.match(text, /Dùng especially\./);
  assert.match(text, /Sai hòa hợp chủ vị/);
  for (const id of ['req_1', 'req_2', 'task', 'language']) assert.match(html, new RegExp(`data-req-id="${id}"`));
  assert.match(html, /data-req-id="req_1"[^>]*value="0\.5"/, 'điểm nháp đã sửa thay cho điểm AI');
  assert.match(html, /data-req-id="req_2"[^>]*value="1"/);
  assert.match(html, /max="7\.5"/);
  assert.doesNotMatch(html, emoji);
  assert.doesNotMatch(text, /%/);
});

test('thu điểm từ ô nhập; ô trống bị bỏ, giữ điểm AI', () => {
  const root = { querySelectorAll: () => [{ dataset: { reqId: 'req_1' }, value: '0.5' }, { dataset: { reqId: 'req_2' }, value: ' ' }, { dataset: { reqId: 'language' }, value: '2' }] };
  assert.deepEqual(collectRequirementScores(root), { req_1: 0.5, language: 2 });
});

test('tổng xem trước = điểm AI + phần giáo viên sửa (chỉ để xem; backend tính điểm chính thức)', () => {
  assert.equal(previewRequirementTotal(feedback(), {}), 7);
  assert.equal(previewRequirementTotal(feedback(), { req_1: 1, language: 2 }), 9);
});
