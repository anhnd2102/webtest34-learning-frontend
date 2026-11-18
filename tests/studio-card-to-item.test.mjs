import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFromRecord, readImport, typeTemplateCsv } from '../term-tests/teacher-dashboard/studio/import-engine.js';
import { cardsToDraftItems } from '../term-tests/teacher-dashboard/studio/card-to-item.js';
import { TYPES } from '../term-tests/teacher-dashboard/studio/import-registry.js';

// Một chỗ duy nhất biến thẻ câu hỏi thành câu trong bản nháp + đáp án chấm (spec #91, GĐ 3).
let counter = 0;
const newId = () => `id-${++counter}`;
const exercise = { exerciseId: 'ex-1', title: 'Bài 1' };
const commit = (cards, extra = {}) => cardsToDraftItems(cards, { exercise, startPosition: 10, newId, ...extra });
const cardsOf = typeCode => readImport(typeTemplateCsv(typeCode), { scope: 'type', typeCode, newGroupId: () => 'group_t' }).cards;

test('mọi dạng: câu có đủ trường nền, thứ tự liên tiếp, và mỗi câu có đáp án chấm cùng loại chấm', () => {
  for (const spec of TYPES) {
    const cards = cardsOf(spec.code);
    const result = commit(cards);
    assert.equal(result.items.length, cards.length, spec.code);
    result.items.forEach((item, index) => {
      assert.equal(item.exerciseId, 'ex-1');
      assert.equal(item.position, 10 + index);
      assert.ok(item.prompt && item.interactionType && item.graderType && item.maxScore > 0, `${spec.code}: trường nền`);
      assert.equal(item.releasePolicy, 'inherit');
      const key = result.gradingKeyItems[item.itemVersionId];
      assert.ok(key, `${spec.code}: có đáp án chấm`);
      assert.equal(key.graderType, item.graderType === 'accepted_text_exact_option' ? 'accepted_text_exact_option' : item.graderType, `${spec.code}: cùng loại chấm`);
    });
  }
});

test('trắc nghiệm một đáp án và ghép tiêu đề: đáp án đúng luôn là một trong các lựa chọn', () => {
  for (const code of ['single_choice', 'pronunciation_choice', 'reading_matching']) {
    const result = commit(cardsOf(code));
    for (const item of result.items) {
      const key = result.gradingKeyItems[item.itemVersionId];
      assert.ok(item.options.some(option => option.id === key.expectedOptionId), `${code}: đáp án phải khớp lựa chọn`);
    }
  }
});

test('giải thích của trắc nghiệm được giữ trong câu', () => {
  const [item] = commit(cardsOf('single_choice')).items;
  assert.match(item.explanation, /depart from/);
});

test('chọn nhiều đáp án: các ô cùng nhóm dùng chung bộ đáp án, có khai nhóm (trước đây đường nhập cả Phần làm mất đáp án)', () => {
  const result = commit(cardsOf('multi_select_group'));
  assert.equal(result.items.length, 2);
  assert.ok(result.items.every(item => item.groupId === 'group_t'));
  assert.deepEqual(result.groups.group_t.expectedOptionIds, ['A', 'C']);
  assert.equal(result.gradingKeyItems[result.items[0].itemVersionId].graderType, 'unordered_group_slot');
});

test('điền từ nội tuyến, sửa lỗi, viết lại, sắp xếp câu, nghe sắp xếp, tranh: đáp án chấm mang đúng dữ liệu', () => {
  const cloze = commit(cardsOf('inline_cloze'));
  assert.deepEqual(Object.keys(cloze.gradingKeyItems[cloze.items[0].itemVersionId].blanks), ['1', '2']);

  const fix = commit(cardsOf('error_correction'));
  const fixKey = fix.gradingKeyItems[fix.items[0].itemVersionId];
  assert.deepEqual(fixKey.expectedErrors, ['much']);
  assert.ok(fixKey.expectedCorrections.includes('many'));
  assert.equal(fix.items[0].interactionType, 'correction_pair');

  const rewrite = commit(cardsOf('sentence_transformation'));
  assert.equal(rewrite.gradingKeyItems[rewrite.items[0].itemVersionId].keyword, 'HAVE');

  const reorder = commit(cardsOf('sentence_reorder'));
  assert.ok(reorder.gradingKeyItems[reorder.items[0].itemVersionId].tokens.length >= 2);

  const listening = commit(cardsOf('listening_order'));
  assert.equal(listening.items.length, 1);
  assert.equal(listening.items[0].listeningEvents.length, 3);
  assert.equal(listening.gradingKeyItems[listening.items[0].itemVersionId].events.length, 3);

  const pictorial = commit(cardsOf('pictorial_vocabulary'));
  assert.equal(pictorial.items[0].image, 'assets/vocabulary/apple.png');
  assert.ok(pictorial.items[0].letterHint);
});

test('tự luận chấm AI: có mẫu chấm mặc định, tổng điểm tiêu chí bằng điểm câu', () => {
  const result = commit(cardsOf('rubric_async'));
  const key = result.gradingKeyItems[result.items[0].itemVersionId];
  assert.equal(key.graderType, 'rubric_async');
  const total = key.rubric.criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0);
  assert.equal(total, result.items[0].maxScore);
});

test('từ vựng nối nghĩa: thêm vào bài tập đã có từ vựng thì gộp bộ nghĩa và cập nhật cả câu cũ (đáp án vẫn trỏ đúng nghĩa)', () => {
  const first = commit(cardsOf('vocabulary_pair'));
  const existing = first.items.map(item => ({ ...item, options: item.options.map(option => ({ ...option })) }));
  const expectedLabel = item => item.options.find(option => option.id === first.gradingKeyItems[item.itemVersionId].expectedOptionId).label;
  const oldLabels = Object.fromEntries(existing.map(item => [item.itemVersionId, expectedLabel(item)]));

  const extra = buildFromRecord('vocabulary_pair', { prompt: 'resilient', correct: 'kiên cường' }).cards;
  const merged = cardsToDraftItems(extra, { exercise, startPosition: 20, newId, existingItems: existing.map(item => ({ ...item, captionHint: oldLabels[item.itemVersionId] })) });

  const labels = merged.items[0].options.map(option => option.label);
  assert.equal(labels.length, 3, 'bộ nghĩa gồm cả nghĩa cũ và mới');
  assert.equal(merged.items[0].options.find(option => option.id === merged.gradingKeyItems[merged.items[0].itemVersionId].expectedOptionId).label, 'kiên cường');
  assert.equal(merged.updatedExisting.length, existing.length);
  for (const update of merged.updatedExisting) {
    assert.equal(update.options.find(option => option.id === update.expectedOptionId).label, oldLabels[update.itemVersionId], 'câu cũ vẫn đúng nghĩa cũ');
  }
});

test('buildFromRecord: một bản ghi nhập tay đi qua đúng quy tắc kiểm tra của file', () => {
  const bad = buildFromRecord('single_choice', { prompt: 'Q', optA: 'a', optB: 'b', correct: 'Z' });
  assert.equal(bad.status, 'error');
  assert.deepEqual(bad.cards, []);
  assert.equal(bad.messages[0].column, 'Đáp án đúng');
  const good = buildFromRecord('single_choice', { prompt: 'Q', optA: 'a', optB: 'b', correct: 'B' }, { defaultPoints: 3 });
  assert.equal(good.status, 'ok');
  assert.equal(good.cards[0].maxScore, 3);
  assert.equal(good.cards[0].expectedOptionId, 'opt_b');
});
