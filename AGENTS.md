# AGENTS.md — Course 34 frontend

## Phạm vi

Đây là frontend canonical của Course 34, được serve tĩnh và publish qua GitHub Pages.
Workspace nằm tại `webtest34-learning-frontend/`; không nhầm với
`izone-ai-team-pages/`, là frontend legacy/reference trong snapshot cha.

Đọc thêm `../AGENTS.md` và `../ARCHITECTURE.md` trước khi thay đổi flow gọi Learning API.

## Boundary và route

- `term-tests/webtest-34/index.html` là landing page.
- `term-tests/webtest-34/test-1/index.html` là entry point cho Test 1.
- `term-tests/webtest-34-demo/index.html` là canonical renderer duy nhất.
- `term-tests/webtest-34-demo/config.js` giữ API origin và public audio config.
- API student dùng prefix `/api/learning`; không gọi lại `/api/webtest-34/` hoặc
  `mapping-api` legacy.
- Test token chỉ đi trong URL fragment `#test=<token>`. Entry point phải giữ fragment;
  không đặt token trong source, query string, local fixture hoặc log.

Frontend không là source of truth cho attempt, deadline, roster, điểm hoặc answer key.
Không nhúng grading key/private rubric vào HTML, JS hoặc public definition.

## Kiểm thử

Chạy từ workspace này:

```bash
npm test
```

Khi thay đổi entry point, config, result mapping hoặc renderer, phải chạy test liên quan
và kiểm tra static route/asset contract. Browser/live API/Pages deployment là các boundary
riêng; không báo đã xác minh nếu chưa thực sự smoke test boundary đó.

## Quy tắc bảo toàn

- Không tạo renderer song song nếu canonical renderer có thể mở rộng.
- Không copy token production, roster thật, answer key, audio private, essay hoặc dữ liệu
  học viên vào workspace.
- Published form version/assignment là immutable; content drift phải được xử lý theo
  `../docs/WEBTEST34_CONTENT_DRIFT.md`, không sửa JSON result để che lỗi.
- Giữ thay đổi trong workspace này; không sửa `izone-ai-team-pages/` hoặc backend legacy
  chỉ để làm test mới chạy.
