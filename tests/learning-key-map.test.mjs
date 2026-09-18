import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadKeyMap() {
  const context = vm.createContext({ window: {} });
  const pedagogicalTypes = await fs.readFile(path.join(root, 'term-tests/34-shared/pedagogical-types.js'), 'utf8');
  const keyMap = await fs.readFile(path.join(root, 'term-tests/34-shared/learning-key-map.js'), 'utf8');
  vm.runInContext(pedagogicalTypes, context, { filename: 'pedagogical-types.js' });
  vm.runInContext(keyMap, context, { filename: 'learning-key-map.js' });
  return context.window.WEBTEST34_LEARNING_KEY_MAP;
}

test('buildResponses preserves a composite tuple for its item version', async () => {
  const keyMap = await loadKeyMap();
  const tuple = ['outgoing', 'definition-option-17'];
  const responses = keyMap.buildResponses({
    blocks: [{
      items: [{
        itemVersionId: 'item-v1',
        position: 1,
        pedagogicalTypeCode: 'vocabulary_listen_write'
      }]
    }],
    answers: { vocab1_1: tuple }
  });

  assert.deepEqual(Array.from(responses['item-v1']), tuple);
  assert.notStrictEqual(responses['item-v1'], tuple);
});

test('buildResponses keeps legacy scalar answers as strings', async () => {
  const keyMap = await loadKeyMap();
  const responses = keyMap.buildResponses({
    blocks: [{
      items: [{
        itemVersionId: 'item-v2',
        position: 1,
        pedagogicalTypeCode: 'vocabulary_listen_write'
      }]
    }],
    answers: { vocab1_1: 'legacy answer' }
  });

  assert.equal(responses['item-v2'], 'legacy answer');
});
test('buildResponses maps typed block items by position when blocks are unsorted', async () => {
  const keyMap = await loadKeyMap();
  const responses = keyMap.buildResponses({
    blocks: [{
      items: [
        { itemVersionId: 'item-v2', position: 2, pedagogicalTypeCode: 'vocabulary_listen_write' },
        { itemVersionId: 'item-v1', position: 1, pedagogicalTypeCode: 'vocabulary_listen_write' }
      ]
    }],
    answers: { vocab1_1: 'first', vocab1_2: 'second' }
  });

  assert.equal(responses['item-v1'], 'first');
  assert.equal(responses['item-v2'], 'second');
});
