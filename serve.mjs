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
  // Proxy API requests to backend API server
  if (req.url.startsWith('/api/') || req.url.startsWith('/internal/') || req.url.startsWith('/health')) {
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: 8788,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: '127.0.0.1:8788'
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'BACKEND_GATEWAY_ERROR', message: 'Không thể kết nối đến backend local: ' + err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

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

  // Handle relative assets requested from teacher-dashboard
  let targetPath = filePath;
  if (!fs.existsSync(targetPath) && urlPath.startsWith('/term-tests/teacher-dashboard/assets/')) {
    const fallbackPath = path.join(root, urlPath.replace('/term-tests/teacher-dashboard/assets/', '/term-tests/webtest-34-demo/assets/'));
    if (fs.existsSync(fallbackPath)) {
      targetPath = fallbackPath;
    }
  }

  fs.stat(targetPath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${urlPath}`);
      console.log(`404  ${req.url}`);
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';

    // Support HTTP Range requests (RFC 7233) for seamless audio/video streaming and seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      if (start >= stat.size || (parts[1] && end >= stat.size)) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stat.size}`,
          'Accept-Ranges': 'bytes'
        });
        return res.end();
      }

      const chunksize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      });

      fs.createReadStream(targetPath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });

    fs.createReadStream(targetPath).pipe(res);
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
