import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';
import { createDraftInputSync } from '../term-tests/teacher-dashboard/studio/draft-inputs.js';
import {
  renderSandboxResult,
  renderStepFour,
  renderStepOne,
  renderStepThree,
  renderStepTwo,
  renderStepper
} from '../term-tests/teacher-dashboard/studio/rubric-wizard.js';
import { createWizardState, changeVariant } from '../term-tests/teacher-dashboard/studio/rubric-wizard-model.js';
import { rubricPresetsBuildPath, rubricPresetsPath } from '../term-tests/teacher-dashboard/api/teacher.js';

const catalog = {
  families: [
    { family: 'structured_sentence', label: 'Viết câu theo cấu trúc' },
    { family: 'key_ideas', label: 'Trả lời theo ý' },
    { family: 'writing', label: 'Viết đoạn/bài (Writing)' }
  ],
  variants: [
    { variant: 'translation', family: 'structured_sentence', label: 'Dịch Việt–Anh', description: 'Dịch một câu.', levels: ['03', '34', '45'], requirementKind: 'structure', hasLanguage: true },
    { variant: 'sentence_order', family: 'structured_sentence', label: 'Điền sắp xếp và chia động từ', description: 'Sắp xếp từ.', levels: ['03', '34', '45'], requirementKind: 'structure', hasLanguage: true },
    { variant: 'reading_comprehension', family: 'key_ideas', label: 'Đọc hiểu', description: 'Trả lời theo đoạn văn.', levels: ['03', '34', '45'], requirementKind: 'idea', hasLanguage: false },
    { variant: 'sentence_role', family: 'key_ideas', label: 'Writing đọc hiểu', description: 'Vai trò câu.', levels: ['03', '34', '45'], requirementKind: 'idea', hasLanguage: false },
    { variant: 'speaking_text', family: 'key_ideas', label: 'Speaking dạng văn bản', description: 'Speaking.', levels: ['03', '34', '45'], requirementKind: 'idea', hasLanguage: true },
    { variant: 'writing', family: 'writing', label: 'Viết đoạn/bài (Writing)', description: 'Viết đoạn.', levels: ['34', '45'], requirementKind: 'outline', hasLanguage: false }
  ],
  levels: [
    { level: '03', label: 'Khối 03', description: 'Mức chấm dễ hơn.' },
    { level: '34', label: 'Khối 34', description: 'Mức chuẩn.' },
    { level: '45', label: 'Khối 45', description: 'Mức chuẩn.' }
  ]
};
const emoji = /\p{Extended_Pictographic}/u;
const visibleText = html => html.replace(/<[^>]+>/g, ' ');

test('đường dẫn API preset và dựng rubric', () => {
  assert.equal(rubricPresetsPath(), '/api/teacher/rubric-presets');
  assert.equal(rubricPresetsBuildPath('https://api.test/'), 'https://api.test/api/teacher/rubric-presets/build');
});

test('bước 1: sáu dạng chia ba lối vào, mỗi dạng có mô tả và ví dụ, không emoji', () => {
  const html = renderStepOne(catalog, createWizardState({ courseId: 2 }));
  assert.equal((html.match(/<fieldset/g) || []).length, 3);
  assert.equal((html.match(/name="rw-variant"/g) || []).length, 6);
  assert.equal((html.match(/rw-variant-example/g) || []).length, 6);
  assert.match(html, /Viết câu theo cấu trúc/);
  assert.doesNotMatch(html, emoji);
});

test('thanh bước đánh dấu bước hiện tại và không dùng mã kỹ thuật', () => {
  const html = renderStepper(3);
  assert.match(html, /aria-current="step"/);
  assert.equal((html.match(/is-done/g) || []).length, 2);
  assert.doesNotMatch(visibleText(html), /izone-rubric|scoringVersion/);
});

test('bước 2 theo từng dạng: dịch có dạng chấp nhận, Writing có dàn ý và từ vựng gợi ý, Writing đọc hiểu có vai trò đúng chỉ AI thấy', () => {
  const translation = createWizardState({ variant: 'translation', courseId: 2 });
  const t = renderStepTwo(translation);
  assert.match(t, /data-f="req-forms"/);
  assert.match(t, /Đáp án mẫu \(chỉ AI thấy/);
  assert.match(t, /Dạng chấp nhận khác, ngoài cách viết ở tên yêu cầu/);
  assert.match(t, /phần còn lại tự tính cho Grammar\/Vocab/);
  assert.match(t, /ô đáp án mẫu/);

  const writing = renderStepTwo(createWizardState({ variant: 'writing', courseId: 3 }));
  assert.match(writing, /data-f="outline"/);
  assert.match(writing, /Từ vựng gợi ý \(không bắt buộc/);
  assert.match(writing, /không dùng các từ này cũng không bị trừ điểm/);

  const role = renderStepTwo(createWizardState({ variant: 'sentence_role', courseId: 1 }), 'Đoạn văn trước');
  assert.match(role, /Vai trò đúng của câu \(chỉ AI thấy/);
  assert.match(role, /data-rw-action="split-sentences"/);
  assert.match(role, /data-rw-action="pull-script"/);
  assert.match(role, /Ẩn với học viên|ẩn với học viên/);
  for (const html of [t, writing, role]) assert.doesNotMatch(html, emoji);
});

test('đổi dạng giữa chừng giữ đề bài và sửa Khối nếu dạng mới không hỗ trợ', () => {
  const state = createWizardState({ variant: 'translation', courseId: 1 });
  state.level = '03';
  state.questions[0].prompt = 'Đề đã nhập';
  const changed = changeVariant(state, 'writing');
  assert.equal(changed.level, '34');
  assert.equal(changed.questions[0].prompt, 'Đề đã nhập');
  assert.equal(changed.points, '15');
});

test('bước 3: Writing chỉ cho Khối 34 và 45; hiện tóm tắt lời thường, trạng thái tải và lỗi; mục nâng cao gập lại', () => {
  const writing = createWizardState({ variant: 'writing', courseId: 3 });
  const html = renderStepThree(writing, catalog, { lines: ['Khối 45: cấu trúc phải đúng dạng.', 'Tổng điểm tối đa của câu: 15.'] });
  assert.equal((html.match(/name="rw-level"/g) || []).length, 2);
  assert.doesNotMatch(html, /value="03"/);
  assert.match(html, /<details class="rw-advanced">/);
  assert.match(html, /Số từ tối thiểu/);
  assert.match(html, /Khối 45: cấu trúc phải đúng dạng/);
  assert.match(renderStepThree(writing, catalog, { loading: true }), /Đang dựng/);
  assert.match(renderStepThree(writing, catalog, { error: 'Điểm không khớp' }), /role="alert"[^>]*>Điểm không khớp/);

  const translation = renderStepThree(createWizardState({ variant: 'translation', courseId: 2 }), catalog, { lines: [] });
  assert.equal((translation.match(/name="rw-level"/g) || []).length, 3);
  assert.match(translation, /Điểm dành cho Grammar\/Vocab/);
  assert.doesNotMatch(translation, /Số từ tối thiểu/);
  assert.doesNotMatch(translation, emoji);
});

test('bước 4 và kết quả chấm thử: hiện tên yêu cầu thay vì mã, điểm đạt/tối đa, không phần trăm', () => {
  const html = renderStepFour(createWizardState({ variant: 'translation', courseId: 2 }), '');
  assert.match(html, /không bắt buộc/);
  assert.match(html, /data-rw-action="sandbox"/);
  const result = renderSandboxResult({
    scoreEarned: 3, maxScore: 4,
    requiredStructures: [{ id: 'req_1', achieved: false, credit: 0, scoreEarned: 0, maxScore: 1 }, { id: 'req_2', achieved: true, credit: 1, scoreEarned: 1, maxScore: 1 }],
    errors: [{ code: 'GRA_VERB_FORM', message: 'enjoy + V-ing' }]
  }, { req_1: 'Particularly + enjoy + V-ing', req_2: 'Cấu trúc song song' });
  assert.match(result, /3\/4/);
  assert.match(result, /Particularly \+ enjoy \+ V-ing/);
  assert.doesNotMatch(result, /req_1|GRA_VERB_FORM|%/);
});

function builderWithRubric(rubric, extraItem = {}) {
  const itemId = '05010000-0000-4000-8000-0000000000a1';
  const container = { innerHTML: '' };
  renderTestBuilderView(container, {
    id: '05010000-0000-4000-8000-000000000001', version: 1, status: 'draft', title: 'Rubric v2', submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1', formVersionId: '05010000-0000-4000-8000-000000000001', title: 'Rubric v2',
      blocks: [{
        blockId: '05010000-0000-4000-8000-0000000000b1', checkpoint: 1, title: 'Writing',
        items: [{ itemFamilyId: '05010000-0000-4000-8000-0000000000f1', itemVersionId: itemId, position: 1, prompt: 'Dịch câu này', interactionType: 'long_text', pedagogicalTypeCode: 'writing', layoutType: 'default', graderType: 'rubric_async', required: true, maxScore: rubric.maxScore, options: [], ...extraItem }]
      }]
    },
    gradingKey: { items: { [itemId]: { graderType: 'rubric_async', rubricCode: 'izone-rubric-v2', rubricVersion: 1, rubric } } }
  });
  return { html: container.innerHTML, itemId };
}

const v2Rubric = {
  scoringVersion: 'izone-rubric-v2', variant: 'translation', level: '03', maxScore: 4,
  requirements: [{ id: 'req_1', label: 'Particularly + enjoy + V-ing', maxScore: 1, mode: 'binary', acceptedForms: ['particularly'] }, { id: 'req_2', label: 'Cấu trúc song song', maxScore: 1, mode: 'binary' }],
  language: { maxScore: 2, tiers: [{ maxErrors: 1, ratio: 1 }, { maxErrors: 3, ratio: 0.5 }] },
  modelAnswers: ['I particularly enjoy running.'], promptGuidance: 'Chấp nhận viết tắt.'
};

test('thẻ câu dùng rubric v2: tóm tắt lời thường, nút chỉnh lại bằng trình hướng dẫn, đáp án mẫu và Sandbox; không còn bảng tiêu chí sửa tay', () => {
  const { html } = builderWithRubric(v2Rubric);
  assert.match(html, /template-rubric-v2/);
  assert.match(html, /btn-edit-rubric-wizard/);
  assert.match(html, /Particularly \+ enjoy \+ V-ing/);
  assert.match(html, /0–1 lỗi: 2 điểm/);
  assert.match(html, /input-rubric-model-answers/);
  assert.match(html, /I particularly enjoy running\./);
  assert.match(html, /btn-trigger-sandbox/);
  assert.doesNotMatch(html, /criterion-label-input|select-rubric-preset|btn-add-criterion/);
  assert.doesNotMatch(visibleText(html.slice(html.indexOf('template-rubric-v2'))), /izone-rubric|scoringVersion/);
});

test('thẻ câu rubric cũ vẫn dùng giao diện tiêu chí như trước', () => {
  const { html } = builderWithRubric({ scoringVersion: 'rubric-translation-v1', maxScore: 4, criteria: [{ id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: 2, requiredConcepts: [] }, { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: 2, requiredConcepts: [] }] });
  assert.match(html, /select-rubric-preset/);
  assert.doesNotMatch(html, /template-rubric-v2/);
});

test('syncInputs với rubric v2 không tính lại tổng điểm từ tiêu chí và giữ/ghi đáp án mẫu', () => {
  const itemId = 'item-writing';
  const rubric = {
    scoringVersion: 'izone-rubric-v2', variant: 'writing', level: '45', maxScore: 15,
    requirements: [{ id: 'outline_1', label: 'Ý 1', maxScore: 3.75, mode: 'partial' }],
    criteria: [{ id: 'grammar', label: 'Grammar', maxScore: 5 }, { id: 'coherence', label: 'Coherence', maxScore: 3.75 }, { id: 'vocabulary', label: 'Vocabulary', maxScore: 2.5 }]
  };
  const draftState = {
    blocks: [{ blockId: 'b1', title: 'W', exercises: [], items: [{ itemVersionId: itemId, graderType: 'rubric_async', maxScore: 15, prompt: 'Viết' }] }],
    gradingKey: { items: { [itemId]: { graderType: 'rubric_async', rubric } }, groups: {} }
  };
  const guidance = { value: 'Hướng dẫn mới' };
  const modelAnswers = { value: 'Đáp án 1\n\nĐáp án 2' };
  const itemCard = {
    querySelector: selector => (selector === '.input-rubric-guidance' ? guidance : (selector === '.input-rubric-model-answers' ? modelAnswers : null)),
    querySelectorAll: () => []
  };
  const blockCard = {
    querySelector: () => null,
    querySelectorAll: selector => (selector === '.builder-item-card' ? [itemCard] : [])
  };
  const container = { querySelector: () => null, querySelectorAll: selector => (selector === '.builder-block-card' ? [blockCard] : []) };
  createDraftInputSync({ container, draftState, updateScoreBreakdownBar: () => {}, hasUnsavedChanges: () => false })();
  const saved = draftState.gradingKey.items[itemId].rubric;
  assert.equal(saved.maxScore, 15, 'tổng điểm không bị tính lại từ tiêu chí');
  assert.equal(draftState.blocks[0].items[0].maxScore, 15);
  assert.equal(saved.promptGuidance, 'Hướng dẫn mới');
  assert.deepEqual(saved.modelAnswers, ['Đáp án 1', 'Đáp án 2']);
});
