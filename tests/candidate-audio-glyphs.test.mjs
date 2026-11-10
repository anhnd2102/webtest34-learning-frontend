import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupSections } from '../term-tests/webtest-34-demo/content-preview.mjs';

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const textGlyphs = /[■-◿⏩-⏺⏸⬅]/u;

test('canonical exam start-audio button shows an SVG play icon, not a text glyph', () => {
  const html = read('term-tests/webtest-34-demo/index.html');
  const button = html.match(/<button[^>]*class="[^"]*audio-start-btn[^"]*"[^>]*>[\s\S]*?<\/button>/);
  assert.ok(button, 'audio-start-btn template exists');
  assert.match(button[0], /<svg class="icon-inline" viewBox="0 0 24 24" aria-hidden="true">/);
  assert.match(button[0], /Bắt đầu phát audio · 1 lần/);
  assert.equal(textGlyphs.test(button[0]), false);
});

test('content preview audio gate button shows the play icon, not a text glyph', () => {
  const form = { groups: [{ id: 'listen-a', title: 'Part A', instructions: 'Listen', audioRequired: true, audioPath: 'audio/listen.mp3', items: [{ id: 'a', prompt: 'Question A' }] }] };
  const button = groupSections(form).match(/<button[^>]*demo-audio-start[^>]*>[\s\S]*?<\/button>/);
  assert.ok(button, 'demo audio start button is rendered');
  assert.match(button[0], /^<button[^>]*>\s*<svg class="icon-inline"/);
  assert.match(button[0], /Phát audio \(nếu có\)/);
  assert.equal(textGlyphs.test(button[0]), false);
});

test('teacher simulation no longer carries the dead text-glyph audio handler', () => {
  const source = read('term-tests/teacher-dashboard/studio/simulation.js');
  assert.ok(!source.includes('btn-sim-audio-play'), 'the simulation dock uses .btn-start-listening');
  assert.equal(textGlyphs.test(source), false, 'no play/pause text glyphs in simulation.js');
});
