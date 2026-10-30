# Issue #18 — CSV/import pilot: implementation and verification

Ngày: 28/10/2026 (Asia/Ho_Chi_Minh). Spec: [Issue #18](https://github.com/anhnd2102/webtest34-learning-frontend/issues/18).

Trạng thái: implemented locally, chưa push/merge/deploy. Nhánh: `refactor/frontend-architecture-plan`. Mốc trước thay đổi: `0fd6274ead5ebffd934758e2962d6997d024b1e7`.

## Phạm vi và inventory

Chuyển nguyên trạng 409 dòng implementation thành module [content-import.js](../term-tests/teacher-dashboard/studio/content-import.js). Không đổi CSS, HTML, payload, quyền, scoring, state/lifecycle hoặc build tooling. Module mới không có import, không tạo dependency vòng; caller cũ giữ named exports qua import/export binding trong app.js. So sánh với Git baseline xác nhận 13 thân hàm không đổi sau chuẩn hóa LF/CRLF.

| Export chuyển vào module | Caller ứng dụng |
| --- | --- |
| parseCsvRows | Parser trắc nghiệm, điền từ, sửa lỗi, viết lại câu và thứ tự nghe |
| parseVocabPairCsv | Preview/confirm nhập cặp từ vựng |
| generateVocabPairTemplateCsv | Download template cặp từ vựng |
| parseSingleChoiceCsv / generateSingleChoiceTemplateCsv | csvConfig trong triggerScCsvUpload |
| parseFitbCsv / generateFitbTemplateCsv | Modal nhập câu điền từ |
| parseErrorCorrectionCsv / generateErrorCorrectionTemplateCsv | Modal nhập câu sửa lỗi |
| parseSentenceTransformationCsv / generateSentenceTransformationTemplateCsv | Luồng nhập viết lại câu hiện có, dù toolbar không còn nút độc lập |
| parseListeningOrderCsv / generateListeningOrderTemplateCsv | Modal nhập thứ tự nghe |

Các consumer kiểm thử trực tiếp đã kiểm kê: `test-studio-csv-bulk-upload`, `test-studio-fitb-mc-points-2col`, `test-studio-vocab-pair-csv-and-batch-variants`; bổ sung `content-import-characterization` và `content-import-module`. Batch integration gọi qua renderTestBuilderView. Không sửa các caller/contract hiện có.

Giữ ngoài pilot: expandSentenceVariants, batchGenerateExerciseVocabVariants, isShortQaEligibleFor2Col, DOM modal, draft operations, simulation và bootstrap. Parser/template không cần các dependency này; không kéo chúng vào module mới.

## Test trước và sau di chuyển

Baseline mới trên Node v24.19.0: frontend 480 pass / 0 fail / 0 skip.

Trước extraction, thêm 8 characterization tests và chạy qua facade hiện có: 8 pass. Một expected physical-line number ban đầu đếm thừa một dòng đã được sửa trong test; không sửa production để làm expected đó pass. Các case bảo vệ BOM/Unicode, comma/tab, escaped quote, quoted newline, CRLF/LF, trailing empty column, dòng trống, header, invalid row details, default points, zero answer, thứ tự/dedup biến thể và grouping/rank của nghe.

Sau đó thêm 2 test cho module độc lập: cả hai RED vì module chưa tồn tại. Sau extraction cả hai GREEN:

- Interface module mới tồn tại và facade giữ chính binding của 13 hàm, không có implementation bản sao.
- Import/parse trong process riêng với document/window/fetch/setTimeout/setInterval bị chặn vẫn thành công; không cần DOM/backend/timer.

Targeted run gồm 6 file parser/module/batch integration: **34 pass**. Kiểm tra syntax bằng node --check cho app.js, module mới và browser harness thành công. Frontend chưa có typecheck script/TypeScript config; không cài thêm compiler và không gọi syntax check là typecheck.

Final verification sau thay đổi:

| Lệnh | Kết quả |
| --- | --- |
| npm --prefix webtest34-learning-frontend test | **490 pass, 0 fail, 0 skip** |
| npm --prefix webtest34-learning-platform/backend run check | Thành công |
| npm --prefix webtest34-learning-platform/backend test | **326 pass, 0 fail, 45 skip** (371 tests) |
| git diff --check | Thành công trước staging |

Backend không thay đổi. Biến test PostgreSQL/private-input được bỏ trong process kiểm thử, không đọc/sửa .env. Các test bị skip không được coi là đã xác minh DB/private content. Không chạy live API, CI Node 22 hoặc deployment trong issue này.

## Browser evidence

Harness: [content-import-smoke.mjs](../tests/browser/content-import-smoke.mjs), chạy thủ công bằng Playwright có sẵn và Chrome headless. Không thêm dependency vào project. Network chỉ được phép tới server loopback của harness; request ngoài origin, gồm fonts/backend thật, bị chặn. API tại server fixture chỉ trả synthetic unauthorized response. Sau khi entry thực tải, mount builder bằng public interface với dữ liệu tổng hợp; không kiểm thử đăng nhập thật.

Đã chạy baseline trước di chuyển và sau di chuyển ở **1440×900, 1024×768, 390×844**. Sau khi loại nhiễu caret/hover/transition bằng cùng phương thức chụp, chạy lại baseline với riêng app.js đọc từ Git mốc trên. Các asset còn lại lấy working tree, đã xác nhận không đổi; harness không phải bản dựng lại toàn repo ở revision cũ.

Mỗi viewport kiểm tra:

- Builder ban đầu sạch; mở modal trắc nghiệm của bài tập thứ hai.
- Download template thực, kiểm BOM và tên tệp.
- Nhập dữ liệu lỗi, xem preview, xác nhận bị chặn bởi cảnh báo và không tạo item.
- File input qua FileReader với CSV tổng hợp, sau đó thao tác textarea trong các lần mở tiếp theo.
- Tab từ textarea tới input điểm CSV; Escape và nút Hủy không tạo item/dirty state.
- Modal body có overflow thực trên viewport 390: scroll tới cuối và trở lại đầu thành công. Hai viewport lớn không có modal body overflow; không ép tạo overflow giả. Builder dài cuộn được ở cả ba viewport.
- Xác nhận nhập 2 item vào đúng exercise; exercise đầu giữ rỗng, thứ tự/điểm/mapping đúng, dirty chuyển true.
- Gọi public save callback tổng hợp, quan sát payload và dirty về false; không ghi backend.
- Không có pageerror; module JS được tải 200 với JavaScript MIME qua project prefix `/preview-base/`.

Kết quả so sánh ảnh RGB bằng Pillow: **12/12 ảnh giống từng pixel** (builder, modal, invalid input, imported × 3 viewport). Focus và scroll report trước/sau tương đương.

Evidence cục bộ ngoài Git:

- `C:/Users/OS/AppData/Local/Temp/webtest34-issue18-before/`: 12 PNG và report.json.
- `C:/Users/OS/AppData/Local/Temp/webtest34-issue18-after/`: 12 PNG, report.json và visual-comparison.json.

Để tái lập, cung cấp Playwright đã cài sẵn nếu không resolve được từ môi trường:

```powershell
$env:PLAYWRIGHT_MODULE = '<absolute path to existing playwright/index.mjs>'
$env:CSV_BASELINE_REF = '0fd6274ead5ebffd934758e2962d6997d024b1e7'
node tests/browser/content-import-smoke.mjs '<temporary before directory outside repo>'
Remove-Item Env:CSV_BASELINE_REF
node tests/browser/content-import-smoke.mjs '<temporary after directory outside repo>'
```

Harness dùng Chrome channel đã cài; không tự download browser. So sánh PNG trước/sau bằng ImageChops.difference trên ảnh RGB và kiểm kích thước bằng nhau. Temp evidence không phải artifact lâu dài trên CI; giữ report này và script để tái lập, chưa upload ảnh hoặc public fixture.

Ngoài fixture server, đã chạy `serve.mjs` thật trên loopback và fetch dashboard HTML, app.js có cache query và module mới: đều **200**, MIME đúng. Sau kiểm tra đã dừng server. Project-prefix smoke do harness mô phỏng; chưa xác nhận cấu hình Pages đang chạy.

## Review hai trục

Mốc review: HEAD trước nhiệm vụ tới working tree triển khai, bao gồm file mới. Hai reviewer độc lập, không sửa code.

- **Standards:** 0 vi phạm, 0 smell đáng kể. Facade chuyển tiếp được spec cho phép; implementation không đổi, module độc lập.
- **Spec:** 1 phát hiện thiếu assertion focus/scroll trong browser harness. Đã bổ sung assertion Tab, cuộn builder/modal overflow và so sánh report trước/sau; chạy lại cả baseline/final thành công. Không có behavior mismatch hoặc scope creep được phát hiện.

Không có production bug cần sửa trong review này. Không xem assertion bổ sung cho browser harness là thay đổi hành vi ứng dụng.

## Quan sát có sẵn, giới hạn và rollback

- Parser hiện chấp nhận một số dữ liệu malformed: unmatched quote, ký tự đáp án ngoài A–D fallback, parseInt cho rank có hậu tố. Characterization giữ đúng hiện trạng; không thay validation trong refactor. Đây là nợ validation cần triage riêng nếu muốn đổi, không phải tính năng mới.
- Builder fixture ở viewport 390 có document width 697px trước lẫn sau. Đây là quan sát của fixture tách riêng, chưa đủ để kết luận mọi màn hình thật bị lỗi responsive. Không sửa CSS trong pilot và không tuyên bố kiểm chứng accessibility/responsive toàn sản phẩm.
- Chưa kiểm chứng mọi loại CSV bằng browser; parser/template các dạng được unit/characterization tests bảo vệ. Browser end-to-end tập trung trắc nghiệm theo phạm vi pilot.
- Chưa triển khai bước entry/lifecycle, TypeScript hay Vue. Pilot không phải bằng chứng framework đã khả thi hoặc app nhanh hơn.
- Rollback commit pilot trong nhánh tích hợp bằng một revert có review, không reset/clean; module/import/test/report được hoàn nguyên cùng nhau. Không có schema/dữ liệu cần migrate ngược, không đụng thay đổi người dùng.
- Tài liệu REFACTOR_PLAN.md đã tồn tại dưới dạng untracked trước nhiệm vụ; giữ nguyên và không tự đưa vào commit pilot.
