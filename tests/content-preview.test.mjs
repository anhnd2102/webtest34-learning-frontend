import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { draftKey, sanitizeDraft, learningRequestMethod, mapAnswerFromDefinitionValue, mapAnswerToDefinitionValue, resetLocalAttemptState } from '../term-tests/webtest-34-demo/content-preview.mjs';

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

test('drafts are isolated by course/version and discard unknown or invalid responses', () => {
  const form = { course: '03', sourceHash: 'abc', groups: [{ items: [{ id: 'a' }, { id: 'b', options: ['A', 'B'] }] }] };
  assert.notEqual(draftKey(form), draftKey({ ...form, course: '45' }));
  assert.notEqual(draftKey(form), draftKey({ ...form, sourceHash: 'def' }));
  assert.deepEqual(sanitizeDraft(form, { answers: { a: 'text', b: 'C', secret: 'bad' } }).answers, { a: 'text' });
  assert.deepEqual(sanitizeDraft(form, null).answers, {});
});

test('starting a server attempt clears answers and submission state from another student', () => {
  const state = { answers: { old: 'answer' }, submittedAt: 123, currentSection: 'listening' };
  resetLocalAttemptState(state);
  assert.deepEqual(state, { answers: {}, submittedAt: null, currentSection: 'listening' });
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
