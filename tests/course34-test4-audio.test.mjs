import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { groupSections, resolveAudioUrl, CLOUDFLARE_R2_AUDIO_BASE } from '../term-tests/webtest-34-demo/content-preview.mjs';

test('Course 34 Phase 1 Test 4 audio URL resolution maps vocabulary to space-encoded R2 object', () => {
  // Test standard asset path
  const standardVocab = resolveAudioUrl('assets/34/test-4/vocabulary.mp3');
  assert.equal(
    standardVocab,
    `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-4/vocabulary%20.mp3`
  );

  // Test with cache-buster query parameter
  const vocabWithBuster = resolveAudioUrl('assets/34/test-4/vocabulary.mp3?v=20261026-c34t4-v1');
  assert.equal(
    vocabWithBuster,
    `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-4/vocabulary%20.mp3?v=20261026-c34t4-v1`
  );

  // Test with literal space or encoded space
  const literalSpace = resolveAudioUrl('assets/34/test-4/vocabulary .mp3');
  assert.equal(
    literalSpace,
    `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-4/vocabulary%20.mp3`
  );

  const encodedSpace = resolveAudioUrl('assets/34/test-4/vocabulary%20.mp3');
  assert.equal(
    encodedSpace,
    `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-4/vocabulary%20.mp3`
  );
});

test('Course 34 Phase 1 Test 4 listening audio URL resolution maps to standard listening.mp3', () => {
  const listeningUrl = resolveAudioUrl('assets/34/test-4/listening.mp3');
  assert.equal(
    listeningUrl,
    `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-4/listening.mp3`
  );
});

test('Course 34 other tests (Test 1, 2, 3) audio resolution remains intact', () => {
  assert.equal(
    resolveAudioUrl('assets/34/test-1/vocabulary.mp3'),
    `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-1/vocabulary.mp3`
  );
  assert.equal(
    resolveAudioUrl('assets/34/test-2/vocabulary.mp3'),
    `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-2/vocabulary.mp3`
  );
  assert.equal(
    resolveAudioUrl('assets/34/test-3/vocabulary.mp3?v=20261020-0900'),
    `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-3/vocabulary.mp3?v=20261020-0900`
  );
});

test('34-test-4.json demo content includes updated vocabulary audioPath with cache buster', () => {
  const filePath = new URL('../term-tests/webtest-34-demo/demo-content/34-test-4.json', import.meta.url);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const vocabGroup = data.groups.find(g => g.id === 'vocabulary-listen');
  assert.ok(vocabGroup, 'vocabulary-listen group should exist');
  assert.ok(vocabGroup.audioPath, 'audioPath must be set for vocabulary-listen');
  assert.match(vocabGroup.audioPath, /^assets\/34\/test-4\/vocabulary\.mp3\?v=/);

  const resolved = resolveAudioUrl(vocabGroup.audioPath);
  assert.match(resolved, /^https:\/\/pub-2a60b39d70e14f98a922aaa8cb1f1dd2\.r2\.dev\/course-34\/phase-1\/test-4\/vocabulary%20\.mp3\?v=/);

  const listeningGroups = data.groups.filter(g => g.id.startsWith('listening-'));
  assert.ok(listeningGroups.length >= 3, 'Should have multiple listening groups');
  for (const lg of listeningGroups) {
    assert.equal(lg.audioPath, 'assets/34/test-4/listening.mp3');
  }

  const sectionsHtml = groupSections(data, true);
  assert.ok(sectionsHtml.includes('vocabulary%20.mp3'), 'Rendered HTML should include resolved R2 vocabulary audio URL');
});
