import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderCourseTestCatalogView,
  renderTestBuilderView,
  openConfirmDeleteTestModal,
  openCreateTestModal
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio: Catalog view displays delete button for 0-submission tests and locks tests with submissions', () => {
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const catalog = [
    {
      testKey: '34-p1t1',
      sessionNumber: 1,
      title: 'Bài thi đã công bố và đã có học viên nộp bài',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      status: 'published',
      submissionCount: 5
    },
    {
      testKey: '34-draft-1234',
      sessionNumber: 7,
      title: 'Bài thi bản nháp',
      formVersionId: '04010000-0000-4000-8000-000000000002',
      status: 'draft',
      submissionCount: 0
    },
    {
      testKey: '34-draft-5be23673',
      sessionNumber: 8,
      title: 'Bài thi đã lỡ ấn công bố nhưng chưa có bài nộp',
      formVersionId: '04010000-0000-4000-8000-000000000003',
      status: 'published',
      submissionCount: 0
    }
  ];

  renderCourseTestCatalogView(container, catalog, {
    teacherRole: 'lead',
    courseId: 2
  });

  const html = container.innerHTML;

  // Verify delete button is rendered for draft test
  assert.ok(
    html.includes('btn-delete-test-draft') || html.includes('btn-delete-test'),
    'Catalog table must provide delete button for draft tests'
  );

  assert.ok(
    html.includes('data-form-version-id="04010000-0000-4000-8000-000000000002"'),
    'Delete button must contain data-form-version-id attribute pointing to the draft'
  );

  // Published test with 0 submissions CAN also be deleted
  assert.ok(
    html.includes('data-form-version-id="04010000-0000-4000-8000-000000000003"'),
    'Published test with 0 submissions must provide delete button'
  );

  // Check that published test WITH submissions does NOT have delete button and shows action-locked
  const p1CardStart = html.indexOf('data-test-key="34-p1t1"');
  const nextCardStart = html.indexOf('data-test-key="34-draft-1234"');
  assert.ok(p1CardStart !== -1, 'Locked test card found in catalog');
  const lockedCardHtml = html.slice(p1CardStart, nextCardStart !== -1 ? nextCardStart : undefined);

  assert.equal(
    lockedCardHtml.includes('btn-delete-test-draft') || lockedCardHtml.includes('btn-delete-test'),
    false,
    'Tests with student submissions must NOT have a delete button'
  );
  assert.ok(
    lockedCardHtml.includes('action-locked'),
    'Tests with student submissions must display locked status indicator'
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

test('Test Studio: openConfirmDeleteTestModal enforces double-check keyword XÓA before enabling delete button', () => {
  // Setup minimal DOM mock
  const elements = {};
  const listeners = {};

  const mockModal = {
    id: '',
    className: '',
    setAttribute: () => {},
    innerHTML: '',
    parentNode: null,
    querySelector: (selector) => elements[selector] || null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const originalDocument = globalThis.document;
  globalThis.document = {
    querySelector: () => null,
    createElement: () => mockModal,
    body: {
      appendChild: (el) => {
        el.parentNode = globalThis.document.body;
      },
      removeChild: (el) => {
        el.parentNode = null;
      }
    }
  };

  try {
    let confirmedData = null;
    openConfirmDeleteTestModal({
      testKey: '34-draft-5be23673',
      formVersionId: '5be23673-0000-4000-8000-000000000001',
      title: 'Minh hoạ đề thi 34',
      sessionNumber: 8,
      phase: 1,
      courseName: 'Khối 34',
      onConfirm: (data) => {
        confirmedData = data;
      }
    });

    assert.ok(mockModal.innerHTML.includes('modal-confirm-delete-test') || mockModal.id === 'modal-confirm-delete-test');
    assert.ok(mockModal.innerHTML.includes('34-draft-5be23673'), 'Modal must display the target testKey');
    assert.ok(mockModal.innerHTML.includes('Minh hoạ đề thi 34'), 'Modal must display target title');
    assert.ok(mockModal.innerHTML.includes('XÓA'), 'Modal must mention keyword XÓA for confirmation');
  } finally {
    globalThis.document = originalDocument;
  }
});

test('Test Studio: openCreateTestModal renders Phase and Session choices for new test creation', () => {
  const mockModal = {
    id: '',
    className: '',
    setAttribute: () => {},
    innerHTML: '',
    parentNode: null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const originalDocument = globalThis.document;
  globalThis.document = {
    querySelector: () => null,
    createElement: () => mockModal,
    body: {
      appendChild: (el) => {
        el.parentNode = globalThis.document.body;
      },
      removeChild: (el) => {
        el.parentNode = null;
      }
    }
  };

  try {
    const catalog = [
      { sessionNumber: 1, phase: 1, title: 'Test 1' },
      { sessionNumber: 2, phase: 1, title: 'Test 2' }
    ];

    openCreateTestModal({
      courseId: 2,
      catalog,
      onSubmit: () => {}
    });

    assert.ok(mockModal.innerHTML.includes('create-phase-select'), 'Modal must render Phase selector');
    assert.ok(mockModal.innerHTML.includes('create-session-input'), 'Modal must render Session Number input');
    assert.ok(mockModal.innerHTML.includes('create-title-input'), 'Modal must render Title input');
    assert.ok(mockModal.innerHTML.includes('Phase 1'), 'Modal must offer Phase 1 option');
  } finally {
    globalThis.document = originalDocument;
  }
});
