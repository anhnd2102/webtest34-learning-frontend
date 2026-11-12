# Bổ sung icon còn thiếu và sửa spinner

Ngày 10/11/2026. Nhánh `fix/missing-svg-icons`, baseline `9743572` (`fix/danger-color-unify`). Đây là thay đổi hình ảnh có chủ đích theo quyết định của chủ dự án, không phải refactor thuần.

## Vấn đề

`renderSvgIcon(name)` trả chuỗi rỗng khi `name` không có trong `ICONS`, nên các nút gọi tên sai không bao giờ có icon. Đã xác minh bằng cách gọi hàm thật: `move`, `play`, `pause`, `volume`, `info`, `arrow-right`, `eye`, `refresh` đều rỗng. Ngoài ra icon `rotate` (dùng làm spinner "Đang lưu…", "Đang chấm AI…", "Đang phân tích tác động…", "Đang công bố…") có đường vẽ kết thúc bằng `l5.67-5.67`, đi ra ngoài khung 24×24 nên bị cắt chéo ở góc trên phải.

## Thay đổi

- `ui/icons.js`: thêm `play`, `pause`, `volume` (giống hệt icon của renderer học viên), `move`, `info`, `eye`, `refresh`. Dùng nét `1.8` theo Design System và `aria-hidden="true"`, `width/height` 13 như các icon dashboard khác.
- `rotate` đổi sang đường chuẩn `rotate-cw` nằm trọn trong khung.
- `studio/publishing.js`: `arrow-right` → `arrowRight` (2 chỗ; tên đúng đã có sẵn).
- Các nút nay hiển thị icon: Chuyển sang Phần khác, Nghe thử (khối, bài tập nghe, và đang phát: Tạm dừng), Bắt đầu nghe và biểu tượng âm lượng của dock mô phỏng, hộp thoại chuyển bài tập (move, info), Tiếp tục (bước 1 công bố, cả khi khôi phục sau lỗi), Xem trước ảnh, Áp dụng cho cả phần này.

## Chống tái phát

`tests/icon-registry.test.mjs` (5 test): mọi tên `renderSvgIcon('…')` trong dashboard phải tồn tại; mọi `ICONS.<tên>` ở module dashboard (import từ `ui/icons.js`) và ở renderer học viên phải tồn tại (icon undefined sẽ in chữ "undefined" ra giao diện); icon mới có nét 1.8 và `aria-hidden`; đường `rotate` không còn đoạn lòi ra khung. Đã chạy test trên mã cũ để xác nhận nó thất bại đúng chỗ (liệt kê các tên thiếu) và pass trên mã mới.

## Xác minh

- `npm test`: 668/668 pass.
- Browser (fixture sẵn có, 3 viewport) bổ sung assertion trên HTML của từng nút: move dialog có icon move và info; bảng từ vựng có icon refresh; nút Nghe thử có icon play; nút Xem trước ảnh có icon eye; nút Chuyển sang Phần khác có icon move; nút Tiếp tục bước 1 có icon mũi tên.
- Helper mới `ELEMENT_SHOTS=1` chụp cận cảnh từng nút; đã xem bằng mắt ở 390px: các icon hiển thị đúng và căn chỉnh với chữ.
- Smoke vòng đời đầy đủ (6 lượt × 10 vòng mount/dispose): 0 browser errors. Các smoke `builder-lifecycle`, `dashboard-lifecycle`, `exam-room-lifecycle`, `dashboard-read-concurrency`, `candidate-mobile` đều pass.

## Giới hạn

- Ở 390px, nút "Chuyển sang Phần khác" và "Xem trước ảnh" hiển thị chữ trên 2 dòng. Chưa có số đo trước/sau (lần chụp trước khi sửa dừng ở assertion mới nên không có ảnh để so); khả năng cao icon 18px làm hẹp chỗ cho chữ. Nút vẫn dùng được; nếu cần có thể thêm `white-space: nowrap` hoặc rút gọn nhãn ở một đợt riêng.
- Chưa kiểm phát âm thanh thật (Nghe thử/Tạm dừng) ngoài việc icon hiển thị.
- Icon `rotate` thay đổi hình dạng ở mọi nơi dùng, gồm "Đang lưu…" của bản nháp (`draft-saving.js`).

Rollback: revert commit như một đơn vị.
