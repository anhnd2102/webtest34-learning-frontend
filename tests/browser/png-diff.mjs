// So sánh hai ảnh PNG theo từng pixel bằng canvas của Chrome.
//   node tests/browser/png-diff.mjs <a.png> <b.png> [more pairs...]
// In số pixel khác nhau và độ lệch kênh lớn nhất; thoát mã 1 nếu có cặp khác nhau.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
const args = process.argv.slice(2);
if (args.length < 2 || args.length % 2) { console.error('usage: png-diff.mjs <a.png> <b.png> [...]'); process.exit(2); }
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let differing = 0;
try {
  const page = await browser.newPage();
  for (let i = 0; i < args.length; i += 2) {
    const [a, b] = await Promise.all([readFile(args[i]), readFile(args[i + 1])]);
    const result = await page.evaluate(async ([left, right]) => {
      const load = async base64 => { const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return { w: image.width, h: image.height, data: ctx.getImageData(0, 0, image.width, image.height).data }; };
      const [x, y] = await Promise.all([load(left), load(right)]);
      if (x.w !== y.w || x.h !== y.h) return { size: [x.w, x.h, y.w, y.h] };
      let pixels = 0, max = 0; const first = [];
      for (let p = 0; p < x.data.length; p += 4) {
        let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(x.data[p + c] - y.data[p + c]));
        if (d) { pixels++; max = Math.max(max, d); if (first.length < 3) first.push([(p / 4) % x.w, Math.floor(p / 4 / x.w), d]); }
      }
      return { pixels, max, first };
    }, [a.toString('base64'), b.toString('base64')]);
    if (result.size || result.pixels) differing++;
    console.log(`${result.size ? 'SIZE ' + result.size.join('x') : result.pixels ? `DIFF ${result.pixels}px max=${result.max} first=${JSON.stringify(result.first)}` : 'SAME'}  ${args[i].split(/[\/]/).pop()}`);
  }
} finally { await browser.close(); }
process.exit(differing ? 1 : 0);
