import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderCourseTestCatalogView,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio: Catalog view displays delete button ONLY for draft tests', () => {
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const catalog = [
    {
      testKey: '34-p1t1',
      sessionNumber: 1,
      title: 'Bài thi đã công bố',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      status: 'published'
    },
    {
      testKey: '34-draft-1234',
      sessionNumber: 7,
      title: 'Bài thi bản nháp',
      formVersionId: '04010000-0000-4000-8000-000000000002',
      status: 'draft'
    }
  ];

  renderCourseTestCatalogView(container, catalog, {
    teacherRole: 'lead',
    courseId: 2
  });

  const html = container.innerHTML;

  // Verify delete button is rendered for draft test
  assert.ok(
    html.includes('btn-delete-test-draft'),
    'Catalog table must provide delete button (.btn-delete-test-draft) for draft tests'
  );

  assert.ok(
    html.includes('data-form-version-id="04010000-0000-4000-8000-000000000002"'),
    'Delete button must contain data-form-version-id attribute pointing to the draft'
  );

  // Check that published test does not have delete button
  const publishedCardMatch = html.match(/class="test-card"[^>]*data-test-key="34-p1t1"[\s\S]*?(?=<div class="test-card"|<\/div>\s*$)/);
  assert.ok(publishedCardMatch, 'Published test card found in catalog');
  assert.equal(
    publishedCardMatch[0].includes('btn-delete-test-draft'),
    false,
    'Published tests must NOT have a delete button'
  );
});

test('Test Studio: Test builder workspace renders delete draft button when test is in draft state with 0 submissions', () => {
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const draftForm = {
    id: '04010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    submissionCount: 0,
    title: 'Bản nháp Test Builder',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000002',
      title: 'Bản nháp Test Builder',
      blocks: []
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, draftForm, {
    teacherRole: 'lead',
    courseId: 2
  });

  const html = container.innerHTML;

  assert.ok(
    html.includes('btn-delete-draft-workspace') || html.includes('btn-delete-draft'),
    'Test Builder top bar must offer delete draft button for mutable drafts'
  );
});

test('Test Studio: Test builder workspace hides delete button when test is published or has submissions', () => {
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const publishedForm = {
    id: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'published',
    submissionCount: 0,
    title: 'Đề thi đã xuất bản',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Đề thi đã xuất bản',
      blocks: []
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, publishedForm, { teacherRole: 'lead', courseId: 2 });
  assert.equal(
    container.innerHTML.includes('btn-delete-draft-workspace'),
    false,
    'Published test must NOT have delete draft button'
  );

  const immutableDraftForm = {
    id: '04010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    submissionCount: 5,
    title: 'Bản nháp đã có người nộp',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000002',
      title: 'Bản nháp đã có người nộp',
      blocks: []
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, immutableDraftForm, { teacherRole: 'lead', courseId: 2 });
  assert.equal(
    container.innerHTML.includes('btn-delete-draft-workspace'),
    false,
    'Draft with submissions (immutable) must NOT have delete draft button'
  );
});

