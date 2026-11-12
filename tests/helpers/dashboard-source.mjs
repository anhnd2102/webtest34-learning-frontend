// Legacy source-contract tests follow the real module graph after extraction.
// New tests should exercise public behavior rather than adding source-text assertions.
import { readFileSync } from 'node:fs';

export function readDashboardSource() {
  const visited = new Set();
  const chunks = [];
  function read(url) {
    url.search = '';
    if (visited.has(url.href)) return;
    visited.add(url.href);
    const source = readFileSync(url, 'utf8');
    chunks.push(source);
    for (const match of source.matchAll(/\b(?:from\s*|import\s*)['"]([.][^'"]+\.m?js)['"]/g)) {
      read(new URL(match[1], url));
    }
  }
  read(new URL('../../term-tests/teacher-dashboard/app.js', import.meta.url));
  read(new URL('../../term-tests/teacher-dashboard/shell/dashboard.js', import.meta.url));
  return chunks.join('\n');
}
