import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  PenTool,
  Lock,
  Unlock,
  Play,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Award,
  CheckCircle2,
  Lightbulb,
  X,
  Layers,
  HelpCircle,
  TrendingUp,
  Bookmark,
  Share2,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import LazyVideo from '../components/tenses/LazyVideo';
import FillInBlankQuiz from '../components/tenses/FillInBlankQuiz';
import { useAuth } from '../contexts/AuthContext';
import { usePracticeSessionTimer } from '../lib/practiceActivity';

// Danh sách 12 thì chuẩn tiếng Anh và các chuyên đề
const TENSE_NAV_LIST = [
  { slug: 'present-simple', name_en: 'Present Simple', name_vi: 'Hiện Tại Đơn', category: 'present' },
  { slug: 'present-continuous', name_en: 'Present Continuous', name_vi: 'Hiện Tại Tiếp Diễn', category: 'present' },
  { slug: 'present-perfect', name_en: 'Present Perfect', name_vi: 'Hiện Tại Hoàn Thành', category: 'present' },
  { slug: 'present-perfect-continuous', name_en: 'Present Perfect Continuous', name_vi: 'Hiện Tại Hoàn Thành Tiếp Diễn', category: 'present' },
  { slug: 'past-simple', name_en: 'Past Simple', name_vi: 'Quá Khứ Đơn', category: 'past' },
  { slug: 'past-continuous', name_en: 'Past Continuous', name_vi: 'Quá Khứ Tiếp Diễn', category: 'past' },
  { slug: 'past-perfect', name_en: 'Past Perfect', name_vi: 'Quá Khứ Hoàn Thành', category: 'past' },
  { slug: 'past-perfect-continuous', name_en: 'Past Perfect Continuous', name_vi: 'Quá Khứ Hoàn Thành Tiếp Diễn', category: 'past' },
  { slug: 'future-simple', name_en: 'Future Simple', name_vi: 'Tương Lai Đơn', category: 'future' },
  { slug: 'future-continuous', name_en: 'Future Continuous', name_vi: 'Tương Lai Tiếp Diễn', category: 'future' },
  { slug: 'future-perfect', name_en: 'Future Perfect', name_vi: 'Tương Lai Hoàn Thành', category: 'future' },
  { slug: 'future-perfect-continuous', name_en: 'Future Perfect Continuous', name_vi: 'Tương Lai Hoàn Thành Tiếp Diễn', category: 'future' },
  { slug: 'near-future', name_en: 'Near Future', name_vi: 'Tương Lai Gần', category: 'future' },
];

// Ví dụ thực chiến TOEIC chuẩn cho 3 thể: Khẳng định, Phủ định, Nghi vấn
const SAMPLE_EXAMPLES = {
  'present-simple': {
    affirmative: {
      en: 'The board of directors meets every Monday morning to review corporate growth.',
      vi: 'Ban giám đốc họp vào mỗi sáng thứ Hai để đánh giá sự phát triển của công ty.',
    },
    negative: {
      en: 'The financial committee does not approve unverified travel reimbursement requests.',
      vi: 'Ủy ban tài chính không phê duyệt các yêu cầu hoàn trả chi phí đi lại chưa kiểm chứng.',
    },
    interrogative: {
      en: 'Does the company shuttle bus depart on schedule during peak traffic hours?',
      vi: 'Xe buýt đưa đón nhân viên có khởi hành đúng lịch trình vào giờ cao điểm không?',
    },
  },
  'present-continuous': {
    affirmative: {
      en: 'Our engineering department is currently developing an automated payment gateway.',
      vi: 'Bộ phận kỹ thuật của chúng tôi hiện đang phát triển một cổng thanh toán tự động.',
    },
    negative: {
      en: 'The senior project manager is not attending today’s international trade briefing.',
      vi: 'Quản lý dự án cấp cao không tham dự buổi báo cáo thương mại quốc tế hôm nay.',
    },
    interrogative: {
      en: 'Are the legal advisors reviewing the revised supplier contract right now?',
      vi: 'Các cố vấn pháp lý có đang xem xét hợp đồng nhà cung cấp sửa đổi ngay lúc này không?',
    },
  },
  'present-perfect': {
    affirmative: {
      en: 'We have successfully expanded our market share across Southeast Asia this fiscal year.',
      vi: 'Chúng tôi đã mở rộng thành công thị phần khắp Đông Nam Á trong năm tài chính này.',
    },
    negative: {
      en: 'The independent auditing team has not finalized the annual revenue report yet.',
      vi: 'Nhóm kiểm toán độc lập vẫn chưa hoàn tất báo cáo doanh thu thường niên.',
    },
    interrogative: {
      en: 'Have you ever negotiated strategic procurement partnerships with overseas vendors?',
      vi: 'Bạn đã từng đàm phán quan hệ đối tác mua sắm chiến lược với nhà cung ứng nước ngoài chưa?',
    },
  },
  'present-perfect-continuous': {
    affirmative: {
      en: 'The marketing specialists have been analyzing consumer feedback for the past three hours.',
      vi: 'Các chuyên viên tiếp thị đã và đang liên tục phân tích phản hồi người tiêu dùng trong 3 giờ qua.',
    },
    negative: {
      en: 'The two research divisions have not been collaborating smoothly since the restructuring.',
      vi: 'Hai bộ phận nghiên cứu đã không hợp tác trơn tru kể từ sau đợt tái cấu trúc.',
    },
    interrogative: {
      en: 'How long have you been preparing the presentation for the international summit?',
      vi: 'Bạn đã chuẩn bị bài thuyết trình cho hội nghị thượng đỉnh quốc tế được bao lâu rồi?',
    },
  },
  'past-simple': {
    affirmative: {
      en: 'The CEO announced the company restructuring plan at yesterday’s press conference.',
      vi: 'Tổng giám đốc đã công bố kế hoạch tái cơ cấu công ty tại buổi họp báo hôm qua.',
    },
    negative: {
      en: 'The regional courier did not deliver the urgent documents by the specified deadline.',
      vi: 'Đơn vị chuyển phát khu vực đã không giao các tài liệu khẩn trước thời hạn quy định.',
    },
    interrogative: {
      en: 'Did the auditor identify any significant discrepancies in last month’s records?',
      vi: 'Kiểm toán viên có phát hiện bất kỳ sự chênh lệch đáng kể nào trong sổ sách tháng trước không?',
    },
  },
  'past-continuous': {
    affirmative: {
      en: 'The technical crew were updating the cloud database when the power failure occurred.',
      vi: 'Đội ngũ kỹ thuật đang cập nhật cơ sở dữ liệu đám mây thì sự cố mất điện xảy ra.',
    },
    negative: {
      en: 'She was not answering internal calls while conducting the department orientation.',
      vi: 'Cô ấy không trả lời các cuộc gọi nội bộ trong khi đang tiến hành buổi định hướng phòng ban.',
    },
    interrogative: {
      en: 'Were the international delegates debating the trade tariffs when the meeting adjourned?',
      vi: 'Các đại biểu quốc tế có đang tranh luận về mức thuế quan thương mại khi cuộc họp tạm hoãn không?',
    },
  },
  'past-perfect': {
    affirmative: {
      en: 'By the time the keynote speaker arrived, the technicians had installed all multimedia devices.',
      vi: 'Trước khi diễn giả chính đến, các kỹ thuật viên đã lắp đặt xong toàn bộ thiết bị đa phương tiện.',
    },
    negative: {
      en: 'The finance branch had not released the budget before receiving explicit board approval.',
      vi: 'Chi nhánh tài chính đã chưa giải ngân ngân sách trước khi nhận được sự phê chuẩn từ hội đồng.',
    },
    interrogative: {
      en: 'Had the aircraft safely landed before the severe storm warnings were officially announced?',
      vi: 'Máy bay đã hạ cánh an toàn trước khi cảnh báo bão lớn được phát đi chính thức chưa?',
    },
  },
  'past-perfect-continuous': {
    affirmative: {
      en: 'The negotiators had been discussing the merger terms for six months before finalizing the deal.',
      vi: 'Các nhà đàm phán đã bàn thảo các điều khoản sáp nhập suốt 6 tháng trước khi chốt thỏa thuận.',
    },
    negative: {
      en: 'The factory had not been running at maximum capacity before the automated system was installed.',
      vi: 'Nhà máy đã không hoạt động ở công suất tối đa trước khi hệ thống tự động được lắp đặt.',
    },
    interrogative: {
      en: 'Had you been working with that client account long before the new director joined?',
      vi: 'Bạn đã chăm sóc tài khoản khách hàng đó lâu chưa trước khi vị giám đốc mới gia nhập?',
    },
  },
  'future-simple': {
    affirmative: {
      en: 'The human resources department will release the updated compensation scheme next Monday.',
      vi: 'Phòng nhân sự sẽ công bố chính sách đãi ngộ cập nhật vào thứ Hai tới.',
    },
    negative: {
      en: 'The overseas parcel will not clear customs without authorized import certificates.',
      vi: 'Bưu kiện gửi từ nước ngoài sẽ không thể thông quan nếu thiếu chứng thư nhập khẩu hợp lệ.',
    },
    interrogative: {
      en: 'Will our corporate leadership approve the proposed expenditure for cybersecurity tools?',
      vi: 'Ban lãnh đạo tập đoàn sẽ phê duyệt khoản chi đề xuất cho các công cụ an ninh mạng chứ?',
    },
  },
  'future-continuous': {
    affirmative: {
      en: 'Tomorrow morning at 10:00 AM, the board will be interviewing candidates for the CTO role.',
      vi: 'Vào lúc 10:00 sáng mai, hội đồng quản trị sẽ đang phỏng vấn các ứng viên cho vị trí CTO.',
    },
    negative: {
      en: 'The technical hotline will not be operating during the national holiday weekend.',
      vi: 'Đường dây nóng kỹ thuật sẽ không hoạt động trong suốt kỳ nghỉ lễ quốc gia cuối tuần.',
    },
    interrogative: {
      en: 'Will the representatives be attending the networking banquet following the general assembly?',
      vi: 'Các đại diện sẽ tham dự dạ tiệc kết nối sau đại hội đồng chứ?',
    },
  },
  'future-perfect': {
    affirmative: {
      en: 'By the end of this financial year, our software will have processed over five million payments.',
      vi: 'Trước cuối năm tài chính này, phần mềm của chúng tôi sẽ xử lý xong hơn 5 triệu lượt thanh toán.',
    },
    negative: {
      en: 'The contractors will not have completed the facility refurbishment before the grand opening.',
      vi: 'Các nhà thầu sẽ chưa hoàn thành việc cải tạo cơ sở trước lễ khánh thành.',
    },
    interrogative: {
      en: 'Will the engineering squad have deployed the server migration before tomorrow’s peak hours?',
      vi: 'Đội ngũ kỹ thuật sẽ hoàn tất việc chuyển đổi máy chủ trước khung giờ cao điểm ngày mai chứ?',
    },
  },
  'future-perfect-continuous': {
    affirmative: {
      en: 'By next November, Ms. Clara will have been leading our logistics division for ten full years.',
      vi: 'Tính đến tháng 11 tới, cô Clara sẽ lãnh đạo bộ phận logistics của chúng tôi tròn mười năm.',
    },
    negative: {
      en: 'The turbine will not have been operating uninterrupted for 48 hours without inspection.',
      vi: 'Tua-bin sẽ không vận hành liên tục trong 48 giờ mà thiếu việc kiểm tra định kỳ.',
    },
    interrogative: {
      en: 'How many months will you have been living in Singapore by the time your visa expires?',
      vi: 'Bạn sẽ sinh sống ở Singapore được bao nhiêu tháng tính đến thời điểm thị thực của bạn hết hạn?',
    },
  },
  'near-future': {
    affirmative: {
      en: 'The management is going to implement an AI customer assistance platform next quarter.',
      vi: 'Ban quản lý chuẩn bị triển khai nền tảng trợ lý khách hàng bằng AI vào quý tới.',
    },
    negative: {
      en: 'The enterprise is not going to renew the commercial lease for this downtown branch.',
      vi: 'Doanh nghiệp sẽ không gia hạn hợp đồng thuê thương mại cho chi nhánh trung tâm này.',
    },
    interrogative: {
      en: 'Are they going to participate in the upcoming regional trade expo in Jakarta?',
      vi: 'Họ có dự định tham gia hội chợ thương mại khu vực sắp tới tại Jakarta không?',
    },
  },
};

// Cẩm nang Bẫy Đề Thi TOEIC Part 5 & 6 cho từng thì
const TOEIC_TRAPS_MAP = {
  'present-simple': [
    {
      title: 'Bẫy chia động từ với đại từ bất định',
      desc: 'Các đại từ như Everyone, Somebody, Nobody, Each of..., Neither of... luôn đi kèm với động từ số ít (V-s/es).',
      tip: 'VD: Everyone in the conference room agrees (không dùng agree).',
    },
    {
      title: 'Mệnh đề trạng ngữ chỉ thời gian',
      desc: 'Trong mệnh đề bắt đầu bằng When, As soon as, Until, Before, After nói về tương lai, KHÔNG dùng "will", bắt buộc dùng Hiện tại đơn.',
      tip: 'VD: As soon as the director arrives, we will begin the briefing.',
    },
  ],
  'present-continuous': [
    {
      title: 'Tuyệt đối tránh Stative Verbs (Động từ trạng thái)',
      desc: 'Các động từ chỉ sở hữu, tri giác, cảm xúc như belong to, possess, know, understand, need, depend on KHÔNG chia ở tiếp diễn trong bài thi.',
      tip: 'VD: This equipment belongs to marketing (SAI: is belonging).',
    },
    {
      title: 'Phân biệt "is being + Adj" vs "is + Adj"',
      desc: 'Đề thi TOEIC thỉnh thoảng dùng "is being + Adj" để chỉ hành vi tạm thời, khác biệt với tính cách tự nhiên.',
      tip: 'VD: He is being unusually quiet today (Hôm nay anh ấy tỏ ra im ắng khác thường).',
    },
  ],
  'present-perfect': [
    {
      title: 'Bẫy kinh điển: Since vs For',
      desc: '"Since" đi với mốc thời gian xác định (since 2019, since last Monday). "For" đi với khoảng thời gian (for 5 days, for two decades).',
      tip: 'Công thức vàng: S + have/has V3/ed + since + S + V(quá khứ đơn).',
    },
    {
      title: 'Thời gian xác định trong quá khứ -> Dùng Quá khứ đơn',
      desc: 'Nếu câu có yesterday, 2 days ago, in 2021, last quarter -> KHÔNG được chọn Hiện tại hoàn thành, phải chọn Quá khứ đơn!',
      tip: 'Hiện tại hoàn thành chỉ đi với: already, yet, recently, lately, so far, over the past 3 years.',
    },
  ],
  'present-perfect-continuous': [
    {
      title: 'Nhấn mạnh tính liên tục không gián đoạn',
      desc: 'Dùng khi hành động diễn ra liên tục từ quá khứ kéo dài đến hiện tại. Thường gặp với all morning, all day, for the past 4 hours.',
      tip: 'Nếu đề bài nhấn mạnh số lần hoặc số lượng thành quả (read 3 books) -> BẮT BUỘC dùng Hiện tại hoàn thành, không dùng tiếp diễn.',
    },
  ],
  'past-simple': [
    {
      title: 'Bẫy Used to + V vs Be used to + V-ing',
      desc: '"Used to + V-inf" chỉ thói quen trong quá khứ đã chấm dứt. "Be/Get used to + V-ing" chỉ sự quen thuộc ở hiện tại.',
      tip: 'VD: Mr. Tanaka used to work in Tokyo (đã từng làm việc ở Tokyo, nay đã nghỉ).',
    },
    {
      title: 'Phối hợp thì When / While',
      desc: 'Hành động đang diễn ra (Past Continuous) thì một hành động ngắn khác chen ngang vào (Past Simple).',
      tip: 'VD: While she was reviewing the files, the printer jammed.',
    },
  ],
  'past-continuous': [
    {
      title: 'Mốc thời gian cụ thể trong quá khứ',
      desc: 'Cần có giờ giấc rõ ràng: At 8 PM last night, At this time yesterday, hoặc hai hành động song song kết nối bằng While.',
      tip: 'VD: At 9:00 AM yesterday, the CEO was greeting overseas guests.',
    },
  ],
  'past-perfect': [
    {
      title: 'Công thức vàng: By the time',
      desc: 'By the time + S + V(quá khứ đơn), S + had + V3/ed. Hành động xảy ra trước chia Quá khứ hoàn thành, hành động sau chia Quá khứ đơn.',
      tip: 'VD: By the time the auditor arrived, the team had submitted the ledger.',
    },
    {
      title: 'Mẹo nhớ Before và After',
      desc: 'Trước Before, Sau After luôn chia Quá khứ hoàn thành (had + V3/ed).',
      tip: 'VD: After the contract had been approved, we issued the invoice.',
    },
  ],
  'future-simple': [
    {
      title: 'Bẫy mệnh đề phụ điều kiện & thời gian',
      desc: 'Trong mệnh đề If / When / As soon as / Once, KHÔNG dùng will. Bắt buộc dùng Hiện tại đơn.',
      tip: 'VD: If the parcel arrives tomorrow, we will notify you immediately.',
    },
    {
      title: 'Các động từ dự đoán & cam kết',
      desc: 'Các từ như promise, expect, believe, predict thường kéo theo mệnh đề tương lai đơn "will + V-inf".',
      tip: 'VD: Management predicts that sales will increase by 15% next quarter.',
    },
  ],
  'future-continuous': [
    {
      title: 'Thời điểm cụ thể trong tương lai',
      desc: 'At this time tomorrow, At 3 PM next Friday -> Chia ngay "will be + V-ing".',
      tip: 'VD: This time next week, our team will be presenting at the conference.',
    },
  ],
  'future-perfect': [
    {
      title: 'Dấu hiệu ăn điểm 100%: By + Mốc tương lai',
      desc: 'By the end of this month, By next year, By 2030 -> Chọn ngay "will have + V3/ed"!',
      tip: 'VD: By next Friday, the contractors will have finished the renovation.',
    },
    {
      title: 'Phân biệt By quá khứ vs By tương lai',
      desc: 'Nếu sau By là mốc quá khứ (By last week) -> had + V3. Nếu mốc tương lai (By next week) -> will have + V3.',
      tip: 'Quan sát kỹ mốc thời gian để không bị nhầm lẫn thời điểm.',
    },
  ],
  'near-future': [
    {
      title: 'Kế hoạch định trước hoặc có bằng chứng cụ thể',
      desc: '"Be going to" dùng khi hành động đã được lên kế hoạch hoặc có dấu hiệu trực quan ngay trước mắt.',
      tip: 'VD: Look at the quarterly revenue; the company is going to exceed its target.',
    },
  ],
};

const DEFAULT_TOPIC_TRAPS = [
  {
    title: 'Quy tắc phân tích Chủ ngữ - Vị ngữ trong Part 5',
    desc: 'Luôn tìm Subject và Verb chính trước tiên. Loại bỏ các cụm giới từ phụ nằm xen giữa để xác định đúng số ít / số nhiều.',
    tip: 'VD: The newly designed software application with numerous cloud plugins operates smoothly.',
  },
  {
    title: 'Danh từ không đếm được đặc trưng TOEIC',
    desc: 'Các từ như information, equipment, luggage, furniture, baggage luôn đi với động từ số ít và không có đuôi -s.',
    tip: 'VD: The laboratory equipment has been inspected thoroughly.',
  },
];

// Component Timeline trực quan hóa thời gian của thì (Visual Timeline 2.0 - High Contrast Infographic)
function VisualTimeline({ slug, nameEn }) {
  const getTimelineConfig = (s) => {
    switch (s) {
      case 'present-continuous':
        return {
          type: 'now-pulse',
          badge: 'Đang diễn ra ngay bây giờ (Now)',
          badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
          headline: 'Hành động đang tiếp diễn tại thời điểm nói',
          desc: 'Hành động đã bắt đầu trước đó, đang thực sự xảy ra ngay tại thời điểm nói và chưa kết thúc.',
          pastInfo: { status: 'Đã bắt đầu trước thời điểm nói', active: false },
          nowInfo: { status: '⚡ ĐANG XẢY RA LIÊN TỤC', active: true },
          futureInfo: { status: 'Sẽ còn tiếp diễn hoặc dừng lại', active: false },
        };
      case 'present-simple':
        return {
          type: 'recurring',
          badge: 'Quy luật & Thói quen vĩnh viễn',
          badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
          headline: 'Chân lý, thói quen lặp đi lặp lại qua mọi thời kỳ',
          desc: 'Không nhấn mạnh vào thời điểm nói, mà khẳng định quy luật, sự thật khách quan luôn đúng qua Quá khứ, Hiện tại và Tương lai.',
          pastInfo: { status: 'Đã từng diễn ra đều đặn', active: true },
          nowInfo: { status: '🔁 VẪN ĐÚNG & LẶP LẠI Ở HIỆN TẠI', active: true },
          futureInfo: { status: 'Sẽ tiếp tục duy trì vĩnh viễn', active: true },
        };
      case 'present-perfect':
        return {
          type: 'past-to-now',
          badge: 'Kết nối Quá khứ ➔ Hiện tại',
          badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
          headline: 'Bắt đầu ở quá khứ, lưu lại kết quả ở hiện tại',
          desc: 'Thời điểm xảy ra trong quá khứ không xác định hoặc không quan trọng; điểm mấu chốt là kết quả hay kinh nghiệm tác động trực tiếp đến thời điểm nói.',
          pastInfo: { status: 'Hành động khởi phát/bắt đầu', active: true },
          nowInfo: { status: '✨ KẾT QUẢ / TRẢI NGHIỆM Ở HIỆN TẠI', active: true },
          futureInfo: { status: 'Có thể tiếp tục hoặc dừng lại', active: false },
        };
      case 'present-perfect-continuous':
        return {
          type: 'past-to-now',
          badge: 'Liên tục không gián đoạn đến Hiện tại',
          badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40',
          headline: 'Hành động liên tục không ngừng nghỉ',
          desc: 'Hành động bắt đầu trong quá khứ, diễn ra liên tục xuyên suốt và vẫn đang tiếp diễn dồn dập tại thời điểm nói.',
          pastInfo: { status: 'Khởi đầu liên tục từ quá khứ', active: true },
          nowInfo: { status: '🔄 ĐANG DIỄN RA LIÊN TỤC', active: true },
          futureInfo: { status: 'Có xu hướng tiếp tục kéo dài', active: false },
        };
      case 'past-simple':
        return {
          type: 'past-point',
          badge: 'Hoàn tất trọn vẹn trong Quá khứ',
          badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
          headline: 'Đã dứt điểm tại một mốc thời gian xác định',
          desc: 'Hành động xảy ra và kết thúc hoàn toàn trong quá khứ (yesterday, in 2021, last week), không còn dính líu đến hiện tại.',
          pastInfo: { status: '✓ ĐÃ CHẤM DỨT HOÀN TOÀN', active: true },
          nowInfo: { status: 'Không còn liên quan hiện tại', active: false },
          futureInfo: { status: 'Đã là chuyện quá khứ', active: false },
        };
      case 'past-continuous':
        return {
          type: 'past-span',
          badge: 'Đang tiếp diễn trong Quá khứ',
          badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
          headline: 'Hành động đang diễn ra tại một mốc giờ quá khứ',
          desc: 'Nhấn mạnh tiến trình đang xảy ra tại một thời điểm cụ thể trong quá khứ (at 8 PM last night) hoặc khi một hành động khác xen vào.',
          pastInfo: { status: '⏳ ĐANG DIỄN RA TẠI MỐC QUÁ KHỨ', active: true },
          nowInfo: { status: 'Đã hoàn tất trước Hiện tại', active: false },
          futureInfo: { status: 'Không ảnh hưởng', active: false },
        };
      case 'past-perfect':
        return {
          type: 'before-past',
          badge: 'Quá khứ trước Quá khứ',
          badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40',
          headline: 'Xảy ra trước một hành động quá khứ khác',
          desc: 'Hành động xảy ra trước chia Quá khứ hoàn thành (had + V3/ed), hành động xảy ra sau chia Quá khứ đơn (V2/ed).',
          pastInfo: { status: '1. Xảy ra trước (had + V3)', active: true },
          nowInfo: { status: 'Đã kết thúc từ lâu', active: false },
          futureInfo: { status: 'Không ảnh hưởng', active: false },
        };
      case 'future-simple':
        return {
          type: 'future-point',
          badge: 'Quyết định / Dự đoán Tương lai',
          badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
          headline: 'Hành động sẽ diễn ra trong tương lai',
          desc: 'Quyết định đưa ra ngay tại thời điểm nói hoặc một dự đoán tương lai không có căn cứ từ trước (will + V-inf).',
          pastInfo: { status: 'Chưa từng xảy ra', active: false },
          nowInfo: { status: 'Thời điểm đưa ra quyết định', active: true },
          futureInfo: { status: '🚀 SẼ DIỄN RA TRONG TƯƠNG LAI', active: true },
        };
      case 'future-continuous':
        return {
          type: 'future-span',
          badge: 'Đang tiếp diễn trong Tương lai',
          badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
          headline: 'Sẽ đang diễn ra tại một thời điểm tương lai',
          desc: 'Diễn tả hành động sẽ đang trong tiến trình tại một thời điểm cụ thể trong tương lai (this time tomorrow, at 10 AM next Monday).',
          pastInfo: { status: 'Chưa diễn ra', active: false },
          nowInfo: { status: 'Chưa diễn ra', active: false },
          futureInfo: { status: '⏳ SẼ ĐANG TIẾP DIỄN TẠI MỐC', active: true },
        };
      case 'future-perfect':
        return {
          type: 'before-future',
          badge: 'Hoàn tất trước mốc Tương lai',
          badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40',
          headline: 'Sẽ hoàn thành xong trước một thời hạn',
          desc: 'Nhấn mạnh hành động sẽ kết thúc trọn vẹn trước một thời điểm hoặc hành động khác trong tương lai (By tomorrow, By next year).',
          pastInfo: { status: 'Có thể đã hoặc chưa bắt đầu', active: false },
          nowInfo: { status: 'Đang lên kế hoạch', active: false },
          futureInfo: { status: '🏁 SẼ HOÀN TẤT TRƯỚC MỐC', active: true },
        };
      default:
        return {
          type: 'general',
          badge: 'Trọng điểm ngữ pháp cốt lõi',
          badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
          headline: 'Ứng dụng thực tế trong đề thi TOEIC',
          desc: 'Nắm vững quy luật thời gian để phản xạ chính xác và tối ưu tốc độ làm bài Part 5 & 6.',
          pastInfo: { status: 'Ngữ cảnh quá khứ', active: false },
          nowInfo: { status: 'Ngữ cảnh hiện tại', active: true },
          futureInfo: { status: 'Ngữ cảnh tương lai', active: false },
        };
    }
  };

  const config = getTimelineConfig(slug);

  return (
    <div className="rounded-3xl p-6 md:p-8 bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl border border-white/60 dark:border-white/15 shadow-[0_12px_40px_0_rgba(0,0,0,0.12)] transition-all">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              DÒNG THỜI GIAN (VISUAL TIMELINE)
            </h4>
            <p className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300">
              {config.headline}
            </p>
          </div>
        </div>

        <span className={`self-start sm:self-auto text-xs font-bold px-3.5 py-1.5 rounded-full border shadow-sm ${config.badgeColor}`}>
          {config.badge}
        </span>
      </div>

      {/* 2. Main SVG Highway Timeline Diagram */}
      <div className="relative py-2 px-1 my-2">
        <svg viewBox="0 0 640 135" className="w-full h-auto overflow-visible select-none">
          <defs>
            {/* Gradients */}
            <linearGradient id="timeTrackHighway" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="42%" stopColor="#6366f1" stopOpacity="0.85" />
              <stop offset="58%" stopColor="#06b6d4" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="activeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="dropShadowGlow" x="-15%" y="-25%" width="130%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#0f172a" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Solid Track Road */}
          <rect x="40" y="58" width="560" height="12" rx="6" fill="#64748b" opacity="0.2" />
          <rect x="42" y="59" width="556" height="10" rx="5" fill="url(#timeTrackHighway)" />

          {/* Road Arrow Heads */}
          <polygon points="602,64 590,57 590,71" fill="#3b82f6" />
          <polygon points="38,64 50,57 50,71" fill="#f59e0b" opacity="0.7" />

          {/* STATIONS: 1. Past (140) | 2. Present/Now (320) | 3. Future (500) */}
          
          {/* Station 1: Past */}
          <circle cx="140" cy="64" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
          <g filter="url(#dropShadowGlow)">
            <rect x="85" y="86" width="110" height="26" rx="8" fill="#f1f5f9" className="dark:fill-slate-800" stroke="#cbd5e1" strokeWidth="1" />
            <text x="140" y="103" textAnchor="middle" className="text-[11px] font-extrabold fill-slate-700 dark:fill-slate-200">
              Quá khứ (Past)
            </text>
          </g>

          {/* Station 2: Now (Center Crown) */}
          <line x1="320" y1="36" x2="320" y2="82" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="320" cy="64" r="10" fill="#4f46e5" stroke="#ffffff" strokeWidth="3" filter="url(#intenseGlow)" />
          <g filter="url(#dropShadowGlow)">
            <rect x="250" y="85" width="140" height="28" rx="10" fill="#4f46e5" />
            <text x="320" y="103" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="12">
              ● HIỆN TẠI (NOW)
            </text>
          </g>

          {/* Station 3: Future */}
          <circle cx="500" cy="64" r="7" fill="#06b6d4" stroke="#ffffff" strokeWidth="2.5" />
          <g filter="url(#dropShadowGlow)">
            <rect x="445" y="86" width="110" height="26" rx="8" fill="#f1f5f9" className="dark:fill-slate-800" stroke="#cbd5e1" strokeWidth="1" />
            <text x="500" y="103" textAnchor="middle" className="text-[11px] font-extrabold fill-slate-700 dark:fill-slate-200">
              Tương lai (Future)
            </text>
          </g>

          {/* DYNAMIC ACTION OVERLAYS */}
          
          {/* NOW PULSE: Present Continuous */}
          {config.type === 'now-pulse' && (
            <g>
              <circle cx="320" cy="64" r="26" fill="none" stroke="#06b6d4" strokeWidth="2.5" opacity="0.8">
                <animate attributeName="r" values="10;34" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="320" cy="64" r="13" fill="#06b6d4" stroke="#ffffff" strokeWidth="2.5" filter="url(#intenseGlow)" />
              <g filter="url(#dropShadowGlow)">
                <rect x="220" y="8" width="200" height="30" rx="15" fill="#0891b2" />
                <text x="320" y="27" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="12">
                  ⚡ ĐANG DIỄN RA (IN PROGRESS)
                </text>
              </g>
            </g>
          )}

          {/* PAST TO NOW ARC: Present Perfect & HTTD */}
          {config.type === 'past-to-now' && (
            <g>
              <path
                d="M 160 64 Q 240 6 320 64"
                fill="none"
                stroke="url(#activeArcGrad)"
                strokeWidth="5"
                filter="url(#intenseGlow)"
              />
              <circle cx="160" cy="64" r="8" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" filter="url(#intenseGlow)" />
              <circle cx="320" cy="64" r="11" fill="#06b6d4" stroke="#ffffff" strokeWidth="2.5" filter="url(#intenseGlow)" />
              <polygon points="314,57 325,64 314,71" fill="#06b6d4" />
              <g filter="url(#dropShadowGlow)">
                <rect x="175" y="6" width="250" height="30" rx="15" fill="#4f46e5" />
                <text x="300" y="25" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="11">
                  Khởi phát ở QK ➔ Tác động ở Hiện tại
                </text>
              </g>
            </g>
          )}

          {/* RECURRING: Present Simple */}
          {config.type === 'recurring' && (
            <g>
              {[100, 190, 280, 360, 440, 530].map((x, i) => (
                <circle key={i} cx={x} cy="64" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" filter="url(#intenseGlow)" />
              ))}
              <g filter="url(#dropShadowGlow)">
                <rect x="180" y="6" width="280" height="30" rx="15" fill="#059669" />
                <text x="320" y="25" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="11">
                  🔁 Thói quen, Quy luật & Chân lý vĩnh viễn
                </text>
              </g>
            </g>
          )}

          {/* PAST POINT: Past Simple */}
          {config.type === 'past-point' && (
            <g>
              <circle cx="180" cy="64" r="12" fill="#d97706" stroke="#ffffff" strokeWidth="2.5" filter="url(#intenseGlow)" />
              <path d="M 175 64 L 178 67 L 186 60" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <g filter="url(#dropShadowGlow)">
                <rect x="90" y="8" width="210" height="30" rx="15" fill="#d97706" />
                <text x="195" y="27" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="11">
                  ✓ ĐÃ KẾT THÚC HOÀN TOÀN
                </text>
              </g>
            </g>
          )}

          {/* PAST SPAN: Past Continuous */}
          {config.type === 'past-span' && (
            <g>
              <rect x="120" y="52" width="130" height="24" rx="12" fill="#f59e0b" opacity="0.65" filter="url(#intenseGlow)" />
              <circle cx="185" cy="64" r="9" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
              <g filter="url(#dropShadowGlow)">
                <rect x="95" y="8" width="210" height="30" rx="15" fill="#b45309" />
                <text x="200" y="27" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="11">
                  ⏳ Đang tiếp diễn tại mốc QK
                </text>
              </g>
            </g>
          )}

          {/* BEFORE PAST: Past Perfect */}
          {config.type === 'before-past' && (
            <g>
              <circle cx="100" cy="64" r="10" fill="#7c3aed" stroke="#ffffff" strokeWidth="2" filter="url(#intenseGlow)" />
              <circle cx="210" cy="64" r="7" fill="#64748b" stroke="#ffffff" strokeWidth="2" />
              <path d="M 112 56 Q 160 36 200 58" fill="none" stroke="#7c3aed" strokeWidth="3" strokeDasharray="4 4" />
              <polygon points="198,53 208,60 198,66" fill="#7c3aed" />
              <g filter="url(#dropShadowGlow)">
                <rect x="50" y="8" width="240" height="30" rx="15" fill="#7c3aed" />
                <text x="170" y="27" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="11">
                  1. Xảy ra trước (had + V3) ➔ 2. Mốc sau
                </text>
              </g>
            </g>
          )}

          {/* FUTURE POINT: Future Simple */}
          {config.type === 'future-point' && (
            <g>
              <path d="M 330 64 L 460 64" stroke="#0891b2" strokeWidth="3.5" strokeDasharray="4 4" />
              <polygon points="458,58 472,64 458,70" fill="#0891b2" />
              <circle cx="475" cy="64" r="11" fill="#0891b2" stroke="#ffffff" strokeWidth="2.5" filter="url(#intenseGlow)" />
              <g filter="url(#dropShadowGlow)">
                <rect x="370" y="8" width="210" height="30" rx="15" fill="#0891b2" />
                <text x="475" y="27" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="11">
                  🚀 SẼ DIỄN RA Ở TƯƠNG LAI
                </text>
              </g>
            </g>
          )}

          {/* FUTURE SPAN: Future Continuous */}
          {config.type === 'future-span' && (
            <g>
              <rect x="420" y="52" width="120" height="24" rx="12" fill="#0284c7" opacity="0.65" filter="url(#intenseGlow)" />
              <circle cx="480" cy="64" r="9" fill="#0369a1" stroke="#ffffff" strokeWidth="2" />
              <g filter="url(#dropShadowGlow)">
                <rect x="365" y="8" width="230" height="30" rx="15" fill="#0369a1" />
                <text x="480" y="27" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="11">
                  Sẽ đang tiếp diễn tại mốc TL
                </text>
              </g>
            </g>
          )}

          {/* BEFORE FUTURE: Future Perfect */}
          {config.type === 'before-future' && (
            <g>
              <line x1="535" y1="42" x2="535" y2="86" stroke="#ef4444" strokeWidth="3" strokeDasharray="3 3" />
              <circle cx="465" cy="64" r="10" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" filter="url(#intenseGlow)" />
              <path d="M 330 64 Q 400 38 455 60" fill="none" stroke="#2563eb" strokeWidth="3" />
              <polygon points="450,55 460,62 450,68" fill="#2563eb" />
              <g filter="url(#dropShadowGlow)">
                <rect x="340" y="8" width="240" height="30" rx="15" fill="#2563eb" />
                <text x="460" y="27" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="11">
                  Hoàn tất TRƯỚC mốc TL (By...)
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* 3. TRI-ZONE INFOGRAPHIC BREAKDOWN CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
        {/* Quá khứ */}
        <div className={`p-3 rounded-2xl border transition-all ${
          config.pastInfo.active
            ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/30'
            : 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-200/60 dark:border-white/5'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>⏳</span>
            <span>QUÁ KHỨ (PAST)</span>
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
            {config.pastInfo.status}
          </p>
        </div>

        {/* Hiện tại */}
        <div className={`p-3 rounded-2xl border transition-all ${
          config.nowInfo.active
            ? 'bg-indigo-500/15 border-indigo-500/40 dark:bg-indigo-950/40 shadow-sm'
            : 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-200/60 dark:border-white/5'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-cyan-400 mb-1">
            <span>📍</span>
            <span>HIỆN TẠI (NOW)</span>
          </div>
          <p className="text-xs font-extrabold text-indigo-950 dark:text-white leading-snug">
            {config.nowInfo.status}
          </p>
        </div>

        {/* Tương lai */}
        <div className={`p-3 rounded-2xl border transition-all ${
          config.futureInfo.active
            ? 'bg-cyan-500/10 border-cyan-500/30 dark:bg-cyan-950/30'
            : 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-200/60 dark:border-white/5'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>🚀</span>
            <span>TƯƠNG LAI (FUTURE)</span>
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
            {config.futureInfo.status}
          </p>
        </div>
      </div>

      {/* 4. KEY TAKEAWAY MEMORY ANCHOR BANNER */}
      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-cyan-500/10 border border-indigo-500/20 flex items-start gap-3">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Sparkles size={15} />
        </div>
        <div className="flex-1">
          <h5 className="text-[11px] font-extrabold text-indigo-700 dark:text-cyan-300 uppercase tracking-wider mb-0.5">
            Điểm mấu chốt dễ nhớ
          </h5>
          <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
            {config.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TenseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tense, setTense] = useState(null);
  const [exercises, setExercises] = useState({ basic: [], advanced: [] });
  const [completedExerciseIds, setCompletedExerciseIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'lesson' (Lý thuyết), 'basic' (Bài tập Cơ bản), 'advanced' (Bài tập Nâng cao)
  const [activeTab, setActiveTab] = useState('lesson');
  const [isAdvancedUnlocked, setIsAdvancedUnlocked] = useState(false);

  // Sub-tab inside Formula card: 'affirmative' | 'negative' | 'interrogative'
  const [formulaTab, setFormulaTab] = useState('affirmative');
  const [copiedFormula, setCopiedFormula] = useState(false);

  // Floating Cheat Sheet drawer for exercise mode
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  // Practice timer for grammar
  usePracticeSessionTimer('grammar', user, Boolean(activeTab === 'basic' || activeTab === 'advanced'));

  useEffect(() => {
    fetchTenseDetail();
  }, [slug, user]);

  const fetchTenseDetail = async () => {
    setLoading(true);
    try {
      // 1. Fetch tense data
      const { data: tenseData, error: tenseError } = await supabase
        .from('tenses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tenseError) throw tenseError;
      setTense(tenseData);

      // Check unlock status in localStorage
      const unlocked = localStorage.getItem(`unlocked_tenses_${tenseData.id}`);
      setIsAdvancedUnlocked(unlocked === 'true');

      // 2. Fetch exercises
      const { data: exData, error: exError } = await supabase
        .from('tense_exercises')
        .select('*')
        .eq('tense_id', tenseData.id)
        .order('id');

      if (exError) throw exError;

      const basic = (exData || []).filter((e) => e.level === 'basic');
      const advanced = (exData || []).filter((e) => e.level === 'advanced');
      setExercises({ basic, advanced });

      // 3. Fetch completed exercises for this user
      if (user && exData && exData.length > 0) {
        const { data: completedData, error: completedError } = await supabase
          .from('user_tense_exercises')
          .select('exercise_id')
          .eq('user_id', user.id)
          .in('exercise_id', exData.map((e) => e.id));

        if (!completedError && completedData) {
          const completedIds = completedData.map((d) => d.exercise_id);
          setCompletedExerciseIds(completedIds);

          if (basic.length > 0) {
            const completedBasicCount = basic.filter((b) => completedIds.includes(b.id)).length;
            const percentage = (completedBasicCount / basic.length) * 100;
            if (percentage >= 80) {
              setIsAdvancedUnlocked(true);
              localStorage.setItem(`unlocked_tenses_${tenseData.id}`, 'true');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tense details:', error.message);
      navigate('/tenses');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = (correctCount, total) => {
    const percentage = Math.round((correctCount / total) * 100);
    if (activeTab === 'basic' && percentage >= 80) {
      setIsAdvancedUnlocked(true);
      if (tense) {
        localStorage.setItem(`unlocked_tenses_${tense.id}`, 'true');
      }
    }
  };

  const handleExerciseUpdate = (exerciseId) => {
    setCompletedExerciseIds((prev) => (prev.includes(exerciseId) ? prev : [...prev, exerciseId]));
  };

  // Pronounce sentence using Web Speech API
  const speakText = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Copy formula text
  const handleCopyFormula = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  // Parse formula object safely
  const parsedFormula = useMemo(() => {
    if (!tense?.formula) return { affirmative: 'N/A', negative: 'N/A', interrogative: 'N/A' };
    if (typeof tense.formula === 'object') return tense.formula;
    try {
      const parsed = JSON.parse(tense.formula);
      if (typeof parsed === 'object') return parsed;
    } catch (e) {
      // ignore
    }
    return { affirmative: String(tense.formula), negative: 'N/A', interrogative: 'N/A' };
  }, [tense]);

  // Current navigation sequence (Prev / Next)
  const { prevTense, nextTense, currentIndex } = useMemo(() => {
    const idx = TENSE_NAV_LIST.findIndex((t) => t.slug === slug);
    return {
      currentIndex: idx,
      prevTense: idx > 0 ? TENSE_NAV_LIST[idx - 1] : null,
      nextTense: idx >= 0 && idx < TENSE_NAV_LIST.length - 1 ? TENSE_NAV_LIST[idx + 1] : null,
    };
  }, [slug]);

  // Category badge info
  const categoryBadge = useMemo(() => {
    if (!slug) return { name: 'Chuyên Đề Ngữ Pháp', icon: '✨', bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400' };
    if (slug.includes('present') || slug.includes('hien-tai')) {
      return { name: 'Nhóm Hiện Tại', icon: '⏳', bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' };
    }
    if (slug.includes('past') || slug.includes('qua-khu')) {
      return { name: 'Nhóm Quá Khứ', icon: '📜', bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' };
    }
    if (slug.includes('future') || slug.includes('tuong-lai')) {
      return { name: 'Nhóm Tương Lai', icon: '🚀', bg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400' };
    }
    return { name: 'Chuyên Đề Trọng Tâm', icon: '✨', bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400' };
  }, [slug]);

  // Example sentences & traps
  const currentExamples = SAMPLE_EXAMPLES[slug] || null;
  const currentTraps = TOEIC_TRAPS_MAP[slug] || DEFAULT_TOPIC_TRAPS;

  // Active formula data
  const currentFormulaItem = useMemo(() => {
    switch (formulaTab) {
      case 'negative':
        return {
          label: 'Thể Phủ Định (-)',
          code: parsedFormula?.negative || 'S + Auxiliary + not + Verb...',
          example: currentExamples?.negative,
          color: 'rose',
        };
      case 'interrogative':
        return {
          label: 'Thể Nghi Vấn (?)',
          code: parsedFormula?.interrogative || 'Auxiliary + S + Verb...?',
          example: currentExamples?.interrogative,
          color: 'cyan',
        };
      case 'affirmative':
      default:
        return {
          label: 'Thể Khẳng Định (+)',
          code: parsedFormula?.affirmative || 'S + Verb...',
          example: currentExamples?.affirmative,
          color: 'emerald',
        };
    }
  }, [formulaTab, parsedFormula, currentExamples]);

  // Total exercises count & completion
  const totalExercisesCount = exercises.basic.length + exercises.advanced.length;
  const completedCount = completedExerciseIds.filter((id) =>
    [...exercises.basic, ...exercises.advanced].some((e) => e.id === id)
  ).length;
  const completionPercent = totalExercisesCount > 0 ? Math.round((completedCount / totalExercisesCount) * 100) : 0;

  if (loading || !tense) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Đang tải chi tiết thì...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* 1. FLOATING LIQUID GLASS TOPBAR HEADER */}
      <div className="sticky top-0 z-30 px-4 md:px-8 py-3.5 backdrop-blur-2xl bg-white/45 dark:bg-slate-950/60 border-b border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Back button + Title & Category */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/tenses')}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/60 dark:bg-slate-900/60 hover:bg-white/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Quay lại danh sách 12 thì"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-semibold hidden sm:inline">12 Thì</span>
            </button>

            <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-current/20 flex items-center gap-1 ${categoryBadge.bg}`}>
                  <span>{categoryBadge.icon}</span>
                  <span>{categoryBadge.name}</span>
                </span>
                {completionPercent === 100 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Thành thạo 100%
                  </span>
                )}
              </div>
              <h1 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                {tense.name_en}
                <span className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
                  ({tense.name_vi})
                </span>
              </h1>
            </div>
          </div>

          {/* Right: Quick Prev / Next Navigator & Stats */}
          <div className="flex items-center justify-between md:justify-end gap-2.5">
            {/* Completion indicator */}
            {totalExercisesCount > 0 && (
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-white/40 dark:border-white/10 text-xs">
                <Award size={15} className="text-indigo-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {completedCount}/{totalExercisesCount} câu
                </span>
                <span className="text-slate-400">({completionPercent}%)</span>
              </div>
            )}

            {/* Prev / Next buttons */}
            <div className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-900/50 p-1 rounded-2xl border border-white/40 dark:border-white/10">
              <button
                disabled={!prevTense}
                onClick={() => prevTense && navigate(`/tenses/${prevTense.slug}`)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  prevTense
                    ? 'hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer hover:shadow-sm'
                    : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                }`}
                title={prevTense ? `Thì trước: ${prevTense.name_en}` : 'Đang ở thì đầu tiên'}
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Thì trước</span>
              </button>

              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800"></div>

              <button
                disabled={!nextTense}
                onClick={() => nextTense && navigate(`/tenses/${nextTense.slug}`)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  nextTense
                    ? 'hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer hover:shadow-sm'
                    : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                }`}
                title={nextTense ? `Thì kế: ${nextTense.name_en}` : 'Đã đến thì cuối'}
              >
                <span className="hidden sm:inline">Thì tiếp</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN SCROLLABLE CONTAINER */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* MODE NAVIGATION DOCK */}
          <div className="flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] gap-1">
              {/* Tab 1: Lesson */}
              <button
                onClick={() => setActiveTab('lesson')}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
                  activeTab === 'lesson'
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
                }`}
              >
                <BookOpen size={16} />
                <span>Lý thuyết & Video</span>
              </button>

              {/* Tab 2: Basic Quiz */}
              <button
                onClick={() => setActiveTab('basic')}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
                  activeTab === 'basic'
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
                }`}
              >
                <PenTool size={16} />
                <span>Bài tập Cơ bản</span>
                {exercises.basic.length > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'basic'
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {exercises.basic.length}
                  </span>
                )}
              </button>

              {/* Tab 3: Advanced Quiz */}
              <button
                onClick={() => isAdvancedUnlocked && setActiveTab('advanced')}
                disabled={!isAdvancedUnlocked}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
                  !isAdvancedUnlocked
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                    : activeTab === 'advanced'
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25 cursor-pointer'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40 cursor-pointer'
                }`}
                title={!isAdvancedUnlocked ? 'Hoàn thành ≥80% bài tập cơ bản để mở khóa' : 'Bài tập nâng cao'}
              >
                {!isAdvancedUnlocked ? <Lock size={16} /> : <Sparkles size={16} />}
                <span>Nâng Cao</span>
                {exercises.advanced.length > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'advanced'
                        ? 'bg-white/20 text-white'
                        : 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {exercises.advanced.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* TAB 1: BENTO GRID THEORY & VIDEO */}
          {activeTab === 'lesson' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20"
            >
              {/* LEFT COLUMN: THEATER VIDEO + TIMELINE + USAGE (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Glass Theater Video Frame */}
                <div className="rounded-3xl p-5 md:p-6 bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-500 to-rose-600 flex items-center justify-center text-white shadow-md">
                        <Play size={16} fill="currentColor" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          Bài Giảng Video Trực Quan
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Video hướng dẫn chi tiết cách phát âm & phản xạ ngữ pháp
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50">
                      Chuẩn phát âm
                    </span>
                  </div>

                  <div className="rounded-2xl overflow-hidden shadow-md border border-white/20">
                    <LazyVideo videoId={tense.video_id} title={tense.name_en} />
                  </div>
                </div>

                {/* 2. Visual Timeline Diagram */}
                <VisualTimeline slug={tense.slug} nameEn={tense.name_en} />

                {/* 3. Practical Usages Card */}
                <div className="rounded-3xl p-6 bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
                      <Lightbulb size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Cách Dùng Thực Tế & Ngữ Cảnh
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Áp dụng trong giao tiếp doanh nghiệp và đề thi TOEIC
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(tense.usage || []).map((usageItem, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-white/5 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-400 to-orange-400 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                          {usageItem}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: INTERACTIVE FORMULA MATRIX + TOEIC TRAPS + SIGNALS (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1. Interactive Formula Matrix */}
                <div className="rounded-3xl p-6 bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                        <Layers size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          Công Thức Chuẩn
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">3 Thể cấu trúc kèm ví dụ TOEIC</p>
                      </div>
                    </div>

                    {/* Copy formula button */}
                    <button
                      onClick={() => handleCopyFormula(currentFormulaItem.code)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-white/60 dark:border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                      title="Sao chép công thức"
                    >
                      {copiedFormula ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{copiedFormula ? 'Đã sao chép!' : 'Sao chép'}</span>
                    </button>
                  </div>

                  {/* 3 Sub-tabs */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-200/50 dark:bg-slate-950/60 mb-4">
                    <button
                      onClick={() => setFormulaTab('affirmative')}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        formulaTab === 'affirmative'
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Khẳng định (+)
                    </button>
                    <button
                      onClick={() => setFormulaTab('negative')}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        formulaTab === 'negative'
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Phủ định (-)
                    </button>
                    <button
                      onClick={() => setFormulaTab('interrogative')}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        formulaTab === 'interrogative'
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Nghi vấn (?)
                    </button>
                  </div>

                  {/* Active Formula Box */}
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/70 border border-white/60 dark:border-white/10 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {currentFormulaItem.label}
                      </span>
                    </div>
                    <code className="block text-base md:text-lg font-mono font-bold text-indigo-700 dark:text-cyan-300 whitespace-pre-wrap select-all">
                      {currentFormulaItem.code}
                    </code>
                  </div>

                  {/* Accompanying TOEIC Example Sentence */}
                  {currentFormulaItem.example && (
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <Sparkles size={14} /> Ví dụ TOEIC điểm cao
                        </span>
                        <button
                          onClick={() => speakText(currentFormulaItem.example.en)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
                          title="Nghe phát âm chuẩn giọng đọc AI"
                        >
                          <Volume2 size={13} />
                          <span>Nghe đọc</span>
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                        "{currentFormulaItem.example.en}"
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                        → {currentFormulaItem.example.vi}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. TOEIC Traps Card (Bẫy đề thi) */}
                <div className="rounded-3xl p-6 bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Bẫy Đề Thi TOEIC Part 5 & 6
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Các lỗi sai phổ biến thí sinh hay mắc</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {currentTraps.map((trap, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">{trap.title}</h4>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {trap.desc}
                        </p>
                        {trap.tip && (
                          <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-indigo-200/40 dark:border-indigo-800/30">
                            💡 {trap.tip}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Signal Keywords Card (Dấu hiệu nhận biết) */}
                <div className="rounded-3xl p-6 bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Dấu Hiệu Nhận Biết
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Từ khóa nhận diện nhanh đáp án</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(tense.signals || []).map((sig, i) => (
                      <span
                        key={i}
                        onClick={() => speakText(sig)}
                        className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-1.5 rounded-xl border border-white/60 dark:border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        title="Click để nghe phát âm từ khóa"
                      >
                        <span>{sig}</span>
                        <Volume2 size={12} className="opacity-40 hover:opacity-100" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: BASIC QUIZ */}
          {activeTab === 'basic' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="pb-20"
            >
              {exercises.basic.length > 0 ? (
                <div className="rounded-3xl p-6 md:p-8 bg-white/45 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
                  <FillInBlankQuiz
                    exercises={exercises.basic}
                    level="basic"
                    tenseId={tense.id}
                    completedExerciseIds={completedExerciseIds}
                    onComplete={handleQuizComplete}
                    onExerciseUpdate={handleExerciseUpdate}
                  />
                </div>
              ) : (
                <div className="rounded-3xl p-12 text-center bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Chưa có bài tập cơ bản cho thì này.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: ADVANCED QUIZ */}
          {activeTab === 'advanced' && isAdvancedUnlocked && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="pb-20"
            >
              {exercises.advanced.length > 0 ? (
                <div className="rounded-3xl p-6 md:p-8 bg-white/45 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
                  <FillInBlankQuiz
                    exercises={exercises.advanced}
                    level="advanced"
                    tenseId={tense.id}
                    completedExerciseIds={completedExerciseIds}
                    onComplete={handleQuizComplete}
                    onExerciseUpdate={handleExerciseUpdate}
                  />
                </div>
              ) : (
                <div className="rounded-3xl p-12 text-center bg-white/45 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Chưa có bài tập nâng cao cho thì này.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* 3. FLOATING ACTION BUTTON: QUICK FORMULA CHEAT-SHEET DRAWER (When in Quiz mode) */}
      {(activeTab === 'basic' || activeTab === 'advanced') && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCheatSheet(true)}
          className="fixed bottom-5 right-24 sm:bottom-6 sm:right-32 z-40 flex items-center gap-2 rounded-full border border-white/25 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-black text-white shadow-xl shadow-indigo-500/30 backdrop-blur-xl transition-all cursor-pointer hover:shadow-indigo-500/50"
          title="Tra nhanh công thức ngữ pháp"
        >
          <Sparkles size={16} className="text-amber-300 animate-pulse" />
          <span className="hidden min-[380px]:inline">Tra nhanh công thức</span>
          <span className="min-[380px]:hidden">Công thức</span>
        </motion.button>
      )}

      {/* 4. MODAL / SLIDE DRAWER FOR CHEAT-SHEET */}
      <AnimatePresence>
        {showCheatSheet && (
          <div className="fixed inset-0 z-[70] flex items-center justify-end bg-black/40 backdrop-blur-sm p-4 md:p-6">
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 240 }}
              className="w-full max-w-md h-full max-h-[85vh] rounded-3xl bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                      Phao Công Thức Nhanh
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{tense.name_en}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheatSheet(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* 3 Formulas */}
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                      Khẳng định (+)
                    </span>
                    <code className="block mt-1 font-mono text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      {parsedFormula.affirmative}
                    </code>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30">
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                      Phủ định (-)
                    </span>
                    <code className="block mt-1 font-mono text-xs font-bold text-rose-900 dark:text-rose-200">
                      {parsedFormula.negative}
                    </code>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/30">
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                      Nghi vấn (?)
                    </span>
                    <code className="block mt-1 font-mono text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      {parsedFormula.interrogative}
                    </code>
                  </div>
                </div>

                {/* Signals */}
                <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <Clock size={14} className="text-indigo-500" /> Dấu hiệu nhận biết
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(tense.signals || []).map((s, i) => (
                      <span
                        key={i}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* TOEIC Tips */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-500" /> Lưu ý đề thi
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {currentTraps.map((t, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>
                          <strong>{t.title}:</strong> {t.desc}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200/60 dark:border-white/10 text-center">
                <button
                  onClick={() => setShowCheatSheet(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Đã hiểu, quay lại làm bài
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
