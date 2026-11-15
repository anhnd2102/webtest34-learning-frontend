// NGUỒN: file .ts này; main.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { mountDashboard } from './shell/dashboard.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountDashboard(document), { once: true });
} else {
  mountDashboard(document);
}
