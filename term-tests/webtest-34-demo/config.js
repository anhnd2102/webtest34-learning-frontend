(function () {
  'use strict';

  // Cấu hình cho index.html (Khóa 34 · Phase 1 · Test 1).
  // Tách riêng khỏi HTML để dễ đổi endpoint/audio khi chuyển môi trường.
  // Local dùng backend riêng; token chỉ nhận từ URL fragment.

  const productionApi = 'https://webtest.ducanhn.autos';
  const localApi = 'http://127.0.0.1:8788';
  const page = window.location || {};
  const query = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(page.search || '') : { get: () => null };
  const forceProd = query.get('prod') === '1' || query.get('apiEnv') === 'production';
  const isLocal = !forceProd && (['localhost', '127.0.0.1', '[::1]', '::1'].includes(page.hostname)
    || page.protocol === 'file:');
  const apiBase = isLocal ? localApi : productionApi;

  window.WEBTEST_34_PREVIEW_CONFIG = Object.freeze({
    // Learning API độc lập dùng chung cho các khóa 03, 34 và 45.
    // Roster được đồng bộ qua boundary riêng, không cần Google token.
    API_BASE_URL: apiBase,
    LEARNING_API_BASE_URL: apiBase,
    LEARNING_TEST_TOKEN: '',
    TEST_SLUG: 'webtest-34',
    // Khi mở local, chỉ dùng token của môi trường thử trong fragment.
    // Không dùng roster/assignment fixture local và không tự fallback sang dữ liệu mẫu.
    ENABLE_DEMO_ROSTER_FALLBACK: false,

    // Audio của Khóa 34 · Phase 1 · Test 1.
    AUDIO: {
      // Bản nghe thử để học viên kiểm tra loa/âm lượng TRƯỚC khi bắt đầu phần nghe.
      soundcheck: {
        remote: 'https://pub-7406d9d7254a4ef7b5d1ad82edb9964b.r2.dev/Audiotest_webtest/soundcheck.mp3'
      },
      // Audio chính thức — mỗi phần phát ĐÚNG MỘT LẦN, không dừng/tua được.
      vocabulary: {
        remote: 'https://pub-7406d9d7254a4ef7b5d1ad82edb9964b.r2.dev/Audiotest_webtest/Test1_Vocab.mp3'
      },
      listening: {
        remote: 'https://pub-7406d9d7254a4ef7b5d1ad82edb9964b.r2.dev/Audiotest_webtest/Test1_Listening.mp3'
      }
    }
  });
}());
