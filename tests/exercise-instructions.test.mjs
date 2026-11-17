import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDynamicExam } from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';
import { exerciseHeadingHtml } from '../term-tests/webtest-34-demo/candidate/exercise-heading.js';

// Màn làm bài của học viên phải hiện đề bài của từng bài tập (exercise), không chỉ câu dẫn theo dạng câu.
const q = (id, position, exerciseId, prompt) => ({
  itemVersionId: id, position, exerciseId, interactionType: 'single_choice', prompt,
  options: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }]
});
const render = definition => {
  const container = { innerHTML: '', addEventListener: () => {}, querySelectorAll: () => [] };
  renderDynamicExam(definition, container, { state: { answers: {} }, activeSection: 'Part A', onAnswerChange: () => {} });
  return container.innerHTML;
};
const twoExercises = {
  blocks: [{
    title: 'Part A', instructions: 'Section-level note.',
    exercises: [
      { exerciseId: 'e1', exerciseNumber: 1, title: 'Bài tập 1', instructions: 'Chọn từ đúng để hoàn thành câu <script>x</script>.', itemIds: ['i1', 'i2'] },
      { exerciseId: 'e2', exerciseNumber: 2, title: 'Bài tập 2', instructions: 'Đọc đoạn văn rồi trả lời.', itemIds: ['i3'] }
    ],
    items: [q('i1', 1, 'e1', 'Q one'), q('i2', 2, 'e1', 'Q two'), q('i3', 3, 'e2', 'Q three')]
  }]
};

test('mỗi bài tập hiện tiêu đề và đề bài ngay trước câu đầu tiên của nó, đúng một lần', () => {
  const html = render(twoExercises);
  assert.equal((html.match(/class="cbt-exercise-heading"/g) || []).length, 2);
  const first = html.indexOf('Chọn từ đúng');
  const second = html.indexOf('Đọc đoạn văn rồi trả lời');
  assert.ok(first > -1 && first < html.indexOf('Q one'), 'đề bài bài tập 1 nằm trước câu 1');
  assert.ok(second > html.indexOf('Q two') && second < html.indexOf('Q three'), 'đề bài bài tập 2 nằm giữa câu 2 và câu 3');
  assert.match(html, /Bài tập 1/);
  assert.doesNotMatch(html, /<script>x/, 'đề bài được làm sạch');
});

test('một bài tập duy nhất không có đề bài: không dựng khối thừa; có đề bài thì hiện', () => {
  const single = { blocks: [{ title: 'Part A', exercises: [{ exerciseId: 'e1', exerciseNumber: 1, title: 'Bài tập 1', instructions: '', itemIds: ['i1'] }], items: [q('i1', 1, 'e1', 'Q one')] }] };
  assert.doesNotMatch(render(single), /cbt-exercise-heading/);
  single.blocks[0].exercises[0].instructions = 'Chỉ có một bài tập nhưng có đề bài.';
  const html = render(single);
  assert.match(html, /Chỉ có một bài tập nhưng có đề bài\./);
  assert.doesNotMatch(html, /Bài tập 1/, 'một bài tập thì không cần số thứ tự/tiêu đề mặc định');
});

test('exerciseHeadingHtml: tiêu đề tùy chỉnh được giữ, tiêu đề mặc định ẩn khi chỉ một bài tập, không emoji', () => {
  const html = exerciseHeadingHtml({ exerciseNumber: 2, title: 'Reading task', instructions: 'Line 1\nLine 2' }, 3);
  assert.match(html, /Reading task/);
  assert.match(html, /Line 1<br\/?>Line 2/);
  assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
  assert.equal(exerciseHeadingHtml(undefined, 2), '');
  assert.equal(exerciseHeadingHtml({ exerciseNumber: 1, title: 'Bài tập 1', instructions: '' }, 1), '');
});
