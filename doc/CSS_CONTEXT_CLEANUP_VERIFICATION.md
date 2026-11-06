# Cleanup CSS: context và assessment

Ngày 06/11/2026. Baseline `97517df`; nhánh triển khai `refactor/css-cleanup` trong worktree `frontend-refactor-integration`.

## Thay đổi

- Fragment `styles/12-context-and-assessment.css` chuyển 70 vị trí màu literal sang token `--izone-*`. Bao gồm reference context, overlay/modal, quick guide, assessment tabs, KPI và quyền làm lại. Fragment này không còn màu hex/RGB hardcode.
- Thêm 24 token trong `01-foundation.css`, dùng lại hai token nền/viền hiện có. Giá trị mới bằng màu từng vị trí trước cleanup. Giữ nguyên tám token cũ, selector, thứ tự rule, specificity và `!important`.
- Bỏ fallback literal của các token đã được foundation định nghĩa và luôn tải qua entry. Fragment không phải stylesheet độc lập.
- Đổi revision entry/HTML/imports thành `20261106-context-tokens1`; không thêm fragment hoặc request CSS.
- Không đổi DOM hoặc JS sản phẩm. Chưa chuyển inline styles; inventory JS từ bước extraction vẫn áp dụng. Chưa có bằng chứng đủ để gỡ rule trùng/`!important` trong vùng này nên không xóa dựa trên hình thức.

**Ruling:** đây là đợt cleanup đầu tiên theo khu vực, không phải hoàn tất cleanup toàn bộ 12 fragment. `--izone-primary`, `--izone-navy` và các màu legacy đang khác canonical Design System vẫn giữ nguyên để bảo toàn giao diện. `--izone-primary-ruby` giữ các vị trí Ruby có sẵn; không chuyển toàn app sang màu mới. Việc chuẩn hóa bảng màu hoặc thay kích thước/radius cần đợt riêng có đánh giá ảnh hưởng.

## Manifest sau extraction

Manifest hiện kiểm integrity của CSS đang sử dụng, không còn khẳng định CSS phải giữ nguyên vĩnh viễn sau extraction. Checksum và line ranges được cập nhật theo nội dung hiện tại; `extractionBaseline` và `extractionStartLine`/`extractionEndLine` giữ nguồn gốc bước tách. Test chỉ đổi tên để mô tả đúng hợp đồng này; mọi assertion checksum, import order, contiguous ranges và giới hạn kích thước vẫn còn. Không normalize giá trị để che khác biệt.

## Xác minh

- Reviewer độc lập thay các token bằng giá trị thực và đối chiếu fragment baseline: toàn bộ declaration tương đương. Không có token trùng tên hoặc bị override trong các fragment; tám giá trị cũ không đổi.
- `npm test` trong worktree: **642 tests, 640 pass, 2 skip, 0 fail**. Hai skip do worktree thiếu tài liệu design-system ở thư mục cha; không tính là pass.
- Browser integration: Chrome 156, ba viewport 1440×900 / 1024×768 / 390×844, root và prefix, 10 vòng mount/dispose mỗi tổ hợp; pass, 0 browser errors. Bao gồm import/save, ownership, rubric, làm lại, SSE và delayed assessment requests.
- **33/33 ảnh RGB giống hoàn toàn**, **30/30 snapshot computed styles giống nhau**, với 23 thuộc tính trên mọi element. Ngoài dashboard/Builder/room/dirty dialog/simulation/audio/publishing/gradient, thêm fixture context default, focus-within, tab hover và KPI keyboard focus.
- Keyboard fixture dùng phím Tab thật, kiểm `document.activeElement` và `matches(':focus-visible')` trước chụp; không dùng programmatic focus để suy luận keyboard ring.
- Giữ 1.611 selector và thứ tự/conditions của extraction; root chỉ thêm custom properties, không thêm selector mới.
- Local browser vẫn kiểm đủ 13 response CSS là 200, MIME CSS và first paint sau khi CSS tải xong. Đây không phải đo performance/CDN hoặc xác nhận FOUC trên mọi mạng/browser.

Artifacts ở ổ C để tránh ổ D gần đầy: `C:/Users/OS/AppData/Local/Temp/css-cleanup-before/`, `css-cleanup-after/`, `css-cleanup-smoke/`. Capture dùng `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 CSS_PARITY=1 CSS_CONTEXT_PARITY=1 ARTIFACT_DIR=<path> node tests/browser/dashboard-integration-smoke.mjs`. So sánh ảnh bằng Pillow, computed JSON so sánh toàn bộ. Baseline được chạy với hai fragment gốc từ `97517df`, sau đó khôi phục CSS mới trước chạy final.

## Review và tiếp theo

- Standards: 0 finding cần sửa.
- Spec: 1 thiếu sót về kiểm chứng keyboard modality; đã sửa và reviewer xác nhận đóng, không còn finding.

Chưa chạy API/DB thật hoặc deploy; không sửa backend hay Pages workflow. Rollback bằng revert commit cleanup cùng manifest/revision. Bước tiếp theo: tiếp tục một fragment khác hoặc di chuyển một nhóm inline styles có cùng owner, kèm parity cho các trạng thái bị tác động; không gỡ hàng loạt `!important` hoặc đổi bảng màu trong cùng commit.
