/**
 * Learning Bot Motivation & Companionship Engine
 * Enriched with funny, heartfelt, and high-impact TOEIC motivational messages
 */

export const MOTIVATION_CATEGORIES = [
  {
    id: 'power',
    name: 'Tiếp Lửa TOEIC',
    icon: '🔥',
    badge: 'Chiến Binh 990',
    color: 'from-amber-500 to-rose-500',
    messages: [
      'Mục tiêu 800+ TOEIC đang vẫy gọi! Mỗi từ bạn học hôm nay là một viên gạch xây nên kỳ tích! 🚀',
      'Chiến thần luyện đề ơi, bạn đang làm rất cừ khôi đó! Đừng bỏ cuộc, đỉnh vinh quang ở ngay trước mắt! 🔥',
      'Đề thi TOEIC có thể lắt léo, nhưng sự kiên trì của bạn còn mạnh mẽ hơn ngàn lần! Cháy hết mình nào! ⚡',
      'Bạn không chỉ đang học tiếng Anh, bạn đang mở ra cánh cửa sự nghiệp xịn sò cho tương lai! Cố lên nhé! 💼',
      'Bộ não của bạn đang tạo hàng triệu liên kết thần kinh mới cho mỗi từ vựng hôm nay. Đỉnh chóp luôn! 🧠✨',
    ],
  },
  {
    id: 'care',
    name: 'Góc Chữa Lành',
    icon: '🍵',
    badge: 'Chăm Sóc Bạn',
    color: 'from-emerald-400 to-teal-500',
    messages: [
      'Bạn học chăm quá rồi nè! Uống một ngụm nước, chớp mắt nhìn ra xa 20 giây rồi chiến tiếp nhé 💧',
      'Tiến bộ nhỏ mỗi ngày vẫn là tiến bộ vĩ đại. Đừng áp lực quá, bé bot luôn ở đây đồng hành cùng bạn 💖',
      'Thả lỏng hai vai ra nào! Hít một hơi thật sâu, thở ra nhẹ nhàng... Bạn đang làm rất tốt rồi! 🌿',
      'Hôm nay mệt thì học ít lại một xíu cũng không sao, miễn là không bỏ cuộc. Bạn đã rất nỗ lực rồi đó! 🌸',
      'Một nụ cười tiếp thêm 100% năng lượng! Cười lên cái nào, thần may mắn TOEIC đang đứng về phía bạn đấy! 😊',
    ],
  },
  {
    id: 'fortune',
    name: 'Gieo Quẻ May Mắn',
    icon: '🍀',
    badge: 'Quẻ Phúc Khí',
    color: 'from-violet-500 to-fuchsia-500',
    messages: [
      '🔮 Quẻ Thượng Thượng: Điềm lành báo hiệu lượt làm bài tiếp theo của bạn sẽ bùng nổ điểm số chuẩn xác!',
      '✨ Rút được thẻ bài [Siêu Trí Nhớ]: Hôm nay bạn học từ nào, từ đó in sâu vào tiềm thức ngay lập tức!',
      '🎁 Bé bot tặng bạn 1 chiếc ôm ảo và bùa may mắn +50 Điểm TOEIC cho bài thi sắp tới! Nhận lấy nhé! 🧧',
      '🌟 Bánh quy may mắn hé lộ: "Người chăm chỉ như bạn xứng đáng nhận được học bổng và công việc mơ ước!"',
      '🍀 Vũ trụ gửi tín hiệu: Ngày hôm nay là thời điểm vàng để bạn chinh phục những từ vựng khó nhất!',
    ],
  },
  {
    id: 'hacks',
    name: 'Mẹo Nhớ Siêu Tốc',
    icon: '💡',
    badge: 'Bí Kíp TOEIC',
    color: 'from-cyan-400 to-blue-600',
    messages: [
      '💡 Bí kíp Part 5: Nhìn 4 đáp án trước! Nếu cùng gốc từ thì xem vị trí chỗ trống là N, V, Adj hay Adv nhé!',
      '🎧 Bí kíp Part 3 & 4: Tận dụng thời gian đọc hướng dẫn để lướt nhanh 3 câu hỏi trước khi băng phát!',
      '📖 Học từ theo cụm Collocation: Nhớ cụm "meet the deadline" hay "reach an agreement" nhanh hơn gấp 3 lần học từ đơn lẻ!',
      '🗣️ Đọc to từ vựng thành tiếng: Kích hoạt cả thính giác và cơ miệng giúp bạn phản xạ nhanh hơn trong phòng thi!',
      '⚡ Đừng dịch từng từ một: Hãy nắm từ khóa chính (Keywords) và mạch cảm xúc của bài đọc để quét đáp án nhanh!',
    ],
  },
];

export const getRandomCheer = () => {
  const cat = MOTIVATION_CATEGORIES[Math.floor(Math.random() * MOTIVATION_CATEGORIES.length)];
  const msg = cat.messages[Math.floor(Math.random() * cat.messages.length)];
  return {
    category: cat,
    message: msg,
    timestamp: Date.now(),
  };
};

export const praiseLearningBot = (message) => {
  if (typeof window === 'undefined') return;

  const detail = typeof message === 'string'
    ? { message, category: MOTIVATION_CATEGORIES[0] }
    : message || getRandomCheer();

  window.dispatchEvent(
    new CustomEvent('learning-bot:praise', {
      detail,
    }),
  );
};
