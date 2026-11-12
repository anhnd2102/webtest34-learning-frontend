// Đo thực nghiệm (Tier B) vai trò của từng khai báo !important trong các fragment của Teacher Dashboard.
//
// Dùng trong các fixture trình duyệt: tạo một audit, gọi `await audit.observe(page, 'tên trạng thái')` ở mỗi trạng thái
// cần phủ, rồi `audit.write(file)` khi xong. Biến môi trường IMPORTANT_AUDIT_OUT bật audit (đường dẫn file kết quả).
//
// Với mỗi khai báo !important (khóa như css-declarations.mjs) và mỗi trạng thái:
//   1. tìm các phần tử khớp selector của rule (rule có :hover/:focus/pseudo-element hoặc @media không áp dụng ở viewport
//      hiện tại được ghi là "unobserved" cho trạng thái đó);
//   2. đọc computed value của mọi longhand mà khai báo đặt;
//   3. tạm bỏ priority (rule.style.setProperty(property, value, '')), đọc lại, rồi khôi phục bằng cssText đã lưu;
//   4. đếm: matched (số phần tử khớp), changed (số phần tử đổi giá trị), inline (phần tử khớp có inline style cùng
//      longhand), hidden (phần tử khớp có thuộc tính hidden, dùng cho display).
import { writeFileSync } from 'node:fs';
import { scanDeclarations } from '../../../scripts/css-declarations.mjs';

// Thuộc tính mà fixture tự ghi đè bằng "*{animation:none!important;...}" nên không đo được bằng audit.
const FIXTURE_OVERRIDDEN = /^(animation|transition|caret-color|scroll-behavior)/;

export function importantAuditEnabled() {
  return Boolean(process.env.IMPORTANT_AUDIT_OUT);
}

export function createImportantAudit() {
  const declarations = scanDeclarations().filter(declaration => declaration.important);
  const payload = declarations.map(({ key, order, property, value }) => ({ key, order, property, value }));
  const totals = new Map(declarations.map(declaration => [declaration.key, { key: declaration.key, matched: 0, changed: 0, inline: 0, hidden: 0, statesChanged: [], statesMatched: 0, skipped: {} }]));
  return {
    async observe(page, label) {
      const viewport = page.viewportSize();
      const stateLabel = `${viewport ? viewport.width : '?'}:${label}`;
      const results = await page.evaluate(entries => {
        const rules = [];
        const visit = list => {
          for (const rule of list) {
            if (rule.styleSheet) visit(rule.styleSheet.cssRules);
            else if (rule.selectorText) rules.push(rule);
            else if (rule.constructor.name === 'CSSMediaRule') visit(rule.cssRules);
          }
        };
        for (const sheet of document.styleSheets) if (sheet.href && new URL(sheet.href).pathname.endsWith('/styles.css')) visit(sheet.cssRules);
        const probe = document.createElement('div');
        const longhandsOf = (property, value) => {
          probe.style.cssText = '';
          probe.style.setProperty(property, value);
          return [...probe.style];
        };
        const read = (elements, longhands) => elements.map(element => { const computed = getComputedStyle(element); return longhands.map(name => computed.getPropertyValue(name)).join('|'); });
        const out = {};
        for (const entry of entries) {
          const rule = rules[entry.order];
          if (!rule) { out[entry.key] = { skipped: 'no-rule' }; continue; }
          const media = rule.parentRule && rule.parentRule.conditionText;
          if (media && !window.matchMedia(media).matches) { out[entry.key] = { skipped: 'media-inactive' }; continue; }
          const selector = rule.selectorText;
          if (/::|:(hover|focus|active|checked|disabled|focus-visible|focus-within|visited|target|placeholder-shown|indeterminate|invalid|valid|read-only|enabled|selection)/.test(selector)) { out[entry.key] = { skipped: 'state-selector' }; continue; }
          let elements;
          try { elements = [...document.querySelectorAll(selector)]; } catch (error) { out[entry.key] = { skipped: 'selector-error' }; continue; }
          if (!elements.length) { out[entry.key] = { matched: 0 }; continue; }
          const longhands = longhandsOf(entry.property, entry.value);
          if (!longhands.length) { out[entry.key] = { skipped: 'unexpandable' }; continue; }
          const before = read(elements, longhands);
          const inline = elements.filter(element => longhands.some(name => element.style && element.style.getPropertyValue(name))).length;
          const hidden = entry.property === 'display' ? elements.filter(element => element.hasAttribute('hidden')).length : 0;
          const saved = rule.style.cssText;
          rule.style.setProperty(entry.property, entry.value, '');
          const after = read(elements, longhands);
          rule.style.cssText = saved;
          let changed = 0;
          for (let index = 0; index < before.length; index++) if (before[index] !== after[index]) changed++;
          out[entry.key] = { matched: elements.length, changed, inline, hidden };
        }
        return out;
      }, payload);
      for (const [key, result] of Object.entries(results)) {
        const total = totals.get(key);
        if (!total) continue;
        if (result.skipped) { total.skipped[result.skipped] = (total.skipped[result.skipped] || 0) + 1; continue; }
        if (FIXTURE_OVERRIDDEN.test(declarations.find(item => item.key === key).property)) { total.skipped['fixture-overridden'] = (total.skipped['fixture-overridden'] || 0) + 1; continue; }
        if (result.matched) { total.matched += result.matched; total.statesMatched++; }
        total.inline += result.inline || 0;
        total.hidden += result.hidden || 0;
        if (result.changed) { total.changed += result.changed; if (total.statesChanged.length < 4) total.statesChanged.push(stateLabel); }
      }
    },
    entries() { return [...totals.values()]; },
    write(file) { writeFileSync(file, JSON.stringify(this.entries(), null, 2) + '\n'); }
  };
}
