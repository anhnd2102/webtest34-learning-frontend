import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as dashboard from '../term-tests/teacher-dashboard/app.js';

const moduleUrl = new URL('../term-tests/teacher-dashboard/studio/content-import.js', import.meta.url);
const publicNames = [
  'parseCsvRows', 'parseVocabPairCsv', 'parseSingleChoiceCsv', 'parseFitbCsv',
  'parseErrorCorrectionCsv', 'parseSentenceTransformationCsv', 'parseListeningOrderCsv',
  'generateSingleChoiceTemplateCsv', 'generateFitbTemplateCsv',
  'generateErrorCorrectionTemplateCsv', 'generateSentenceTransformationTemplateCsv',
  'generateListeningOrderTemplateCsv', 'generateVocabPairTemplateCsv'
];

test('CSV module is available independently and dashboard preserves the same public function bindings', async () => {
  const contentImport = await import(moduleUrl.href);
  for (const name of publicNames) {
    assert.equal(typeof contentImport[name], 'function', name);
    assert.equal(dashboard[name], contentImport[name], `${name} remains compatible without a second implementation`);
  }
  assert.deepEqual(contentImport.parseFitbCsv('A ___,word,2').items, [
    { prompt: 'A ___', targetAnswer: 'word', maxScore: 2 }
  ]);
});

test('CSV import and parsing need no browser globals, network or timers', () => {
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', `
    for (const name of ['document', 'window', 'fetch', 'setTimeout', 'setInterval']) {
      Object.defineProperty(globalThis, name, { get() { throw new Error('Unexpected side effect: ' + name); } });
    }
    const { parseVocabPairCsv } = await import(${JSON.stringify(moduleUrl.href)});
    const result = parseVocabPairCsv('English,Vietnamese\\ncoast,bờ biển');
    if (result.validRows[0]?.vietnamese !== 'bờ biển') throw new Error('Wrong parse result');
  `], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr || child.error?.message);
});
