import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { draftKey, sanitizeDraft, clozeSegments, groupBody, groupSections, learningRequestMethod, mapAnswerFromDefinitionValue, mapAnswerToDefinitionValue, resetLocalAttemptState } from '../term-tests/webtest-34-demo/content-preview.mjs';

test('Learning API saves drafts with PATCH and keeps commands on POST', () => {
  assert.equal(learningRequestMethod('/attempts/draft'), 'PATCH');
  assert.equal(learningRequestMethod('/attempts/start'), 'POST');
  assert.equal(learningRequestMethod('/attempts/submit'), 'POST');
});

test('shared renderer does not embed local or production access tokens', async () => {
  const source = await fs.readFile(new URL('../term-tests/webtest-34-demo/content-preview.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /03010000-0000-4000-8000-000000000002/);
  assert.doesNotMatch(source, /45010000-0000-4000-8000-000000000002/);
  assert.doesNotMatch(source, /defaultCourseTokens/);
});

test('Cloze maps numbered blanks to stable answer IDs and preserves surrounding text', () => {
  const segments = clozeSegments('John (1).... (not/study). I (2) ___ (think).', ['a', 'b']);
  assert.deepEqual(segments.filter(x => typeof x !== 'string').map(x => x.id), ['a', 'b']);
  assert.ok(segments.join('').includes('(not/study)'));
  assert.equal(clozeSegments('(1)___ and (1)___', ['a', 'b']), null);
  assert.equal(clozeSegments('(1)___', ['a', 'b']), null);
  assert.deepEqual(clozeSegments('I ____ TV.', ['a'], false), ['I ', { id: 'a', number: 1 }, ' TV.']);
});

test('drafts are isolated by course/version and discard unknown or invalid responses', () => {
  const form = { course: '03', sourceHash: 'abc', groups: [{ items: [{ id: 'a' }, { id: 'b', options: ['A', 'B'] }] }] };
  assert.notEqual(draftKey(form), draftKey({ ...form, course: '45' }));
  assert.notEqual(draftKey(form), draftKey({ ...form, sourceHash: 'def' }));
  assert.deepEqual(sanitizeDraft(form, { answers: { a: 'text', b: 'C', secret: 'bad' } }).answers, { a: 'text' });
  assert.deepEqual(sanitizeDraft(form, null).answers, {});
});

test('choice cards preserve stored option values and Vocabulary meanings remain dropdowns', () => {
  const choice = { id: 'pronunciation-choice', items: [1, 2, 3].map(n => ({ id: `p${n}`, prompt: `${n}. Chọn từ có phần gạch chân phát âm khác`, options: [`opt-${n}-a`, `opt-${n}-b`, `opt-${n}-c`] })) };
  const html = groupBody(choice);
  assert.equal([...html.matchAll(/type="radio"/g)].length, 9);
  assert.ok(html.includes('class="qnum">1</span>'));
  assert.ok(html.includes('class="qnum">3</span>'));
  assert.ok(html.includes(`value="${choice.items[0].options[0]}"`));
  const vocabulary = { id: 'vocabulary-listen', items: [1, 2].map(n => ({ id: `v${n}`, prompt: `${n}. word`, options: ['nghĩa 1', 'nghĩa 2', 'nghĩa 3'] })) };
  const vocabularyHtml = groupBody(vocabulary);
  assert.equal([...vocabularyHtml.matchAll(/<select /g)].length, 2);
  assert.ok(!vocabularyHtml.includes('type="radio"'));
});

test('starting a server attempt clears answers and submission state from another student', () => {
  const state = { answers: { old: 'answer' }, submittedAt: 123, currentSection: 'listening' };
  resetLocalAttemptState(state);
  assert.deepEqual(state, { answers: {}, submittedAt: null, currentSection: 'listening' });
});

test('audio exercises stay hidden until their shared recording starts', () => {
  const form = { groups: [
    { id: 'listen-a', title: 'Part A', instructions: 'Listen', audioRequired: true, audioPath: 'audio/listen.mp3', items: [{ id: 'a', prompt: 'Question A' }] },
    { id: 'listen-b', title: 'Part B', instructions: 'Listen', audioRequired: true, audioPath: 'audio/listen.mp3', items: [{ id: 'b', prompt: 'Question B' }] },
    { id: 'grammar', title: 'Grammar', instructions: 'Write', audioRequired: false, items: [{ id: 'c', prompt: 'Question C' }] }
  ] };
  const html = groupSections(form);
  assert.equal([...html.matchAll(/data-demo-audio-start=/g)].length, 1);
  assert.equal([...html.matchAll(/data-demo-audio-content="audio-gate-1" hidden/g)].length, 2);
  assert.match(html, /data-demo-audio-player="audio-gate-1"/);
  assert.match(html, /data-demo-audio-content=""/);
});

test('listening-gap with a table renders the exam table grid layout', () => {
  const gapGroup = {
    id: 'listening-gap',
    title: 'Listening gap',
    items: [{ id: 'g1', prompt: '(1) ____' }, { id: 'g2', prompt: '(2) ____' }],
    table: { title: 'The Active Leisure Center', rows: [{ header: 'Outdoor facility', content: 'Name: (1) ______' }, { header: 'Opening hours', content: 'Opens at (2) ______' }] }
  };
  const rendered = groupBody(gapGroup, '34');
  assert.match(rendered, /demo-table-wrapper/);
  assert.match(rendered, /demo-cloze-table/);
  assert.match(rendered, /Outdoor facility/);
  assert.match(rendered, /data-demo-answer=/);
});

test('listening-order renders sentence cards and sequence dropdowns', () => {
  const orderGroup = {
    id: 'listening-order',
    title: 'Listening order',
    context: 'A. First sentence\nB. Second sentence\nC. Third sentence',
    items: [1, 2, 3].map(n => ({ id: `o${n}`, prompt: `Vị trí ${n}`, options: ['A', 'B', 'C'] }))
  };
  const rendered = groupBody(orderGroup, '34');
  assert.match(rendered, /demo-order-container/);
  assert.match(rendered, /demo-order-sentence-card/);
  assert.match(rendered, /demo-order-slot/);
  assert.match(rendered, /Vị trí 1/);
});

test('listening-choice renders MCQ radio options without prompt collisions', () => {
  const mcqGroup = {
    id: 'listening-choice',
    items: [{
      id: 'q1',
      prompt: '1. What does the speaker consider as an adventure?',
      options: ['A. Studying communications at university', 'B. Making friends with people every day', 'C. Seeing new people daily while studying']
    }]
  };
  const rendered = groupBody(mcqGroup, '34');
  assert.match(rendered, /demo-choice/);
  assert.match(rendered, /Studying communications at university/);
});

test('course entries delegate to the canonical page and keep the token fragment', async () => {
  for (const course of ['03', '45']) {
    const entry = await fs.readFile(new URL(`../term-tests/webtest-${course}/test-1/index.html`, import.meta.url), 'utf8');
    assert.match(entry, new RegExp(`searchParams\\.set\\('demoCourse', '${course}'\\)`));
    assert.match(entry, /location\.hash/);
  }
  const html = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes("import('./content-preview.mjs?rev="), 'trang nạp content-preview.mjs');
  // Đường prototype nội tuyến đã gỡ: không còn logic thi trong index.html, chỉ còn bước chọn mount hoặc hiện hướng dẫn.
  assert.ok(!html.includes('const STORAGE_KEY'), 'index.html không còn script prototype');
  assert.ok(html.includes('id="noTokenNotice"'), 'không có token thì hiện hướng dẫn mở bằng link giáo viên');
});

test('choice answers are translated between visible labels and stable definition option IDs', () => {
  const formItem = { options: ['A label', 'B label', 'C label', "What’s your name?"] };
  const definitionItem = { options: [
    { id: 'choice-a' }, { id: 'choice-b' }, { id: 'choice-c' }, { id: 'choice-d' }
  ] };
  assert.equal(mapAnswerToDefinitionValue(formItem, definitionItem, "What’s your name?"), 'choice-d');
  assert.equal(mapAnswerFromDefinitionValue(formItem, definitionItem, 'choice-d'), "What’s your name?");
  assert.equal(mapAnswerToDefinitionValue({}, {}, 'free text'), 'free text');
});

test('canonical page cache-busts the content renderer after text fixes', async () => {
  const html = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(html, /import\('\.\/content-preview\.mjs\?rev=[a-z0-9-]+'\)/i);
});
