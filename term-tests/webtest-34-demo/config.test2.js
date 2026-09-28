(function () {
  'use strict';

  // Course 34 · Phase 1 · Test 2 audio configuration.
  // This file is intentionally separate from config.js, which remains Test 1.
  window.WEBTEST_34_TEST2_AUDIO = Object.freeze({
    soundcheck: {
      remote: 'https://pub-7406d9d7254a4ef7b5d1ad82edb9964b.r2.dev/Audiotest_webtest/soundcheck.mp3'
    },
    vocabulary: {
      remote: 'https://pub-7406d9d7254a4ef7b5d1ad82edb9964b.r2.dev/Audiotest_webtest/Test%202_Vocab.mp3'
    },
    listening: {
      remote: 'https://pub-7406d9d7254a4ef7b5d1ad82edb9964b.r2.dev/Audiotest_webtest/Test%202_Listening.mp3'
    }
  });
  if (new URLSearchParams(window.location.search).get('test') === '2') {
    const base = window.WEBTEST_34_PREVIEW_CONFIG || {};
    window.WEBTEST_34_PREVIEW_CONFIG = Object.freeze({
      ...base,
      AUDIO: window.WEBTEST_34_TEST2_AUDIO
    });
  }
}());
