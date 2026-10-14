import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const page = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');

test('attempt requests and the student event stream use the tab device id', () => {
  assert.ok(/sessionStorage\.getItem\(['"]webtest34\.learning\.deviceId['"]\)/.test(page));
  assert.ok(/examDeviceRequestBody\(body, deviceId\)/.test(page));
  assert.ok(/attempts\/events\?deviceId=\$\{encodeURIComponent\(deviceId\)\}/.test(page));
});

test('student sends exam heartbeats with the tab device id and stops on terminal states', () => {
  assert.match(page, /function startExamHeartbeat\(\)[\s\S]*?learningRequest\('\/attempts\/exam\/heartbeat', \{attemptToken: state\.learning\.attemptToken\}\)[\s\S]*?setInterval\(send, 20_000\)/);
  assert.match(page, /path\.startsWith\('\/attempts\/'\) \? window\.examDeviceRequestBody\(body, deviceId\)/);
  assert.match(page, /device\.superseded'[\s\S]*?stopExamHeartbeat\(\)/);
  assert.match(page, /function acceptLearningSubmission\(result\)[\s\S]*?stopExamHeartbeat\(\)/);
  assert.match(page, /initializePage\(\)[\s\S]*?\['waiting', 'running'\]\.includes\(state\.learning\?\.exam\?\.status\)[\s\S]*?connectExamEvents\(\)/);
});

test('device.superseded locks the old attempt and shows the required message', () => {
  assert.ok(/event === 'device\.superseded'[\s\S]*?type: 'device_superseded'/.test(page));
  assert.ok(/Bài thi đang được mở ở máy khác\. Nếu không phải bạn, hãy báo giáo viên\./.test(page));
  assert.ok(/document\.querySelector\('main'\)\.inert = true/.test(page));
});
