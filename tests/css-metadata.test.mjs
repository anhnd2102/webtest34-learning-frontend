import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRuleMap } from '../scripts/css-metadata.mjs';

test('rule-map.json matches the rules generated from styles fragments', () => {
  const committed = JSON.parse(readFileSync(new URL('../term-tests/teacher-dashboard/styles/rule-map.json', import.meta.url), 'utf8'));
  assert.deepEqual(buildRuleMap(), committed, 'run: node scripts/css-metadata.mjs rule-map --write');
});

test('rule map keeps cascade order and media conditions of every rule', () => {
  const rules = buildRuleMap();
  assert.ok(rules.length > 1000);
  assert.deepEqual(rules.map(rule => rule.order), rules.map((_, index) => index));
  assert.ok(rules.some(rule => rule.conditions.includes('print')));
  assert.ok(rules.every(rule => rule.selector && !rule.selector.startsWith('@')));
});
