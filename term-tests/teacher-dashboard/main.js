import { mountDashboard } from './shell/dashboard.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountDashboard(document), { once: true });
} else {
  mountDashboard(document);
}
