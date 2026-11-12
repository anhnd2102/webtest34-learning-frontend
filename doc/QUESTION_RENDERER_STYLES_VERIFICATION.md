# Cleanup inline styles tĩnh trong Question Renderer của Builder

Ngày 10/11/2026. Baseline `5cd46b0` (`main` = `feature/test-studio`); nhánh `refactor/question-renderer-styles`.

## Phạm vi

- Chuyển các inline style **tĩnh** trong `studio/question-renderer.js` sang fragment 07 cho 6 template soạn câu hỏi: Error Correction, Reading Matching, Listening Order, Inline Cloze, Pictorial Vocabulary và AI Rubric. 32 dòng template được sửa; thêm class `ai-reference-context-header` cho hàng tiêu đề ngữ cảnh AI vốn là `<div style>` không class.
- Selector scope theo wrapper `.template-*` của từng template (specificity 0,2,0 trở lên); riêng biến thể Pictorial dùng child combinator để không chạm chip container khác. Không thêm `!important`, token hoặc radius mới; màu cứng thay bằng token hiện có cùng giá trị: `--izone-surface`, `--izone-border`, `--izone-slate`, `--izone-slate-bg`, `--izone-slate-300`, `--izone-slate-600`, `--izone-text-body`, `--izone-text-muted`.
- **Giữ inline có chủ đích** (19 vị trí còn lại trong file): các `display: none` do JS bật/tắt (popup bảng/ảnh, lỗi editor, textarea mã HTML, vocab bank/bulk panel, rubric panes, sandbox results), ảnh Pictorial có style điều kiện cùng handler `onload/onerror`, `display` ban đầu của lỗi ảnh Pictorial và của khối ngữ cảnh AI (giá trị phụ thuộc dữ liệu). Phần trình bày tĩnh của hai phần tử sau đã chuyển sang CSS; chỉ còn `display` inline.
- Không đổi DOM ngoài việc bỏ thuộc tính `style` và thêm một class, không đổi điều kiện render, handler, draft, payload hay grading. Không đổi framework, backend hay dependency.
- CSS revision `20261110-question-renderer1`: cập nhật entry `styles.css`, link trong `index.html`, manifest (hash/ranges), rule map (1758 → 1789 rule) và inventory lexical (261 → 231 vị trí; `question-renderer.js` 49 → 19).

## Công cụ tái tạo metadata

Manifest, rule map và inventory được tái tạo bằng script tạm (không commit) thay vì sửa tay. Trước khi dùng, mỗi script được kiểm trên baseline: rule map sinh ra trùng 100% với `rule-map.json` hiện có (1758 rule, sau khi chuẩn hóa `:nth-child(even)` thành `2n` như CSSOM), inventory quét lại khớp 261/261 vị trí. `tests/dashboard-css-artifact.test.mjs` xác nhận manifest/hash/thứ tự import.

## Xác minh

- `node --check studio/question-renderer.js` pass (syntax check, không phải typecheck).
- `npm test`: **661 tests, 661 pass, 0 fail, 0 skip** (Node v24.19.0).
- Harness mới `QUESTION_RENDERER_STYLE_PARITY=1` trong `tests/browser/dashboard-integration-smoke.mjs`: mount Builder thật với 7 câu tổng hợp (6 template, gồm rubric có ngữ cảnh riêng và rubric kế thừa ngữ cảnh Bài tập). Assert số câu render, 2 thẻ chỗ trống, trạng thái hiện/ẩn của khối ngữ cảnh AI; thêm biến thể chỗ trống (2) và biến thể lỗi sai bằng Enter, chuyển tab Sandbox/Tiêu chí, kiểm `clozeAnswers[2].accepted` trong draft rồi dispose.
- Parity trước/sau với `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 QUESTION_RENDERER_STYLE_PARITY=1` trên 1440×900, 1024×768, 390×844: **30/30 computed snapshots toàn DOM giống baseline** (23 thuộc tính, không loại phần tử nào). 29/30 PNG giống từng byte; `1024-simulation-question-default.png` khác 6 pixel, maxChannel 1/255, ở màn mô phỏng không dùng module này (nhiễu khử răng cưa, computed giống hệt).
- Smoke tích hợp đầy đủ (không bật cờ parity): root và `/preview-base` × 3 viewport, mỗi lượt 10 vòng mount/dispose, 0 browser errors, 13 CSS responses 200/`text/css`.

## Giới hạn đã biết

- Bật bất kỳ cờ parity nào (đã đối chứng với `VOCAB_STYLE_PARITY=1`) khiến assertion "Staying returns keyboard focus" của harness fail vì hàm chụp ảnh blur focus; đây là giới hạn có sẵn của harness, nên lifecycle smoke được chạy riêng như các đợt trước.
- Chưa kiểm API/DB thật, Pages deployment, mọi tổ hợp dữ liệu câu hỏi hoặc trạng thái ảnh Pictorial lỗi tải.
- Artifacts nằm ngoài repo, trong scratchpad của phiên: `qr-before/`, `qr-after/`, `qr-smoke/`.

Rollback: revert commit template/CSS/metadata như một đơn vị.
