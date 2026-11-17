import test from 'node:test';
import assert from 'node:assert/strict';
import { writingAidsHtml } from '../term-tests/webtest-34-demo/candidate/writing-aids.js';
import { requirementFeedbackHtml, studentResultsBodyHtml } from '../term-tests/webtest-34-demo/candidate/result-view.js';
import { renderQuestionCard } from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';
import { reviewHtml, reviewViewModel } from '../term-tests/34-shared/review-module.mjs';

// Giao diện học viên cho rubric v2 (spec #40, GĐ 4): dàn ý + từ vựng gợi ý khi làm bài, từng yêu cầu đạt/chưa đạt khi xem kết quả.
const emoji = /\p{Extended_Pictographic}/u;
const visible = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const writingItem = {
  itemVersionId: '30000000-0000-4000-8000-000000000001', position: 1, prompt: 'Explain the difficulties of living in a city.',
  interactionType: 'long_text', graderType: 'rubric_async', pedagogicalTypeCode: 'writing', maxScore: 15,
  studentOutline: ['Topic sentence', 'Ý 1: chi phí sinh hoạt cao', 'Ý 2: nhiều vấn đề xã hội'],
  vocabularyHints: ['migrate to', 'the cost of living <b>']
};

test('dàn ý hiện thành danh sách có thứ tự, từ vựng gợi ý ghi rõ không bắt buộc, nội dung được escape', () => {
  const html = writingAidsHtml(writingItem);
  assert.match(html, /<ol[^>]*>[\s\S]*Topic sentence[\s\S]*<\/ol>/);
  assert.equal((html.match(/<li/g) || []).length, 5);
  assert.match(html, /không bắt buộc/i);
  assert.match(html, /the cost of living &lt;b&gt;/);
  assert.doesNotMatch(html, /<b>/);
  assert.doesNotMatch(html, emoji);
});

test('không có dàn ý hay từ vựng thì không dựng gì; chỉ có một trong hai thì chỉ dựng phần đó', () => {
  assert.equal(writingAidsHtml({}), '');
  assert.equal(writingAidsHtml({ studentOutline: [], vocabularyHints: [] }), '');
  const onlyVocab = writingAidsHtml({ vocabularyHints: ['migrate to'] });
  assert.match(onlyVocab, /migrate to/);
  assert.doesNotMatch(onlyVocab, /Dàn ý/);
});

test('thẻ câu hỏi Writing của học viên có dàn ý và từ vựng ngay trên ô trả lời; câu tự luận thường không bị đổi', () => {
  const html = renderQuestionCard(writingItem, {});
  const aids = html.indexOf('cbt-writing-aid');
  const textarea = html.indexOf('<textarea');
  assert.ok(aids > -1 && textarea > aids, 'dàn ý nằm trước ô trả lời');
  assert.match(html, /Ý 1: chi phí sinh hoạt cao/);
  const plain = renderQuestionCard({ ...writingItem, studentOutline: undefined, vocabularyHints: undefined }, {});
  assert.doesNotMatch(plain, /cbt-writing-aid/);
});

const feedback = (hidden = false) => ({
  structureScore: 1, structureMaxScore: 2, accuracyScore: 2, accuracyMaxScore: 2,
  requiredStructures: [
    { id: 'req_1', ...(hidden ? {} : { label: 'Particularly + enjoy + V-ing', comment: 'Dùng especially nên chưa đạt.' }), achieved: false, credit: 0, maxScore: 1, scoreEarned: 0, evidence: ['especially enjoy'] },
    { id: 'req_2', ...(hidden ? {} : { label: 'Cấu trúc song song' }), achieved: true, credit: 1, maxScore: 1, scoreEarned: 1, evidence: ['running, swimming'] },
    { id: 'req_3', ...(hidden ? {} : { label: 'Ý phụ' }), achieved: false, credit: 0.5, maxScore: 1, scoreEarned: 0.5, evidence: [] }
  ],
  language: { maxScore: 2, scoreEarned: 2, independentErrors: 0 },
  errors: [], evidence: []
});

test('kết quả từng yêu cầu: Đạt / Một phần / Chưa đạt, điểm, nhận xét; không phần trăm, không emoji, không lộ mã', () => {
  const html = requirementFeedbackHtml(feedback());
  const text = visible(html);
  assert.match(text, /Particularly \+ enjoy \+ V-ing/);
  assert.match(text, /Chưa đạt/);
  assert.match(text, /Đạt/);
  assert.match(text, /Một phần/);
  assert.match(text, /0\/1đ/);
  assert.match(text, /0\.5\/1đ/);
  assert.match(text, /Dùng especially nên chưa đạt/);
  assert.match(text, /Grammar\/Vocab[^a-z]*2\/2đ/);
  assert.doesNotMatch(html, emoji);
  assert.doesNotMatch(text, /req_\d|%/);
});

test('khi đáp án chưa công bố: vẫn thấy đạt/chưa đạt và điểm nhưng gọi là "Yêu cầu N", không có tên hay nhận xét', () => {
  const text = visible(requirementFeedbackHtml(feedback(true)));
  assert.match(text, /Yêu cầu 1/);
  assert.match(text, /Yêu cầu 2/);
  assert.match(text, /Chưa đạt/);
  assert.match(text, /1\/1đ/);
  assert.doesNotMatch(text, /Particularly|especially/);
});

test('phản hồi của rubric cũ (không có điểm từng yêu cầu) không dựng khối yêu cầu', () => {
  assert.equal(requirementFeedbackHtml({ structureScore: 1, accuracyScore: 1, requiredStructures: [{ id: 'there_be', achieved: true, evidence: ['There'] }], errors: [], evidence: [] }), '');
  assert.equal(requirementFeedbackHtml(undefined), '');
});

const result = {
  gradingStatus: 'complete', answerRelease: 'released',
  summary: { scoreFinal: true, scoreEarned: 3, maxScore: 4, pendingItemCount: 0, answered: 1, totalItems: 1 },
  items: [{ itemVersionId: writingItem.itemVersionId, position: 1, verdict: 'partial', scoreEarned: 3, maxScore: 4, rawAnswer: 'I especially enjoy running.', feedback: feedback() }]
};
const definition = { blocks: [{ blockId: 'b1', title: 'Writing', items: [{ itemVersionId: writingItem.itemVersionId, interactionType: 'long_text', pedagogicalTypeCode: 'writing' }] }] };

test('màn hình kết quả của học viên có khối yêu cầu trong thẻ câu', () => {
  const html = studentResultsBodyHtml({ result, definition, studentName: 'A', className: 'L' });
  assert.match(html, /sim-card-requirements/);
  assert.match(visible(html), /Particularly \+ enjoy \+ V-ing/);
  assert.match(visible(html), /3\/4đ/);
});

test('màn hình xem lại (review-module) có khối yêu cầu cho câu rubric v2', () => {
  const vm = reviewViewModel({ state: 'ready', meta: {}, result, definition, groupResultItems: ({ blocks, items }) => {
    const groups = blocks.map(block => ({ id: block.blockId, label: block.title, score: 3, maxScore: 4, gradedMaxScore: 4, correct: 0, graded: 1, items }));
    return Object.assign(groups, { incomplete: false, unmatchedItems: [] });
  } });
  const html = reviewHtml(vm);
  assert.match(html, /review-requirements/);
  assert.match(visible(html), /Chưa đạt/);
  assert.doesNotMatch(html, emoji);
});
