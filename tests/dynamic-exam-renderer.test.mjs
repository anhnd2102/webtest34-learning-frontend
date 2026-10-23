import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTotalItemCount,
  getAnsweredCount,
  formatOptionDisplayLetter,
  renderDynamicExam
} from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';

test('dynamic-exam-renderer: computes total items and answered count accurately', () => {
  const definition = {
    title: 'IZONE · Khối 03 · Đề thi mới',
    blocks: [
      {
        title: 'LISTENING',
        items: [
          { itemVersionId: 'it-1', position: 1, interactionType: 'short_text' },
          { itemVersionId: 'it-2', position: 2, interactionType: 'long_text' }
        ]
      },
      {
        title: 'VOCABULARY',
        items: [
          { itemVersionId: 'it-3', position: 3, interactionType: 'text_select_pair' },
          { itemVersionId: 'it-4', position: 4, interactionType: 'text_select_pair' },
          { itemVersionId: 'it-5', position: 5, interactionType: 'single_choice' }
        ]
      }
    ]
  };

  assert.equal(getTotalItemCount(definition), 5);

  const answers = {
    'it-1': 'answer 1',
    'it-3': ['word', 'opt-1'],
    'it-4': ['', ''] // empty pair should not count
  };

  assert.equal(getAnsweredCount(definition, answers), 2);
});

test('dynamic-exam-renderer: formatOptionDisplayLetter maps keys correctly', () => {
  assert.equal(formatOptionDisplayLetter('a', 0), 'A');
  assert.equal(formatOptionDisplayLetter('opt-b', 1), 'B');
  assert.equal(formatOptionDisplayLetter('', 2), 'C');
  assert.equal(formatOptionDisplayLetter('meaning-01', 0), 'A');
});

test('dynamic-exam-renderer: renderDynamicExam outputs HTML containing question cards and tables', () => {
  const container = {
    innerHTML: '',
    addEventListener: () => {},
    querySelectorAll: () => []
  };

  const definition = {
    title: 'Test Exam',
    blocks: [
      {
        title: 'VOCABULARY',
        items: [
          {
            itemVersionId: 'v1',
            position: 1,
            interactionType: 'text_select_pair',
            options: [{ id: 'opt-a', label: 'tháng hai' }]
          },
          {
            itemVersionId: 'p1',
            position: 2,
            interactionType: 'short_text',
            pedagogicalTypeCode: 'pictorial_vocabulary',
            layoutType: 'pictorial_card',
            letterHint: 'F_ _ _ _ _ _ _'
          }
        ]
      }
    ]
  };

  const state = { answers: {} };

  renderDynamicExam(definition, container, {
    state,
    activeSection: 'VOCABULARY',
    onAnswerChange: () => {}
  });

  assert.ok(container.innerHTML.includes('candidate-vocab-table'), 'Should include vocab table HTML');
  assert.ok(container.innerHTML.includes('candidate-pictorial-card'), 'Should include pictorial card HTML');
  assert.ok(container.innerHTML.includes('F_ _ _ _ _ _ _'), 'Should render letter hint');
});
