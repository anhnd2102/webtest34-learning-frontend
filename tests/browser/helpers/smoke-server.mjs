// Dùng chung cho smoke học viên: chạy với static server cục bộ (mặc định) hoặc trỏ vào site đã deploy.
//   SMOKE_ORIGIN=https://anhnd2102.github.io/webtest34-learning-frontend node tests/browser/candidate-flow-smoke.mjs
// Khi có SMOKE_ORIGIN không dựng server cục bộ; API vẫn là API giả (route của Playwright), chỉ file tĩnh lấy từ site thật.
export const liveOrigin = process.env.SMOKE_ORIGIN ? process.env.SMOKE_ORIGIN.replace(/\/+$/, '') : null;

export const smokeOrigin = port => liveOrigin || `http://127.0.0.1:${port}`;

// Đối số cho `spawn(process.execPath, ...)`: server thật, hoặc tiến trình giả in dòng "sẵn sàng" để mã chờ hiện có chạy tiếp.
export const smokeServerArgs = port => liveOrigin
  ? ['-e', `console.log(':${port}/'); setInterval(() => {}, 1e6)`]
  : ['serve.mjs', String(port), '127.0.0.1'];
