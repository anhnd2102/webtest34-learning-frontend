/**
 * Minimal HTTP static server với MIME type đúng cho .mjs, .js, .json.
 * Dùng để phục vụ frontend demo locally.
 *
 * Chạy: node serve.mjs [port] [bind]
 * Ví dụ: node serve.mjs 8034 127.0.0.1
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2]) || 8034;
const bind = process.argv[3] || '127.0.0.1';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.mp3':  'audio/mpeg',
  '.m4a':  'audio/mp4',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  // Strip query string
  const urlPath = req.url.split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(urlPath);
  const filePath = path.join(root, decoded);

  // Safety: prevent path traversal
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${urlPath}`);
      console.log(`404  ${req.url}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(filePath).pipe(res);
    console.log(`200  ${req.url}`);
  });
});

server.listen(port, bind, () => {
  console.log(`\nDemo server đang chạy tại http://${bind}:${port}/`);
  console.log('');
  console.log('  Khối 03:  http://' + bind + ':' + port + '/term-tests/webtest-34-demo/index.html?demoCourse=03');
  console.log('  Khối 34:  http://' + bind + ':' + port + '/term-tests/webtest-34-demo/index.html?demoCourse=34');
  console.log('  Khối 45:  http://' + bind + ':' + port + '/term-tests/webtest-34-demo/index.html?demoCourse=45');
  console.log('');
  console.log('Nhấn Ctrl+C để dừng.\n');
});
