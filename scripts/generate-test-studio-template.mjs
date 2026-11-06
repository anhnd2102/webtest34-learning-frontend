import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const vendorPath = join(__dirname, '../term-tests/teacher-dashboard/vendor/xlsx.full.min.js');
const templateOutPath = join(__dirname, '../term-tests/teacher-dashboard/assets/templates/mau_de_thi_test_studio.xlsx');

const xlsxCode = readFileSync(vendorPath, 'utf8');
const fn = new Function('window', 'global', `${xlsxCode}; return window.XLSX || global.XLSX;`);
const XLSX = fn(globalThis, globalThis);

const wb = XLSX.utils.book_new();

// Sheet 1: Nhap_De_Thi
const nhapDeThiData = [
  [
    'Exercise_Title',
    'Exercise_Instructions',
    'Question_Type',
    'Prompt',
    'Correct_Answer',
    'Options_Or_Details',
    'Score'
  ],
  [
    'Phần 1: Cặp từ vựng (Vocabulary Pair)',
    'Nối từ tiếng Anh với nghĩa tiếng Việt tương ứng',
    'vocabulary_pair',
    'destination',
    'điểm đến',
    '',
    1
  ],
  [
    '',
    '',
    'vocabulary_pair',
    'itinerary',
    'lịch trình chuyến đi',
    '',
    1
  ],
  [
    '',
    '',
    'vocabulary_pair',
    'excursion',
    'chuyến tham quan ngắn',
    '',
    1
  ],
  [
    '',
    '',
    'vocabulary_pair',
    'embark',
    'lên tàu / bắt đầu chuyến đi',
    '',
    1
  ],
  [
    'Phần 2: Trắc nghiệm đơn (Multiple Choice)',
    'Chọn một phương án đúng nhất A, B, C hoặc D',
    'single_choice',
    'The cruise departs ___ Miami every Monday morning.',
    'B',
    'at | from | on | in',
    1
  ],
  [
    '',
    '',
    'single_choice',
    'Passengers must arrive at the port ___ 2 hours before departure.',
    'A',
    'at least | at most | approximately | exactly',
    1
  ],
  [
    'Phần 3: Trắc nghiệm nhóm (Multi-Select Group)',
    'Chọn 2 phương án chính xác trong các lựa chọn sau',
    'multi_select_group',
    'Which TWO activities are free of charge for cruise guests?',
    'A, C',
    'Swimming pool | Tennis court | Fitness center | Sauna | Yoga class',
    2
  ],
  [
    'Phần 4: Điền từ nội tuyến (Inline Cloze Passage)',
    'Đọc đoạn văn và điền từ thích hợp vào mỗi chỗ trống đánh số',
    'inline_cloze',
    'The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) __________. Passengers can enjoy local seafood and (3) __________ culture.',
    'six / 6 | Nassau | Bahamian',
    '',
    1
  ],
  [
    'Phần 5: Điền ô trống ngắn (Fill in the Blank)',
    'Điền từ hoặc số thích hợp vào chỗ trống',
    'fitb',
    'Water freezes at ___ degrees Celsius at sea level.',
    '0',
    'zero | 0 degrees',
    1
  ],
  [
    '',
    '',
    'fitb',
    'The capital of France is ___.',
    'Paris',
    'paris',
    1
  ],
  [
    'Phần 6: Tìm và sửa lỗi sai (Error Correction)',
    'Tìm một từ viết sai trong câu và viết lại từ đúng',
    'error_correction',
    'We have two knife in the kitchen.',
    'knife',
    'knives',
    1
  ],
  [
    '',
    '',
    'error_correction',
    'Danny bought five bottle of water in the supermarket.',
    'bottle',
    'bottles',
    1
  ],
  [
    '',
    '',
    'error_correction',
    'There are much people in the conference room.',
    'much',
    'many',
    1
  ],
  [
    'Phần 7: Sắp xếp câu (Sentence Reorder)',
    'Sắp xếp các cụm từ sau thành câu hoàn chỉnh',
    'sentence_reorder',
    'She / has worked / at the hospital / for five years',
    'She has worked at the hospital for five years.',
    'Thì hiện tại hoàn thành',
    1
  ],
  [
    'Phần 8: Sắp xếp thứ tự nghe (Listening Order)',
    'Nghe đoạn băng và đánh số thứ tự xuất hiện của các sự kiện (1, 2, 3...)',
    'listening_order',
    'Welcome aboard briefing at the Grand Lounge',
    '1',
    '',
    1
  ],
  [
    '',
    '',
    'listening_order',
    'Safety drill and life jacket demonstration',
    '2',
    '',
    1
  ],
  [
    '',
    '',
    'listening_order',
    'Captain\'s welcome dinner in main dining room',
    '3',
    '',
    1
  ],
  [
    'Phần 9: Viết lại câu có từ khóa (Sentence Transformation)',
    'Viết lại câu thứ hai sao cho nghĩa không đổi, bắt buộc dùng từ in hoa',
    'sentence_transformation',
    'It is not necessary for you to bring your own towel.',
    'HAVE',
    'You (1) __________ your own towel. | do not have to bring',
    1
  ],
  [
    'Phần 10: Từ vựng qua ảnh (Pictorial Vocabulary)',
    'Nhìn hình ảnh và gõ từ vựng tiếng Anh tương ứng',
    'pictorial_vocabulary',
    'https://drive.google.com/uc?export=download&id=SAMPLE_ID',
    'apple',
    'an apple | quả táo',
    1
  ],
  [
    'Phần 11: Phát âm & Trọng âm (Pronunciation Choice)',
    'Chọn phương án có phiên âm IPA chính xác',
    'pronunciation_choice',
    'camera',
    'A',
    '/ˈkæm.ər.ə/ | /kəˈmɪər.ə/ | /kæmˈrɑː/',
    1
  ],
  [
    'Phần 12: Tự luận chấm AI (AI Rubric Writing & Translation)',
    'Dịch câu sau sang tiếng Anh hoặc viết tóm tắt',
    'rubric_async',
    'Dịch sang tiếng Anh: Chuyến tàu sẽ khởi hành lúc 8 giờ sáng mai.',
    'The train will depart at 8 a.m. tomorrow.',
    'Ý nghĩa chính xác (2đ) | Ngữ pháp chuẩn (2đ)',
    4
  ]
];

const ws1 = XLSX.utils.aoa_to_sheet(nhapDeThiData);
// Set column widths
ws1['!cols'] = [
  { wch: 30 }, // Title
  { wch: 40 }, // Instructions
  { wch: 22 }, // Type
  { wch: 55 }, // Prompt
  { wch: 20 }, // Answer
  { wch: 45 }, // Details
  { wch: 8 }   // Score
];
XLSX.utils.book_append_sheet(wb, ws1, 'Nhap_De_Thi');

// Sheet 2: Huong_Dan_Chi_Tiet
const huongDanData = [
  [
    'Mã Dạng Bài (Question_Type)',
    'Tên Dạng Bài',
    'Cột Prompt (Đề bài)',
    'Cột Correct_Answer (Đáp án đúng)',
    'Cột Options_Or_Details (Chi tiết / Lựa chọn)',
    'Điểm (Score)',
    'Quy tắc & Ví dụ cụ thể'
  ],
  [
    'single_choice (hoặc trac_nghiem)',
    'Trắc nghiệm đơn',
    'Câu hỏi / Đề bài chứa chỗ trống ___',
    'Chữ cái đáp án đúng (A, B, C hoặc D)',
    'Các lựa chọn ngăn cách bằng dấu gạch đứng | (e.g. at | from | on | in)',
    '1',
    'Prompt: The cruise departs ___ Miami. | Correct_Answer: B | Options: at | from | on | in'
  ],
  [
    'multi_select_group (hoặc trac_nghiem_nhom)',
    'Trắc nghiệm nhóm (Chọn 2-3 đáp án)',
    'Đề bài chung yêu cầu chọn nhiều phương án',
    'Các chữ cái đáp án đúng ngăn cách bằng dấu phẩy hoặc | (e.g. A, C hoặc A | C)',
    'Toàn bộ các lựa chọn ngăn cách bằng dấu | (e.g. Swimming pool | Tennis court | Fitness center | Sauna | Yoga class)',
    '2 (hệ thống tự chia đều cho các slot)',
    'Prompt: Which TWO activities are free? | Correct_Answer: A, C | Options: Swimming pool | Tennis court | Fitness center | Sauna | Yoga class'
  ],
  [
    'inline_cloze (hoặc dien_tu_noi_tuyen)',
    'Điền từ nội tuyến (Đoạn văn)',
    'Toàn bộ đoạn văn chứa các chỗ trống đánh số (1) _____ hoặc [1] hoặc {{1}}',
    'Danh sách đáp án cho từng chỗ trống ngăn cách bằng dấu | theo đúng thứ tự (nhiều biến thể ngăn cách bằng /)',
    'Để trống',
    '1 (điểm cho mỗi chỗ trống; tổng điểm tự nhân với số chỗ trống)',
    'Prompt: Visits (1) _____ islands and arrives in (2) _____. | Correct_Answer: six / 6 | Nassau'
  ],
  [
    'error_correction (hoặc sua_loi)',
    'Tìm và sửa lỗi sai',
    'Câu văn gốc chứa từ viết sai',
    'Từ viết sai trong câu gốc (Error Word)',
    'Từ đúng sau khi sửa lại (Correction), có thể thêm biến thể cách nhau bằng |',
    '1',
    'Prompt: We have two knife in the kitchen. | Correct_Answer: knife | Options: knives (Hệ thống có Smart Auto-Detect tự nhận diện từ nằm trong câu)'
  ],
  [
    'fitb (hoặc dien_tu)',
    'Điền ô trống ngắn',
    'Đề bài chứa ký hiệu chỗ trống ___',
    'Đáp án chính xác nhất',
    'Các biến thể chấp nhận ngăn cách bằng | (e.g. zero | 0 degrees)',
    '1',
    'Prompt: Water freezes at ___ degrees. | Correct_Answer: 0 | Options: zero | 0 degrees'
  ],
  [
    'vocabulary_pair (hoặc tu_vung)',
    'Cặp từ vựng Anh - Việt',
    'Từ / cụm từ tiếng Anh (e.g. destination)',
    'Nghĩa tiếng Việt chuẩn (e.g. điểm đến)',
    'Để trống (hệ thống tự gom toàn bộ nghĩa trong bài vào dropdown)',
    '1 (hoặc số điểm tùy ý)',
    'Prompt: destination | Correct_Answer: điểm đến | Options: để trống'
  ],
  [
    'sentence_transformation (hoặc viet_lai_cau)',
    'Viết lại câu có từ khóa',
    'Câu văn gốc ban đầu',
    'Từ khóa bắt buộc in hoa (e.g. HAVE)',
    'Câu đích chứa chỗ trống (1) __________ | Cụm từ đáp án đúng (ngăn cách bằng |)',
    '1',
    'Prompt: It is not necessary to book. | Correct_Answer: HAVE | Options: You (1) __________ in advance. | do not have to book'
  ],
  [
    'sentence_reorder (hoặc sap_xep_cau)',
    'Sắp xếp trật tự câu',
    'Các từ/cụm từ phân tách bởi dấu gạch chéo / (e.g. She / has worked / here / for five years)',
    'Câu hoàn chỉnh sau khi sắp xếp đúng',
    'Gợi ý làm bài (Help Text, nếu có, hoặc để trống)',
    '1',
    'Prompt: She / has worked / here / for five years | Correct_Answer: She has worked here for five years. | Options: Thì HTHT'
  ],
  [
    'listening_order (hoặc sap_xep_nghe)',
    'Sắp xếp thứ tự nghe',
    'Tên sự kiện / thông tin nghe được trong bài',
    'Thứ tự số nguyên xuất hiện trong bài (1, 2, 3...)',
    'Để trống',
    '1',
    'Prompt: Welcome aboard briefing | Correct_Answer: 1 | Options: để trống'
  ],
  [
    'pictorial_vocabulary (hoặc tu_vung_anh)',
    'Từ vựng qua ảnh',
    'Đường dẫn link ảnh HTTPS hoặc Google Drive (e.g. https://drive.google.com/...)',
    'Từ tiếng Anh mục tiêu cần đoán',
    'Các biến thể chấp nhận hoặc nghĩa tiếng Việt gợi ý (ngăn cách bằng |)',
    '1',
    'Prompt: https://.../image.png | Correct_Answer: apple | Options: an apple | quả táo'
  ],
  [
    'pronunciation_choice (hoặc phat_am)',
    'Trắc nghiệm phát âm / IPA',
    'Từ tiếng Anh cần kiểm tra phát âm',
    'Chữ cái phương án đúng (A, B, C...)',
    'Các phương án phiên âm IPA ngăn cách bằng dấu |',
    '1',
    'Prompt: camera | Correct_Answer: A | Options: /ˈkæm.ər.ə/ | /kəˈmɪər.ə/ | /kæmˈrɑː/'
  ],
  [
    'rubric_async (hoặc tu_luan)',
    'Tự luận chấm AI theo Rubric',
    'Đề bài yêu cầu viết đoạn văn / dịch thuật / tóm tắt',
    'Đoạn văn mẫu hoặc câu dịch chuẩn (làm ngữ cảnh tham chiếu cho AI)',
    'Các tiêu chí rubric kèm điểm số ngăn cách bằng dấu |',
    '4 (hoặc số điểm tùy bài)',
    'Prompt: Dịch: Chuyến tàu sẽ khởi hành lúc 8 giờ sáng. | Correct_Answer: The train will depart at 8 a.m. | Options: Ý nghĩa chính xác (2đ) | Ngữ pháp chuẩn (2đ)'
  ]
];

const ws2 = XLSX.utils.aoa_to_sheet(huongDanData);
ws2['!cols'] = [
  { wch: 30 },
  { wch: 30 },
  { wch: 45 },
  { wch: 45 },
  { wch: 50 },
  { wch: 15 },
  { wch: 60 }
];
XLSX.utils.book_append_sheet(wb, ws2, 'Huong_Dan_Chi_Tiet');

const outBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync(templateOutPath, outBuffer);
console.log('Successfully generated mau_de_thi_test_studio.xlsx with 2 sheets and', nhapDeThiData.length, 'rows in Sheet 1.');

