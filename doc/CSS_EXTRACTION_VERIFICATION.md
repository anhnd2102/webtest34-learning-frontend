# Bước 4: tách CSS giữ cascade

Ngày: 06/11/2026. Baseline `6aebf2e`; nhánh `refactor/dashboard-css`.

## Phạm vi và cấu trúc

`feature/test-studio` đã fast-forward từ `d0e328f` tới `6aebf2e` trước khi tách CSS. Kiểm thử ở checkout chính tại mốc đó: 641/641 pass. Main không bị thay đổi. Worktree CSS mới tạo thất bại do ổ D thiếu dung lượng; Git tự dọn bản tạo dở. Dùng lại worktree tích hợp đang sạch cho nhánh CSS. Artifacts ảnh lưu ở ổ C.

`styles.css` từ 11.527 dòng thành entry 12 dòng import. 12 fragment trong `term-tests/teacher-dashboard/styles/` giữ nguyên các đoạn liên tiếp, không đảo nhóm rule để gom chủ đề. Các nhóm gồm foundation, dashboard/grading, Builder, authoring, simulation questions, publishing, reports/question layouts, simulation shell, editor/media, overrides, analytics và context/assessment. Mỗi fragment dưới 2.000 dòng.

- `styles/manifest.json`: thứ tự import, mốc dòng nguồn, checksum từng fragment và checksum toàn bộ CSS baseline.
- `styles/rule-map.json`: 1.611 selector do Chrome CSSOM đọc, thứ tự, fragment và điều kiện media/grouping.
- `doc/CSS_INLINE_STYLE_INVENTORY.json`: 443 vị trí lexical inline style/ghi style trong JS, phục vụ cleanup sau; không khẳng định đây là số declaration hoặc danh sách CSS parser hoàn chỉnh.
- Entry và imports có revision `20261106-css1`. Không thêm build tool/framework, không sửa workflow Pages. Giữ `url(#barGradient)` và `url(#barActiveGradient)` nguyên văn.

**Ruling:** bước này chỉ tách file. Cleanup token, `!important`, rule trùng và inline styles thực hiện ở commit riêng sau này, đúng kế hoạch; không đổi hành vi thắng/thua của cascade để làm sạch cùng lúc. CSS nợ cũ vẫn còn, không coi baseline là chứng nhận tuân thủ design system.

## Kiểm thử và parity

- Artifact test RED vì manifest chưa có, rồi GREEN sau extraction. Ghép fragment khớp toàn bộ baseline SHA-256 sau chuẩn hóa CRLF, không normalize URL hoặc declaration.
- Tests CSS cũ dùng helper đọc entry/imports theo thứ tự; giữ nguyên assertions. Không bỏ assertions cho pass.
- Staged whitespace check báo các dòng trắng cuối fragment và trailing spaces có sẵn trong đoạn CSS gốc. Giữ nguyên để checksum source khớp tuyệt đối; dọn whitespace thuộc commit cleanup sau.
- Frontend trong worktree: **642 tests, 640 pass, 2 skip, 0 fail**. Hai skip do thiếu tài liệu design-system ở thư mục cha worktree, không tính là pass.
- Browser Chrome 156.0.8078.81: root và prefix, 1440×900 / 1024×768 / 390×844, 10 mount/dispose mỗi tổ hợp, tất cả pass và 0 browser errors. Giữ kiểm tra dirty/focus/scroll, save, import, modal ownership, SSE, rubric, retake và assessment cancellation.
- **21/21 ảnh RGB giống hoàn toàn**, gồm dashboard, Builder, dirty dialog, room, simulation/audio, publishing và histogram gradient probe ở ba viewport.
- **18/18 snapshot computed styles giống nhau**: 18 thuộc tính trên mọi element trong sáu state mỗi viewport. Selector map baseline/final có cùng 1.611 selector và thứ tự/conditions.
- Histogram probe được kiểm tra pixel thực: RGB `(219, 8, 40)` tại tâm thanh ở cả ba viewport, giống baseline. Đây là kiểm tra gradient được tô màu, không chỉ so chuỗi computed URL.

Artifacts local: `C:/Users/OS/AppData/Local/Temp/webtest34-css-baseline/`, `webtest34-css-final/`, `webtest34-css-smoke-final/`. Chạy capture với `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 CSS_PARITY=1 ARTIFACT_DIR=<path> node tests/browser/dashboard-integration-smoke.mjs`; chạy integration với `RUN_ASSESSMENT_RACE=1 ARTIFACT_DIR=<path>`.

## Tải CSS và giới hạn

Cold local load có 13 request CSS thay vì 1: entry + 12 fragments, đều 200 và `text/css`, không có nested import. ResourceTiming của capture:

| Viewport | CSS cuối baseline / split (ms) | First paint baseline / split (ms) |
| --- | --- | --- |
| 1440×900 | 53,8 / 77,2 | 276 / 268 |
| 1024×768 | 30,7 / 57,8 | 76 / 140 |
| 390×844 | 28,8 / 58,0 | 72 / 132 |

Thời gian tính từ navigation start; đây là một lần đo trên local static server, không phải benchmark hay kết luận nhanh hơn. Harness xác nhận first paint sau khi tất cả CSS kết thúc tải. Bằng chứng này không chứng minh không FOUC trên mọi mạng/browser; chưa đo CDN Pages, latency cao hoặc rollout thật. Giữ chi phí request này hiển thị rõ để đánh giá bundle khi làm tooling sau này. Chưa deploy.

## Review và rollback

Standards phát hiện việc đổi fragment-only URL thành đường dẫn stylesheet làm mất SVG gradient; đã giữ nguyên URL, bỏ normalization trong helper và reviewer kiểm tra lại. Quy tắc URL cục bộ được đối chiếu với [CSS Values – Fragment URLs](https://www.w3.org/TR/css-values-3/#local-urls).

Spec yêu cầu bổ sung đo CSS request/FOUC và trạng thái simulation/publishing/audio; đã bổ sung dữ liệu và giới hạn ở trên. Không thay API/backend, không chạy lại backend matrix cho thay đổi chỉ CSS và harness.

Rollback bằng revert commit extraction như một đơn vị: entry, fragments, revision, manifest và test readers đi cùng nhau. Không xóa fragment đơn lẻ khi entry còn tham chiếu. Tiếp theo là cleanup CSS theo từng khu vực có parity checks; chưa thực hiện TypeScript hoặc Vue pilot.
