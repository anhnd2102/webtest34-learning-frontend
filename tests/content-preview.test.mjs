import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { draftKey, sanitizeDraft, clozeSegments, groupBody, groupSections, learningRequestMethod, resetLocalAttemptState } from '../term-tests/webtest-34-demo/content-preview.mjs';

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

const load = course => fs.readFile(new URL(`../term-tests/webtest-34-demo/demo-content/${course}.json`, import.meta.url), 'utf8').then(JSON.parse);

test('03 picture questions use exact source anchors and exclude the Writing prompt image', async () => {
  const form=await load('03');
  const items=form.groups.find(g=>g.id==='vocabulary-picture').items;
  assert.equal(items.length,10);
  assert.equal(items[0].image,undefined);
  assert.ok(items[0].prompt.includes('BUI QUANG HUNG'));
  const files=['image5.png','image9.jpg','image4.png','image1.png','image8.png','image3.png','image7.png','image2.png','image6.png'];
  items.slice(1).forEach((item,index)=>assert.ok(item.image.endsWith(files[index])));
  assert.ok(!items.some(item=>item.image?.includes('image10')));
  const writing=form.groups.find(g=>g.id==='writing');
  assert.equal(writing.items.length,5);
  assert.ok(writing.items[0].prompt.includes('Hoa 17 tuổi'));
  assert.ok(writing.items.every(item=>!item.promptMissing));
});

test('Speaking 34 exposes questions and student notes without adjacent teacher criteria or model answers', async () => {
  const form=await load('34');
  const items=form.groups.find(group=>group.id==='speaking').items;
  assert.equal(items.length,3);
  for(const item of items) {
    const lines=item.prompt.split('\n').filter(Boolean);
    assert.match(lines[0],/^[123]\. .*\?/);
    assert.ok(lines.slice(1).every(line=>line.startsWith('Note:')));
  }
  assert.ok(items[1].prompt.includes('Note: a long coach trip/bus ride'));
});

test('rendering every course retains every response field once, including actual Cloze source passages', async () => {
  for (const course of ['03','34','45']) {
    const form=await load(course);
    for (const group of form.groups) {
      const html=groupBody(group);
      const ids=[...html.matchAll(/data-demo-answer="([^"]+)"/g)].map(match=>match[1]);
      assert.deepEqual(ids.slice().sort(),group.items.map(item=>item.id).sort());
      if (['listening-gap','listening-notes','grammar-present','grammar-past','grammar-perfect','grammar-verb'].includes(group.id)) {
        assert.ok(html.includes('demo-cloze'),`${course}/${group.id} must render inline`);
      }
    }
  }
  const html=groupBody({id:'ordinary',items:[{id:'x',prompt:'<script>alert(1)</script>'}]});
  assert.ok(!html.includes('<script>'));
});

test('demo uses selected Phase 1 forms and contains no private grading data', async () => {
  for (const course of ['03', '34', '45']) {
    const form = await load(course);
    assert.equal(form.course, course);
    assert.equal(form.testNumber, 1);
    assert.equal(form.phase, course !== '03' ? 1 : null);
    if (course === '45') assert.equal(form.sourceSheet, 'TEST MỚI');
    assert.doesNotMatch(JSON.stringify(form), /correctOptionId|acceptedWord|privateGrading|IMPORTRANGE|DUMMYFUNCTION/);
    const items = form.groups.flatMap(group => group.items);
    assert.equal(new Set(items.map(item => item.id)).size, items.length);
    assert.ok(items.length > 50);
    for (const group of form.groups) for (const item of group.items) {
      if (item.image) await fs.access(new URL(`../term-tests/webtest-34-demo/${item.image}`, import.meta.url));
    }
  }
});

test('drafts are isolated by course/version and discard unknown or invalid responses', () => {
  const form = { course: '03', sourceHash: 'abc', groups: [{ items: [{ id: 'a' }, { id: 'b', options: ['A', 'B'] }] }] };
  assert.notEqual(draftKey(form), draftKey({ ...form, course: '45' }));
  assert.notEqual(draftKey(form), draftKey({ ...form, sourceHash: 'def' }));
  assert.deepEqual(sanitizeDraft(form, { answers: { a: 'text', b: 'C', secret: 'bad' } }).answers, { a: 'text' });
  assert.deepEqual(sanitizeDraft(form, null).answers, {});
});

test('choice cards preserve stored option values and Vocabulary meanings remain dropdowns', async () => {
  const form=await load('34');
  const pronunciation=form.groups.find(group=>group.id==='pronunciation-choice');
  const html=groupBody(pronunciation);
  assert.equal([...html.matchAll(/type="radio"/g)].length,30);
  assert.ok(html.includes('class="qnum">1</span>'));
  assert.ok(html.includes('class="qnum">10</span>'));
  assert.ok(html.includes(`value="${pronunciation.items[0].options[0]}"`));
  const vocabulary=groupBody(form.groups.find(group=>group.id==='vocabulary-listen'));
  assert.equal([...vocabulary.matchAll(/<select /g)].length,25);
  assert.ok(!vocabulary.includes('type="radio"'));
  const course03=await load('03');
  const vocabulary03=groupBody(course03.groups.find(group=>group.id==='vocabulary-listen'));
  assert.equal([...vocabulary03.matchAll(/<select /g)].length,15);
  assert.equal(course03.groups.find(group=>group.id==='vocabulary-listen').items.filter(item=>item.options).length,15);
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

test('all production audio paths resolve to supplied files', async () => {
  for (const course of ['03', '45']) {
    const form = await load(course);
    for (const path of new Set(form.groups.map(group => group.audioPath).filter(Boolean))) {
      await fs.access(new URL(`../term-tests/webtest-34-demo/${path}`, import.meta.url));
    }
  }
});

test('demo entries delegate to the canonical page and branch before Learning initialization', async () => {
  for (const course of ['03', '45']) {
    const entry = await fs.readFile(new URL(`../term-tests/webtest-${course}/test-1/index.html`, import.meta.url), 'utf8');
    assert.match(entry, new RegExp(`searchParams\\.set\\('demoCourse', '${course}'\\)`));
    assert.match(entry, /location\.hash/);
  }
  const html = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf("import('./content-preview.mjs?rev=") < html.indexOf('const STORAGE_KEY'));
});

test('canonical demo cache-busts the content renderer after text fixes', async () => {
  const html = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(html, /import\('\.\/content-preview\.mjs\?rev=[a-z0-9-]+'\)/i);
});
