import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSingleChoiceTemplateCsv,
  parseSingleChoiceCsv,
  generateFitbTemplateCsv,
  parseFitbCsv,
  isShortQaEligibleFor2Col,
  openGenericBatchModal,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';
import { isShortQaEligibleFor2Col as cbtIsShortQaEligibleFor2Col } from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';

test('generateFitbTemplateCsv creates valid CSV with UTF-8 BOM and Prompt, Target_Answer, Points columns', () => {
  const csv = generateFitbTemplateCsv();
  assert.ok(csv.startsWith('\uFEFF'), 'Includes UTF-8 BOM');
  assert.ok(csv.includes('Prompt,Target_Answer,Points'), 'Includes header');
  assert.ok(csv.includes('The capital of France is ___.,Paris,1'), 'Includes sample row');
});

test('parseFitbCsv parses comma and tab separated FITB rows, respecting points or defaultPoints', () => {
  const csvText = `
Prompt,Target_Answer,Points
The capital of France is ___.,Paris,2
Water freezes at ___ degrees.,0,
The Sun rises in the ___.,east,1.5
Invalid line with missing answer
  `.trim();

  const parsed = parseFitbCsv(csvText, 0.5);
  assert.equal(parsed.items.length, 3, 'Parsed 3 valid items');
  assert.equal(parsed.invalidRows.length, 1, 'Captured 1 invalid row');

  assert.equal(parsed.items[0].prompt, 'The capital of France is ___.');
  assert.equal(parsed.items[0].targetAnswer, 'Paris');
  assert.equal(parsed.items[0].maxScore, 2);

  assert.equal(parsed.items[1].prompt, 'Water freezes at ___ degrees.');
  assert.equal(parsed.items[1].targetAnswer, '0');
  assert.equal(parsed.items[1].maxScore, 0.5, 'Falls back to defaultPoints 0.5 when Points column is empty');

  assert.equal(parsed.items[2].maxScore, 1.5);
});

test('generateSingleChoiceTemplateCsv and parseSingleChoiceCsv handle Points column with defaultPoints fallback', () => {
  const csv = generateSingleChoiceTemplateCsv();
  assert.ok(csv.startsWith('\uFEFF'), 'Includes UTF-8 BOM');
  assert.ok(csv.includes('Points'), 'Includes Points column in header');

  const csvText = `
Question_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation,Points
What is the capital of UK?,London,Paris,Berlin,Rome,A,London is the capital,2.5
What is 2 + 2?,3,4,5,,B,Basic math,
  `.trim();

  const parsed = parseSingleChoiceCsv(csvText, 1.0);
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].maxScore, 2.5);
  assert.equal(parsed.items[1].maxScore, 1.0, 'Falls back to defaultPoints 1.0');
});

test('isShortQaEligibleFor2Col accurately identifies short prompts under 100 characters', () => {
  const shortItems = [
    { prompt: 'The capital of France is ___.' },
    { prompt: 'Water freezes at ___ degrees Celsius.' }
  ];
  assert.ok(isShortQaEligibleFor2Col(shortItems), 'Eligible for 2-column layout');
  assert.ok(cbtIsShortQaEligibleFor2Col(shortItems), 'CBT candidate renderer recognizes 2-col eligibility');

  const longItems = [
    { prompt: 'The capital of France is ___.' },
    { prompt: 'In this extended comprehensive analysis of European climate and geographic distribution across different centuries, what is the primary impact on local agricultural outputs?' }
  ];
  assert.equal(isShortQaEligibleFor2Col(longItems), false, 'Ineligible because prompt exceeds 100 characters');

  const tableItems = [
    { prompt: '<table><tr><td>Column</td></tr></table> Fill in the blank:' },
    { prompt: 'Another item' }
  ];
  assert.equal(isShortQaEligibleFor2Col(tableItems), false, 'Ineligible because prompt contains table markup');

  const singleItem = [{ prompt: 'Short prompt' }];
  assert.equal(isShortQaEligibleFor2Col(singleItem), false, 'Single item does not need 2-column grid');
});

test('openGenericBatchModal supports defaultPoints parameter and passes it on confirm/single', () => {
  let singleResult = null;
  openGenericBatchModal({
    title: 'Test Modal',
    defaultPoints: 2.5,
    onSingle: (res) => {
      singleResult = res;
    }
  });

  assert.ok(singleResult, 'onSingle executed');
  assert.equal(singleResult.defaultPoints, 2.5, 'Passed defaultPoints 2.5');
});

test('renderTestBuilderView removes reading matching, sentence transformation and pronunciation from toolbar', () => {
  const container = { innerHTML: '', querySelectorAll: () => [] };
  const mockForm = {
    id: 'form-test-1',
    version: 1,
    status: 'draft',
    title: 'Test Form',
    publicDefinition: {
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Block 1',
          exercises: [{ exerciseId: 'ex1', title: 'Exercise 1' }],
          items: []
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);
  const html = container.innerHTML;

  // Verify removed deprecated buttons
  assert.ok(!html.includes('btn-add-reading-matching'), 'btn-add-reading-matching is removed');
  assert.ok(!html.includes('btn-add-sentence-transformation'), 'btn-add-sentence-transformation is removed');
  assert.ok(!html.includes('btn-add-pronunciation-choice'), 'btn-add-pronunciation-choice is removed');

  // Verify kept buttons
  assert.ok(html.includes('btn-add-single-choice'), 'btn-add-single-choice remains present');
  assert.ok(html.includes('btn-add-fitb'), 'btn-add-fitb remains present');
  assert.ok(html.includes('btn-add-listening-order'), 'btn-add-listening-order remains present');
  assert.ok(html.includes('btn-add-vocab-pair'), 'btn-add-vocab-pair remains present');
});
