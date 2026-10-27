import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { groupSections } from '../term-tests/webtest-34-demo/content-preview.mjs';

test('Course 34 Phase 1 Test 4 speaking section contains the 3 correct speaking questions with suggested vocabulary', () => {
  const filePath = new URL('../term-tests/webtest-34-demo/demo-content/34-test-4.json', import.meta.url);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const speakingGroup = data.groups.find(g => g.id === 'speaking');
  assert.ok(speakingGroup, 'speaking group must exist');
  assert.equal(speakingGroup.items.length, 3, 'speaking group must have 3 questions');

  // Verify Question 1
  const q1 = speakingGroup.items[0];
  assert.equal(q1.id, '57f231a9-e24f-48e6-a774-151eb944f458');
  assert.match(q1.prompt, /^1\.\s+How important is it to choose the right career\? \(6 points\)/);
  assert.match(q1.prompt, /Suggested Vocab:/);
  assert.match(q1.prompt, /Gắn bó với công việc:\s*Stick to the job/);
  assert.match(q1.prompt, /Phù hợp:\s*to be suitable/);

  // Verify Question 2
  const q2 = speakingGroup.items[1];
  assert.equal(q2.id, '4d913500-90d6-4c38-9f31-9cba5a13d681');
  assert.match(q2.prompt, /^2\.\s+What do you hope to do in the future if you have a lot of money\? \(6 points\)/);
  assert.match(q2.prompt, /Suggested Vocab:/);
  assert.match(q2.prompt, /May mắn thay \(Adv\):\s*luckily/);
  assert.match(q2.prompt, /Dịp nghỉ Tết:\s*Tet holiday/);

  // Verify Question 3
  const q3 = speakingGroup.items[2];
  assert.equal(q3.id, 'c33cb664-b4e0-4701-88ea-f31c3b02a6c2');
  assert.match(q3.prompt, /^3\.\s+Is it difficult to understand body language\? \(6 points\)/);
  assert.match(q3.prompt, /extremely\/\s*incredibly\/\s*remarkably hard/);
  assert.match(q3.prompt, /At first\/in the beginning/);
  assert.match(q3.prompt, /get the hang of it/);

  // Verify none of the old Debra Garrel questions are in the speaking group
  for (const item of speakingGroup.items) {
    assert.doesNotMatch(item.prompt, /Debra Garrel/i);
  }

  // Verify rendered HTML
  const sectionsHtml = groupSections(data, true);
  assert.match(sectionsHtml, /How important is it to choose the right career\?/);
  assert.match(sectionsHtml, /Stick to the job/);
  assert.match(sectionsHtml, /What do you hope to do in the future if you have a lot of money\?/);
  assert.match(sectionsHtml, /Tet holiday/);
  assert.match(sectionsHtml, /Is it difficult to understand body language\?/);
  assert.match(sectionsHtml, /get the hang of it/);
});
