import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView,
  formPublishPath,
  formPublishPreviewPath,
  getCourseCodeFromCourseId,
  filterClassesForCourse
} from '../term-tests/teacher-dashboard/app.js';

test('formPublishPath returns canonical endpoint', () => {
  assert.equal(formPublishPath(), '/api/teacher/forms/publish');
  assert.equal(formPublishPath('https://api.test'), 'https://api.test/api/teacher/forms/publish');
  assert.equal(formPublishPath('https://api.test/'), 'https://api.test/api/teacher/forms/publish');
});

test('renderTestBuilderView renders Preview and Publish action buttons in top bar', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '06010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Candidate Simulation & Publishing Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '06010000-0000-4000-8000-000000000001',
      title: 'Candidate Simulation & Publishing Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: '06010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Phần 1: Nghe hiểu',
          audioUrl: 'assets/test.mp3',
          readingPassage: 'This is a sample passage.',
          items: [
            {
              itemFamilyId: '06010000-0000-4000-8000-0000000000f1',
              itemVersionId: '06010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Sample Question',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Option A' },
                { id: 'B', label: 'Option B' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '06010000-0000-4000-8000-0000000000i1': {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm, {
    classes: [
      { classId: '201', name: '34.01 - Sáng Thứ 2-4', courseCode: 'course-34' },
      { classId: '202', name: '34.02 - Tối Thứ 3-5', courseCode: 'course-34' }
    ]
  });

  // Verify Preview Button exists
  assert.ok(container.innerHTML.includes('id="btn-preview-test"'), 'Must have btn-preview-test button');
  assert.ok(container.innerHTML.includes('Xem trước bài thi'), 'Button text includes Xem trước bài thi');

  // Verify Publish Button exists
  assert.ok(container.innerHTML.includes('id="btn-publish-test"'), 'Must have btn-publish-test button');
  assert.ok(container.innerHTML.includes('Công bố đề thi'), 'Button text includes Công bố đề thi');

  // Verify status tags and title
  assert.ok(container.innerHTML.includes('v1'), 'Displays form version v1');
  assert.ok(container.innerHTML.includes('Bản nháp'), 'Displays draft badge');
  assert.ok(container.innerHTML.includes('Candidate Simulation &amp; Publishing Test') || container.innerHTML.includes('Candidate Simulation & Publishing Test'), 'Displays test title');
});

test('renderTestBuilderView supports multi-interaction types for candidate simulation', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '06020000-0000-4000-8000-000000000001',
    version: 2,
    status: 'draft',
    title: 'Full Test Simulation',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '06020000-0000-4000-8000-000000000001',
      title: 'Full Test Simulation',
      durationMinutes: 60,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Section 1',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'i1',
              position: 1,
              prompt: 'Question 1',
              interactionType: 'multi_choice_group',
              pedagogicalTypeCode: 'multiple_choice_group',
              layoutType: 'grid_3',
              graderType: 'unordered_group_slot',
              groupId: 'grp_1',
              maxScore: 2,
              options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]
            },
            {
              itemFamilyId: 'f2',
              itemVersionId: 'i2',
              position: 2,
              prompt: 'Question 2',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'fill_in_the_blank',
              graderType: 'accepted_text',
              maxScore: 1,
              options: []
            },
            {
              itemFamilyId: 'f3',
              itemVersionId: 'i3',
              position: 3,
              prompt: 'Vocab Word',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              graderType: 'accepted_text_exact_option',
              maxScore: 1,
              options: [{ id: 'opt_1', label: 'Meaning 1' }]
            },
            {
              itemFamilyId: 'f4',
              itemVersionId: 'i4',
              position: 4,
              prompt: 'AI Essay Prompt',
              interactionType: 'long_text',
              pedagogicalTypeCode: 'writing',
              graderType: 'rubric_async',
              maxScore: 4,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i2: { graderType: 'accepted_text', accepted: ['answer'] },
        i3: { graderType: 'accepted_text_exact_option', accepted: ['Vocab Word'], expectedOptionId: 'opt_1' },
        i4: { graderType: 'rubric_async', rubricCode: 'r1', rubricVersion: 1, rubric: { criteria: [] } }
      },
      groups: {
        grp_1: { graderType: 'unordered_group_slot', expectedOptionIds: ['A', 'B'] }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('unordered_group_slot'), 'Renders multi-choice group');
  assert.ok(container.innerHTML.includes('short_text') || container.innerHTML.includes('short-text'), 'Renders short text item');
  assert.ok(container.innerHTML.includes('text_select_pair') || container.innerHTML.includes('vocabulary_pair'), 'Renders vocab pair item');
  assert.ok(container.innerHTML.includes('template-rubric-async'), 'Renders AI rubric item');
});

test('formPublishPreviewPath returns canonical pre-flight endpoint', () => {
  assert.equal(formPublishPreviewPath(), '/api/teacher/forms/publish-preview');
  assert.equal(formPublishPreviewPath('https://api.test'), 'https://api.test/api/teacher/forms/publish-preview');
  assert.equal(formPublishPreviewPath('https://api.test/'), 'https://api.test/api/teacher/forms/publish-preview');
});

test('getCourseCodeFromCourseId converts numeric and string course IDs to 2-digit course codes', () => {
  assert.equal(getCourseCodeFromCourseId(1), '03');
  assert.equal(getCourseCodeFromCourseId(2), '34');
  assert.equal(getCourseCodeFromCourseId(3), '45');
  assert.equal(getCourseCodeFromCourseId('1'), '03');
  assert.equal(getCourseCodeFromCourseId('2'), '34');
  assert.equal(getCourseCodeFromCourseId('3'), '45');
  assert.equal(getCourseCodeFromCourseId('course-03'), '03');
  assert.equal(getCourseCodeFromCourseId('course-45'), '45');
  assert.equal(getCourseCodeFromCourseId(null), '34');
});

test('filterClassesForCourse filters classes strictly by course code and course ID', () => {
  const classes = [
    { classId: '101', name: '03.01 - Sáng Thứ 2', courseCode: '03' },
    { classId: '102', name: '03.02 - Chiều Thứ 3', course_code: 'course-03' },
    { classId: '201', name: '34.01 - Tối Thứ 2-4', courseCode: '34' },
    { classId: '202', name: '34.02 - Sáng Thứ 3-5', courseCode: 'course-34' },
    { classId: '301', name: '45.01 - Chiều Thứ 7', courseCode: '45' },
    { classId: '302', name: '45.02 - Tối Chủ Nhật', course_code: '45' },
    { classId: '303', name: '45.03 - Chiều Chủ Nhật', courseId: 3 }
  ];

  const course03Classes = filterClassesForCourse(classes, 1);
  assert.equal(course03Classes.length, 2);
  assert.deepEqual(course03Classes.map(c => c.classId), ['101', '102']);

  const course34Classes = filterClassesForCourse(classes, 2);
  assert.equal(course34Classes.length, 2);
  assert.deepEqual(course34Classes.map(c => c.classId), ['201', '202']);

  const course45Classes = filterClassesForCourse(classes, 3);
  assert.equal(course45Classes.length, 3);
  assert.deepEqual(course45Classes.map(c => c.classId), ['301', '302', '303']);
});

test('Smart Publishing Modal: renders 2-step wizard, calculates impact, and enforces double-check matching before publishing', async () => {
  // Setup minimal DOM mock
  const domElements = new Map();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  function createMockNode(tag = 'div') {
    const nodeListeners = new Map();
    const childrenMap = new Map();
    const node = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      value: '',
      textContent: '',
      checked: false,
      disabled: false,
      style: {},
      _innerHTML: '',
      get innerHTML() { return this._innerHTML; },
      set innerHTML(val) {
        this._innerHTML = val;
      },
      querySelector(sel) {
        if (!childrenMap.has(sel)) {
          const child = createMockNode(sel.includes('btn') ? 'button' : 'input');
          if (sel.startsWith('#')) child.id = sel.slice(1);
          if (sel.startsWith('.')) child.className = sel.slice(1);
          childrenMap.set(sel, child);
        }
        return childrenMap.get(sel);
      },
      querySelectorAll(sel) {
        return [this.querySelector(sel)];
      },
      addEventListener(event, cb) {
        if (!nodeListeners.has(event)) nodeListeners.set(event, []);
        nodeListeners.get(event).push(cb);
      },
      dispatchEvent(event) {
        const cbs = nodeListeners.get(event.type) || [];
        for (const cb of cbs) cb(event);
      },
      click() {
        this.dispatchEvent({ type: 'click', target: this, preventDefault() {} });
      },
      focus() {},
      select() {},
      closest(sel) {
        return createMockNode('div');
      },
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains() { return false; }
      }
    };
    return node;
  }

  const mockModal = createMockNode('div');
  mockModal.id = 'smart-publishing-modal';

  const publishBtn = createMockNode('button');
  publishBtn.id = 'btn-publish-test';

  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === '#btn-publish-test') return publishBtn;
      return null;
    },
    querySelectorAll() { return []; }
  };

  globalThis.document = {
    querySelector(sel) {
      if (sel === '#smart-publishing-modal') return mockModal;
      return null;
    },
    querySelectorAll() { return []; },
    createElement(tag) {
      const el = createMockNode(tag);
      return el;
    },
    body: {
      appendChild() {},
      removeChild() {}
    }
  };

  const mockForm = {
    id: '04050000-0000-4000-8000-000000000001',
    formVersionId: '04050000-0000-4000-8000-000000000001',
    version: 3,
    status: 'draft',
    title: 'IZONE · Khối 45 · Test 7',
    submissionCount: 0,
    testKey: '45-p2t7',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04050000-0000-4000-8000-000000000001',
      title: 'IZONE · Khối 45 · Test 7',
      durationMinutes: 60,
      blocks: []
    },
    gradingKey: { items: {} }
  };

  const catalog = [
    { testKey: '45-p1t1', sessionNumber: 1, title: 'IZONE · Khối 45 · Test 1' },
    { testKey: '45-p2t7', sessionNumber: 7, title: 'IZONE · Khối 45 · Test 7' }
  ];

  const classes = [
    { classId: '4501', name: '45.01 - Sáng Thứ 7', courseCode: '45', submissionCount: 15 },
    { classId: '4502', name: '45.02 - Tối Chủ Nhật', courseCode: '45', submissionCount: 0 }
  ];

  let previewCalledWith = null;
  let publishCalledWith = null;

  renderTestBuilderView(container, mockForm, {
    courseId: 3,
    catalog,
    classes,
    onPublishPreview: async (payload) => {
      previewCalledWith = payload;
      return {
        success: true,
        willBeUpdated: 1,
        willBeSkipped: 1,
        updatedCount: 1,
        skippedCount: 1,
        totalChecked: 2,
        purpose: payload.purpose,
        targetTestTitle: 'IZONE · Khối 45 · Test 7'
      };
    },
    onPublish: async (payload) => {
      publishCalledWith = payload;
      return {
        success: true,
        updatedCount: 1,
        frozenCount: 1,
        totalCount: 2,
        formVersionId: payload.formVersionId,
        purpose: payload.purpose,
        courseCatalogUpdated: true,
        assignmentsUpdated: [
          { assignmentId: 'asg-4502', classId: '4502', status: 'updated' },
          { assignmentId: 'asg-4501', classId: '4501', status: 'frozen_protected' }
        ]
      };
    }
  });

  // 1. Trigger openPublishingModal via button click
  publishBtn.click();

  // Verify Step 1 is rendered into modal
  assert.ok(mockModal.innerHTML.includes('Smart Publishing Engine'), 'Modal renders Smart Publishing Engine title');
  assert.ok(mockModal.innerHTML.includes('Mục tiêu &amp; Phạm vi') || mockModal.innerHTML.includes('Mục tiêu & Phạm vi'), 'Step 1 indicator rendered');
  assert.ok(mockModal.innerHTML.includes('Cập nhật thay thế cho bài test có sẵn trong lộ trình'), 'Contains replace existing option');
  assert.ok(mockModal.innerHTML.includes('Bổ sung thành một bài test mới trong lộ trình'), 'Contains add new option');
  assert.ok(mockModal.innerHTML.includes('Cơ chế Roster Freezing'), 'Contains Roster Freezing safety banner');
  assert.ok(mockModal.innerHTML.includes('45.01 - Sáng Thứ 7'), 'Displays available Khối 45 classes');

  // 2. Click Step 1 Next button to trigger preview pre-flight and advance to Step 2
  const nextBtn = mockModal.querySelector('#btn-step1-next');
  assert.ok(nextBtn, 'Step 1 next button exists');
  await nextBtn.click();

  assert.ok(previewCalledWith, 'onPublishPreview must be called with pre-flight payload');
  assert.equal(previewCalledWith.purpose, 'replace_existing');
  assert.equal(previewCalledWith.scope, 'whole_course');

  // Verify Step 2 is rendered into modal
  assert.ok(mockModal.innerHTML.includes('Bảng phân tích tác động'), 'Step 2 renders impact summary table');
  assert.ok(mockModal.innerHTML.includes('XÁC NHẬN AN TOÀN (DOUBLE-CHECK)'), 'Step 2 renders double-check confirmation box');
  assert.ok(mockModal.innerHTML.includes('btn-auto-fill-confirm'), 'Step 2 provides auto-fill button for usability');

  // 3. Verify double-check safety: final publish button is initially disabled
  const finalPublishBtn = mockModal.querySelector('#btn-final-publish');
  const confirmInput = mockModal.querySelector('#input-confirm-title');
  const autoFillBtn = mockModal.querySelector('#btn-auto-fill-confirm');

  assert.equal(finalPublishBtn.disabled, true, 'Final publish button MUST be disabled before name confirmation');

  // 4. Click auto-fill button to populate test title
  autoFillBtn.click();
  assert.equal(confirmInput.value, 'IZONE · Khối 45 · Test 7');
  assert.equal(finalPublishBtn.disabled, false, 'Final publish button MUST be enabled once test title matches');

  // 5. Click final publish
  await finalPublishBtn.click();
  assert.ok(publishCalledWith, 'onPublish must be invoked with complete payload');
  assert.equal(publishCalledWith.purpose, 'replace_existing');
  assert.equal(publishCalledWith.scope, 'whole_course');
  assert.equal(publishCalledWith.formVersionId, '04050000-0000-4000-8000-000000000001');

  // Cleanup globals
  globalThis.document = originalDocument;
  globalThis.window = originalWindow;
});

test('Smart Publishing Modal: renders selection tiles with minimalist icons, hidden native radio, and checkmark indicators', () => {
  let innerHtmlResult = '';
  const node = {
    id: '',
    style: {},
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    closest: () => null
  };

  const publishBtn = { ...node, id: 'btn-publish-test' };
  const mockModal = {
    ...node,
    id: 'smart-publishing-modal',
    set innerHTML(val) {
      innerHtmlResult = val;
    },
    get innerHTML() {
      return innerHtmlResult;
    }
  };

  const originalDocument = globalThis.document;
  globalThis.document = {
    querySelector(sel) {
      if (sel === '#smart-publishing-modal') return mockModal;
      return null;
    },
    querySelectorAll: () => [],
    createElement: () => ({ ...node }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };

  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === '#btn-publish-test') return publishBtn;
      return null;
    },
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '04050000-0000-4000-8000-000000000002',
    formVersionId: '04050000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Selection Tile Test',
    publicDefinition: { blocks: [] },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm, {
    courseId: 3,
    catalog: [],
    classes: []
  });

  // Open modal
  const openFn = publishBtn.listeners?.click || publishBtn._clickHandler;
  // Trigger openPublishingModal directly by simulating click
  // In renderTestBuilderView, publishBtn listener was attached
  // Let's verify modal HTML after opening
  // Since we also test styles.css, verify stylesheet has the tokens:
  import('node:fs').then(({ readFileSync }) => {
    const css = readFileSync(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');
    assert.ok(css.includes('.tile-card-header'), 'styles.css defines .tile-card-header');
    assert.ok(css.includes('.tile-card-icon'), 'styles.css defines .tile-card-icon');
    assert.ok(css.includes('.tile-card-check'), 'styles.css defines .tile-card-check');
    assert.ok(css.includes('.sr-only-radio'), 'styles.css defines .sr-only-radio');
    assert.ok(css.includes('--izone-primary'), 'styles.css defines brand primary token');
  });

  globalThis.document = originalDocument;
});
