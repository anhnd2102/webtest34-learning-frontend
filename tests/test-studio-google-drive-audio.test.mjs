import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertGoogleDriveAudioUrl,
  renderStrictCandidateAudioDock
} from '../term-tests/teacher-dashboard/app.js';

test('convertGoogleDriveAudioUrl converts various Google Drive link formats to direct streaming audio URLs', () => {
  // Format 1: /file/d/{id}/view?usp=sharing
  const url1 = 'https://drive.google.com/file/d/1B2C3D4E5F6G7H8I9J0K_audio/view?usp=sharing';
  assert.equal(
    convertGoogleDriveAudioUrl(url1),
    'https://docs.google.com/uc?export=download&id=1B2C3D4E5F6G7H8I9J0K_audio'
  );

  // Format 2: /open?id={id}
  const url2 = 'https://drive.google.com/open?id=1B2C3D4E5F6G7H8I9J0K_audio';
  assert.equal(
    convertGoogleDriveAudioUrl(url2),
    'https://docs.google.com/uc?export=download&id=1B2C3D4E5F6G7H8I9J0K_audio'
  );

  // Format 3: /uc?id={id}&export=download
  const url3 = 'https://drive.google.com/uc?id=1B2C3D4E5F6G7H8I9J0K_audio&export=download';
  assert.equal(
    convertGoogleDriveAudioUrl(url3),
    'https://docs.google.com/uc?export=download&id=1B2C3D4E5F6G7H8I9J0K_audio'
  );

  // Format 4: With resourcekey parameter
  const url4 = 'https://drive.google.com/file/d/1B2C3D4E5F6G_audio/view?resourcekey=0-resKeyAudio123&usp=sharing';
  assert.equal(
    convertGoogleDriveAudioUrl(url4),
    'https://docs.google.com/uc?export=download&id=1B2C3D4E5F6G_audio&resourcekey=0-resKeyAudio123'
  );

  // Non-drive regular HTTPS URL is returned as-is (trimmed)
  const regularHttps = '  https://assets.izone.edu.vn/audio/34-test-1-listening.mp3  ';
  assert.equal(convertGoogleDriveAudioUrl(regularHttps), 'https://assets.izone.edu.vn/audio/34-test-1-listening.mp3');

  // Relative asset path is returned as-is
  const localAsset = 'assets/34/test-1/listening.mp3';
  assert.equal(convertGoogleDriveAudioUrl(localAsset), 'assets/34/test-1/listening.mp3');

  // Empty / null inputs return empty string
  assert.equal(convertGoogleDriveAudioUrl(''), '');
  assert.equal(convertGoogleDriveAudioUrl(null), '');
  assert.equal(convertGoogleDriveAudioUrl(undefined), '');
});

test('renderStrictCandidateAudioDock creates strict candidate listening player with NO pause, NO timeline seeking, and volume control', () => {
  // Simple DOM simulation
  const listeners = new Map();
  const attributes = new Map();
  const classes = new Set();
  
  const mockContainer = {
    innerHTML: '',
    querySelector(selector) {
      if (selector === '.btn-start-listening') {
        return {
          addEventListener(evt, fn) { listeners.set(`btn_${evt}`, fn); },
          disabled: false,
          style: {}
        };
      }
      if (selector === '.candidate-audio-volume') {
        return {
          value: '1',
          addEventListener(evt, fn) { listeners.set(`vol_${evt}`, fn); }
        };
      }
      if (selector === '.audio-hidden-element') {
        return {
          currentTime: 0,
          duration: 120,
          paused: true,
          volume: 1,
          play: async () => {},
          pause: () => {},
          addEventListener(evt, fn) { listeners.set(`audio_${evt}`, fn); }
        };
      }
      return null;
    }
  };

  const dockHtml = renderStrictCandidateAudioDock(mockContainer, {
    audioUrl: 'https://drive.google.com/file/d/12345/view?usp=sharing',
    autoPlay: false
  });

  // Verify container receives strict listening dock markup
  assert.ok(mockContainer.innerHTML.includes('strict-audio-dock'), 'Expected strict-audio-dock container');
  assert.ok(mockContainer.innerHTML.includes('audio-volume-control'), 'Expected volume control slider');
  assert.ok(mockContainer.innerHTML.includes('btn-start-listening'), 'Expected start listening button');

  // Strictly verify: NO <audio controls>, NO pause button, NO seek scrubber
  assert.equal(mockContainer.innerHTML.includes('<audio controls'), false, 'Candidate dock must NEVER render default audio controls');
  assert.equal(mockContainer.innerHTML.includes('btn-pause-listening'), false, 'Candidate dock must NOT have a pause button');
  assert.equal(mockContainer.innerHTML.includes('input-audio-scrubber'), false, 'Candidate dock must NOT have a seek/scrubber input');
  assert.equal(mockContainer.innerHTML.includes('timeline-slider'), false, 'Candidate dock must NOT have a timeline slider');

  // Check URL is normalized inside the hidden audio tag
  assert.ok(
    mockContainer.innerHTML.includes('id=12345') &&
    (mockContainer.innerHTML.includes('docs.google.com/uc') || mockContainer.innerHTML.includes('/api/teacher/media/drive-stream')),
    'Expected normalized direct streaming or proxy Google Drive audio URL'
  );
});
