import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderDynamicExam,
  initDynamicExamInteractions
} from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';

function findFile(rel) {
  const p1 = resolve(rel);
  if (existsSync(p1)) return p1;
  const p2 = resolve('webtest34-learning-frontend', rel);
  if (existsSync(p2)) return p2;
  const p3 = resolve(import.meta.dirname, '..', rel);
  if (existsSync(p3)) return p3;
  return p1;
}

test('Audio Gate Spec Check: renderer code contract defines data-has-audio and data-audio-unlocked', () => {
  const file = findFile('term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  const code = readFileSync(file, 'utf8');

  assert.ok(
    code.includes('data-has-audio='),
    'dynamic-exam-renderer.mjs must set data-has-audio attribute on simulation-section-card'
  );
  assert.ok(
    code.includes('data-audio-unlocked='),
    'dynamic-exam-renderer.mjs must set data-audio-unlocked attribute on simulation-section-card'
  );
  assert.ok(
    code.includes('cbt-audio-gate-placeholder') || code.includes('audio-gate-placeholder'),
    'dynamic-exam-renderer.mjs must render an academic audio gate placeholder card for audio sections'
  );
});

test('Audio Gate CSS: rules enforce concealing questions before audio unlock', () => {
  const cssFile = findFile('term-tests/webtest-34-demo/dynamic-test.css');
  const css = readFileSync(cssFile, 'utf8');

  assert.ok(
    css.includes('data-has-audio="true"') && css.includes('data-audio-unlocked="true"'),
    'dynamic-test.css must contain CSS rules targeting data-has-audio and data-audio-unlocked'
  );
  assert.ok(
    css.includes('.cbt-audio-gate-placeholder') || css.includes('.audio-gate-placeholder'),
    'dynamic-test.css must style the audio gate placeholder banner'
  );
});

test('Audio Gate Logic: renderDynamicExam marks section as locked when audio exists and not yet played', () => {
  const mockContainer = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const definition = {
    blocks: [
      {
        blockId: 'b-listen',
        title: 'LISTENING',
        audioUrl: 'https://cdn.example.com/audio1.mp3',
        items: [
          { itemVersionId: 'q1', position: 1, prompt: 'Listen and fill in the blank (1) _____', interactionType: 'short_text', layoutType: 'inline_cloze' }
        ]
      },
      {
        blockId: 'b-grammar',
        title: 'GRAMMAR',
        audioUrl: null,
        items: [
          { itemVersionId: 'q2', position: 2, prompt: 'Select correct tense', interactionType: 'single_choice' }
        ]
      }
    ]
  };

  const state = { answers: {}, unlockedAudioBlocks: new Set() };
  renderDynamicExam(definition, mockContainer, { state, activeSection: 'LISTENING' });

  // Verify listening section markup
  assert.ok(
    mockContainer.innerHTML.includes('data-has-audio="true"'),
    'Listening block must have data-has-audio="true"'
  );
  assert.ok(
    mockContainer.innerHTML.includes('data-audio-unlocked="false"'),
    'Listening block must be locked initially with data-audio-unlocked="false"'
  );
  assert.ok(
    mockContainer.innerHTML.includes('cbt-audio-gate-placeholder') || mockContainer.innerHTML.includes('audio-gate-placeholder'),
    'Listening block must contain audio gate placeholder banner'
  );

  // Verify grammar section markup
  assert.ok(
    mockContainer.innerHTML.includes('data-has-audio="false"'),
    'Grammar block without audio must have data-has-audio="false"'
  );
});

test('Audio Gate Logic: section remains unlocked across re-renders if unlockedAudioBlocks includes blockId', () => {
  const mockContainer = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const definition = {
    blocks: [
      {
        blockId: 'b-listen',
        title: 'LISTENING',
        audioUrl: 'https://cdn.example.com/audio1.mp3',
        items: [
          { itemVersionId: 'q1', position: 1, prompt: 'Listen and fill (1) _____', interactionType: 'short_text' }
        ]
      }
    ]
  };

  // State with b-listen already unlocked
  const state = { answers: {}, unlockedAudioBlocks: new Set(['b-listen']) };
  renderDynamicExam(definition, mockContainer, { state, activeSection: 'LISTENING' });

  assert.ok(
    mockContainer.innerHTML.includes('data-audio-unlocked="true"'),
    'Section must be rendered as unlocked when blockId is in state.unlockedAudioBlocks'
  );
});

test('Audio Gate Interaction: audio playback event sets data-audio-unlocked to true and records to state', () => {
  const eventListeners = {};
  const attributes = {
    'data-has-audio': 'true',
    'data-audio-unlocked': 'false',
    'data-block-id': 'b-listen-01'
  };

  const mockAudioEl = {
    paused: true,
    currentTime: 0,
    duration: 120,
    muted: false,
    addEventListener(evt, fn) {
      eventListeners[evt] = eventListeners[evt] || [];
      eventListeners[evt].push(fn);
    },
    dispatchEvent(evtName) {
      (eventListeners[evtName] || []).forEach(fn => fn());
    }
  };

  const mockSectionCard = {
    getAttribute(name) {
      return attributes[name] || null;
    },
    setAttribute(name, val) {
      attributes[name] = String(val);
    }
  };

  const mockPlayBtn = {
    style: {},
    disabled: false,
    addEventListener() {},
    set innerHTML(v) {}
  };

  const mockDock = {
    getAttribute(name) {
      return name === 'data-max-listens' ? '1' : null;
    },
    setAttribute() {},
    querySelector(sel) {
      if (sel === '.audio-hidden-element') return mockAudioEl;
      if (sel === '.btn-sim-audio-play') return mockPlayBtn;
      return null;
    },
    closest(sel) {
      if (sel === '.simulation-section-card') return mockSectionCard;
      return null;
    }
  };

  const state = { answers: {}, unlockedAudioBlocks: new Set() };

  // Khởi tạo tương tác mô phỏng qua mock root
  const mockRoot = {
    querySelectorAll(sel) {
      if (sel === '.strict-audio-dock') return [mockDock];
      return [];
    },
    querySelector() { return null; },
    addEventListener() {}
  };

  initDynamicExamInteractions(mockRoot, { definition: { blocks: [] }, state });

  // Ban đầu là khóa
  assert.equal(mockSectionCard.getAttribute('data-audio-unlocked'), 'false');
  assert.ok(!state.unlockedAudioBlocks.has('b-listen-01'));

  // Kích hoạt sự kiện playing khi audio bắt đầu chạy
  mockAudioEl.dispatchEvent('playing');

  // Đã mở khóa và lưu vào state
  assert.equal(mockSectionCard.getAttribute('data-audio-unlocked'), 'true');
  assert.ok(state.unlockedAudioBlocks.has('b-listen-01'));

  // Tạm dừng audio không làm khóa lại
  mockAudioEl.dispatchEvent('pause');
  assert.equal(mockSectionCard.getAttribute('data-audio-unlocked'), 'true');

  // Kết thúc audio không làm khóa lại
  mockAudioEl.dispatchEvent('ended');
  assert.equal(mockSectionCard.getAttribute('data-audio-unlocked'), 'true');
});
