# Bước 2 — kiểm chứng tích hợp lifecycle và rollback (#24)

Ngày xác minh: **04/11/2026**, Asia/Ho_Chi_Minh. Spec: [#24](https://github.com/anhnd2102/webtest34-learning-frontend/issues/24), parent [#19](https://github.com/anhnd2102/webtest34-learning-frontend/issues/19).

## Phạm vi và workspace

- Nhánh `refactor/step2-integration-verification`, worktree riêng `.worktrees/frontend-step2-verification`, xuất phát từ `2a13447` trên `feature/test-studio`.
- Không đưa thay đổi chưa commit của workspace chính vào kiểm chứng: HTML/CSS, template Excel và vendor ở đó thuộc công việc khác. Không reset/stash/copy đè các file này.
- #20–22 đã được tích hợp trước lượt này; #23 có implementation `a8c203c`; bản sửa tích hợp trước đó là `07d145c`. Lượt này xác minh trạng thái đã commit hiện tại và sửa lỗi phát hiện qua integration.
- Không đổi CSS, HTML, backend, API, schema, dữ liệu thật, framework hoặc pipeline deploy. Chưa push/merge/deploy nhánh này. Parent #19 được giữ nguyên.

## Lỗi phát hiện và sửa theo test

1. Harness integration không chạy trong linked worktree: `.git` là file, nên mkdir dưới `.git/verification` báo ENOTDIR. Đã tái hiện lỗi trước sửa; integration, room và rollback harness nay hỏi Git bằng `rev-parse --git-path` để ghi vào đúng metadata của worktree. Rollback chuẩn hóa đường dẫn Windows bằng `path.resolve` trước containment check.
2. Dispose Builder cũ xóa hộp thoại chưa lưu của Builder khác. Integration báo `Cleanup removed another Builder dialog`; test mới trong `studio-builder-lifecycle` tái hiện RED rồi GREEN sau khi cleanup theo owner.
3. Review tìm thêm ownership khi dùng lại overlay hoặc khi có nhiều Builder roots. Đã thêm browser regression RED (`Foreign guard incorrectly claimed another root’s CSV modal`) rồi GREEN: owner truyền tường minh từ các caller Builder, được gắn lại mỗi lần mở overlay kể cả tái sử dụng DOM. Dispose owner cũ giữ overlay hiện thuộc owner mới; dispose owner mới xóa đúng overlay.

Modal metadata dùng WeakMap, không thêm DOM attribute hoặc thay giao diện. Builder chỉ dọn modal đã ghi nhận thuộc owner đó; không dùng selector toàn cục để xóa modal không rõ chủ. Đường cleanup generic CSV modal dùng close nội bộ để tháo window keydown và hủy delayed focus, không kích hoạt confirm/import. Khi thay generic modal cũ cũng chạy cleanup trước khi tháo DOM.

## Kết quả chạy thực tế

Môi trường: Node **v24.19.0**, Chrome **156.0.8078.80**, Playwright đã có sẵn. Fixture tổng hợp, network bị giới hạn vào server cục bộ/API interception; không đọc .env hay dùng token/PII thật.

| Kiểm tra | Kết quả |
| --- | --- |
| Targeted lifecycle/read/room trên baseline | 39 pass, 0 fail |
| Builder regression + guard suite sau sửa owner | 11 pass, 0 fail |
| Toàn frontend `npm test` | **616 tests: 614 pass, 2 skip, 0 fail** |
| `dashboard-integration-smoke` | **6 tổ hợp × 10 chu kỳ**, 0 page errors |
| `dashboard-read-concurrency-smoke` | 1440×900, 1024×768, 390×844 đều pass, 0 page errors |
| `exam-room-lifecycle-smoke` | **3 viewport × 10 chu kỳ**, reconnect verified, 0 page errors |
| `dashboard-rollback-smoke` | **5 historical snapshots × 2 đường dẫn**, đúng entry/import/MIME và 1 session restore, 0 page errors |
| Backend `npm run check` | Thành công |
| Backend `npm test` | **384 tests: 337 pass, 47 skip, 0 fail** |
| Backend `npm run contract` | **4 pass, 0 fail** |
| Backend `npm run webtest34:types:check` | Thành công: 9 canonical types, 6 legacy aliases |
| Backend `npm run webtest34:content:test` | **3 skip, 0 pass**; không có private inputs |

Hai frontend test skip là kiểm tra DESIGN_SYSTEM.md và hướng dẫn AGENTS/GEMINI ở thư mục cha của repo; linked worktree không chứa tài liệu workspace cha tại vị trí đó. Không bỏ qua test ứng dụng để làm suite pass. Backend skip PostgreSQL/private-input không phải xác nhận database hoặc nội dung riêng. Frontend chưa có TypeScript compiler; syntax check không phải typecheck. Không cài dependency mới.

Integration chạy cả `/` và `/preview-base` tại ba viewport. Các kịch bản: khôi phục URL và session; re-import entry không bootstrap trùng; chỉnh/import CSV; save lỗi rồi thành công; Back/Forward và dirty ở lại/rời; focus trở lại nút khởi tạo; Escape giữ draft; ở lại giữ scroll/input; save muộn không clear guard đề mới; 10 vòng mở/đóng Builder và Phòng thi, dispose/remount dashboard; listener/storage của owner ngoài không bị xóa. Sau đó kiểm cả hai thứ tự ownership của modal từ hai Builder roots và chuyển quyền preview tái sử dụng.

Read smoke chứng minh A/B, filter/page và stale response/error không ghi lên scope mới. Room smoke chứng minh đóng/đổi scope/logout/dispose dừng stream/reader/reconnect/fallback; phòng mới tiếp tục nhận cập nhật. Những tình huống cụ thể ở public seam còn được unit tests với deferred fetch/stream và fake clock bảo vệ, không dùng thời gian chờ polling 30 giây thực.

### Visual, static path và cache

- Chụp baseline từ **2a13447** trước sửa ownership và final sau sửa tại cùng Chrome/fixture. Không dùng CSS/HTML chưa commit của workspace chính làm baseline; không so với production hoặc trước toàn bộ refactor.
- 12 ảnh: dashboard, builder, dirty-modal, room × 3 viewport. **Final run: 12/12 PNG byte-identical**. Lần chạy trung gian có nhiễu raster nhỏ và đã được xem ảnh; lượt chốt chạy lại cho kết quả đồng nhất, không sửa CSS để ép khớp.
- Baseline và final tắt animation/transition/caret trong harness, chờ font ready, blur focus khi chụp; keyboard/focus được kiểm riêng trước/sau tương tác.
- Với mỗi tổ hợp, các JavaScript module trả **200 + JavaScript MIME**. Fetch entry theo reload/force-cache/thêm query cho cùng nội dung; revision vẫn tồn tại, static server trả no-store. Project-prefix được fixture route mô phỏng, chưa kiểm Pages hosting thật.
- Tràn ngang hiện có trên viewport 390 được giữ nguyên; không tuyên bố toàn sản phẩm đã đạt responsive/accessibility.

Artifact không nằm trong source: hỏi đường dẫn bằng `git rev-parse --path-format=absolute --git-path verification/issue-24`. Bên trong có `baseline/`, `final/report.json`, 12 PNG mỗi bộ, `rollback-report.json`, archive/snapshot lịch sử. Room artifact tương tự dưới `verification/issue-23`.

## Đối chiếu acceptance của parent #19

| Tiêu chí parent | Triển khai/bằng chứng |
| --- | --- |
| Inventory và owner tài nguyên | Báo cáo #20, #21, #23; overlay ownership được bổ sung ở lượt #24 này |
| Entry một lần, import an toàn khi có document | #20; dashboard lifecycle unit + actual entry/cache probe trong integration |
| Mount handle, idempotent dispose/remount | #20–21; 10 vòng public mount/dispose trong unit/browser |
| Export/caller cũ và CSV tương thích | #18–21; toàn bộ suite hiện tại + import CSV trong integration |
| Listener/timer/delayed callback và tài nguyên foreign | Lifecycle/Builder tests; regression modal foreign/reuse; kiểm storage và foreign click |
| SSE reader/reconnect/fallback/polling | #20/#23 unit với fake clock, room smoke ở ba viewport |
| Stale response/error/filter/page | #22 concurrency/coordinator tests, read browser smoke |
| Save completion cũ và guard mới | Builder late-save tests và integration với pending save; không retry ghi |
| Dirty ở lại/rời/history/đề khác | #21 và integration qua history/modal; không dispose trước quyết định |
| Native beforeunload và cleanup listener | Dashboard lifecycle unit dispatch event cancelable khi guard dirty, kiểm sau dispose; native text do browser kiểm soát |
| Browser, keyboard/focus/scroll và visual parity | 6 tổ hợp browser, explicit focus/scroll/Escape assertions, 12 ảnh baseline/final |
| Suite/static contract và giới hạn môi trường | Bảng verification phía trên; ghi rõ 2 frontend skip/47 backend skip, chưa CI/live |
| Không đổi nghiệp vụ/CSS/backend/framework | Diff lượt này chỉ ownership trong app, test/harness và báo cáo; các thay đổi khác của HEAD là baseline có trước |
| Review Standards/Spec và rollback | Review hai trục và rollback snapshots bên dưới |

Đối chiếu #24: cả 10 nhóm acceptance đã có bằng chứng từ bảng mapping, integration, concurrency/room smoke, screenshots, static probes, matrix test và rollback. Các giới hạn CI/live/hosting/private input được ghi rõ; không tính các boundary đó là pass.

## Review hai trục

Standards và Spec được review độc lập trên diff từ `2a13447` tới working tree lượt này. Cả hai tìm cùng một lỗi attribution của overlay tái sử dụng/guard toàn cục; không gộp kết quả để che trục nào.

- **Standards:** 1 finding correctness/ownership. Đã truyền owner từ caller, retag trên mỗi open và thêm browser regression RED→GREEN. Không có finding khác ở artifact path hoặc thay đổi ngoài phạm vi được báo.
- **Spec:** 1 finding foreign-resource isolation. Đã sửa và kiểm bằng hai Builder roots, dispose hai thứ tự, generic CSV và reused preview; final integration pass toàn bộ 6 tổ hợp. Không có requirement gap khác được báo ngoài evidence/report đang được hoàn tất tại thời điểm review.

Không có phát hiện được để lại dưới dạng “đã pass” mà chưa kiểm. Không claim review toàn bộ lịch sử feature/test-studio hoặc tất cả tính năng được thêm sau các commit refactor.

## Rollback đã thử và cách tích hợp

Harness xuất source bằng git archive ra metadata Git, không checkout/reset/revert workspace người dùng. Đã mở browser ở cả root/project-prefix cho:

1. `a8c203c` — trước sửa tích hợp #24.
2. `7ab2f3e` — trước SSE ownership #23.
3. `e263d26` — trước request freshness #22.
4. `915bc91` — trước Builder lifecycle #21.
5. `ad358df` — trước browser entry #20; snapshot này dùng app entry cũ.

Mỗi snapshot giữ đúng entry tương ứng, tải các module/MIME, khôi phục lớp/Bài được giao/query/tab và chỉ restore session một lần. Đây là smoke khả năng mở phiên bản rollback, không phải khẳng định phiên bản cũ có các bảo vệ mới.

Để bỏ thay đổi lượt này, revert riêng commit #24 của nhánh này cùng tests/harness/report. Nếu bỏ các bước trước, revert có review theo thứ tự phụ thuộc (24→23→22→21→20), khôi phục script entry tương ứng và chạy static/URL smoke; không chép app cũ đè lên các feature mới trên feature/test-studio. Không có data/schema migration cần hoàn nguyên. Chưa merge nhánh verification vào workspace chính có thay đổi dở dang.

## Tái lập

Từ worktree frontend, dùng Playwright/Chrome đã cài và biến PLAYWRIGHT_MODULE nếu cần:

```powershell
$env:CAPTURE_ONLY = '1'
$env:ARTIFACT_LABEL = 'baseline'
node tests/browser/dashboard-integration-smoke.mjs
Remove-Item Env:CAPTURE_ONLY
Remove-Item Env:ARTIFACT_LABEL
$env:COMPARE_BASELINE = '1'
node tests/browser/dashboard-integration-smoke.mjs
node tests/browser/dashboard-read-concurrency-smoke.mjs
node tests/browser/exam-room-lifecycle-smoke.mjs
node tests/browser/dashboard-rollback-smoke.mjs
npm test
```

Để so sánh thay đổi tương lai, chụp baseline trước khi sửa source; không ghi đè artifact baseline cũ rồi gọi đó là bằng chứng trước/sau.
