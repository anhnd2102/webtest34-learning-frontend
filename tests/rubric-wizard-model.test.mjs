import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRubricPayload,
  createWizardState,
  draftFromItem,
  itemsFromWizard,
  suggestLevel,
  summarizeRubricV2,
  validateWizardStep,
  VARIANT_EXAMPLES
} from '../term-tests/teacher-dashboard/studio/rubric-wizard-model.js';

// Seam: trạng thái trình hướng dẫn -> payload gửi backend -> câu hỏi và rubric snapshot lưu vào bản nháp (spec #40, GĐ 3).

const ids = (() => { let n = 0; return () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`; })();

const rubricStub = (variant, level, maxScore) => ({
  scoringVersion: 'izone-rubric-v2', variant, level, maxScore,
  requirements: [{ id: 'req_1', label: 'A', maxScore: maxScore / 2, mode: 'binary' }, { id: 'req_2', label: 'B', maxScore: maxScore / 2, mode: 'binary' }]
});

test('suggestLevel: Khối của đề gợi ý mức chấm mặc định, không rõ thì Khối 34', () => {
  assert.equal(suggestLevel(1), '03');
  assert.equal(suggestLevel('2'), '34');
  assert.equal(suggestLevel(3), '45');
  assert.equal(suggestLevel(undefined), '34');
});

test('trạng thái ban đầu của từng dạng có đúng số hàng yêu cầu gợi ý', () => {
  const translation = createWizardState({ variant: 'translation', courseId: 2 });
  assert.equal(translation.level, '34');
  assert.equal(translation.questions.length, 1);
  assert.ok(translation.questions[0].requirements.length >= 2);
  const writing = createWizardState({ variant: 'writing', courseId: 1 });
  assert.equal(writing.level, '34', 'Writing không có Khối 03 nên đổi sang mức gần nhất');
  assert.equal(writing.questions[0].requirements.length, 0);
});

test('payload dịch Việt-Anh: bỏ hàng trống, tách dạng chấp nhận, điểm Grammar/Vocab từ mục nâng cao', () => {
  const state = createWizardState({ variant: 'translation', courseId: 2 });
  state.points = '4';
  state.languageScore = '2';
  Object.assign(state.questions[0], {
    prompt: 'Dịch: Tôi đặc biệt thích chạy bộ.',
    requirements: [
      { label: 'Particularly + enjoy + V-ing', maxScore: '', acceptedForms: 'particularly; especially' },
      { label: '  ', maxScore: '', acceptedForms: '' },
      { label: 'Cấu trúc song song', maxScore: '1', acceptedForms: '' }
    ],
    modelAnswers: 'I particularly enjoy running.\n\nI especially enjoy running.'
  });
  const payload = buildRubricPayload(state, state.questions[0]);
  assert.equal(payload.variant, 'translation');
  assert.equal(payload.level, '34');
  assert.equal(payload.maxScore, 4);
  assert.equal(payload.languageScore, 2);
  assert.deepEqual(payload.requirements, [
    { label: 'Particularly + enjoy + V-ing', acceptedForms: ['particularly', 'especially'] },
    { label: 'Cấu trúc song song', maxScore: 1 }
  ]);
  assert.deepEqual(payload.modelAnswers, ['I particularly enjoy running.', 'I especially enjoy running.']);
});

test('payload Writing: dàn ý theo dòng và số từ tối thiểu; Writing đọc hiểu: vai trò đúng chỉ vào hướng dẫn chấm cho AI', () => {
  const writing = createWizardState({ variant: 'writing', courseId: 3 });
  writing.points = '15';
  writing.wordMin = '80';
  Object.assign(writing.questions[0], { prompt: 'Explain the difficulties of living in a city.', outline: 'Topic sentence\nÝ 1: chi phí\n\nÝ 2: xã hội' });
  const payload = buildRubricPayload(writing, writing.questions[0]);
  assert.deepEqual(payload.outline, ['Topic sentence', 'Ý 1: chi phí', 'Ý 2: xã hội']);
  assert.deepEqual(payload.wordCount, { minimum: 80, scoreCapBelowMinimum: true });

  const role = createWizardState({ variant: 'sentence_role', courseId: 1 });
  role.points = '1';
  Object.assign(role.questions[0], { prompt: 'Vai trò đúng của Câu 1. Một mặt, có tranh luận đạo đức là:', role: 'Nêu luận điểm phản đối' });
  const rolePayload = buildRubricPayload(role, role.questions[0]);
  assert.equal(rolePayload.requirements.length, 1);
  assert.match(rolePayload.promptGuidance, /Nêu luận điểm phản đối/);
  assert.deepEqual(rolePayload.modelAnswers, ['Nêu luận điểm phản đối']);
});

test('tạo câu hỏi: rubric snapshot vào grading key, dàn ý và từ vựng gợi ý chỉ vào câu Writing, đề bài không lộ vai trò đúng', () => {
  const state = createWizardState({ variant: 'writing', courseId: 3 });
  state.points = '15';
  Object.assign(state.questions[0], { prompt: 'Explain the difficulties.', outline: 'Topic sentence\nÝ 1', vocabularyHints: 'migrate to\nthe cost of living' });
  const rubric = { ...rubricStub('writing', '45', 15), requirements: [{ id: 'outline_1', label: 'Topic sentence', maxScore: 1, mode: 'partial' }] };
  const { items, gradingKeyItems } = itemsFromWizard(state, [rubric], { exerciseId: 'ex-1', exerciseTitle: 'Bài 1', startPosition: 5, newId: ids });
  assert.equal(items.length, 1);
  const item = items[0];
  assert.equal(item.position, 5);
  assert.equal(item.exerciseId, 'ex-1');
  assert.equal(item.graderType, 'rubric_async');
  assert.equal(item.interactionType, 'long_text');
  assert.equal(item.maxScore, 15);
  assert.deepEqual(item.studentOutline, ['Topic sentence', 'Ý 1']);
  assert.deepEqual(item.vocabularyHints, ['migrate to', 'the cost of living']);
  const key = gradingKeyItems[item.itemVersionId];
  assert.equal(key.graderType, 'rubric_async');
  assert.equal(key.rubricCode, 'izone-rubric-v2');
  assert.equal(key.rubric, rubric);
  assert.equal(item.rubricVariant, 'writing');

  const role = createWizardState({ variant: 'sentence_role', courseId: 1 });
  role.points = '1';
  Object.assign(role.questions[0], { prompt: 'Vai trò đúng của Câu 1:', role: 'Nêu luận điểm phản đối' });
  const made = itemsFromWizard(role, [rubricStub('sentence_role', '03', 1)], { exerciseId: 'ex-1', exerciseTitle: 'Bài 1', startPosition: 1, newId: ids });
  assert.doesNotMatch(JSON.stringify(made.items), /luận điểm phản đối/, 'vai trò đúng không được nằm trong định nghĩa công khai');
  assert.equal(made.items[0].studentOutline, undefined);
});

test('nhiều câu cùng lúc: mỗi câu một rubric, vị trí liên tiếp', () => {
  const state = createWizardState({ variant: 'translation', courseId: 2 });
  state.points = '4';
  state.questions = [{ ...state.questions[0], prompt: 'Câu A' }, { ...state.questions[0], prompt: 'Câu B' }];
  const { items } = itemsFromWizard(state, [rubricStub('translation', '34', 4), rubricStub('translation', '34', 4)], { exerciseId: 'e', exerciseTitle: 'E', startPosition: 3, newId: ids });
  assert.deepEqual(items.map(i => [i.position, i.prompt]), [[3, 'Câu A'], [4, 'Câu B']]);
  assert.notEqual(items[0].itemVersionId, items[1].itemVersionId);
});

test('kiểm tra từng bước: thiếu đề bài, thiếu yêu cầu, điểm sai, Writing thiếu dàn ý, khối không hỗ trợ', () => {
  const state = createWizardState({ variant: 'translation', courseId: 2 });
  assert.ok(validateWizardStep(state, 2).some(m => /đề bài/i.test(m)));
  state.questions[0].prompt = 'Dịch câu này';
  assert.ok(validateWizardStep(state, 2).some(m => /yêu cầu/i.test(m)));
  state.questions[0].requirements[0].label = 'Cấu trúc 1';
  assert.deepEqual(validateWizardStep(state, 2), []);
  state.points = '0';
  assert.ok(validateWizardStep(state, 2).some(m => /điểm/i.test(m)));
  state.points = '4';
  state.questions[0].requirements[0].maxScore = 'abc';
  assert.ok(validateWizardStep(state, 2).some(m => /điểm/i.test(m)));

  const writing = createWizardState({ variant: 'writing', courseId: 3 });
  writing.questions[0].prompt = 'Viết';
  assert.ok(validateWizardStep(writing, 2).some(m => /dàn ý/i.test(m)));
  writing.level = '03';
  assert.ok(validateWizardStep(writing, 3).some(m => /Khối/i.test(m)));
  assert.deepEqual(validateWizardStep(createWizardState({ variant: null, courseId: 2 }), 1).length, 1);
});

test('chỉnh lại câu có sẵn: đọc ngược rubric snapshot thành trạng thái trình hướng dẫn', () => {
  const rubric = {
    scoringVersion: 'izone-rubric-v2', variant: 'translation', level: '03', maxScore: 4,
    requirements: [{ id: 'req_1', label: 'Particularly + enjoy + V-ing', maxScore: 1, mode: 'binary', acceptedForms: ['particularly'] }, { id: 'req_2', label: 'Song song', maxScore: 1, mode: 'binary' }],
    language: { maxScore: 2, tiers: [{ maxErrors: 1, ratio: 1 }] },
    modelAnswers: ['I particularly enjoy running.'], promptGuidance: 'Chấp nhận viết tắt.'
  };
  const state = draftFromItem({ prompt: 'Dịch câu', maxScore: 4 }, { rubric }, { courseId: 2 });
  assert.equal(state.mode, 'edit');
  assert.equal(state.variant, 'translation');
  assert.equal(state.level, '03');
  assert.equal(state.points, '4');
  assert.equal(state.languageScore, '2');
  assert.equal(state.questions[0].prompt, 'Dịch câu');
  assert.deepEqual(state.questions[0].requirements.map(r => [r.label, r.maxScore, r.acceptedForms]), [['Particularly + enjoy + V-ing', '1', 'particularly'], ['Song song', '1', '']]);
  assert.equal(state.questions[0].modelAnswers, 'I particularly enjoy running.');
  assert.equal(state.questions[0].promptGuidance, 'Chấp nhận viết tắt.');
});

test('tóm tắt rubric trên thẻ câu hỏi bằng lời thường, không lộ mã kỹ thuật hay phần trăm', () => {
  const rubric = {
    scoringVersion: 'izone-rubric-v2', variant: 'translation', level: '03', maxScore: 4,
    requirements: [{ id: 'req_1', label: 'Cấu trúc 1', maxScore: 1, mode: 'binary', acceptedForms: ['particularly'] }, { id: 'req_2', label: 'Cấu trúc 2', maxScore: 1, mode: 'binary' }],
    language: { maxScore: 2, tiers: [{ maxErrors: 1, ratio: 1 }, { maxErrors: 3, ratio: 0.5 }] }
  };
  const text = summarizeRubricV2(rubric).join('\n');
  assert.match(text, /Khối 03/);
  assert.match(text, /Cấu trúc 1/);
  assert.match(text, /particularly/);
  assert.match(text, /0–1 lỗi: 2 điểm/);
  assert.match(text, /từ 4 lỗi: 0 điểm/);
  assert.doesNotMatch(text, /izone-rubric|scoringVersion|rubric_|%/);
});

test('mỗi dạng có ví dụ minh họa cho thẻ chọn dạng', () => {
  for (const variant of ['translation', 'sentence_order', 'reading_comprehension', 'sentence_role', 'speaking_text', 'writing']) {
    assert.ok(VARIANT_EXAMPLES[variant] && VARIANT_EXAMPLES[variant].length > 10, variant);
  }
});
