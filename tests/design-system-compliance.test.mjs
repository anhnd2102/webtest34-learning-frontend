import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '../..');
const FRONTEND_DIR = resolve(__dirname, '..');
// shortcut: DESIGN_SYSTEM.md/GEMINI.md nằm ở monorepo root ngoài repo này; checkout đơn lẻ và CI không có nên skip — bỏ skip khi các file được đưa vào repo.
const monorepoSkip = !existsSync(resolve(ROOT_DIR, 'DESIGN_SYSTEM.md')) && 'cần DESIGN_SYSTEM.md ở monorepo root';

test('DESIGN_SYSTEM.md exists at monorepo root and defines complete specification', { skip: monorepoSkip }, () => {
  const designSystemPath = resolve(ROOT_DIR, 'DESIGN_SYSTEM.md');
  assert.ok(existsSync(designSystemPath), 'DESIGN_SYSTEM.md must exist at monorepo root');

  const content = readFileSync(designSystemPath, 'utf8');
  assert.ok(content.includes('## 1. Nguyên tắc thiết kế cốt lõi'), 'Must define core principles');
  assert.ok(content.includes('## 2. Bảng màu thương hiệu'), 'Must define brand color system');
  assert.ok(content.includes('## 3. Quy cách Icons tối giản & Đơn điệu'), 'Must define monochromatic iconography');
  assert.ok(content.includes('## 4. Typography & Kiểu chữ'), 'Must define typography specs');
  assert.ok(content.includes('## 5. Quy cách Hình học: Bo góc & Đổ bóng ("Bớt AI")'), 'Must define geometric & non-AI radius specs');
  assert.ok(content.includes('## 6. Thang khoảng cách & Lưới giao diện (8-point Grid)'), 'Must define 8-point grid');
  assert.ok(content.includes('## 7. Ràng buộc Nghiệp vụ Sư phạm Bất biến'), 'Must define pedagogical invariants');
  assert.ok(content.includes('## 8. Quy trình nghiệm thu & Tiêu chí Check'), 'Must define checklist');
});

test('Renderer code does not contain banned colorful emojis in UI output', () => {
  const examRendererPath = resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  const previewRendererPath = resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/content-preview.mjs');

  const examRenderer = readFileSync(examRendererPath, 'utf8');
  const previewRenderer = readFileSync(previewRendererPath, 'utf8');

  const bannedEmojis = ['📊', '🧭', '✨', '💡', '⏱', '🚀', '💾', '🔊', '▶️', '✏️', '🔒', '⚠️'];

  for (const emoji of bannedEmojis) {
    assert.ok(
      !examRenderer.includes(emoji),
      `dynamic-exam-renderer.mjs must not contain banned emoji: ${emoji}`
    );
    assert.ok(
      !previewRenderer.includes(emoji),
      `content-preview.mjs must not contain banned emoji: ${emoji}`
    );
  }
});

test('dynamic-test.css defines required brand color tokens and complies with "Bớt AI" radius', () => {
  const cssPath = resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-test.css');
  const cssContent = readFileSync(cssPath, 'utf8');

  // Verify color tokens
  assert.ok(cssContent.includes('--izone-primary: #e11d48'), 'Must define --izone-primary');
  assert.ok(cssContent.includes('--izone-navy: #0f172a'), 'Must define --izone-navy');
  assert.ok(cssContent.includes('--izone-bg: #f8fafc'), 'Must define --izone-bg');
  assert.ok(cssContent.includes('--izone-card-bg: #ffffff'), 'Must define --izone-card-bg');
  assert.ok(cssContent.includes('--izone-border: #e2e8f0'), 'Must define --izone-border');

  // Verify non-AI card radius: must not use 18px on main cards
  assert.ok(!cssContent.includes('border-radius: 18px;'), 'Must not contain 18px border-radius in dynamic-test.css');
  assert.ok(cssContent.includes('border-radius: 12px;'), 'Must use academic 12px card border-radius');
});

test('AGENTS.md and GEMINI.md mandate compliance with DESIGN_SYSTEM.md', { skip: monorepoSkip }, () => {
  const agentsPath = resolve(ROOT_DIR, 'AGENTS.md');
  const geminiPath = resolve(ROOT_DIR, 'GEMINI.md');

  const agentsContent = readFileSync(agentsPath, 'utf8');
  const geminiContent = readFileSync(geminiPath, 'utf8');

  for (const [name, content] of [['AGENTS.md', agentsContent], ['GEMINI.md', geminiContent]]) {
    assert.ok(
      content.includes('DESIGN_SYSTEM.md'),
      `${name} must reference DESIGN_SYSTEM.md`
    );
    assert.ok(
      content.includes('Quy chuẩn Thiết kế Giao diện Bắt buộc'),
      `${name} must include Section 5 for Design System invariants`
    );
    assert.ok(
      content.includes('Monochromatic Icons') || content.includes('Tối giản & Đơn điệu'),
      `${name} must mandate monochromatic minimalist icons`
    );
    assert.ok(
      content.includes('Bớt AI'),
      `${name} must enforce non-AI academic structure`
    );
  }
});
