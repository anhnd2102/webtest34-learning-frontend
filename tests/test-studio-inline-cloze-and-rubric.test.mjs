import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scaleRubricCriteriaScores,
  pruneOrphanClozeKeys,
  getItemSpanCount,
  findPrecedingClozeScript,
  isComprehensionExercise,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('scaleRubricCriteriaScores: proportionally scales criteria when question total score changes', () => {
  // Test 1: Equal 50/50 split (e.g. Translation: 2/2 -> 5 total)
  const translationCriteria = [
    { id: 'meaning', label: 'Meaning', maxScore: 2 },
    { id: 'grammar', label: 'Grammar', maxScore: 2 }
  ];
  const scaled5 = scaleRubricCriteriaScores(translationCriteria, 5);
  assert.equal(scaled5.length, 2);
  assert.equal(scaled5[0].maxScore, 2.5);
  assert.equal(scaled5[1].maxScore, 2.5);
  assert.equal(scaled5[0].maxScore + scaled5[1].maxScore, 5.0);

  // Test 2: 70/30 split (e.g. Comprehension: 2.8 / 1.2 -> 6 total)
  const comprehensionCriteria = [
    { id: 'comprehension', label: 'Comprehension', maxScore: 2.8 },
    { id: 'keywords', label: 'Keywords', maxScore: 1.2 }
  ];
  const scaled6 = scaleRubricCriteriaScores(comprehensionCriteria, 6);
  assert.equal(scaled6[0].maxScore, 4.2);
  assert.equal(scaled6[1].maxScore, 1.8);
  assert.equal(scaled6[0].maxScore + scaled6[1].maxScore, 6.0);

  // Test 3: 3 criteria with repeating decimals (1, 1, 1 -> 10 total)
  const threeCriteria = [
    { id: 'c1', maxScore: 1 },
    { id: 'c2', maxScore: 1 },
    { id: 'c3', maxScore: 1 }
  ];
  const scaled10 = scaleRubricCriteriaScores(threeCriteria, 10);
  assert.equal(scaled10[0].maxScore, 3.33);
  assert.equal(scaled10[1].maxScore, 3.33);
  assert.equal(scaled10[2].maxScore, 3.34);
  const sum = Math.round((scaled10[0].maxScore + scaled10[1].maxScore + scaled10[2].maxScore) * 100) / 100;
  assert.equal(sum, 10.0, 'Last criterion must absorb rounding difference to guarantee exact sum match');

  // Edge cases: empty criteria or invalid total
  assert.deepEqual(scaleRubricCriteriaScores([], 5), []);
  assert.deepEqual(scaleRubricCriteriaScores(translationCriteria, 0), translationCriteria);
  assert.deepEqual(scaleRubricCriteriaScores(translationCriteria, -2), translationCriteria);
});

test('pruneOrphanClozeKeys: strips orphan keys not found in prompt blanks', () => {
  const item = {
    prompt: '1. I (41) _____ TV (watch)\n2. He (42) _____ before 7 (get up)',
    clozeAnswers: {
      '37': { targetWord: 'old_orphan', accepted: ['orphan'] },
      '41': { targetWord: 'watch', accepted: ['watch', 'watches'] },
      '42': { targetWord: 'gets up', accepted: ['gets up'] },
      '99': { targetWord: 'stale', accepted: ['stale'] }
    }
  };
  const itemKey = {
    graderType: 'inline_cloze',
    blanks: {
      '37': { accepted: ['orphan'] },
      '41': { accepted: ['watch'] },
      '42': { accepted: ['gets up'] },
      '99': { accepted: ['stale'] }
    }
  };

  pruneOrphanClozeKeys(item, itemKey);

  assert.equal(item.clozeAnswers['37'], undefined, 'Must prune key 37 from item.clozeAnswers');
  assert.equal(item.clozeAnswers['99'], undefined, 'Must prune key 99 from item.clozeAnswers');
  assert.ok(item.clozeAnswers['41'], 'Must retain key 41');
  assert.ok(item.clozeAnswers['42'], 'Must retain key 42');

  assert.equal(itemKey.blanks['37'], undefined, 'Must prune key 37 from itemKey.blanks');
  assert.equal(itemKey.blanks['99'], undefined, 'Must prune key 99 from itemKey.blanks');
  assert.ok(itemKey.blanks['41'], 'Must retain blank 41 in key');
  assert.ok(itemKey.blanks['42'], 'Must retain blank 42 in key');
});

test('getItemSpanCount: counts exact number of unique blanks from prompt as source of truth', () => {
  // Grammar Test 1: 10 blanks from 41 to 50, but clozeAnswers has extra key 37
  const item = {
    layoutType: 'inline_cloze',
    interactionType: 'short_text',
    prompt: `
1. I (41) _____ TV in the evening (watch)
2. He (42) _____ before 7 o'clock (get up)
3. Ms Ha (43) _____ three children (have)
4. Hung and I (44) _____ good friends (be)
5. Jason (45) _____ a first-year university student (be)
6. Brian lives near us, but we (46) _____ him very often (not see)
7. She (47) _____ very hard (not work)
8. They (48) _____ to each other (not be)
9. How long (49) _____ you to go to school? (it/take)
10. (50) _____ a teacher? (be)
    `,
    clozeAnswers: {
      '37': { targetWord: 'ghost' },
      '41': { targetWord: 'watch' },
      '42': { targetWord: 'gets up' },
      '43': { targetWord: 'has' },
      '44': { targetWord: 'are' },
      '45': { targetWord: 'is' },
      '46': { targetWord: "don't see" },
      '47': { targetWord: "doesn't work" },
      '48': { targetWord: "aren't" },
      '49': { targetWord: 'does it take' },
      '50': { targetWord: 'Is she' }
    }
  };

  const span = getItemSpanCount(item);
  assert.equal(span, 10, 'Prompt contains 10 blanks (41-50), spanCount must be 10, ignoring orphan key 37');
});

test('findPrecedingClozeScript: retrieves clean script text from prior inline cloze items or block reading passage', () => {
  const draftState = {
    blocks: [
      {
        blockId: 'b1',
        title: 'Listening Part 1',
        items: [
          {
            layoutType: 'inline_cloze',
            prompt: '<p>The cruise departs from Miami and visits (86) _________ Caribbean islands. It features (87) _________ pools.</p>'
          }
        ]
      },
      {
        blockId: 'b2',
        title: 'Reading Comprehension',
        items: []
      }
    ]
  };

  const script = findPrecedingClozeScript(draftState, 1);
  assert.ok(script.includes('The cruise departs from Miami and visits ... Caribbean islands.'));
  assert.ok(!script.includes('<p>'), 'HTML tags must be stripped');
});

test('isComprehensionExercise: returns true ONLY for reading comprehension Khối 03 or exercises with reference context', () => {
  // 1. Empty exercise (e.g. brand new Exercise 1 with 0 questions)
  const emptyEx = { exerciseId: 'ex-1', title: 'Bài tập 1: Phần 10' };
  const emptyBlock = { blockId: 'b-1', items: [], exercises: [emptyEx] };
  assert.equal(isComprehensionExercise(emptyEx, emptyBlock, { items: {} }), false, 'Empty exercise must NOT show reference context');

  // 2. Exercise with standard questions (Single choice, fitb, vocab pair)
  const standardEx = { exerciseId: 'ex-2', title: 'Exercise 2' };
  const standardBlock = {
    blockId: 'b-2',
    exercises: [standardEx],
    items: [
      { itemVersionId: 'i-1', exerciseId: 'ex-2', graderType: 'single_choice' },
      { itemVersionId: 'i-2', exerciseId: 'ex-2', graderType: 'fitb' }
    ]
  };
  assert.equal(isComprehensionExercise(standardEx, standardBlock, { items: {} }), false, 'Standard questions exercise must NOT show reference context');

  // 3. Exercise explicitly marked as comprehension
  const compEx = { exerciseId: 'ex-3', title: 'Exercise 3', exerciseType: 'comprehension' };
  assert.equal(isComprehensionExercise(compEx, { items: [] }, { items: {} }), true, 'Explicit comprehension exercise must show reference context');

  // 4. Exercise with existing referenceContext filled
  const contextEx = { exerciseId: 'ex-4', title: 'Exercise 4', referenceContext: 'Reading passage script here...' };
  assert.equal(isComprehensionExercise(contextEx, { items: [] }, { items: {} }), true, 'Exercise with referenceContext must show reference context');

  // 5. Exercise containing a comprehension rubric item
  const rubricEx = { exerciseId: 'ex-5', title: 'Exercise 5' };
  const rubricBlock = {
    blockId: 'b-5',
    exercises: [rubricEx],
    items: [
      { itemVersionId: 'i-comp', exerciseId: 'ex-5', graderType: 'rubric_async', rubricCode: 'rubric_comprehension_v1' }
    ]
  };
  const key = {
    items: {
      'i-comp': {
        graderType: 'rubric_async',
        rubric: { scoringVersion: 'rubric-comprehension-v1' }
      }
    }
  };
  assert.equal(isComprehensionExercise(rubricEx, rubricBlock, key), true, 'Exercise with comprehension rubric item must show reference context');
});

test('renderTestBuilderView: conceals exercise-reference-context-field on empty or standard exercises, reveals only for comprehension', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '05050000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Conditional Reference Context Test',
    blocks: [
      {
        blockId: 'b-empty',
        title: 'Phần 1: Ngữ pháp',
        exercises: [
          { exerciseId: 'ex-empty', title: 'Bài tập 1: Phần 1' }
        ],
        items: []
      },
      {
        blockId: 'b-comp',
        title: 'Phần 2: Đọc hiểu Khối 03',
        exercises: [
          {
            exerciseId: 'ex-comp',
            title: 'Bài tập 1: Đọc hiểu',
            exerciseType: 'comprehension',
            referenceContext: 'The park is located downtown. Its trees provide shade.'
          }
        ],
        items: [
          {
            itemVersionId: 'i-c1',
            exerciseId: 'ex-comp',
            position: 1,
            prompt: 'Từ "its" ở dòng thứ 2 có nghĩa là gì?',
            interactionType: 'short_text',
            graderType: 'rubric_async',
            maxScore: 4
          }
        ]
      }
    ],
    gradingKey: {
      items: {
        'i-c1': {
          graderType: 'rubric_async',
          rubricCode: 'rubric_comprehension_v1',
          rubric: { scoringVersion: 'rubric-comprehension-v1', maxScore: 4 }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Exercise 1 (empty) must NOT have reference context field
  assert.ok(container.innerHTML.includes('Bài tập 1: Phần 1'));
  // Exercise 2 (comprehension) MUST have reference context field with script text
  assert.ok(container.innerHTML.includes('Ngữ cảnh bài đọc / Script tham chiếu chung cho AI:'));
  assert.ok(container.innerHTML.includes('The park is located downtown. Its trees provide shade.'));
  assert.ok(container.innerHTML.includes('Ẩn với học viên'));
});
