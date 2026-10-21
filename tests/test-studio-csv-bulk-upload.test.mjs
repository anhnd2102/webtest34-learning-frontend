import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSingleChoiceTemplateCsv,
  parseSingleChoiceCsv,
  generateErrorCorrectionTemplateCsv,
  parseErrorCorrectionCsv,
  generateSentenceTransformationTemplateCsv,
  parseSentenceTransformationCsv,
  generateListeningOrderTemplateCsv,
  parseListeningOrderCsv
} from '../term-tests/teacher-dashboard/app.js';

test('Single Choice: generateSingleChoiceTemplateCsv outputs UTF-8 BOM and valid CSV columns', () => {
  const csv = generateSingleChoiceTemplateCsv();
  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Excel compatibility');
  assert.ok(csv.includes('Question_Prompt'), 'Contains Question_Prompt header');
  assert.ok(csv.includes('Option_A'), 'Contains Option_A header');
  assert.ok(csv.includes('Option_B'), 'Contains Option_B header');
  assert.ok(csv.includes('Correct_Answer'), 'Contains Correct_Answer header');
});

test('Single Choice: parseSingleChoiceCsv parses 4-option, 3-option, and 2-option questions', () => {
  const sampleCsv = `
Question_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation
The cruise departs ___ Miami.,at,from,on,in,B,Cụm từ depart from
She is interested ___ marine life.,in,at,on,,A,Interested in
The weather was ___ today.,good,bad,,,A,
`;

  const result = parseSingleChoiceCsv(sampleCsv);
  assert.equal(result.items.length, 3, 'Parses 3 valid questions');

  // Question 1: 4 options
  const q1 = result.items[0];
  assert.equal(q1.prompt, 'The cruise departs ___ Miami.');
  assert.equal(q1.options.length, 4);
  assert.equal(q1.layoutType, 'grid_4');
  assert.equal(q1.expectedOptionId, 'opt_b');
  assert.equal(q1.options[1].label, 'from');

  // Question 2: 3 options
  const q2 = result.items[1];
  assert.equal(q2.prompt, 'She is interested ___ marine life.');
  assert.equal(q2.options.length, 3);
  assert.equal(q2.layoutType, 'grid_3');
  assert.equal(q2.expectedOptionId, 'opt_a');

  // Question 3: 2 options
  const q3 = result.items[2];
  assert.equal(q3.options.length, 2);
  assert.equal(q3.layoutType, 'grid_2');
  assert.equal(q3.expectedOptionId, 'opt_a');
});

test('Error Correction: generateErrorCorrectionTemplateCsv and parseErrorCorrectionCsv work accurately', () => {
  const template = generateErrorCorrectionTemplateCsv();
  assert.ok(template.startsWith('\uFEFF'), 'Contains UTF-8 BOM');
  assert.ok(template.includes('Original_Sentence'), 'Contains Original_Sentence header');
  assert.ok(template.includes('Error_Part'), 'Contains Error_Part header');
  assert.ok(template.includes('Correction'), 'Contains Correction header');

  const sampleCsv = `
Original_Sentence,Error_Part,Correction,Accepted_Variants,Explanation
There are much people on the ship.,much,many,a lot of,Much dùng cho danh từ không đếm được
He go to the port yesterday.,go,went,,Quá khứ đơn
`;

  const result = parseErrorCorrectionCsv(sampleCsv);
  assert.equal(result.items.length, 2);

  const item1 = result.items[0];
  assert.equal(item1.prompt, 'There are much people on the ship.');
  assert.equal(item1.targetWord, 'much');
  assert.ok(item1.accepted.includes('many'));
  assert.ok(item1.accepted.includes('a lot of'));
  assert.equal(item1.explanation, 'Much dùng cho danh từ không đếm được');

  const item2 = result.items[1];
  assert.equal(item2.targetWord, 'go');
  assert.deepEqual(item2.accepted, ['went']);
});

test('Sentence Transformation: generateSentenceTransformationTemplateCsv and parseSentenceTransformationCsv work accurately', () => {
  const template = generateSentenceTransformationTemplateCsv();
  assert.ok(template.startsWith('\uFEFF'), 'Contains UTF-8 BOM');
  assert.ok(template.includes('Mandatory_Keyword'), 'Contains Mandatory_Keyword header');

  const sampleCsv = `
Original_Sentence,Mandatory_Keyword,Target_Sentence_With_Blank,Expected_Answer,Accepted_Variants
It is not necessary for you to book now.,HAVE,You __________ tickets now.,do not have to book,don't have to book
The cruise is too expensive for us.,ENOUGH,We do not have __________ the cruise.,enough money for,enough funds for
`;

  const result = parseSentenceTransformationCsv(sampleCsv);
  assert.equal(result.items.length, 2);

  const item1 = result.items[0];
  assert.equal(item1.prompt, 'It is not necessary for you to book now.');
  assert.equal(item1.mandatoryKeyword, 'HAVE');
  assert.equal(item1.targetSentence, 'You __________ tickets now.');
  assert.ok(item1.accepted.includes('do not have to book'));
  assert.ok(item1.accepted.includes("don't have to book"));
});

test('Listening Order: generateListeningOrderTemplateCsv and parseListeningOrderCsv group and rank events correctly', () => {
  const template = generateListeningOrderTemplateCsv();
  assert.ok(template.startsWith('\uFEFF'), 'Contains UTF-8 BOM');
  assert.ok(template.includes('Section_Title'), 'Contains Section_Title header');
  assert.ok(template.includes('Correct_Order'), 'Contains Correct_Order header');

  const sampleCsv = `
Section_Title,Event_Text,Correct_Order
Day 1 Itinerary,Safety drill and lifeboat inspection,2
Day 1 Itinerary,Welcome aboard meeting at main lounge,1
Day 1 Itinerary,Captain's dinner in dining hall,3
`;

  const result = parseListeningOrderCsv(sampleCsv);
  assert.equal(result.items.length, 1, 'Combines rows with same Section_Title into 1 listening order card');

  const orderCard = result.items[0];
  assert.equal(orderCard.prompt, 'Day 1 Itinerary');
  assert.equal(orderCard.listeningEvents.length, 3);
  assert.equal(orderCard.maxScore, 3);

  // Verifies sorted by correct rank
  assert.equal(orderCard.listeningEvents[0].correctRank, 1);
  assert.equal(orderCard.listeningEvents[0].text, 'Welcome aboard meeting at main lounge');
  assert.equal(orderCard.listeningEvents[1].correctRank, 2);
  assert.equal(orderCard.listeningEvents[1].text, 'Safety drill and lifeboat inspection');
  assert.equal(orderCard.listeningEvents[2].correctRank, 3);
  assert.equal(orderCard.listeningEvents[2].text, "Captain's dinner in dining hall");
});

test('CSV Parser resilience: handles RFC 4180 quotes, commas inside fields, and tab separation', () => {
  const quoteCsv = `
"Question_Prompt","Option_A","Option_B","Option_C","Option_D","Correct_Answer"
"The cruise, departing from Miami, visits islands.","Yes, it does","No, it does not","Maybe","Not sure","A"
`;

  const result = parseSingleChoiceCsv(quoteCsv);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].prompt, 'The cruise, departing from Miami, visits islands.');
  assert.equal(result.items[0].options[0].label, 'Yes, it does');
  assert.equal(result.items[0].options[1].label, 'No, it does not');
  assert.equal(result.items[0].expectedOptionId, 'opt_a');

  // Tab separated
  const tabTsv = `Question_Prompt\tOption_A\tOption_B\tOption_C\tOption_D\tCorrect_Answer\nWhere is the port?\tMiami\tDallas\tAustin\tBoston\tA`;
  const tabResult = parseSingleChoiceCsv(tabTsv);
  assert.equal(tabResult.items.length, 1);
  assert.equal(tabResult.items[0].prompt, 'Where is the port?');
  assert.equal(tabResult.items[0].options[0].label, 'Miami');
});

test('UI: openCsvUploadModal is exported, question type buttons exist in toolbar without cluttered outer CSV buttons, and modal provides bulk import & single creation', async () => {
  const { openCsvUploadModal, renderTestBuilderView } = await import('../term-tests/teacher-dashboard/app.js');

  assert.equal(typeof openCsvUploadModal, 'function', 'openCsvUploadModal must be an exported function');

  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '49010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'CSV Bulk Upload UI Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '49010000-0000-4000-8000-000000000001',
      title: 'CSV Bulk Upload UI Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Exercise Block',
          exercises: [
            {
              exerciseId: 'ex_1',
              exerciseNumber: 1,
              title: 'Grammar Practice'
            }
          ],
          items: []
        }
      ]
    },
    gradingKey: {
      items: {}
    }
  };

  renderTestBuilderView(mockContainer, mockForm);

  const html = mockContainer.innerHTML;

  // Question type buttons exist in Exercise toolbar
  assert.ok(html.includes('btn-add-single-choice'), 'Renders Single Choice button in toolbar');
  assert.ok(html.includes('btn-add-listening-order'), 'Renders Listening Order button in toolbar');
  assert.ok(html.includes('btn-add-error-correction'), 'Renders Error Correction button in toolbar');
  assert.ok(html.includes('btn-add-sentence-transformation'), 'Renders Sentence Transformation button in toolbar');

  // Cluttered outer CSV buttons are eliminated from toolbar
  assert.ok(!html.includes('btn-upload-sc-csv'), 'Does not clutter outer toolbar with btn-upload-sc-csv');
  assert.ok(!html.includes('btn-upload-listening-order-csv'), 'Does not clutter outer toolbar with btn-upload-listening-order-csv');
  assert.ok(!html.includes('btn-upload-error-correction-csv'), 'Does not clutter outer toolbar with btn-upload-error-correction-csv');
  assert.ok(!html.includes('btn-upload-transformation-csv'), 'Does not clutter outer toolbar with btn-upload-transformation-csv');

  // Verify openCsvUploadModal returns a proper modal or executes onSingle in headless environment
  let singleClicked = false;
  openCsvUploadModal({
    title: 'Nhập câu hỏi Trắc nghiệm vào Exercise (CSV / Excel)',
    subtitle: 'Hướng dẫn nhập dữ liệu',
    onSingle: () => {
      singleClicked = true;
    }
  });
  assert.equal(singleClicked, true, 'Headless invocation of openCsvUploadModal correctly invokes onSingle fallback');
});

