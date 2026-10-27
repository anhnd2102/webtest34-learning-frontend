import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Candidate simulation navigator renders individual question buttons for every question in a multi-item span', () => {
  const listeners = {};
  const mockPreviewBtn = {
    addEventListener: (evt, cb) => { listeners['preview'] = cb; }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-preview-test' || sel === '.btn-preview-test') {
        return mockPreviewBtn;
      }
      return null;
    },
    querySelectorAll: (sel) => []
  };

  const mockForm = {
    id: '04040000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Simulation Navigator Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04040000-0000-4000-8000-000000000001',
      title: 'Simulation Navigator Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b-sim-01',
          checkpoint: 1,
          title: 'Phần 1: Nghe và Đọc',
          items: [
            {
              itemFamilyId: 'f-sim-01',
              itemVersionId: 'i-sim-01',
              position: 51,
              prompt: 'Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              graderType: 'ordered_sequence',
              maxScore: 5,
              events: [
                { label: 'A', rank: 1, text: 'Event A' },
                { label: 'B', rank: 2, text: 'Event B' },
                { label: 'C', rank: 3, text: 'Event C' },
                { label: 'D', rank: 4, text: 'Event D' },
                { label: 'E', rank: 5, text: 'Event E' }
              ]
            },
            {
              itemFamilyId: 'f-sim-02',
              itemVersionId: 'i-sim-02',
              position: 56,
              prompt: 'Đoạn văn điền từ: (56) __________ text (57) __________ text (58) __________ text (59) __________ text (60) __________ text',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              maxScore: 5,
              clozeAnswers: {
                56: { accepted: ['apple'] },
                57: { accepted: ['banana'] },
                58: { accepted: ['orange'] },
                59: { accepted: ['grape'] },
                60: { accepted: ['lemon'] }
              }
            },
            {
              itemFamilyId: 'f-sim-03',
              itemVersionId: 'i-sim-03',
              position: 61,
              prompt: 'Câu 61: Chọn đáp án đúng',
              interactionType: 'single_choice',
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
        'i-sim-01': { graderType: 'ordered_sequence', expectedSequence: ['A', 'B', 'C', 'D', 'E'] },
        'i-sim-02': { graderType: 'accepted_text', accepted: ['apple'] },
        'i-sim-03': { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  let createdModal = null;
  globalThis.document = {
    querySelector: (sel) => (sel === '#candidate-simulation-modal' ? createdModal : null),
    createElement: (tag) => {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
      };
      return el;
    },
    body: {
      appendChild: (node) => {
        createdModal = node;
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Trigger preview simulation modal
  if (listeners['preview']) {
    listeners['preview']();
  }

  assert.ok(createdModal, 'Modal #candidate-simulation-modal must be created');
  assert.ok(createdModal.innerHTML.includes('question-navigator-grid'), 'Modal must contain question-navigator-grid');

  // Verify buttons for 51 through 61 exist in the navigator
  for (let q = 51; q <= 61; q++) {
    assert.ok(
      createdModal.innerHTML.includes(`data-pos="${q}"`),
      `Question button for Câu ${q} must exist with data-pos="${q}"`
    );
  }
});

test('Navigator button click smoothly focuses target element and updates answered status upon candidate typing', () => {
  let modalListenerMap = {};
  let focusedElement = null;
  let scrolledElement = null;

  const mockBlank56 = {
    value: '',
    getAttribute: (name) => (name === 'data-position' ? '56' : null),
    scrollIntoView: () => { scrolledElement = mockBlank56; },
    focus: () => { focusedElement = mockBlank56; },
    classList: {
      add: () => {},
      remove: () => {}
    }
  };

  const mockSelect51 = {
    value: '',
    getAttribute: (name) => (name === 'data-position' ? '51' : (name === 'data-slot' ? '1' : null)),
    scrollIntoView: () => { scrolledElement = mockSelect51; },
    focus: () => { focusedElement = mockSelect51; },
    classList: {
      add: () => {},
      remove: () => {}
    }
  };

  const qnavBtn56 = {
    getAttribute: (name) => {
      if (name === 'data-pos') return '56';
      if (name === 'data-blank-pos') return '56';
      if (name === 'data-section-target') return 'sim-block-0';
      return null;
    },
    hasAttribute: (name) => name === 'data-blank-pos',
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      },
      contains(c) { return this._classes.has(c); }
    }
  };

  let qnavClickListener = null;
  qnavBtn56.addEventListener = (evt, cb) => {
    if (evt === 'click') qnavClickListener = cb;
  };

  const mockPreviewBtn = {
    addEventListener: (evt, cb) => { cb(); }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => (sel === '#btn-preview-test' ? mockPreviewBtn : null),
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '04040000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Focus & Answered Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04040000-0000-4000-8000-000000000001',
      title: 'Focus & Answered Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b-01',
          items: [
            {
              itemFamilyId: 'f-01',
              itemVersionId: 'i-01',
              position: 56,
              prompt: 'Đoạn văn điền từ: (56) __________ text',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              maxScore: 1
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'i-01': { graderType: 'accepted_text', accepted: ['sample'] }
      }
    }
  };

  let createdModal = null;
  globalThis.document = {
    querySelector: (sel) => (sel === '#candidate-simulation-modal' ? createdModal : null),
    createElement: (tag) => {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        addEventListener: (evt, cb) => { modalListenerMap[evt] = cb; },
        querySelector: (sel) => {
          if (sel.includes('data-position="56"')) return mockBlank56;
          if (sel === '.progress-ratio') return { textContent: '' };
          if (sel === '.progress-fill') return { style: {} };
          return null;
        },
        querySelectorAll: (sel) => {
          if (sel === '.btn-qnav') return [qnavBtn56];
          if (sel === '.btn-qnav.answered') return qnavBtn56.classList.contains('answered') ? [qnavBtn56] : [];
          return [];
        }
      };
      return el;
    },
    body: {
      appendChild: (node) => { createdModal = node; }
    }
  };

  renderTestBuilderView(container, mockForm);

  // 1. Test clicking question button 56 triggers focus on mockBlank56
  assert.ok(qnavClickListener, 'Click listener must be registered on qnav button');
  qnavClickListener();
  assert.equal(focusedElement, mockBlank56, 'Target blank 56 must be focused');
  assert.equal(scrolledElement, mockBlank56, 'Target blank 56 must be scrolled into view');

  // 2. Test typing in blank 56 toggles .answered class
  assert.equal(qnavBtn56.classList.contains('answered'), false, 'Button starts unanswered');
  mockBlank56.value = 'typed word';
  if (modalListenerMap['input']) {
    modalListenerMap['input']();
  }
  assert.equal(qnavBtn56.classList.contains('answered'), true, 'Button must become answered after typing');

  // Clear value and test removal of answered class
  mockBlank56.value = '';
  if (modalListenerMap['input']) {
    modalListenerMap['input']();
  }
  assert.equal(qnavBtn56.classList.contains('answered'), false, 'Button becomes unanswered when input is cleared');
});

test('Submitting simulation evaluates multi-item span questions, formatting scores as đạt/tối đa and never percentage', () => {
  let submitSimulationHandler = null;
  const mockSubmitBtn = {
    addEventListener: (evt, cb) => {
      if (evt === 'click') submitSimulationHandler = cb;
    }
  };

  const mockBlank56 = {
    value: 'apple',
    getAttribute: (name) => (name === 'data-position' ? '56' : null)
  };

  const mockSeq51 = {
    value: 'A',
    getAttribute: (name) => (name === 'data-position' ? '51' : (name === 'data-slot' ? '1' : null))
  };

  const qnav51 = {
    getAttribute: (name) => {
      if (name === 'data-pos') return '51';
      if (name === 'data-slot-num') return '1';
      if (name === 'data-item-id') return 'i-01';
      return null;
    },
    hasAttribute: (name) => name === 'data-slot-num',
    addEventListener: () => {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    }
  };

  const qnav56 = {
    getAttribute: (name) => {
      if (name === 'data-pos') return '56';
      if (name === 'data-blank-pos') return '56';
      if (name === 'data-item-id') return 'i-02';
      return null;
    },
    hasAttribute: (name) => name === 'data-blank-pos',
    addEventListener: () => {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    }
  };

  const mockResultsModal = { style: { display: 'none' } };
  const mockResultsBody = { innerHTML: '' };

  const mockForm = {
    id: '04040000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Grading Simulation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04040000-0000-4000-8000-000000000002',
      title: 'Grading Simulation Test',
      durationMinutes: 30,
      blocks: [
        {
          blockId: 'b-01',
          items: [
            {
              itemFamilyId: 'f-01',
              itemVersionId: 'i-01',
              position: 51,
              prompt: 'Nghe và sắp xếp:',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              graderType: 'ordered_sequence',
              maxScore: 1,
              events: [{ label: 'A', rank: 1, text: 'First event' }]
            },
            {
              itemFamilyId: 'f-02',
              itemVersionId: 'i-02',
              position: 56,
              prompt: 'Điền từ: (56) __________',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              maxScore: 1,
              clozeAnswers: {
                56: { accepted: ['apple'] }
              }
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'i-01': { graderType: 'ordered_sequence', expectedSequence: ['A'] },
        'i-02': { graderType: 'accepted_text', accepted: ['apple'] }
      }
    }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => (sel === '#btn-preview-test' ? { addEventListener: (e, cb) => cb() } : null),
    querySelectorAll: () => []
  };

  globalThis.document = {
    querySelector: () => null,
    createElement: (tag) => ({
      tagName: tag,
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      addEventListener: () => {},
      querySelector: (sel) => {
        if (sel === '#btn-submit-simulation') return mockSubmitBtn;
        if (sel === '#simulation-results-modal') return mockResultsModal;
        if (sel === '#sim-results-body') return mockResultsBody;
        if (sel.includes('data-position="51"')) return mockSeq51;
        if (sel.includes('data-position="56"')) return mockBlank56;
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === '.btn-qnav') return [qnav51, qnav56];
        return [];
      }
    }),
    body: { appendChild: () => {} }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(submitSimulationHandler, 'Submit simulation button click handler must be registered');
  submitSimulationHandler();

  // Verify navigator buttons received correct status
  assert.equal(qnav51.classList.contains('is-correct'), true, 'Câu 51 should be marked is-correct');
  assert.equal(qnav56.classList.contains('is-correct'), true, 'Câu 56 should be marked is-correct');

  // Verify results breakdown was rendered
  assert.equal(mockResultsModal.style.display, 'flex', 'Results modal must be shown');
  assert.ok(mockResultsBody.innerHTML.includes('2/2đ'), 'Total score must be formatted as 2/2đ');
  assert.ok(!mockResultsBody.innerHTML.includes('%'), 'Score must strictly never contain percentage symbol %');
  assert.ok(mockResultsBody.innerHTML.includes('Câu 51'), 'Breakdown includes Câu 51');
  assert.ok(mockResultsBody.innerHTML.includes('Câu 56'), 'Breakdown includes Câu 56');
});
