import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTestBuilderScoreSummary,
  renderScoreBreakdownBarHtml,
  renderBlockJumpTagsHtml,
  resolveStudentAnswerDisplay,
  resolveExpectedAnswerDisplay
} from '../term-tests/teacher-dashboard/app.js';

test('computeTestBuilderScoreSummary accurately aggregates total score and per-skill breakdown', () => {
  const blocks = [
    {
      blockId: 'b1',
      title: 'Phần 1: Listening Comprehension',
      items: [
        {
          itemVersionId: 'item-1',
          position: 1,
          maxScore: 5,
          skillCodes: ['listening']
        },
        {
          itemVersionId: 'item-2',
          position: 2,
          maxScore: 10,
          skillCodes: ['listening'],
          layoutType: 'inline_cloze',
          clozeAnswers: { '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e' }
        }
      ]
    },
    {
      blockId: 'b2',
      title: 'Phần 2: Reading Skills',
      items: [
        {
          itemVersionId: 'item-3',
          position: 7,
          maxScore: 20,
          primarySkill: 'reading'
        }
      ]
    },
    {
      blockId: 'b3',
      title: 'Phần 3: Writing Translation',
      items: [
        {
          itemVersionId: 'item-4',
          position: 8,
          maxScore: 15,
          primarySkill: 'writing'
        }
      ]
    },
    {
      blockId: 'b4',
      title: 'Phần 4: Speaking Interview',
      items: [
        {
          itemVersionId: 'item-5',
          position: 9,
          maxScore: 25,
          primarySkill: 'speaking'
        }
      ]
    }
  ];

  const summary = computeTestBuilderScoreSummary(blocks);

  // Total score = 5 + 10 + 20 + 15 + 25 = 75
  assert.equal(summary.totalScore, 75);

  // Total questions: item-1 (1) + item-2 cloze 5 blanks (5) + item-3 (1) + item-4 (1) + item-5 (1) = 9
  assert.equal(summary.totalQuestions, 9);

  // Check canonical skill buckets
  const listening = summary.skills.find(s => s.code === 'listening');
  assert.ok(listening);
  assert.equal(listening.score, 15);
  assert.equal(listening.count, 6);

  const reading = summary.skills.find(s => s.code === 'reading');
  assert.ok(reading);
  assert.equal(reading.score, 20);
  assert.equal(reading.count, 1);

  const writing = summary.skills.find(s => s.code === 'writing');
  assert.ok(writing);
  assert.equal(writing.score, 15);
  assert.equal(writing.count, 1);

  const speaking = summary.skills.find(s => s.code === 'speaking');
  assert.ok(speaking);
  assert.equal(speaking.score, 25);
  assert.equal(speaking.count, 1);
});

test('renderScoreBreakdownBarHtml outputs structured HTML with icon, total score and skill chips', () => {
  const draftState = {
    blocks: [
      {
        blockId: 'b1',
        title: 'Listening Test',
        items: [
          { itemVersionId: 'i1', maxScore: 25, skillCodes: ['listening'] }
        ]
      }
    ]
  };

  const html = renderScoreBreakdownBarHtml(draftState);

  assert.ok(html.includes('builder-score-breakdown-bar'));
  assert.ok(html.includes('score-total-val'));
  assert.ok(html.includes('25'));
  assert.ok(html.includes('1 câu hỏi'));
  assert.ok(html.includes('Phân bố kỹ năng:'));
  assert.ok(html.includes('Listening'));
  // Must NOT contain colored Unicode emojis
  assert.ok(!html.includes('📊'));
  assert.ok(!html.includes('💡'));
  assert.ok(!html.includes('⏱'));
  // Verify block jump tags row
  assert.ok(html.includes('score-bar-blocks-row'));
  assert.ok(html.includes('btn-block-jump-chip'));
  assert.ok(html.includes('data-block-idx="0"'));
  assert.ok(html.includes('Phần 1'));
  assert.ok(html.includes('Listening Test'));
  assert.ok(html.includes('1 câu · 25 đ'));
});

test('renderBlockJumpTagsHtml renders interactive navigation chips with correct metadata', () => {
  const blocks = [
    {
      blockId: 'b1',
      title: 'Khởi động & Nghe hiểu',
      items: [
        { itemVersionId: 'i1', maxScore: 5 },
        { itemVersionId: 'i2', maxScore: 5 }
      ]
    },
    {
      blockId: 'b2',
      title: 'Đọc hiểu & Ghép nối',
      items: [
        { itemVersionId: 'i3', maxScore: 10 }
      ]
    }
  ];

  const html = renderBlockJumpTagsHtml(blocks);
  assert.ok(html.includes('score-bar-blocks-row'));
  assert.ok(html.includes('Danh sách phần thi:'));
  assert.ok(html.includes('data-block-idx="0"'));
  assert.ok(html.includes('data-block-idx="1"'));
  assert.ok(html.includes('Khởi động &amp; Nghe hiểu'));
  assert.ok(html.includes('2 câu · 10 đ'));
  assert.ok(html.includes('Đọc hiểu &amp; Ghép nối'));
  assert.ok(html.includes('1 câu · 10 đ'));
  // Design system: no emoji
  assert.ok(!html.includes('🔖'));
  assert.ok(!html.includes('🚩'));
});

test('computeTestBuilderScoreSummary tracks firstBlockIdx for quick jump from skill chips', () => {
  const blocks = [
    {
      blockId: 'b1',
      title: 'Phần 1: Nghe',
      items: [{ itemVersionId: 'i1', maxScore: 10, skillCodes: ['listening'] }]
    },
    {
      blockId: 'b2',
      title: 'Phần 2: Đọc',
      items: [{ itemVersionId: 'i2', maxScore: 10, skillCodes: ['reading'] }]
    }
  ];

  const summary = computeTestBuilderScoreSummary(blocks);
  const listening = summary.skills.find(s => s.code === 'listening');
  const reading = summary.skills.find(s => s.code === 'reading');
  const writing = summary.skills.find(s => s.code === 'writing');

  assert.equal(listening.firstBlockIdx, 0);
  assert.equal(reading.firstBlockIdx, 1);
  assert.equal(writing.firstBlockIdx, null);
});

test('resolveStudentAnswerDisplay formats inline cloze object cleanly without [object Object]', () => {
  // Case 1: Real cloze answer object with subResults
  const itemWithSubResults = {
    position: 4,
    studentAnswer: {
      '1': 'near a beautiful',
      '2': "I'm a big fan of",
      '3': 'feel excited',
      '4': 'making friends',
      '5': 'shy'
    },
    subResults: {
      '1': { verdict: 'correct' },
      '2': { verdict: 'correct' },
      '3': { verdict: 'correct' },
      '4': { verdict: 'incorrect' },
      '5': { verdict: 'correct' }
    }
  };

  const display = resolveStudentAnswerDisplay(itemWithSubResults);

  assert.ok(!display.includes('[object Object]'));
  assert.ok(!display.includes('[object object]'));
  assert.ok(display.includes('(1) near a beautiful [✓]'));
  assert.ok(display.includes("(2) I'm a big fan of [✓]"));
  assert.ok(display.includes('(3) feel excited [✓]'));
  assert.ok(display.includes('(4) making friends [✗]'));
  assert.ok(display.includes('(5) shy [✓]'));

  // Case 2: JSON-encoded string
  const itemJsonString = {
    position: 4,
    studentAnswer: JSON.stringify({
      '1': 'apple',
      '2': 'banana'
    })
  };

  const displayJson = resolveStudentAnswerDisplay(itemJsonString);
  assert.ok(!displayJson.includes('[object Object]'));
  assert.equal(displayJson, '(1) apple · (2) banana');
});

test('resolveExpectedAnswerDisplay formats cloze blanks and lists without [object Object]', () => {
  // Case 1: Expected answer map of accepted variants
  const itemClozeMap = {
    expectedAnswer: {
      '1': ['near a beautiful', 'near a beautiful.'],
      '2': ["I'm a big fan of", 'I am a big fan of'],
      '3': ['feel excited'],
      '4': ['making new friends'],
      '5': ['shy', 'timid']
    }
  };

  const display = resolveExpectedAnswerDisplay(itemClozeMap);

  assert.ok(!display.includes('[object Object]'));
  assert.ok(!display.includes('[object object]'));
  assert.ok(display.includes('(1) near a beautiful / near a beautiful.'));
  assert.ok(display.includes("(2) I'm a big fan of / I am a big fan of"));
  assert.ok(display.includes('(3) feel excited'));
  assert.ok(display.includes('(4) making new friends'));
  assert.ok(display.includes('(5) shy / timid'));

  // Case 2: Fallback from item.clozeAnswers when expectedAnswer is empty
  const itemFallback = {
    expectedAnswer: null,
    clozeAnswers: {
      '1': { accepted: ['cat'] },
      '2': { accepted: ['dog', 'puppy'] }
    }
  };

  const displayFallback = resolveExpectedAnswerDisplay(itemFallback);
  assert.ok(!displayFallback.includes('[object Object]'));
  assert.ok(displayFallback.includes('(1) cat · (2) dog / puppy'));
});
