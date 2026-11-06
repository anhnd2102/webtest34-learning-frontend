import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBlockExercisesCsv,
  generateBlockExercisesTemplateCsv,
  normalizeQuestionType,
  parseInlineClozeCsv,
  generateInlineClozeTemplateCsv,
  parseMultiGroupCsv,
  generateMultiGroupTemplateCsv,
  parseClozeBlanks
} from '../term-tests/teacher-dashboard/app.js';

test('normalizeQuestionType correctly recognizes multi_select_group and inline_cloze', () => {
  assert.equal(normalizeQuestionType('multi_select_group'), 'multi_select_group');
  assert.equal(normalizeQuestionType('multiple_choice_group'), 'multi_select_group');
  assert.equal(normalizeQuestionType('trắc nghiệm nhóm'), 'multi_select_group');
  assert.equal(normalizeQuestionType('chọn nhiều đáp án'), 'multi_select_group');
  assert.equal(normalizeQuestionType('inline_cloze'), 'inline_cloze');
  assert.equal(normalizeQuestionType('điền từ nội tuyến'), 'inline_cloze');
  assert.equal(normalizeQuestionType('error_correction'), 'error_correction');
  assert.equal(normalizeQuestionType('tìm và sửa lỗi sai'), 'error_correction');
});

test('parseClozeBlanks supports (1) _____, [1], {{1}}, and parenthetical numbers', () => {
  const prompt1 = 'The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) _____.';
  const blanks1 = parseClozeBlanks(prompt1);
  assert.equal(blanks1.length, 2);
  assert.equal(blanks1[0].number, 1);
  assert.equal(blanks1[1].number, 2);

  const prompt2 = 'Water boils at [1] degrees and freezes at [2] degrees.';
  const blanks2 = parseClozeBlanks(prompt2);
  assert.equal(blanks2.length, 2);
  assert.equal(blanks2[0].number, 1);
  assert.equal(blanks2[1].number, 2);

  const prompt3 = 'Item {{3}} and item {{4}}.';
  const blanks3 = parseClozeBlanks(prompt3);
  assert.equal(blanks3.length, 2);
  assert.equal(blanks3[0].number, 3);
  assert.equal(blanks3[1].number, 4);
});

test('Block CSV: error_correction correctly assigns knife (error) and knives (correction) with Smart Auto-Detect', () => {
  // Case 1: Col 5 = knife (error), Col 6 = knives (correction)
  const csv1 = `Exercise_Title,Exercise_Instructions,Question_Type,Prompt,Correct_Answer,Options_Or_Details,Score
Phần 7: Sửa lỗi sai,Tìm một từ sai và sửa lại,error_correction,We have two knife in the kitchen.,knife,knives,1
`;
  const res1 = parseBlockExercisesCsv(csv1);
  assert.equal(res1.exercises.length, 1);
  const item1 = res1.exercises[0].items[0];
  assert.equal(item1.pedagogicalTypeCode, 'error_correction');
  assert.equal(item1.graderType, 'correction_pair');
  assert.equal(item1.targetWord, 'knife');
  assert.deepEqual(item1.expectedErrors, ['knife']);
  assert.deepEqual(item1.expectedCorrections, ['knives']);
  assert.notDeepEqual(item1.expectedErrors, ['she']);
  assert.notDeepEqual(item1.expectedCorrections, ['her']);

  // Case 2: Smart Auto-Detect when user inverts columns: Col 5 = knives, Col 6 = knife
  const csv2 = `Exercise_Title,Exercise_Instructions,Question_Type,Prompt,Correct_Answer,Options_Or_Details,Score
Phần 7: Sửa lỗi sai,Tìm một từ sai và sửa lại,error_correction,We have two knife in the kitchen.,knives,knife,1
`;
  const res2 = parseBlockExercisesCsv(csv2);
  const item2 = res2.exercises[0].items[0];
  assert.equal(item2.targetWord, 'knife', 'Smart Auto-Detect detects knife appears in prompt and marks it as errorPart');
  assert.deepEqual(item2.expectedErrors, ['knife']);
  assert.deepEqual(item2.expectedCorrections, ['knives']);
});

test('Block CSV: multi_select_group creates linked items sharing groupId and unordered_group_slot', () => {
  const csv = `Exercise_Title,Exercise_Instructions,Question_Type,Prompt,Correct_Answer,Options_Or_Details,Score
Part 2: Group Choice,Select correct options,multi_select_group,Which TWO activities are free of charge?,A, C,Swimming pool | Tennis court | Fitness center | Sauna | Yoga class,2
`;
  const res = parseBlockExercisesCsv(csv);
  assert.equal(res.exercises.length, 1);
  const items = res.exercises[0].items;
  assert.equal(items.length, 2, 'Creates 2 question slots for the 2 correct answers');
  assert.ok(items[0].groupId, 'Slot 1 has a groupId');
  assert.equal(items[0].groupId, items[1].groupId, 'Both slots share the same groupId');
  assert.equal(items[0].graderType, 'unordered_group_slot');
  assert.equal(items[1].graderType, 'unordered_group_slot');
  assert.deepEqual(items[0].expectedOptionIds, ['A', 'C']);
  assert.equal(items[0].options.length, 5);
  assert.equal(items[0].options[0].label, 'Swimming pool');
  assert.equal(items[0].options[1].label, 'Tennis court');
});

test('Block CSV: inline_cloze extracts blanks and populates clozeAnswers with variant support', () => {
  const csv = `Exercise_Title,Exercise_Instructions,Question_Type,Prompt,Correct_Answer,Options_Or_Details,Score
Part 3: Cloze,Fill blanks,inline_cloze,"The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) __________.",six / 6 | Nassau,,1
`;
  const res = parseBlockExercisesCsv(csv);
  assert.equal(res.exercises.length, 1);
  const item = res.exercises[0].items[0];
  assert.equal(item.pedagogicalTypeCode, 'inline_cloze');
  assert.equal(item.graderType, 'inline_cloze');
  assert.equal(item.maxScore, 2, '2 blanks * 1 point = 2 points');
  assert.ok(item.clozeAnswers[1]);
  assert.ok(item.clozeAnswers[2]);
  assert.equal(item.clozeAnswers[1].targetWord, 'six');
  assert.deepEqual(item.clozeAnswers[1].accepted, ['six', '6']);
  assert.equal(item.clozeAnswers[2].targetWord, 'Nassau');
});

test('Individual Parsers: parseInlineClozeCsv and parseMultiGroupCsv operate stand-alone', () => {
  const clozeTemplate = generateInlineClozeTemplateCsv();
  assert.ok(clozeTemplate.startsWith('\uFEFF'));
  const clozeRes = parseInlineClozeCsv(clozeTemplate);
  assert.ok(clozeRes.items.length >= 2);
  assert.equal(clozeRes.items[0].graderType, 'inline_cloze');

  const multiGroupTemplate = generateMultiGroupTemplateCsv();
  assert.ok(multiGroupTemplate.startsWith('\uFEFF'));
  const mgRes = parseMultiGroupCsv(multiGroupTemplate);
  assert.ok(mgRes.items.length >= 4);
  assert.equal(mgRes.items[0].graderType, 'unordered_group_slot');
});

test('generateBlockExercisesTemplateCsv contains comprehensive rows for all 11 types', () => {
  const csv = generateBlockExercisesTemplateCsv();
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('single_choice'));
  assert.ok(csv.includes('multi_select_group'));
  assert.ok(csv.includes('inline_cloze'));
  assert.ok(csv.includes('fitb'));
  assert.ok(csv.includes('vocabulary_pair'));
  assert.ok(csv.includes('error_correction'));
  assert.ok(csv.includes('knife,knives'));
  assert.ok(csv.includes('sentence_transformation'));
  assert.ok(csv.includes('sentence_reorder'));
  assert.ok(csv.includes('listening_order'));
  assert.ok(csv.includes('reading_matching'));
  assert.ok(csv.includes('rubric_async'));
});

test('Excel Template File: mau_de_thi_test_studio.xlsx contains 2 sheets and parses all 12 exercise types cleanly', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { join, dirname } = await import('node:path');
  const __dirname = dirname(fileURLToPath(import.meta.url));

  const vendorPath = join(__dirname, '../term-tests/teacher-dashboard/vendor/xlsx.full.min.js');
  const templatePath = join(__dirname, '../term-tests/teacher-dashboard/assets/templates/mau_de_thi_test_studio.xlsx');

  const xlsxCode = readFileSync(vendorPath, 'utf8');
  const fn = new Function('window', 'global', `${xlsxCode}; return window.XLSX || global.XLSX;`);
  const XLSX = fn(globalThis, globalThis);

  const buf = readFileSync(templatePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  assert.deepEqual(wb.SheetNames, ['Nhap_De_Thi', 'Huong_Dan_Chi_Tiet']);

  const csvText = XLSX.utils.sheet_to_csv(wb.Sheets['Nhap_De_Thi']);
  const parsed = parseBlockExercisesCsv(csvText);
  assert.equal(parsed.exercises.length, 12, 'Parses all 12 exercises');

  const errorEx = parsed.exercises.find(e => e.title.includes('Phần 6'));
  assert.ok(errorEx, 'Error correction exercise found');
  assert.equal(errorEx.items[0].targetWord, 'knife');
  assert.deepEqual(errorEx.items[0].expectedErrors, ['knife']);
  assert.deepEqual(errorEx.items[0].expectedCorrections, ['knives']);

  const multiGroupEx = parsed.exercises.find(e => e.title.includes('Phần 3'));
  assert.ok(multiGroupEx, 'Multi-select group exercise found');
  assert.equal(multiGroupEx.items.length, 2);
  assert.deepEqual(multiGroupEx.items[0].expectedOptionIds, ['A', 'C']);

  const clozeEx = parsed.exercises.find(e => e.title.includes('Phần 4'));
  assert.ok(clozeEx, 'Inline cloze exercise found');
  assert.equal(clozeEx.items[0].graderType, 'inline_cloze');
  assert.equal(Object.keys(clozeEx.items[0].clozeAnswers).length, 3);
});

