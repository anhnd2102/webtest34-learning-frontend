import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeItemErrorRate,
  sortItems,
  filterItemsBySkill,
  extractUniqueSkills,
  formatItemPromptDisplay
} from '../term-tests/teacher-dashboard/shell/analytics/item-analysis.js';

test('computeItemErrorRate calculates error rate accurately and handles edge cases', () => {
  // Normal case: 10 attempts, 4 correct, 3 incorrect, 1 partial, 2 unanswered
  // total error = 3 + 1 + 2 = 6 => rate = 0.6
  const item1 = {
    totalAttempts: 10,
    correctCount: 4,
    incorrectCount: 3,
    partialCount: 1,
    unansweredCount: 2
  };
  assert.equal(computeItemErrorRate(item1), 0.6);

  // 100% correct => error rate = 0
  const itemAllCorrect = {
    totalAttempts: 15,
    correctCount: 15,
    incorrectCount: 0,
    partialCount: 0,
    unansweredCount: 0
  };
  assert.equal(computeItemErrorRate(itemAllCorrect), 0);

  // 0 attempts => error rate = 0 (no division by zero)
  assert.equal(computeItemErrorRate({ totalAttempts: 0 }), 0);
  assert.equal(computeItemErrorRate(null), 0);
  assert.equal(computeItemErrorRate(undefined), 0);
});

test('sortItems sorts items by error_rate_desc, position_asc, and unanswered_desc without mutating input', () => {
  const items = [
    { itemVersionId: 'q1', position: 1, totalAttempts: 10, correctCount: 8, incorrectCount: 2, partialCount: 0, unansweredCount: 0 }, // err = 2/10 = 0.2
    { itemVersionId: 'q2', position: 2, totalAttempts: 10, correctCount: 2, incorrectCount: 5, partialCount: 1, unansweredCount: 2 }, // err = 8/10 = 0.8, unanswered = 2
    { itemVersionId: 'q3', position: 3, totalAttempts: 10, correctCount: 5, incorrectCount: 1, partialCount: 0, unansweredCount: 4 }, // err = 5/10 = 0.5, unanswered = 4
    { itemVersionId: 'q4', position: 4, totalAttempts: 10, correctCount: 2, incorrectCount: 6, partialCount: 2, unansweredCount: 0 }, // err = 8/10 = 0.8, unanswered = 0
  ];

  // 1. Sort by error_rate_desc
  // q2 (0.8, pos 2) & q4 (0.8, pos 4) tied error rate -> pos 2 first, then pos 4, then q3 (0.5), then q1 (0.2)
  const byError = sortItems(items, 'error_rate_desc');
  assert.deepEqual(byError.map(i => i.itemVersionId), ['q2', 'q4', 'q3', 'q1']);

  // 2. Sort by position_asc
  const byPosition = sortItems(items, 'position_asc');
  assert.deepEqual(byPosition.map(i => i.itemVersionId), ['q1', 'q2', 'q3', 'q4']);

  // 3. Sort by unanswered_desc
  // q3 (4), q2 (2), then q1 & q4 (0) -> q1 pos 1 first, q4 pos 4 next
  const byUnanswered = sortItems(items, 'unanswered_desc');
  assert.deepEqual(byUnanswered.map(i => i.itemVersionId), ['q3', 'q2', 'q1', 'q4']);

  // Ensure original array was not mutated
  assert.equal(items[0].itemVersionId, 'q1');
  assert.equal(items[1].itemVersionId, 'q2');
});

test('sortItems handles empty or invalid lists safely', () => {
  assert.deepEqual(sortItems([], 'error_rate_desc'), []);
  assert.deepEqual(sortItems(null, 'error_rate_desc'), []);
  assert.deepEqual(sortItems(undefined, 'error_rate_desc'), []);
});

test('filterItemsBySkill filters items correctly by skill code and supports ALL', () => {
  const items = [
    { itemVersionId: 'q1', skill: 'LISTENING' },
    { itemVersionId: 'q2', skill: 'READING' },
    { itemVersionId: 'q3', skill: 'LISTENING' },
    { itemVersionId: 'q4', skill: 'WRITING' },
    { itemVersionId: 'q5', skill: null }
  ];

  const listening = filterItemsBySkill(items, 'LISTENING');
  assert.deepEqual(listening.map(i => i.itemVersionId), ['q1', 'q3']);

  // Case insensitive match
  const reading = filterItemsBySkill(items, 'reading');
  assert.deepEqual(reading.map(i => i.itemVersionId), ['q2']);

  // ALL or falsy returns everything
  assert.equal(filterItemsBySkill(items, 'ALL').length, 5);
  assert.equal(filterItemsBySkill(items, '').length, 5);
  assert.equal(filterItemsBySkill(items, null).length, 5);
});

test('extractUniqueSkills returns sorted list of distinct skills with uppercase normalization', () => {
  const items = [
    { skill: 'Reading' },
    { skill: 'LISTENING' },
    { skill: 'reading' },
    { skill: 'Grammar' },
    { skill: null },
    { skill: '' }
  ];

  const skills = extractUniqueSkills(items);
  assert.deepEqual(skills, ['GRAMMAR', 'LISTENING', 'READING']);
});

test('formatItemPromptDisplay cleans markup and provides fallback for empty prompts', () => {
  assert.equal(
    formatItemPromptDisplay('<p>Choose the <strong>correct</strong> answer:</p>'),
    'Choose the correct answer:'
  );

  assert.equal(
    formatItemPromptDisplay('   Fill in the blank   '),
    'Fill in the blank'
  );

  assert.equal(
    formatItemPromptDisplay(''),
    'Câu hỏi chưa có tiêu đề'
  );

  assert.equal(
    formatItemPromptDisplay(null),
    'Câu hỏi chưa có tiêu đề'
  );
});
