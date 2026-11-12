import { readFileSync } from 'node:fs';

export function readDashboardCss() {
  const entry = new URL('../../term-tests/teacher-dashboard/styles.css', import.meta.url);
  const source = readFileSync(entry, 'utf8');
  return source.replace(/@import\s+url\("([^"\n]+)"\);\r?\n?/g, (_, path) =>
    readFileSync(new URL(path, entry), 'utf8'));
}
