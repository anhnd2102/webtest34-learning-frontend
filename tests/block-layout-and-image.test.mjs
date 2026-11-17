import test from 'node:test';
import assert from 'node:assert/strict';
import { renderQuestionCard, renderDynamicExam } from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';

const choice = labels => ({
  itemVersionId: 'c1', position: 1, interactionType: 'single_choice', prompt: 'Q?',
  options: labels.map((label, i) => ({ id: String.fromCharCode(97 + i), label }))
});
const render = (definition, activeSection) => {
  const container = { innerHTML: '', addEventListener: () => {}, querySelectorAll: () => [] };
  renderDynamicExam(definition, container, { state: { answers: {} }, activeSection, onAnswerChange: () => {} });
  return container.innerHTML;
};

test('choiceGridColumns: đáp án ngắn giữ lưới nhiều cột', () => {
  assert.match(renderQuestionCard(choice(['go', 'went', 'gone', 'going'])), /cbt-options-grid grid-cols-4/);
  assert.match(renderQuestionCard(choice(['a', 'b', 'c'])), /grid-cols-3/);
  assert.match(renderQuestionCard(choice(['yes', 'no'])), /grid-cols-2/);
});

test('choiceGridColumns: có đáp án dài thì mỗi đáp án một dòng', () => {
  const html = renderQuestionCard(choice(['short', 'She has lived in Hanoi for ten years', 'x', 'y']));
  assert.match(html, /cbt-options-grid grid-cols-1/);
  assert.doesNotMatch(html, /grid-cols-4/);
});

test('choiceGridColumns: multi_choice_group cũng xuống dòng khi đáp án dài', () => {
  const item = { ...choice(['short', 'A fairly long answer sentence here']), interactionType: 'multi_choice_group' };
  assert.match(renderQuestionCard(item), /grid-cols-1/);
  const shortItem = { ...choice(['one', 'two']), interactionType: 'multi_choice_group' };
  assert.match(renderQuestionCard(shortItem), /grid-cols-2/);
});

test('stimulusImageUrl: ảnh đầu phần thi hiển thị và được escape', () => {
  const html = render({ title: 'T', blocks: [{ title: 'WRITING', stimulusImageUrl: 'https://x.test/a.png?a=1&b="2"', items: [{ itemVersionId: 'w1', position: 1, interactionType: 'long_text', prompt: 'Viết.' }] }] }, 'WRITING');
  assert.match(html, /<figure class="cbt-block-image"><img src="https:\/\/x\.test\/a\.png\?a=1&amp;b=&quot;2&quot;"/);
});

test('stimulusImageUrl: không có ảnh thì không render figure', () => {
  const html = render({ title: 'T', blocks: [{ title: 'WRITING', items: [{ itemVersionId: 'w1', position: 1, interactionType: 'long_text', prompt: 'Viết.' }] }] }, 'WRITING');
  assert.doesNotMatch(html, /cbt-block-image/);
});

test('block có bài đọc dùng bố cục chia đôi, có audio thì giữ dock cũ', () => {
  const item = { itemVersionId: 'r1', position: 1, interactionType: 'single_choice', prompt: 'Q', options: [{ id: 'a', label: 'A' }] };
  const split = render({ title: 'T', blocks: [{ title: 'READING', readingPassage: 'Passage', items: [item] }] }, 'READING');
  assert.match(split, /cbt-split-pane/);
  assert.doesNotMatch(split, /Danh sách câu hỏi ghép nối/);
  const audio = render({ title: 'T', blocks: [{ title: 'LISTEN', audioUrl: 'https://x.test/a.mp3', readingPassage: 'Passage', items: [item] }] }, 'LISTEN');
  assert.doesNotMatch(audio, /id="split-pane-0"/);
});
