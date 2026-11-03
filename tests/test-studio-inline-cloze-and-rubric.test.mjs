import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scaleRubricCriteriaScores,
  pruneOrphanClozeKeys,
  getItemSpanCount,
  findPrecedingClozeScript
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
