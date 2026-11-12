import test from 'node:test';
import assert from 'node:assert/strict';
import * as compatibility from '../term-tests/teacher-dashboard/app.js';
import { spawnSync } from 'node:child_process';

test('draft operations are independently available and retain facade behavior for exercise-scoped insertion', async () => {
  const draft = await import('../term-tests/teacher-dashboard/studio/draft-model.js');
  assert.equal(draft.insertItemsIntoBlockExercise, compatibility.insertItemsIntoBlockExercise);
  assert.equal(draft.reorderBlockItem, compatibility.reorderBlockItem);
  assert.equal(draft.moveItemToExercise, compatibility.moveItemToExercise);
  const block = { exercises: [{ exerciseId: 'first', itemIds: ['old'] }, { exerciseId: 'target', itemIds: [] }], items: [{ itemVersionId: 'old', exerciseId: 'first', position: 1 }] };
  draft.insertItemsIntoBlockExercise(block, block.exercises[1], [{ itemVersionId: 'new', exerciseId: 'target', position: 2 }]);
  assert.deepEqual(block.items.map(item => item.itemVersionId), ['old', 'new']);
  assert.equal(block.items[1].exerciseId, 'target');
  assert.deepEqual(block.exercises[0].itemIds, ['old']);
});

test('rich content and media retain their public behavior through independent module interfaces', async () => {
  const rich = await import('../term-tests/teacher-dashboard/ui/rich-content.js');
  const media = await import('../term-tests/teacher-dashboard/studio/media.js');
  assert.equal(rich.sanitizeRichContent, compatibility.sanitizeRichContent);
  assert.equal(media.convertGoogleDriveImageUrl, compatibility.convertGoogleDriveImageUrl);
  assert.equal(rich.sanitizeRichContent('<p>Giữ <b>định dạng</b></p><script>alert(1)</script>'), '<p>Giữ <b>định dạng</b></p>');
  assert.equal(media.convertGoogleDriveImageUrl('https://example.test/synthetic.png'), 'https://example.test/synthetic.png');
});

test('workflow modules import without DOM access, network, timers or application startup', () => {
  const modules = ['studio/draft-model.js', 'studio/rich-editor.js', 'studio/media.js', 'studio/simulation.js', 'studio/publishing.js', 'studio/draft-saving.js', 'studio/question-renderer.js', 'studio/builder.js', 'results/view.js', 'grading/attempt-review.js'];
  const urls = modules.map(file => new URL('../term-tests/teacher-dashboard/' + file, import.meta.url).href);
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', `
    globalThis.document = new Proxy({}, { get() { throw new Error('Unexpected DOM access during workflow import'); } });
    for (const name of ['fetch', 'setTimeout', 'setInterval']) {
      globalThis[name] = () => { throw new Error('Unexpected side effect: ' + name); };
    }
    for (const url of ${JSON.stringify(urls)}) await import(url);
  `], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
});

test('retained vocabulary CSV button still dispatches to the vocabulary workflow', () => {
  const handlers = new Map();
  const button = {
    getAttribute(name) { return name === 'data-block-idx' ? '0' : name === 'data-exercise-id' ? 'ex1' : null; },
    addEventListener(name, callback) { handlers.set(name, callback); }
  };
  const root = {
    innerHTML: '', querySelector() { return null; },
    querySelectorAll(selector) { return selector === '.btn-upload-vocab-csv' ? [button] : []; }
  };
  const handle = compatibility.mountBuilder(root, {
    id: 'synthetic-vocabulary-workflow', blocks: [{ blockId: 'b1', title: 'Vocabulary',
      exercises: [{ exerciseId: 'ex1', title: 'Synthetic exercise', itemIds: [] }], items: [] }],
    gradingKey: { items: {}, groups: {} }
  });
  try {
    assert.equal(typeof handlers.get('click'), 'function');
    handlers.get('click')();
    const [item] = handle.getDraft().blocks[0].items;
    assert.equal(item.interactionType, 'text_select_pair');
    assert.equal(item.exerciseId, 'ex1');
  } finally {
    handle.dispose();
  }
});
