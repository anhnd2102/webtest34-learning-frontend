// Run with a local frontend server and Playwright available through NODE_PATH:
// NODE_PATH=<playwright node_modules> node --test tests/teacher-login.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium, expect } = createRequire(import.meta.url)('playwright/test');

test('teacher login layout, submit, restore and logout work on desktop and mobile', async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const teacher = { name: 'Test Teacher', email: 'teacher@example.test', role: 'admin', courseCodes: ['34'] };
      let pendingLogin;
      let loginCalls = 0;
      let expired = false;
      const reply = (route, status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
      await page.route('**/api/teacher/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/auth/login')) {
          loginCalls++;
          assert.deepEqual(route.request().postDataJSON(), { email: teacher.email, phone: '0000000000' });
          pendingLogin = route;
        } else if (path.endsWith('/auth/me')) {
          await reply(route, expired ? 401 : 200, { teacher });
        } else {
          await reply(route, 200, { classes: [] });
        }
      });
      await page.goto('http://127.0.0.1:8034/term-tests/teacher-dashboard/index.html');
      await expect(page.locator('#login-form')).toBeVisible();
      await expect(page.locator('.control-toolbar')).toBeHidden();
      await expect(page.locator('#identity-form')).toBeHidden();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const card = await page.locator('#auth-panel').boundingBox();
      assert.ok(Math.abs(card.x + card.width / 2 - viewport.width / 2) < 2);
      await page.locator('#login-email').fill(teacher.email);
      await page.locator('#login-phone').fill('0000000000');
      await page.getByRole('button', { name: 'Hiện mật khẩu' }).click();
      await expect(page.locator('#login-phone')).toHaveAttribute('type', 'text');
      await page.getByRole('button', { name: 'Ẩn mật khẩu' }).click();
      await expect(page.locator('#login-phone')).toHaveAttribute('type', 'password');
      await page.locator('#login-phone').press('Enter');
      await expect(page.locator('#login-btn')).toBeDisabled();
      await expect(page.locator('#login-btn')).toHaveText('Đang đăng nhập…');
      await expect.poll(() => loginCalls).toBe(1);
      await page.locator('#login-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
      assert.equal(loginCalls, 1);
      await reply(pendingLogin, 401, { message: 'Sai thông tin đăng nhập.' });
      await expect(page.locator('#login-error')).toHaveText('Sai thông tin đăng nhập.');
      await expect(page.locator('#login-email')).toHaveValue(teacher.email);
      await expect(page.locator('#login-btn')).toBeEnabled();
      await page.locator('#login-btn').click();
      await expect.poll(() => loginCalls).toBe(2);
      await pendingLogin.abort();
      await expect(page.locator('#login-error')).toBeVisible();
      await expect(page.locator('#login-btn')).toBeEnabled();
      await page.locator('#login-btn').click();
      await expect.poll(() => loginCalls).toBe(3);
      await reply(pendingLogin, 200, { token: 'synthetic-session', teacher });
      await expect(page.locator('#teacher-profile')).toBeVisible();
      await expect(page.locator('.control-toolbar')).toBeVisible();
      await expect(page.locator('#admin-course-filters')).toBeVisible();
      await expect(page.locator('.login-footer')).toBeHidden();
      await page.reload();
      await expect(page.locator('#teacher-profile')).toBeVisible();
      expired = true;
      await page.reload();
      await expect(page.locator('#login-form')).toBeVisible();
      await expect(page.locator('.control-toolbar')).toBeHidden();
      await page.locator('#login-email').fill(teacher.email);
      await page.locator('#login-phone').fill('0000000000');
      await page.locator('#login-btn').click();
      await expect.poll(() => loginCalls).toBe(4);
      await reply(pendingLogin, 200, { token: 'synthetic-session', teacher });
      await expect(page.locator('#teacher-profile')).toBeVisible();
      await page.locator('#logout-btn').click();
      await expect(page.locator('#login-form')).toBeVisible();
      await expect(page.locator('.control-toolbar')).toBeHidden();
      assert.equal(await page.evaluate(() => sessionStorage.getItem('izone_teacher_token')), null);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
