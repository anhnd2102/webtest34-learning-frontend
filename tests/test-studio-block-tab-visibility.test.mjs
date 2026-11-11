import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

// Chỉ Phần đang chọn được hiển thị; các Phần còn lại dùng thuộc tính hidden (không dùng display inline).
test('Test Studio renders only the active block visible and hides the others with the hidden attribute', () => {
  const container = { innerHTML: '' };
  const block = (index) => ({
    blockId: `b-tab-${index}`,
    checkpoint: index + 1,
    title: `Phần ${index + 1}`,
    items: [{
      itemFamilyId: `f-tab-${index}`,
      itemVersionId: `i-tab-${index}`,
      position: index + 1,
      prompt: `Câu ${index + 1}`,
      interactionType: 'single_choice',
      pedagogicalTypeCode: 'multiple_choice',
      graderType: 'exact_option',
      maxScore: 1,
      options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]
    }]
  });
  const form = {
    id: '09010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Block tab visibility',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '09010000-0000-4000-8000-000000000001',
      title: 'Block tab visibility',
      durationMinutes: 45,
      blocks: [block(0), block(1), block(2)]
    },
    gradingKey: { items: Object.fromEntries([0, 1, 2].map(i => [`i-tab-${i}`, { graderType: 'exact_option', expectedOptionId: 'A' }])) }
  };

  renderTestBuilderView(container, form);

  const card = index => container.innerHTML.match(new RegExp(`<div class="builder-block-card[^"]*" id="builder-block-${index}"[^>]*>`))?.[0] || '';
  assert.ok(card(0), 'renders the first block card');
  assert.doesNotMatch(card(0), /\shidden[\s>]/, 'the active block is visible');
  assert.match(card(1), /\shidden>/, 'the second block starts hidden');
  assert.match(card(2), /\shidden>/, 'the third block starts hidden');
  assert.doesNotMatch(container.innerHTML, /id="builder-block-\d+"[^>]*display:\s*(none|block)/, 'block cards no longer rely on inline display');
});
