(function () {
  'use strict';

  // Course 34 · Phase 1 · Test 2 audio configuration.
  // This file is intentionally separate from config.js, which remains Test 1.
  window.WEBTEST_34_TEST2_AUDIO = Object.freeze({
    soundcheck: {
      remote: 'https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/soundcheck.mp3'
    },
    vocabulary: {
      remote: 'https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/course-34/phase-1/test-2/vocabulary.mp3'
    },
    listening: {
      remote: 'https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/course-34/phase-1/test-2/listening.mp3'
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
