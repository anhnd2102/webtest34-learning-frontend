# Xác minh bước 3: tách workflow Test Studio

Chốt báo cáo ngày 06/11/2026. Baseline `95c46ef`, nhánh `refactor/studio-workflows`, worktree riêng `frontend-step2-verification`. Không sửa workspace chính, push, merge hoặc deploy.

## Kết quả và ranh giới

- `app.js` còn 129 dòng, giữ nguyên 169 named exports qua facade tương thích. Implementation import trực tiếp module sở hữu; dependency graph không có vòng lặp.
- `studio/builder.js` còn 3.069 dòng orchestration; `shell/dashboard.js` còn 2.721 dòng. Đây là một bước giảm coupling, chưa phải kết thúc toàn bộ roadmap refactor.
- Draft model, input synchronization, saving, rich editor, media, batch import, question rendering, simulation, publishing và authoring theo loại câu có module riêng trong `studio/`.
- API helpers, navigation/overlay ownership, presentation dùng chung chuyển vào `api/`, `navigation/`, `ui/`. Results, attempt review và exam-room view chuyển vào `results/`, `grading/`, `exam-room/`.
- Builder giữ draft và trạng thái dirty/lifecycle; workflow nhận thao tác và getter cần thiết. Shell chia sẻ trạng thái view bằng accessor, không tạo state store thứ hai.
- Không đổi CSS, HTML entry, API contract, schema hoặc framework. Chưa chuyển TypeScript. Số request module ban đầu tăng; không có tuyên bố cải thiện hiệu năng.

## Kiểm thử

| Boundary | Kết quả |
| --- | --- |
| Frontend `npm test` (chạy lại trước commit) | 620 tests: 618 pass, 2 skip, 0 fail |
| Backend `npm run check` | Pass |
| Backend `npm test` | 392 tests: 338 pass, 54 skip, 0 fail |
| Backend `npm run contract` | 4 pass |
| Backend `npm run webtest34:types:check` | 9 canonical types, 6 aliases |
| Backend content tests | 3 skip; không xác minh nội dung private |
| Browser integration, Chrome 156 | 1440×900, 1024×768, 390×844; root và URL prefix; 10 vòng mount/dispose mỗi tổ hợp; 0 browser errors |
| Builder lifecycle browser smoke | 3 viewport, 10 vòng mỗi viewport; 0 browser errors |

Hai frontend tests skip vì worktree không có các tài liệu ở thư mục cha được design-compliance tests tìm kiếm. Không xem các tests skip là xác minh đã pass. Backend không dùng DB/private inputs; không kiểm thử production hoặc deployment.

Browser fixture bao phủ CSV import, preview, save lỗi/thành công, pending save, dirty navigation, history/focus/scroll, overlay ownership và room SSE. Các tests editor/publishing/authoring hiện có cũng được chạy. Bốn tests mới kiểm tra module độc lập, identity của facade, import không khởi động DOM/network/timer và retained vocabulary CSV handler. Các source-contract tests cũ chỉ đổi cách tìm implementation, giữ assertions.

## So sánh giao diện

Artifacts local nằm tại git common directory: `worktrees/frontend-step2-verification/verification/issue-24/step3-baseline/` và `step3-final/`; không commit ảnh hoặc fixture nhạy cảm.

12 ảnh cùng kích thước; 8 ảnh giống RGB hoàn toàn. Bốn ảnh còn lại khác rất ít: builder 1024 có 87 pixel (độ lệch kênh tối đa 11), room 1024 có 3 pixel (7), room 1440 có 1 pixel (3), room 390 có 4 pixel (7). Kiểm tra ảnh không thấy thay đổi bố cục; không khẳng định tất cả ảnh giống tuyệt đối. Overflow mobile có sẵn được giữ nguyên.

## Review hai trục

- **Standards:** một finding về handler `.btn-upload-vocab-csv` gọi helper đã chuyển scope. Đã chuyển handler vào vocabulary workflow; test tái hiện ReferenceError trước sửa và pass sau sửa. Không còn finding mới chưa xử lý.
- **Spec:** không có finding cụ thể; giữ export compatibility, ownership và phạm vi kế hoạch.

Nợ có sẵn: `studio/content-import.js` có tham chiếu `parseClozeBlanks` chưa bind trong nhánh block CSV inline-cloze, đã tồn tại ở baseline. Đợt này không sửa; cần ticket sửa lỗi riêng kèm test tái hiện. Browser CSV smoke không chứng minh nhánh này hoạt động.

## Rollback và bước tiếp

Revert commit bước này như một đơn vị: facade, implementation, imports và tests phải đi cùng nhau. Không có migration dữ liệu. Trước tích hợp vào nhánh đang dùng, cần review diff với các thay đổi mới ở workspace chính và xử lý xung đột nếu có. Sau đó tiếp tục các hạng mục còn lại trong `REFACTOR_PLAN.md`; không coi việc tách JS là hoàn tất phân lớp CSS hoặc migration TypeScript.
