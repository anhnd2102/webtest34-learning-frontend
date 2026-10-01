import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { groupBody, groupSections, resolveAudioUrl } from '../term-tests/webtest-34-demo/content-preview.mjs';

for (const t of [1, 2]) {
  test(`Course 45 Phase 2 Test ${t} renders choice cards, passages, and Cloudflare audio`, () => {
    const filePath = new URL(`../term-tests/webtest-34-demo/demo-content/45-p2-test-${t}.json`, import.meta.url);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    assert.equal(data.groups.length, 13);

    for (const g of data.groups) {
      const html = groupBody(g);
      assert.ok(html.length > 0, `Group ${g.id} rendered empty HTML`);
      
      // If the group is a choice/matching group, verify it renders radio buttons, not selects
      if (g.id.includes('choice') || g.id.includes('matching') || g.id.includes('headings') || g.id.includes('info') || g.id.endsWith('-tf')) {
        const selectCount = [...html.matchAll(/<select/g)].length;
        const radioCount = [...html.matchAll(/type="radio"/g)].length;
        assert.equal(selectCount, 0, `Group ${g.id} should not have selects`);
        assert.ok(radioCount > 0, `Group ${g.id} should render radio options`);
      }
    }

    const audios = new Set();
    for (const g of data.groups) {
      if (g.audioPath) {
        const resolved = resolveAudioUrl(g.audioPath);
        audios.add(resolved);
      }
    }

    assert.ok(audios.size > 0, `Test ${t} should have audio configured`);
    for (const audio of audios) {
      assert.match(audio, /^https:\/\/pub-2a60b39d70e14f98a922aaa8cb1f1dd2\.r2\.dev\/course-45\/phase-2\//);
    }

    const sectionsHtml = groupSections(data, true);
    assert.ok(sectionsHtml.length > 10000, `Test ${t} should render complete sections HTML`);

    if (t === 1) {
      const vocabBox = groupBody(data.groups.find(g => g.id === 'vocabulary-box'));
      assert.match(vocabBox, /class="demo-word-bank"/);
      assert.match(vocabBox, /class="demo-word-bank-list"/);
      assert.match(vocabBox, /<span>aim<\/span>/);
      assert.match(vocabBox, /class="demo-blank-number">\(1\)<\/span>/);

      const vocabPhrase = groupBody(data.groups.find(g => g.id === 'vocabulary-phrase'));
      assert.match(vocabPhrase, /class="demo-cloze demo-sentence"/);
      assert.match(vocabPhrase, /The pros and <span class="demo-question demo-inline">/);

      const lForm = groupBody(data.groups.find(g => g.id === 'listening-form'));
      assert.match(lForm, /class="demo-blank-number">\(1\)<\/span>/);
    }

    if (t === 2) {
      const rSummary = groupBody(data.groups.find(g => g.id === 'reading-summary'));
      assert.match(rSummary, /class="demo-word-bank"/);
      assert.match(rSummary, /<span>trapped<\/span>/);
      assert.match(rSummary, /class="demo-blank-number">\(16\)<\/span>/);

      const lTable = groupBody(data.groups.find(g => g.id === 'listening-table'));
      assert.match(lTable, /class="demo-cloze-table"/);
      assert.match(lTable, /class="demo-blank-number">\(1\)<\/span>/);

      const vocabPrep = groupBody(data.groups.find(g => g.id === 'vocabulary-preposition'));
      assert.match(vocabPrep, /class="demo-cloze demo-sentence"/);
    }
  });
}
