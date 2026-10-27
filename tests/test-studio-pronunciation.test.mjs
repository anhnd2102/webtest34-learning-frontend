import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIpaTranscription,
  COMMON_IPA_SYMBOLS,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('formatIpaTranscription standardizes phonetic transcription with slashes and stress marks', () => {
  assert.equal(formatIpaTranscription('kæm.ər.ə'), '/kæm.ər.ə/');
  assert.equal(formatIpaTranscription('/ˈkæm.ər.ə/'), '/ˈkæm.ər.ə/');
  assert.equal(formatIpaTranscription('  ˌdʒen.ərˈeɪ.ʃən  '), '/ˌdʒen.ərˈeɪ.ʃən/');
  assert.equal(formatIpaTranscription(''), '');
  assert.equal(formatIpaTranscription(null), '');
});

test('COMMON_IPA_SYMBOLS contains essential phonetic symbols and stress marks', () => {
  assert.ok(Array.isArray(COMMON_IPA_SYMBOLS), 'COMMON_IPA_SYMBOLS is an array');
  const requiredSymbols = ['æ', 'θ', 'ð', 'ʃ', 'ʒ', 'tʃ', 'dʒ', 'ŋ', 'ʌ', 'ɔː', 'ə', 'ɜː', 'ˈ', 'ˌ'];
  for (const sym of requiredSymbols) {
    assert.ok(COMMON_IPA_SYMBOLS.includes(sym), `Includes IPA symbol ${sym}`);
  }
});

test('renderTestBuilderView provides button to add pronunciation template and renders editor controls with IPA keyboard', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '14010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Pronunciation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '14010000-0000-4000-8000-000000000001',
      title: 'Pronunciation Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1401',
          checkpoint: 2,
          title: 'Pronunciation · Part 2',
          instructions: 'Choose the correct pronunciation or stress pattern for the given word.',
          items: [
            {
              itemFamilyId: 'f1401',
              itemVersionId: 'i1401',
              position: 1,
              prompt: 'Choose the correct pronunciation for "camera":',
              helpText: '',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'pronunciation_choice',
              layoutType: 'ipa_card',
              graderType: 'exact_option',
              maxScore: 0.5,
              targetWord: 'camera',
              ipaTranscription: '/ˈkæm.ər.ə/',
              audioUrl: 'https://assets.izone.edu.vn/audio/camera.mp3',
              options: [
                { id: 'A', label: '/ˈkæm.ər.ə/' },
                { id: 'B', label: '/kəˈmɪər.ə/' },
                { id: 'C', label: '/ˈkæm.eɪ.rə/' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1401: {
          graderType: 'exact_option',
          expectedOptionId: 'A',
          ipaTranscription: '/ˈkæm.ər.ə/',
          targetWord: 'camera'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-pronunciation-choice'), 'Provides button to add pronunciation template');
  assert.ok(container.innerHTML.includes('template-pronunciation-ipa'), 'Renders template-pronunciation-ipa section');
  assert.ok(container.innerHTML.includes('input-ipa-transcription'), 'Renders IPA phonetic transcription input');
  assert.ok(container.innerHTML.includes('ipa-symbol-keyboard'), 'Renders virtual IPA symbol keyboard');
  assert.ok(container.innerHTML.includes('btn-ipa-symbol'), 'Renders 1-click symbol buttons');
  assert.ok(container.innerHTML.includes('ipa-phonetic-badge'), 'Renders high-legibility monospace phonetic preview badge');
  assert.ok(container.innerHTML.includes('input-pronunciation-word'), 'Renders target word input');
  assert.ok(container.innerHTML.includes('input-pronunciation-audio'), 'Renders audio pronunciation URL input');
});

test('Candidate Simulation Modal renders IPA phonetic card, audio trigger, and discrimination choices', () => {
  const domContainer = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            domContainer._previewHandler = handler;
          }
        };
      }
      return null;
    },
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '14010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Simulation Pronunciation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '14010000-0000-4000-8000-000000000002',
      title: 'Simulation Pronunciation Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1402',
          checkpoint: 2,
          title: 'Pronunciation Section',
          items: [
            {
              itemFamilyId: 'f1402',
              itemVersionId: 'i1402',
              position: 1,
              prompt: 'Choose the correct pronunciation for "generous":',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'pronunciation_choice',
              layoutType: 'ipa_card',
              graderType: 'exact_option',
              maxScore: 0.5,
              targetWord: 'generous',
              ipaTranscription: '/ˈdʒen.ər.əs/',
              audioUrl: 'https://assets.izone.edu.vn/audio/generous.mp3',
              options: [
                { id: 'A', label: '/ˈdʒen.ər.əs/' },
                { id: 'B', label: '/dʒəˈner.əs/' },
                { id: 'C', label: '/ˈdʒɪn.ər.əs/' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1402: {
          graderType: 'exact_option',
          expectedOptionId: 'A',
          ipaTranscription: '/ˈdʒen.ər.əs/'
        }
      }
    }
  };

  let createdModal = null;
  globalThis.document = {
    querySelector: (sel) => (sel === '#candidate-simulation-modal' ? createdModal : null),
    createElement: (tag) => ({
      tagName: tag,
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      querySelector: () => null,
      querySelectorAll: () => []
    }),
    body: {
      appendChild: (node) => {
        createdModal = node;
      }
    }
  };

  renderTestBuilderView(domContainer, mockForm);
  domContainer._previewHandler();

  assert.ok(createdModal, 'Candidate simulation modal created');
  assert.ok(createdModal.innerHTML.includes('candidate-pronunciation-wrap'), 'Renders candidate-pronunciation-wrap');
  assert.ok(createdModal.innerHTML.includes('candidate-ipa-badge'), 'Renders candidate IPA phonetic badge');
  assert.ok(createdModal.innerHTML.includes('/ˈdʒen.ər.əs/'), 'Displays formatted IPA transcription');
  assert.ok(createdModal.innerHTML.includes('candidate-ipa-audio-btn'), 'Renders audio trigger button');
  assert.ok(createdModal.innerHTML.includes('Phát âm'), 'Renders question type badge for pronunciation');
});
