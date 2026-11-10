# Cleanup inline styles tĩnh của modal nhập Cặp từ vựng (CSV / Excel)

Ngày 10/11/2026. Nhánh `refactor/vocab-batch-modal-styles`, xếp chồng trên `refactor/question-renderer-styles` (`a158c4d`, chưa merge vào `main`). Cần merge theo thứ tự này vì cả hai đợt cùng sửa `styles.css`, rev trong `index.html`, manifest, rule map và inventory.

## Phạm vi

- `studio/authoring/vocabulary.js` (`openBatchVocabPairModal`): chuyển 12 inline style attribute tĩnh của template modal và 3 `<span style>` màu trong `previewBox.innerHTML` (đường lỗi, thành công, cảnh báo) sang class. Tổng 15 vị trí; inventory 231 → 216.
- CSS thêm cuối fragment 07, scope `#batch-vocab-pair-modal`. Scope bằng ID là bắt buộc: `.modal-batch-vocab-header h3` và `.modal-batch-vocab-footer` (fragment 04) đã có rule riêng, trước đây bị inline đè; rule mới có specificity ID để thắng đúng như inline cũ.
- Token dùng đúng giá trị, không thêm token: `--izone-text-muted` (#64748b), `--izone-slate-bg` (#f8fafc), `--izone-border` (#e2e8f0), `--izone-import-error` (#ef4444), `--izone-import-success` (#10b981), `--izone-import-warning` (#f59e0b). Không thêm `!important`, radius hay màu cứng.
- **Giữ inline có chủ đích**: `style="display: none;"` của `.vocab-preview-summary` (JS bật/tắt ở `updatePreview`), `modal.style.display` đóng/mở modal. Phần trình bày tĩnh còn lại của preview chuyển sang CSS. File input ẩn dùng class `vocab-batch-hidden` vì không có code nào đổi style của nó (chỉ `fileInput.click()`).
- Không đổi DOM ngoài việc bỏ `style` và thêm class (thêm `vocab-batch-title`, `vocab-batch-file-actions`, `vocab-batch-hint`, `vocab-batch-csv-field`, `vocab-batch-csv-label`, `vocab-batch-options`, `vocab-batch-footer-actions`, `vocab-batch-notice`, `vocab-batch-hidden`, `vocab-batch-preview-*`). Không đổi parser, handler, draft hay grading.
- CSS revision `20261110-vocab-batch1`; manifest/rule map (1789 → 1804 rule)/inventory được tái tạo bằng script đã kiểm trên baseline.

## Xác minh

- `node --check studio/authoring/vocabulary.js` pass (syntax check, không phải typecheck).
- `npm test`: **661 tests, 661 pass, 0 fail, 0 skip** (Node v24.19.0).
- Harness mới `VOCAB_BATCH_MODAL_STYLE_PARITY=1`: mount Builder thật với hai câu vocab, mở modal bằng nút thật, chụp 3 trạng thái runtime: modal rỗng (preview ẩn, file input ẩn), chỉ dòng lỗi (thông báo "Chưa tìm thấy"), hỗn hợp hợp lệ + bỏ qua ("Tìm thấy 2", "Bỏ qua 1"); sau đó xóa input (preview ẩn lại), đóng modal, dispose. Baseline chụp trên nhánh mới sau khi thêm fixture, trước khi sửa code.
- Parity trước/sau trên 1440×900, 1024×768, 390×844: **21/21 computed snapshots toàn DOM giống baseline** (gồm 9 snapshot trạng thái modal; 23 thuộc tính, không loại phần tử).
- PNG: 20/21 giống từng byte, gồm cả 9 ảnh modal. `1024-dirty-modal.png` khác 34 pixel (maxChannel 11/255) ở màn xác nhận thay đổi chưa lưu, không dùng module này và computed giống hệt; không chụp lại để chọn kết quả thuận lợi.
- Smoke tích hợp đầy đủ (không bật cờ parity): root và `/preview-base` × 3 viewport, mỗi lượt 10 vòng mount/dispose, 0 browser errors, 13 CSS responses 200/`text/css`.

## Giới hạn

- Bật cờ parity vẫn gặp assertion focus "Staying returns keyboard focus" có sẵn của harness; đợt này harness dừng ở chế độ `CAPTURE_ONLY`, còn lifecycle smoke chạy riêng.
- Chưa kiểm luồng nhập thật bằng file .csv/.xlsx trong trình duyệt (chỉ kiểm preview khi dán), API/DB thật, Pages deployment.
- Artifacts nằm trong scratchpad của phiên: `vb-before/`, `vb-after/`, `vb-smoke/`.

Rollback: revert commit template/CSS/metadata như một đơn vị.
