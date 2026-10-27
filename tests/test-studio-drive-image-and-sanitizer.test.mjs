import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertGoogleDriveImageUrl,
  validateImageUrl,
  sanitizeRichContent
} from '../term-tests/teacher-dashboard/app.js';

test('convertGoogleDriveImageUrl converts various Google Drive link formats to thumbnail CDN URLs', () => {
  // Format 1: /file/d/{id}/view
  const url1 = 'https://drive.google.com/file/d/1B2C3D4E5F6G7H8I9J0K_abc/view?usp=sharing';
  assert.equal(
    convertGoogleDriveImageUrl(url1),
    'https://drive.google.com/thumbnail?id=1B2C3D4E5F6G7H8I9J0K_abc&sz=w1600'
  );

  // Format 2: /open?id={id}
  const url2 = 'https://drive.google.com/open?id=1B2C3D4E5F6G7H8I9J0K_abc';
  assert.equal(
    convertGoogleDriveImageUrl(url2),
    'https://drive.google.com/thumbnail?id=1B2C3D4E5F6G7H8I9J0K_abc&sz=w1600'
  );

  // Format 3: /uc?id={id}&export=download
  const url3 = 'https://drive.google.com/uc?id=1B2C3D4E5F6G7H8I9J0K_abc&export=download';
  assert.equal(
    convertGoogleDriveImageUrl(url3),
    'https://drive.google.com/thumbnail?id=1B2C3D4E5F6G7H8I9J0K_abc&sz=w1600'
  );

  // Format 4: With resourcekey parameter
  const url4 = 'https://drive.google.com/file/d/1B2C3D4E5F6G/view?resourcekey=0-resKey123&usp=sharing';
  assert.equal(
    convertGoogleDriveImageUrl(url4),
    'https://drive.google.com/thumbnail?id=1B2C3D4E5F6G&sz=w1600&resourcekey=0-resKey123'
  );

  // Non-drive regular HTTPS URL is returned as-is (trimmed)
  const regularHttps = '  https://images.unsplash.com/photo-example.jpg?w=800  ';
  assert.equal(convertGoogleDriveImageUrl(regularHttps), 'https://images.unsplash.com/photo-example.jpg?w=800');

  // Relative asset path is returned as-is
  const localAsset = 'assets/test 1/vocabulary/image1.png';
  assert.equal(convertGoogleDriveImageUrl(localAsset), 'assets/test 1/vocabulary/image1.png');

  // Empty / null inputs return empty string
  assert.equal(convertGoogleDriveImageUrl(''), '');
  assert.equal(convertGoogleDriveImageUrl(null), '');
});

test('validateImageUrl enforces HTTPS and relative asset paths, rejecting insecure and base64 URLs', () => {
  // Valid HTTPS URLs
  assert.equal(validateImageUrl('https://drive.google.com/thumbnail?id=123&sz=w1600'), true);
  assert.equal(validateImageUrl('https://cdn.izone.edu.vn/images/banner.png'), true);
  assert.equal(validateImageUrl('assets/test 1/vocabulary/image1.png'), true);
  assert.equal(validateImageUrl('/assets/images/sample.jpg'), true);

  // Insecure HTTP is rejected
  assert.equal(validateImageUrl('http://insecure.site.com/image.jpg'), false);

  // Base64 data:image is strictly rejected to prevent DB bloating
  assert.equal(validateImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), false);

  // Script injection / invalid protocols are rejected
  assert.equal(validateImageUrl('javascript:alert(1)'), false);
  assert.equal(validateImageUrl('file:///C:/secret.png'), false);
  assert.equal(validateImageUrl(''), false);
  assert.equal(validateImageUrl(null), false);
  assert.equal(validateImageUrl('   '), false);
});

test('sanitizeRichContent allows structured table and image elements while stripping malicious scripts and attributes', () => {
  // Safe table with structure and styles
  const inputHtml = `
    <table class="cloze-table" style="width: 100%;">
      <thead>
        <tr>
          <th>Topic</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Places to visit</td>
          <td>six (1) __________ Caribbean islands</td>
        </tr>
      </tbody>
    </table>
  `;

  const sanitized = sanitizeRichContent(inputHtml);
  assert.ok(sanitized.includes('<table'), 'Preserves table element');
  assert.ok(sanitized.includes('<thead'), 'Preserves thead element');
  assert.ok(sanitized.includes('<th'), 'Preserves th element');
  assert.ok(sanitized.includes('<tbody'), 'Preserves tbody element');
  assert.ok(sanitized.includes('<tr'), 'Preserves tr element');
  assert.ok(sanitized.includes('<td'), 'Preserves td element');
  assert.ok(sanitized.includes('six (1) __________ Caribbean islands'), 'Preserves blank token inside td');

  // Strips script tags and inline event handlers
  const malicious = `
    <p>Safe text</p>
    <script>alert("hacked")</script>
    <img src="https://example.com/pic.png" onload="alert(1)" onerror="alert(2)" alt="Sample" />
    <a href="javascript:alert(1)">Click me</a>
  `;

  const clean = sanitizeRichContent(malicious);
  assert.ok(!clean.includes('<script'), 'Removes script tags');
  assert.ok(!clean.includes('alert("hacked")'), 'Removes script content');
  assert.ok(!clean.includes('onload='), 'Removes onload handler');
  assert.ok(!clean.includes('onerror='), 'Removes onerror handler');
  assert.ok(!clean.includes('javascript:'), 'Removes javascript: protocol');
  assert.ok(clean.includes('Safe text'), 'Preserves safe text');
  assert.ok(clean.includes('<img src="https://example.com/pic.png"'), 'Preserves safe HTTPS image');
});

test('sanitizeRichContent removes base64 and insecure img tags while preserving surrounding text', () => {
  const mixedHtml = `
    <div>
      <p>Before image</p>
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=" alt="bloated" />
      <img src="http://unencrypted.com/photo.jpg" alt="insecure" />
      <img src="https://cdn.example.com/safe.jpg" alt="safe" />
      <p>After image</p>
    </div>
  `;

  const result = sanitizeRichContent(mixedHtml);
  assert.ok(!result.includes('data:image'), 'Strips base64 image');
  assert.ok(!result.includes('http://unencrypted'), 'Strips insecure HTTP image');
  assert.ok(result.includes('https://cdn.example.com/safe.jpg'), 'Preserves safe HTTPS image');
  assert.ok(result.includes('Before image'), 'Preserves preceding text');
  assert.ok(result.includes('After image'), 'Preserves following text');
});
