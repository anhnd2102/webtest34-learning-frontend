# Rà soát inline styles còn lại của `studio/question-renderer.js`

Ngày 11/11/2026. Baseline `1f6af9f` (`feature/test-studio`). CSS revision `20261111-question-renderer2`.

## Kết luận

Đợt trước (`QUESTION_RENDERER_STYLES_VERIFICATION.md`) đã chuyển phần tĩnh của file này. Rà lại 19 vị trí còn trong kiểm kê:

- **Chuyển được: 1 vị trí** — kiểu tĩnh của ảnh xem trước Pictorial (`max-height`, `max-width`, `border-radius`, `border` với màu cứng `#e2e8f0`, `object-fit`) → rule `.pictorial-thumb-preview .pictorial-preview-img` ở fragment 12, `border` dùng `--izone-border` (cùng giá trị `#e2e8f0`). Thuộc tính `style="display: none;"` chỉ còn khi chưa có `imgSrc`.
- **Giữ inline có chủ đích: 18 vị trí còn lại** — đều là `display: none` ban đầu của phần tử do JS bật/tắt (popup bảng/ảnh, lỗi editor, textarea mã HTML, vocab bank/bulk panel, rubric panes, sandbox results, lỗi ảnh Pictorial) hoặc `display` phụ thuộc dữ liệu (khối ngữ cảnh AI).

Đã kiểm mã: mọi nơi bật các phần tử này đều gán giá trị tường minh (`'block'`, `'flex'`, `'inline-flex'`, `'inline-block'`), không có nơi nào xóa inline bằng `''`/`removeProperty`. Vì vậy về mặt kỹ thuật có thể đổi `display: none` ban đầu sang class, nhưng đó là đổi mô hình trạng thái ẩn/hiện (ranh giới giữa template và 6+ module JS: builder, rich-editor, pictorial, rubric, vocabulary, publishing), không phải dọn style. Không làm trong đợt này; nếu muốn, nên là một đợt riêng với `hidden`/class dùng chung và test hành vi toggle.

## Phạm vi thay đổi

- `studio/question-renderer.js` (1 dòng template), `styles/12-context-and-assessment.css` (+1 rule, không token mới, không `!important`).
- Số vị trí trong kiểm kê không đổi (167): dòng này còn `style="display: none;"` có điều kiện và handler `onerror`; phần tĩnh đã được loại. Rule map 1840 → 1841.
- Specificity: `.pictorial-thumb-preview .pictorial-preview-img` (0,2,0) thắng `.pictorial-preview-img` (fragment 09, `max-height: 200px`, radius 8px, border `#cbd5e1`) và `.pictorial-thumb-preview img` (fragment 05, `object-fit: cover`) như inline cũ. Lần đầu rule chưa vào CSS (lỗi thao tác của tôi), harness báo ngay `border-radius 6px → 8px` và đổi màu border — minh chứng harness phát hiện được lệch.

## Xác minh

- Harness có sẵn `QUESTION_RENDERER_STYLE_PARITY=1 CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 SMOKE_ROOT_ONLY=1` (mount Builder thật, câu q5 Pictorial có ảnh). Baseline từ worktree tạm tại `1f6af9f`.
- **30/30 computed snapshots giống baseline và 30/30 PNG trùng từng byte** (1440, 1024, 390 × default/edited/… ); so sánh bằng `node tests/browser/grading-modal-parity.mjs --compare <before> <after>`.
- `npm test`: 671/671 pass; `node scripts/css-metadata.mjs check` khớp.

## Giới hạn

- Chỉ bao phủ trường hợp ảnh tải được. Trường hợp `imgSrc` rỗng (ẩn) và ảnh lỗi (`onerror`) giữ nguyên cơ chế inline nên không đổi, nhưng chưa có ảnh chụp riêng.
- Chưa chạy lại smoke vòng đời `/preview-base`.

Rollback: revert commit như một đơn vị.
