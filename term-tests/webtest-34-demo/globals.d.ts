// Biến toàn cục do exam-guard.js gắn vào globalThis (nạp bằng thẻ <script> trước content-preview.mjs).
export {};

declare global {
  // eslint-disable-next-line no-var
  var selfProctoringNotice: (selfProctoring: { exitLimit: number, exitCount?: number, autoSubmitted?: boolean }) => { level: 'info' | 'danger' | 'submitted', text: string };
}
