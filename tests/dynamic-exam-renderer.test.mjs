import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getItemSpanCount,
  getTotalItemCount,
  getAnsweredCount,
  formatOptionDisplayLetter,
  renderSectionNavPills,
  renderQuestionNavigator,
  renderSidePanel,
  renderDynamicExam,
  initDynamicExamInteractions
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

test('dynamic-exam-renderer: getItemSpanCount handles inline cloze multi-blanks and timeline events', () => {
  const standardItem = { position: 1, interactionType: 'single_choice' };
  assert.equal(getItemSpanCount(standardItem), 1);

  const clozeItem = {
    position: 2,
    interactionType: 'short_text',
    layoutType: 'inline_cloze',
    prompt: 'Sentence with (1) _____ and (2) _____ and (3) _____ blanks.'
  };
  assert.equal(getItemSpanCount(clozeItem), 3);

  const listeningOrderItem = {
    position: 5,
    pedagogicalTypeCode: 'listening_order',
    events: ['Step A', 'Step B', 'Step C', 'Step D']
  };
  assert.equal(getItemSpanCount(listeningOrderItem), 4);
});

test('dynamic-exam-renderer: formatOptionDisplayLetter maps keys correctly', () => {
  assert.equal(formatOptionDisplayLetter('a', 0), 'A');
  assert.equal(formatOptionDisplayLetter('opt-b', 1), 'B');
  assert.equal(formatOptionDisplayLetter('', 2), 'C');
  assert.equal(formatOptionDisplayLetter('meaning-01', 0), 'A');
});

test('dynamic-exam-renderer: renderSectionNavPills outputs pill buttons with badges', () => {
  const definition = {
    blocks: [
      { title: 'Listening', items: [{ position: 1 }, { position: 2 }] },
      { title: 'Vocabulary', items: [{ position: 3 }] }
    ]
  };
  const html = renderSectionNavPills(definition, 0);
  assert.ok(html.includes('simulation-nav-pill'), 'Must include simulation-nav-pill');
  assert.ok(html.includes('Listening'), 'Must include section title');
  assert.ok(html.includes('2 câu'), 'Must include question count');
});

test('dynamic-exam-renderer: renderQuestionNavigator creates buttons with section target and answered state', () => {
  const definition = {
    blocks: [
      {
        title: 'Block 1',
        items: [
          { itemVersionId: 'q1', position: 1 },
          { itemVersionId: 'q2', position: 2 }
        ]
      }
    ]
  };
  const answers = { q1: 'done' };
  const html = renderQuestionNavigator(definition, answers);
  assert.ok(html.includes('btn-qnav answered'), 'q1 should have answered class');
  assert.ok(html.includes('data-section-target="sim-block-0"'), 'Should target sim-block-0');
  assert.ok(html.includes('data-pos="1"'), 'Should include data-pos');
});

test('dynamic-exam-renderer: renderSidePanel creates progress bar, section buttons, and navigator card', () => {
  const definition = {
    blocks: [
      {
        title: 'Phần 1',
        items: [{ itemVersionId: 'q1', position: 1 }]
      }
    ]
  };
  const sideHtml = renderSidePanel(definition, { answers: { q1: 'ok' } }, 0);
  assert.ok(sideHtml.includes('progress-ratio'), 'Must have progress ratio');
  assert.ok(sideHtml.includes('question-navigator-card'), 'Must have question-navigator-card');
  assert.ok(sideHtml.includes('question-navigator-grid'), 'Must have question-navigator-grid');
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
