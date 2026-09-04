/*
 * Suggested standing orders for a dental clinic, each with the answer it
 * produces to the same caller question. The Chỉ dẫn riêng page offers them
 * as one-tap additions; the mock receptionist uses the pairs so that adding
 * one audibly changes her answer in the try-out panel.
 */
export const INSTRUCTION_IDEAS: { text: string; answer: string }[] = [
  {
    text: 'Luôn gợi ý khách đặt lịch tư vấn miễn phí.',
    answer:
      'Dạ niềng răng bên em khoảng 25–45 triệu tuỳ ca ạ. Anh chị đặt một buổi tư vấn miễn phí để bác sĩ xem trực tiếp nhé ạ?',
  },
  {
    text: 'Khách hỏi giá niềng răng: mời đến khám để bác sĩ tư vấn chính xác.',
    answer: 'Dạ khoảng 25–45 triệu tuỳ ca ạ. Giá chính xác thì bác sĩ phải xem phim và khám trực tiếp mới báo được ạ.',
  },
  {
    text: 'Xưng "em", gọi khách là "anh/chị", không dùng "quý khách".',
    answer: 'Dạ niềng răng bên em khoảng 25–45 triệu tuỳ ca ạ. Anh chị cần em xem giúp lịch khám không ạ?',
  },
  {
    text: 'Khách hỏi bác sĩ nào giỏi nhất: nói tất cả bác sĩ đều được đào tạo bài bản, không so sánh.',
    answer:
      'Dạ bên em bác sĩ nào cũng được đào tạo bài bản ạ, em không so sánh được. Anh chị đến khám, bác sĩ trực hôm đó tư vấn giúp mình nhé ạ.',
  },
]
