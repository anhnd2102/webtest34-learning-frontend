// Cuộn bằng JS: không trượt mượt khi người dùng bật giảm chuyển động.
// NGUỒN: file .ts này; motion.js do `npm run build` sinh ra (xem text-utils.ts). dynamic-exam-renderer.mjs re-export hàm này.
// 'instant' chứ không phải 'auto', vì 'auto' theo CSS scroll-behavior của trang.
export const scrollBehavior = (): 'instant' | 'smooth' =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
