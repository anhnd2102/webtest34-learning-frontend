import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const textGlyphs = /[■-◿⏩-⏺⏸⬅]/u;


test('teacher simulation no longer carries the dead text-glyph audio handler', () => {
  const source = read('term-tests/teacher-dashboard/studio/simulation.js');
  assert.ok(!source.includes('btn-sim-audio-play'), 'the simulation dock uses .btn-start-listening');
  assert.equal(textGlyphs.test(source), false, 'no play/pause text glyphs in simulation.js');
});
