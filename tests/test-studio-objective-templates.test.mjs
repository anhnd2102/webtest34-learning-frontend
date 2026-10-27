import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandSentenceVariants,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('expandSentenceVariants generates NFKC, contraction, punctuation and apostrophe variants', () => {
  const variants = expandSentenceVariants(["I'm a big fan of nature."]);
  assert.ok(variants.includes("I'm a big fan of nature."));
  assert.ok(variants.includes("I'm a big fan of nature"));
  assert.ok(variants.includes("I’m a big fan of nature."));
  assert.ok(variants.includes("I’m a big fan of nature"));
  assert.ok(variants.includes("I am a big fan of nature."));
  assert.ok(variants.includes("I am a big fan of nature"));
  assert.ok(variants.length <= 40);

  const donVariants = expandSentenceVariants(["don't, stop"]);
  assert.ok(donVariants.includes("don't, stop"));
  assert.ok(donVariants.includes("don't stop"));
  assert.ok(donVariants.includes("do not stop"));
  assert.ok(donVariants.includes("don’t stop"));
});

test('renderTestBuilderView renders single choice template with responsive grid and answer key selector', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Single Choice Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000001',
      title: 'Single Choice Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Part 1',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f1',
              itemVersionId: '03010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Choose the correct color',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_3',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Blue' },
                { id: 'B', label: 'Red' },
                { id: 'C', label: 'Green' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '03010000-0000-4000-8000-0000000000i1': {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('Choose the correct color'));
  assert.ok(container.innerHTML.includes('grid-cols-3') || container.innerHTML.includes('grid_3'));
  assert.ok(container.innerHTML.includes('Blue'));
  assert.ok(container.innerHTML.includes('Red'));
  assert.ok(container.innerHTML.includes('Green'));
  assert.ok(container.innerHTML.includes('checked') || container.innerHTML.includes('data-correct="A"'));
});

test('renderTestBuilderView renders multi-select group template with unordered_group_slot', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Multi-Select Group Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000002',
      title: 'Multi-Select Group Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b2',
          checkpoint: 1,
          title: 'Part 2',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f2',
              itemVersionId: '03010000-0000-4000-8000-0000000000i2',
              position: 2,
              prompt: 'Select TWO sports (Slot 1)',
              interactionType: 'multi_choice_group',
              pedagogicalTypeCode: 'multiple_choice_group',
              layoutType: 'grid_2',
              graderType: 'unordered_group_slot',
              groupId: 'group_sports_1',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Football' },
                { id: 'B', label: 'Swimming' },
                { id: 'C', label: 'Running' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      groups: {
        'group_sports_1': {
          graderType: 'unordered_group_slot',
          expectedOptionIds: ['A', 'C']
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('Select TWO sports'));
  assert.ok(container.innerHTML.includes('unordered_group_slot') || container.innerHTML.includes('Nhóm'));
  assert.ok(container.innerHTML.includes('group_sports_1'));
  assert.ok(container.innerHTML.includes('Football'));
});

test('renderTestBuilderView renders fill-in-the-blank with accepted-answer chip previews', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000003',
    version: 1,
    status: 'draft',
    title: 'Fill In The Blank Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000003',
      title: 'Fill In The Blank Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b3',
          checkpoint: 1,
          title: 'Part 3',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f3',
              itemVersionId: '03010000-0000-4000-8000-0000000000i3',
              position: 3,
              prompt: 'Fill in the blank: He is interested in _______',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'fill_in_the_blank',
              layoutType: 'default',
              graderType: 'accepted_text',
              required: true,
              maxScore: 1,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '03010000-0000-4000-8000-0000000000i3': {
          graderType: 'accepted_text',
          accepted: ['reading books', 'reading book'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('He is interested in _______'));
  assert.ok(container.innerHTML.includes('reading books'));
  assert.ok(container.innerHTML.includes('variant-chip') || container.innerHTML.includes('accepted-chip'));
});
