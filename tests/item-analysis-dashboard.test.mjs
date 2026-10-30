import test from 'node:test';
import assert from 'node:assert/strict';
import {
  itemAnalysisApiPath,
  renderReportModeSwitch,
  renderItemAnalysisControls,
  renderItemCard,
  renderItemAnalysisView
} from '../term-tests/teacher-dashboard/shell/analytics/item-analysis-view.js';
import {
  computeItemErrorRate,
  sortItems,
  filterItemsBySkill
} from '../term-tests/teacher-dashboard/shell/analytics/item-analysis.js';

test('Item Analysis integration: mode switching, filtering and accordion toggle data flows', () => {
  const itemsFixture = [
    {
      itemVersionId: 'q1',
      position: 1,
      prompt: 'Listening Q1',
      skill: 'LISTENING',
      maxScore: 1,
      totalAttempts: 20,
      correctCount: 15,
      partialCount: 0,
      incorrectCount: 5,
      unansweredCount: 0,
      errorRate: 0.25,
      expectedAnswer: 'Option A',
      commonWrongAnswers: [{ answer: 'Option B', count: 4 }, { answer: 'Option C', count: 1 }],
      wrongStudents: [
        { studentRef: 's1', name: 'Student 1', rawAnswer: 'Option B', scoreEarned: 0, maxScore: 1, verdict: 'incorrect' }
      ]
    },
    {
      itemVersionId: 'q2',
      position: 2,
      prompt: 'Reading Q2',
      skill: 'READING',
      maxScore: 2,
      totalAttempts: 20,
      correctCount: 4,
      partialCount: 2,
      incorrectCount: 10,
      unansweredCount: 4,
      errorRate: 0.8,
      expectedAnswer: 'True',
      commonWrongAnswers: [{ answer: 'False', count: 10 }],
      wrongStudents: [
        { studentRef: 's2', name: 'Student 2', rawAnswer: 'False', scoreEarned: 0, maxScore: 2, verdict: 'incorrect' },
        { studentRef: 's3', name: 'Student 3', rawAnswer: '', scoreEarned: 0, maxScore: 2, verdict: 'unanswered' }
      ]
    }
  ];

  // 1. Initial view render
  const initialHtml = renderItemAnalysisView({
    items: itemsFixture,
    loading: false,
    selectedSkill: 'ALL',
    sortCriteria: 'error_rate_desc',
    expandedItemIds: new Set()
  });

  // Verify sorted by error rate desc (q2 has 0.8, q1 has 0.25)
  const q2Pos = initialHtml.indexOf('Câu 2');
  const q1Pos = initialHtml.indexOf('Câu 1');
  assert.ok(q2Pos < q1Pos, 'Highest error rate question (q2) should appear before q1');

  // 2. Filter by skill LISTENING
  const listeningOnly = filterItemsBySkill(itemsFixture, 'LISTENING');
  assert.equal(listeningOnly.length, 1);
  assert.equal(listeningOnly[0].itemVersionId, 'q1');

  const filteredHtml = renderItemAnalysisView({
    items: itemsFixture,
    loading: false,
    selectedSkill: 'LISTENING',
    sortCriteria: 'error_rate_desc',
    expandedItemIds: new Set()
  });
  assert.match(filteredHtml, /Câu 1/);
  assert.doesNotMatch(filteredHtml, /Câu 2/);

  // 3. Sort by position_asc
  const sortedByPos = sortItems(itemsFixture, 'position_asc');
  assert.equal(sortedByPos[0].itemVersionId, 'q1');
  assert.equal(sortedByPos[1].itemVersionId, 'q2');

  // 4. Accordion expansion
  const expandedSet = new Set(['q2']);
  const expandedHtml = renderItemAnalysisView({
    items: itemsFixture,
    loading: false,
    selectedSkill: 'ALL',
    sortCriteria: 'error_rate_desc',
    expandedItemIds: expandedSet
  });

  assert.match(expandedHtml, /Các phương án sai phổ biến/);
  assert.match(expandedHtml, /Đáp án chuẩn của đề/);
  assert.match(expandedHtml, /True/); // Expected answer of q2
  assert.match(expandedHtml, /Student 2/);
  assert.match(expandedHtml, /Student 3/);
  assert.match(expandedHtml, /Chưa trả lời/);
});
