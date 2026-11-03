# HƯỚNG DẪN TẠO ĐỀ THI & BÀI TẬP BẰNG FILE CSV (TEST STUDIO)

Tài liệu hướng dẫn chi tiết dành cho giáo viên và ban học thuật (Academic Team) thuộc Hệ thống luyện thi IZONE để nhập đề thi hàng loạt qua định dạng CSV / Excel một cách nhanh chóng, chuẩn xác.

---

## MỤC LỤC
1. [Quy chuẩn kỹ thuật chung khi soạn thảo](#1-quy-chuẩn-kỹ-thuật-chung-khi-soạn-thảo)
2. [Upload CSV gộp cấp Phần (Block-Level All-in-One CSV) — Khuyên dùng](#2-upload-csv-gộp-cấp-phần-block-level-all-in-one-csv--khuyên-dùng)
3. [Hướng dẫn chi tiết từng dạng bài tập riêng lẻ (11 Dạng)](#3-hướng-dẫn-chi-tiết-từng-dạng-bài-tập-riêng-lẻ)
   - 3.1. [Trắc nghiệm đơn (Single Choice / Multiple Choice)](#31-trắc-nghiệm-đơn-single-choice--multiple-choice)
   - 3.2. [Điền ô trống ngắn (Fill in the Blank / Short Text)](#32-điền-ô-trống-ngắn-fill-in-the-blank--short-text)
   - 3.3. [Điền từ nội tuyến (Inline Cloze)](#33-điền-từ-nội-tuyến-inline-cloze)
   - 3.4. [Cặp từ vựng Anh - Việt (Vocabulary Pair)](#34-cặp-từ-vựng-anh---việt-vocabulary-pair)
   - 3.5. [Tìm và sửa lỗi sai (Error Correction)](#35-tìm-và-sửa-lỗi-sai-error-correction)
   - 3.6. [Viết lại câu có từ khóa (Sentence Transformation / Rewrite)](#36-viết-lại-câu-có-từ-khóa-sentence-transformation--rewrite)
   - 3.7. [Sắp xếp trật tự từ/câu (Sentence Reorder)](#37-sắp-xếp-trật-tự-từcâu-sentence-reorder)
   - 3.8. [Sắp xếp thứ tự nghe (Listening Order) — Chuẩn hóa 1 bài](#38-sắp-xếp-thứ-tự-nghe-listening-order--chuẩn-hóa-1-bài)
   - 3.9. [Thẻ từ vựng qua ảnh (Pictorial Vocabulary)](#39-thẻ-từ-vựng-qua-ảnh-pictorial-vocabulary)
   - 3.10. [Chọn phát âm & Ký hiệu IPA (Pronunciation Choice)](#310-chọn-phát-âm--ký-hiệu-ipa-pronunciation-choice)
   - 3.11. [Tự luận chấm AI theo Rubric (AI-Graded Rubric)](#311-tự-luận-chấm-ai-theo-rubric-ai-graded-rubric)
4. [Bảng đối chiếu mã dạng bài (Tiếng Anh & Tiếng Việt)](#4-bảng-đối-chiếu-mã-dạng-bài)
5. [Các lỗi thường gặp và cách khắc phục](#5-các-lỗi-thường-gặp-và-cách-khắc-phục)

---

## 1. QUY CHUẨN KỸ THUẬT CHUNG KHI SOẠN THẢO

- **Bộ mã ký tự UTF-8 (có BOM)**: Mọi file tải từ Test Studio về đều được nhúng sẵn ký tự UTF-8 BOM (`\uFEFF`), giúp Microsoft Excel mở trực tiếp hiển thị 100% tiếng Việt có dấu mà không bao giờ bị lỗi font (mojibake).
- **Quy tắc dấu phẩy và dấu ngoặc kép (RFC 4180)**:
  - Nếu trong nội dung câu hỏi có chứa dấu phẩy `,` hoặc dấu xuống dòng, hãy bọc toàn bộ ô đó trong cặp dấu nháy kép `""`.
  - Ví dụ: `"The ship, which departs from Miami, is large.",at,from,on,in,B,1`
- **Hỗ trợ cả dấu Tab (`.tsv`)**: Nếu giáo viên copy trực tiếp từ bảng tính Excel / Google Sheets rồi dán (Paste) vào khung nhập liệu, hệ thống tự động nhận diện phím Tab để tách cột chuẩn xác.

---

## 2. UPLOAD CSV GỘP CẤP PHẦN (BLOCK-LEVEL ALL-IN-ONE CSV) — KHUYÊN DÙNG

Tính năng này cho phép giáo viên đẩy toàn bộ các bài tập (Exercise) và mọi dạng câu hỏi trong 1 Phần thi (Block) chỉ bằng **1 file CSV duy nhất** gồm 7 cột chuẩn hóa.

### Cấu trúc 7 cột:
```csv
Exercise_Title,Exercise_Instructions,Question_Type,Prompt,Correct_Answer,Options_Or_Details,Score
```

### Ý nghĩa các cột:
1. **`Exercise_Title`**: Tên bài tập (ví dụ: `Part 1: Grammar & Vocabulary`). Nếu các dòng tiếp theo thuộc cùng bài tập, để trống ô này.
2. **`Exercise_Instructions`**: Hướng dẫn làm bài tập (ví dụ: `Choose the correct option for each question`).
3. **`Question_Type`**: Dạng câu hỏi (chấp nhận cả tiếng Anh và tiếng Việt, xem bảng mục 4).
4. **`Prompt`**: Đề bài, câu văn hoặc đường dẫn ảnh.
5. **`Correct_Answer`**: Đáp án đúng (hoặc thứ tự đúng, nghĩa tiếng Việt, bài đọc tham chiếu).
6. **`Options_Or_Details`**: Các phương án phân tách bởi dấu gạch đứng `|` hoặc thông tin bổ sung.
7. **`Score`**: Điểm số cho câu hỏi (mặc định là `1` nếu để trống).

### Ví dụ mẫu CSV cấp Phần:
```csv
Exercise_Title,Exercise_Instructions,Question_Type,Prompt,Correct_Answer,Options_Or_Details,Score
Part 1: Trắc nghiệm & Điền từ,Chọn phương án đúng và điền từ thích hợp,single_choice,The cruise departs ___ Miami every Monday.,B,at | from | on | in,1
,,single_choice,She is interested ___ marine biology.,A,in | at | on | with,1
,,fitb,Water freezes at ___ degrees Celsius.,0,,1
,,sentence_reorder,"She / has worked / here / for five years",She has worked here for five years.,,1
Part 2: Sắp xếp sự kiện nghe,Nghe và sắp xếp thứ tự các sự kiện theo đúng trình tự,listening_order,Welcome aboard meeting at main lounge,1,,1
,,listening_order,Safety drill and lifeboat inspection,2,,1
,,listening_order,Captain's dinner in dining hall,3,,1
Part 3: Đọc hiểu và Tự luận,Đọc đoạn văn và hoàn thành các bài tập,reading_matching,Paragraph A,i,The spy in the sky | The spread of technology,1
,,reading_matching,Paragraph B,ii,The spy in the sky | The spread of technology,1
,,rubric_async,Summarize the main idea of Paragraph A in 50 words.,,Ý chính đầy đủ (2đ) | Ngữ pháp chuẩn (2đ),4
```

> [!TIP]
> **Chế độ nhập dữ liệu**:
> - **Thêm nối tiếp (Append)**: Mặc định — thêm các bài tập mới vào sau các bài tập hiện có trong Phần.
> - **Ghi đè (Overwrite)**: Xóa sạch toàn bộ bài tập cũ trong Phần này và thay bằng dữ liệu trong file CSV.

---

## 3. HƯỚNG DẪN CHI TIẾT TỪNG DẠNG BÀI TẬP RIÊNG LẺ

Ngoài file CSV gộp cả Phần, giáo viên có thể tải lên file CSV riêng biệt cho từng dạng bài tập cụ thể:

### 3.1. Trắc nghiệm đơn (Single Choice / Multiple Choice)
- **Tên file mẫu**: `mau_trac_nghiem_don.csv`
- **Header**: `Question_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation,Points`
- **Quy tắc**:
  - Hỗ trợ 2 phương án (A, B), 3 phương án (A, B, C) hoặc 4 phương án (A, B, C, D).
  - Cột `Correct_Answer`: Điền chữ cái tương ứng: `A`, `B`, `C`, hoặc `D`.
- **Ví dụ**:
  ```csv
  Question_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation,Points
  The cruise departs ___ Miami.,at,from,on,in,B,Cụm từ depart from,1
  She is interested ___ marine life.,in,at,on,,A,Interested in,1
  The weather was ___ today.,good,bad,,,A,,1
  ```

---

### 3.2. Điền ô trống ngắn (Fill in the Blank / Short Text)
- **Tên file mẫu**: `mau_dien_o_trong.csv`
- **Header**: `Prompt,Target_Answer,Points`
- **Quy tắc**: Điền đề bài chứa ký hiệu chỗ trống `___` và đáp án đúng.
- **Ví dụ**:
  ```csv
  Prompt,Target_Answer,Points
  The capital of France is ___.,Paris,1
  Water freezes at ___ degrees Celsius.,0,1
  The Sun rises in the ___.,east,1
  ```

---

### 3.3. Điền từ nội tuyến (Inline Cloze)
- **Quy tắc**: Trong đề bài câu hỏi dạng Cloze, chỗ trống có thể được đánh số `(1) __________`, `(2) __________` hoặc dùng thẻ `[answer]`.
- Hệ thống tự động trích xuất các chỗ trống và tạo ô nhập liệu cho từng vị trí.

---

### 3.4. Cặp từ vựng Anh - Việt (Vocabulary Pair)
- **Tên file mẫu**: `mau_cap_tu_vung.csv`
- **Header**: `English,Vietnamese`
- **Quy tắc**: Cột 1 là từ tiếng Anh, Cột 2 là nghĩa tiếng Việt. Tự động hỗ trợ nút sinh biến thể (variants) tự động sau khi nhập.
- **Ví dụ**:
  ```csv
  English,Vietnamese
  destination,điểm đến
  itinerary,lịch trình chuyến đi
  resilient,kiên cường
  sustainable,bền vững
  environment,môi trường
  ```

---

### 3.5. Tìm và sửa lỗi sai (Error Correction)
- **Tên file mẫu**: `mau_tim_sua_loi_sai.csv`
- **Header**: `Original_Sentence,Error_Part,Correction,Accepted_Variants,Explanation`
- **Quy tắc**:
  - `Original_Sentence`: Câu văn đầy đủ có lỗi.
  - `Error_Part`: Từ hoặc cụm từ bị sai trong câu.
  - `Correction`: Đáp án sửa đúng chính thức.
  - `Accepted_Variants`: Các cách sửa đúng khác chấp nhận được (phân tách bởi dấu `|` hoặc `;`).
- **Ví dụ**:
  ```csv
  Original_Sentence,Error_Part,Correction,Accepted_Variants,Explanation
  There are much people on the ship.,much,many,a lot of,Much dùng cho danh từ không đếm được
  He go to the port yesterday.,go,went,,Quá khứ đơn của go là went
  ```

---

### 3.6. Viết lại câu có từ khóa (Sentence Transformation / Rewrite)
- **Tên file mẫu**: `mau_viet_lai_cau.csv`
- **Header**: `Original_Sentence,Mandatory_Keyword,Target_Sentence_With_Blank,Expected_Answer,Accepted_Variants`
- **Quy tắc**:
  - `Mandatory_Keyword`: Từ khóa in hoa bắt buộc học sinh phải dùng.
  - `Target_Sentence_With_Blank`: Câu gợi ý có chỗ trống `(1) __________`.
- **Ví dụ**:
  ```csv
  Original_Sentence,Mandatory_Keyword,Target_Sentence_With_Blank,Expected_Answer,Accepted_Variants
  It is not necessary for you to book now.,HAVE,You __________ tickets now.,do not have to book,don't have to book
  The cruise is too expensive for us.,ENOUGH,We do not have __________ the cruise.,enough money for,enough funds for
  ```

---

### 3.7. Sắp xếp trật tự từ/câu (Sentence Reorder)
- **Tên file mẫu**: `mau_sap_xep_cau.csv`
- **Header**: `Sentence_Text,Score,Help_Text`
- **Quy tắc**: Các từ hoặc cụm từ phân tách nhau bằng dấu gạch chéo `/`. Hệ thống sẽ tự động xáo trộn (scramble) khi học sinh làm bài và chấm điểm so với thứ tự ban đầu.
- **Ví dụ**:
  ```csv
  Sentence_Text,Score,Help_Text
  "She / has worked / at the company / for five years",1,"Thì hiện tại hoàn thành"
  "They / will travel / to Japan / next summer",1,"Thì tương lai đơn"
  "The book / which I bought yesterday / is interesting",1,"Mệnh đề quan hệ"
  ```

---

### 3.8. Sắp xếp thứ tự nghe (Listening Order) — Chuẩn hóa 1 bài
- **Tên file mẫu**: `mau_sap_xep_thu_tu_nghe.csv`
- **Header**: `Event_Text,Correct_Order,Score`
- **Quy tắc**:
  - Mỗi dòng là một sự kiện trong bài nghe.
  - Cột `Correct_Order`: Điền số nguyên thứ tự thời gian đúng (`1`, `2`, `3`, `4`...).
  - Tất cả các dòng trong file sẽ được gộp thành **1 bài tập duy nhất**, hệ thống tự động gán nhãn A, B, C, D cho từng sự kiện.
- **Ví dụ**:
  ```csv
  Event_Text,Correct_Order,Score
  Safety drill and lifeboat inspection,2,1
  Welcome aboard meeting at main lounge,1,1
  Captain's dinner in dining hall,3,1
  Evening musical performance on deck,4,1
  ```

---

### 3.9. Thẻ từ vựng qua ảnh (Pictorial Vocabulary)
- **Tên file mẫu**: `mau_tu_vung_qua_anh.csv`
- **Header**: `Image_URL,Target_Word,Vietnamese_Meaning,Accepted_Variants,Score`
- **Quy tắc**:
  - `Image_URL`: Đường dẫn ảnh Cloudflare R2 hoặc file assets nội bộ.
  - `Target_Word`: Từ vựng tiếng Anh mục tiêu.
  - `Accepted_Variants`: Các cách viết chấp nhận khác (ví dụ: có hoặc không có mạo từ `a`, `an`, `the`).
- **Ví dụ**:
  ```csv
  Image_URL,Target_Word,Vietnamese_Meaning,Accepted_Variants,Score
  assets/test 1/vocabulary/image1.png,apple,quả táo,an apple|the apple,1
  assets/test 1/vocabulary/image2.png,camera,máy ảnh,a camera|the camera,1
  https://r2.izone.edu.vn/images/lighthouse.png,lighthouse,ngọn hải đăng,a lighthouse,1
  ```

---

### 3.10. Chọn phát âm & Ký hiệu IPA (Pronunciation Choice)
- **Tên file mẫu**: `mau_phat_am_ipa.csv`
- **Header**: `Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Option,Score`
- **Quy tắc**:
  - `Prompt`: Từ vựng cần phát âm (ví dụ: `camera`) hoặc đề bài câu hỏi.
  - `Option_A` đến `Option_D`: Phiên âm IPA hoặc từ vựng lựa chọn.
  - `Correct_Option`: Chữ cái đáp án đúng (`A`, `B`, `C` hoặc `D`).
- **Ví dụ**:
  ```csv
  Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Option,Score
  camera,/ˈkæm.ər.ə/,/kəˈmɪər.ə/,/ˈkæm.eɪ.rə/,,A,1
  generous,/ˈdʒen.ər.əs/,/dʒəˈner.əs/,/ˈdʒen.eɪ.rəs/,,A,1
  Chọn từ có trọng âm khác,develop,remember,understand,consider,C,1
  ```

---

### 3.11. Tự luận chấm AI theo Rubric (AI-Graded Rubric)
- **Tên file mẫu**: `mau_tu_luan_cham_ai.csv`
- **Header**: `Prompt,Reference_Context,Max_Score,Preset_Type,Criterion_1,Criterion_2`
- **Quy tắc**:
  - `Prompt`: Đề bài câu hỏi tự luận / dịch câu.
  - `Reference_Context`: Bài đọc hoặc ngữ cảnh tham chiếu dùng để AI đối chiếu khi chấm điểm (được ẩn khỏi học sinh nếu cần).
  - `Max_Score`: Điểm tối đa của câu hỏi.
  - `Criterion_1`, `Criterion_2`: Tên và thang điểm các tiêu chí chấm.
- **Ví dụ**:
  ```csv
  Prompt,Reference_Context,Max_Score,Preset_Type,Criterion_1,Criterion_2
  "Tóm tắt ý chính của đoạn văn trên trong 50 từ.","Đoạn trích thông tin bài đọc...",4,writing_summary,"Ý chính đầy đủ (2đ)","Ngữ pháp và từ vựng (2đ)"
  "Translate into English: Chuyến tàu rời cảng lúc 8 giờ sáng.",,4,rubric_translation_v1,"Độ chính xác ý nghĩa (2đ)","Cấu trúc ngữ pháp (2đ)"
  ```

---

## 4. BẢNG ĐỐI CHIẾU MÃ DẠNG BÀI

Hệ thống tự động nhận diện linh hoạt các từ khóa sau trong cột `Question_Type` (không phân biệt chữ hoa/thường hay dấu tiếng Việt):

| Tên chuẩn hệ thống | Mã tiếng Anh nhận diện | Từ khóa tiếng Việt nhận diện |
| :--- | :--- | :--- |
| **Trắc nghiệm đơn** | `single_choice`, `mcq`, `choice` | `trắc nghiệm`, `trac nghiem`, `chọn đáp án` |
| **Điền ô trống ngắn** | `fitb`, `short_text` | `điền từ`, `dien tu`, `ô trống` |
| **Điền từ nội tuyến** | `inline_cloze`, `cloze` | `điền từ nội tuyến`, `dien tu noi tuyen` |
| **Cặp từ vựng Anh - Việt** | `vocabulary_pair`, `vocab` | `cặp từ vựng`, `tu vung`, `từ vựng` |
| **Tìm và sửa lỗi sai** | `error_correction` | `sửa lỗi sai`, `sua loi`, `tìm lỗi sai` |
| **Viết lại câu có từ khóa**| `sentence_transformation`, `sentence_rewrite` | `viết lại câu`, `viet lai cau`, `biến đổi câu` |
| **Sắp xếp câu** | `sentence_reorder` | `sắp xếp câu`, `sap xep cau`, `trật tự từ` |
| **Sắp xếp thứ tự nghe** | `listening_order` | `sắp xếp nghe`, `sap xep nghe`, `thứ tự nghe` |
| **Thẻ từ vựng qua ảnh** | `pictorial_vocabulary`, `pictorial` | `từ vựng qua ảnh`, `tu vung anh`, `hình ảnh` |
| **Phát âm & Trọng âm** | `pronunciation_choice`, `pronunciation` | `phát âm`, `phat am`, `trọng âm`, `ipa` |
| **Tự luận chấm AI** | `rubric_async`, `writing` | `tự luận`, `tu luan`, `chấm ai`, `rubric` |

---

## 5. CÁC LỖI THƯỜNG GẶP VÀ CÁCH KHẮC PHỤC

1. **Lỗi hiển thị dấu `?` hoặc ký tự lạ khi mở bằng Excel**:
   - *Nguyên nhân*: File CSV lưu ở định dạng ANSI thay vì UTF-8.
   - *Cách khắc phục*: Khi lưu trong Excel, chọn **Save As** $\rightarrow$ chọn định dạng **CSV UTF-8 (Comma delimited) (*.csv)**. Các file tải về từ Test Studio đã có sẵn UTF-8 BOM chuẩn.
2. **Nội dung câu có dấu phẩy bị nhảy sang cột khác**:
   - *Nguyên nhân*: Thiếu cặp dấu nháy kép `""` bọc quanh câu.
   - *Cách khắc phục*: Bọc toàn bộ câu trong dấu nháy kép, ví dụ: `"The dog, cat, and bird",A,1`.
3. **Dán từ Google Sheets / Excel bị lệch dòng**:
   - Test Studio hỗ trợ đầy đủ dán trực tiếp dữ liệu dạng bảng (Tab-delimited). Chỉ cần bôi đen các ô trên Excel/Sheets $\rightarrow$ nhấn `Ctrl + C` $\rightarrow$ dán trực tiếp vào khung Textarea của Test Studio.
