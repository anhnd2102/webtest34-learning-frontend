// Tìm khai báo "chết" do bị khai báo trùng thắng ở rule khác có cùng selector (phân tích tĩnh, chắc chắn).
//
//   node scripts/css-duplicates.mjs report [--out <report.json>] [--edits <edits.json>]
//
// Một khai báo là chết khi tồn tại khai báo khác với:
//   - cùng chuỗi selector (đã chuẩn hóa) và cùng chuỗi @media;
//   - cùng tên thuộc tính;
//   - thuộc rule khác (khai báo lặp trong cùng một rule thường là fallback nên bị bỏ qua);
//   - thắng: !important thắng không-!important; cùng mức thì rule đứng sau (thứ tự rule-map) thắng;
//   - giá trị của khai báo thắng hợp lệ trong CSSOM (nếu không, khai báo trước vẫn còn hiệu lực).
// Khai báo thua đi vào edits.json với action "delete" (css-declarations.mjs apply).
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { scanDeclarations } from './css-declarations.mjs';

async function validValues(declarations) {
  const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const pairs = [...new Set(declarations.map(item => JSON.stringify([item.property, item.value])))].map(item => JSON.parse(item));
    const valid = await page.evaluate(entries => {
      const probe = document.createElement('div');
      return entries.map(([property, value]) => { probe.style.cssText = ''; probe.style.setProperty(property, value); return probe.style.length > 0; });
    }, pairs);
    return new Set(pairs.filter((_, index) => valid[index]).map(pair => JSON.stringify(pair)));
  } finally { await browser.close(); }
}

export async function findDeadDuplicates() {
  const declarations = scanDeclarations();
  const valid = await validValues(declarations);
  const isValid = declaration => valid.has(JSON.stringify([declaration.property, declaration.value]));
  const groups = new Map();
  for (const declaration of declarations) {
    const id = `${declaration.selector}@@${declaration.conditions.join('&&')}@@${declaration.property}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(declaration);
  }
  const dead = [];
  for (const members of groups.values()) {
    const rules = new Set(members.map(item => item.order));
    if (rules.size < 2) continue;
    // Chọn người thắng: ưu tiên !important, rồi rule đứng sau; chỉ xét khai báo hợp lệ.
    const candidates = members.filter(isValid);
    if (!candidates.length) continue;
    const winner = candidates.reduce((best, item) => {
      if (item.important !== best.important) return item.important ? item : best;
      return item.order > best.order || (item.order === best.order && item.line > best.line) ? item : best;
    });
    for (const member of members) {
      if (member.order === winner.order) continue; // cùng rule với người thắng: giữ (fallback)
      dead.push({ key: member.key, source: member.source, line: member.line, selector: member.selector, conditions: member.conditions, property: member.property, value: member.value, important: member.important, winner: { key: winner.key, line: winner.line, value: winner.value, important: winner.important, source: winner.source } });
    }
  }
  return { totalDeclarations: declarations.length, groupsWithDuplicates: [...groups.values()].filter(members => new Set(members.map(item => item.order)).size > 1).length, dead };
}

async function main([command, ...args]) {
  if (command !== 'report') { console.error('commands: report [--out <file>] [--edits <file>]'); process.exitCode = 2; return; }
  const report = await findDeadDuplicates();
  const bySource = {};
  for (const item of report.dead) bySource[item.source] = (bySource[item.source] || 0) + 1;
  console.log(JSON.stringify({ totalDeclarations: report.totalDeclarations, groupsWithDuplicates: report.groupsWithDuplicates, deadDeclarations: report.dead.length, bySource }, null, 2));
  const out = args.indexOf('--out');
  if (out >= 0) writeFileSync(args[out + 1], JSON.stringify(report, null, 2) + '\n');
  const edits = args.indexOf('--edits');
  if (edits >= 0) writeFileSync(args[edits + 1], JSON.stringify(report.dead.map(item => ({ key: item.key, action: 'delete' })), null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
