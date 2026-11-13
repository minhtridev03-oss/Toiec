import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Backpack,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import chatbotImage from '../assets/chatbot-transparent.png';
import {
  playBotCheerSound,
  playCorrectSound,
  playPopSound,
} from '../features/games/gameAudio';

// =========================================================================
// CURRICULUM DATA: 5 HÒN ĐẢO TRI THỨC (LỚP 1 - LỚP 5)
// =========================================================================

const ISLANDS = [
  {
    grade: 1,
    id: 'island-1',
    name: 'Vườn Ươm Thần Tiên',
    badge: 'Khởi Động Pre-A1',
    subtitle: 'Làm quen bảng chữ cái, ngữ âm Phonics, màu sắc & muông thú',
    icon: '🎈',
    color: 'from-amber-400 via-rose-400 to-pink-500',
    bgLight: 'bg-gradient-to-br from-amber-50 via-rose-50/60 to-pink-50/50',
    border: 'border-amber-300/60',
    cardGlow: 'shadow-[0_12px_40px_rgba(251,191,36,0.25)]',
    mapBg: 'from-amber-100/60 via-orange-50/40 to-yellow-100/50',
    stations: [
      {
        id: 'g1-s1',
        title: 'Chữ Cái & Âm Đầu',
        icon: '🔤',
        starsRequired: 0,
        words: [
          { id: 'apple', word: 'apple', pronunciation: '/ˈæp.əl/', meaning: 'quả táo', image: '/assets/kids/apple.jpg', emoji: '🍎', example: 'I eat a sweet apple.', exampleVi: 'Bé ăn một quả táo ngọt.' },
          { id: 'ball', word: 'ball', pronunciation: '/bɔːl/', meaning: 'quả bóng', emoji: '⚽', example: 'This is my red ball.', exampleVi: 'Đây là quả bóng màu đỏ của bé.' },
          { id: 'cat', word: 'cat', pronunciation: '/kæt/', meaning: 'con mèo', emoji: '🐱', example: 'The cute cat says meow.', exampleVi: 'Chú mèo con kêu meo meo.' },
          { id: 'dog', word: 'dog', pronunciation: '/dɒɡ/', meaning: 'con chó', emoji: '🐶', example: 'The dog wags its tail.', exampleVi: 'Chú cún vẫy vẫy cái đuôi.' },
        ],
      },
      {
        id: 'g1-s2',
        title: 'Sắc Màu Kẹo Ngọt',
        icon: '🎨',
        starsRequired: 3,
        words: [
          { id: 'red', word: 'red', pronunciation: '/red/', meaning: 'màu đỏ', emoji: '🔴', example: 'Red is my favorite color.', exampleVi: 'Màu đỏ là màu bé thích nhất.' },
          { id: 'blue', word: 'blue', pronunciation: '/bluː/', meaning: 'màu xanh dương', emoji: '🔵', example: 'The sky is clear blue.', exampleVi: 'Bầu trời màu xanh biếc.' },
          { id: 'yellow', word: 'yellow', pronunciation: '/ˈjel.əʊ/', meaning: 'màu vàng', emoji: '🟡', example: 'The sun shines yellow.', exampleVi: 'Mặt trời chiếu nắng vàng.' },
          { id: 'green', word: 'green', pronunciation: '/ɡriːn/', meaning: 'màu xanh lá', emoji: '🟢', example: 'Green leaves on the tree.', exampleVi: 'Lá cây màu xanh mướt.' },
        ],
      },
      {
        id: 'g1-chest',
        isChest: true,
        title: 'Rương Thần Lớp 1',
        icon: '🎁',
        bonusStars: 5,
        starsRequired: 6,
      },
      {
        id: 'g1-s3',
        title: 'Đồ Dùng Đến Trường',
        icon: '🎒',
        starsRequired: 6,
        words: [
          { id: 'book', word: 'book', pronunciation: '/bʊk/', meaning: 'quyển sách', image: '/assets/kids/book.jpg', emoji: '📖', example: 'Open your English book.', exampleVi: 'Mở quyển sách tiếng Anh ra nào.' },
          { id: 'pencil', word: 'pencil', pronunciation: '/ˈpen.səl/', meaning: 'bút chì', image: '/assets/kids/pencil.jpg', emoji: '✏️', example: 'I draw with my pencil.', exampleVi: 'Bé vẽ bằng chiếc bút chì.' },
          { id: 'backpack', word: 'backpack', pronunciation: '/ˈbæk.pæk/', meaning: 'ba lô đi học', image: '/assets/kids/backpack.jpg', emoji: '🎒', example: 'My backpack is very light.', exampleVi: 'Chiếc ba lô của bé rất nhẹ.' },
          { id: 'desk', word: 'desk', pronunciation: '/desk/', meaning: 'bàn học', emoji: '🪑', example: 'Sit at your desk nicely.', exampleVi: 'Ngồi ngay ngắn ở bàn học nhé.' },
        ],
      },
      {
        id: 'g1-s4',
        title: 'Số Đếm Diệu Kỳ',
        icon: '🔢',
        starsRequired: 9,
        words: [
          { id: 'one', word: 'one', pronunciation: '/wʌn/', meaning: 'số 1', emoji: '1️⃣', example: 'One little happy star.', exampleVi: 'Một ngôi sao nhỏ vui vẻ.' },
          { id: 'two', word: 'two', pronunciation: '/tuː/', meaning: 'số 2', emoji: '2️⃣', example: 'I have two bright eyes.', exampleVi: 'Bé có hai mắt sáng tinh anh.' },
          { id: 'three', word: 'three', pronunciation: '/θriː/', meaning: 'số 3', emoji: '3️⃣', example: 'Three flying balloons.', exampleVi: 'Ba quả bóng bay lơ lửng.' },
          { id: 'four', word: 'four', pronunciation: '/fɔːr/', meaning: 'số 4', emoji: '4️⃣', example: 'A table has four legs.', exampleVi: 'Chiếc bàn có bốn chiếc chân.' },
        ],
      },
    ],
  },
  {
    grade: 2,
    id: 'island-2',
    name: 'Khu Rừng Tinh Nghịch',
    badge: 'Mở Rộng Pre-A1',
    subtitle: 'Khám phá thế giới gia đình, bộ phận cơ thể, món ăn & cảm xúc',
    icon: '🐾',
    color: 'from-emerald-400 via-teal-400 to-sky-500',
    bgLight: 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-sky-50/50',
    border: 'border-emerald-300/60',
    cardGlow: 'shadow-[0_12px_40px_rgba(16,185,129,0.22)]',
    mapBg: 'from-emerald-100/60 via-teal-50/40 to-cyan-100/50',
    stations: [
      {
        id: 'g2-s1',
        title: 'Tổ Ấm Gia Đình',
        icon: '🏡',
        starsRequired: 0,
        words: [
          { id: 'family', word: 'family', pronunciation: '/ˈfæm.əl.i/', meaning: 'gia đình', image: '/assets/kids/family.jpg', emoji: '👨‍👩‍👧‍👦', example: 'I love my lovely family.', exampleVi: 'Bé rất yêu thương gia đình mình.' },
          { id: 'father', word: 'father', pronunciation: '/ˈfɑː.ðər/', meaning: 'bố, ba', emoji: '👨', example: 'My father is tall and kind.', exampleVi: 'Bố của bé cao và tốt bụng.' },
          { id: 'mother', word: 'mother', pronunciation: '/ˈmʌð.ər/', meaning: 'mẹ', emoji: '👩', example: 'My mother sings sweet songs.', exampleVi: 'Mẹ hát cho bé nghe những bài hát ngọt ngào.' },
          { id: 'baby', word: 'baby', pronunciation: '/ˈbeɪ.bi/', meaning: 'em bé', emoji: '👶', example: 'The baby smiles at me.', exampleVi: 'Em bé cười tươi với bé.' },
        ],
      },
      {
        id: 'g2-s2',
        title: 'Món Ngon Bé Thích',
        icon: '🥛',
        starsRequired: 3,
        words: [
          { id: 'milk', word: 'milk', pronunciation: '/mɪlk/', meaning: 'sữa tươi', emoji: '🥛', example: 'Drink a glass of warm milk.', exampleVi: 'Uống một ly sữa ấm nhé bé.' },
          { id: 'bread', word: 'bread', pronunciation: '/bred/', meaning: 'bánh mì', emoji: '🍞', example: 'Fresh bread for breakfast.', exampleVi: 'Bánh mì thơm ngon cho bữa sáng.' },
          { id: 'banana', word: 'banana', pronunciation: '/bəˈnæn.ə/', meaning: 'quả chuối', emoji: '🍌', example: 'Monkeys love sweet bananas.', exampleVi: 'Các bạn khỉ rất thích chuối ngọt.' },
          { id: 'water', word: 'water', pronunciation: '/ˈwɔː.tər/', meaning: 'nước lọc', emoji: '💧', example: 'Drink fresh water every day.', exampleVi: 'Uống nước lọc đều đặn mỗi ngày.' },
        ],
      },
      {
        id: 'g2-chest',
        isChest: true,
        title: 'Rương Thần Lớp 2',
        icon: '🎁',
        bonusStars: 5,
        starsRequired: 6,
      },
      {
        id: 'g2-s3',
        title: 'Cơ Thể Khỏe Mạnh',
        icon: '🧍',
        starsRequired: 6,
        words: [
          { id: 'hand', word: 'hand', pronunciation: '/hænd/', meaning: 'bàn tay', emoji: '✋', example: 'Wash your hands before eating.', exampleVi: 'Rửa tay sạch sẽ trước khi ăn nhé.' },
          { id: 'eye', word: 'eye', pronunciation: '/aɪ/', meaning: 'mắt', emoji: '👁️', example: 'Close your eyes and sleep.', exampleVi: 'Nhắm mắt lại và ngủ ngoan nào.' },
          { id: 'ear', word: 'ear', pronunciation: '/ɪər/', meaning: 'tai', emoji: '👂', example: 'Listen with your two ears.', exampleVi: 'Lắng nghe bằng đôi tai nhỏ.' },
          { id: 'mouth', word: 'mouth', pronunciation: '/maʊθ/', meaning: 'miệng', emoji: '👄', example: 'A happy smile on your mouth.', exampleVi: 'Một nụ cười vui trên bờ môi.' },
        ],
      },
    ],
  },
  {
    grade: 3,
    id: 'island-3',
    name: 'Trạm Vũ Trụ Kỳ Thú',
    badge: 'Chinh Phục Starters',
    subtitle: 'Nền tảng câu hỏi Yes/No, thì Hiện tại đơn, trường lớp & thể thao',
    icon: '🚀',
    color: 'from-sky-400 via-indigo-500 to-purple-600',
    bgLight: 'bg-gradient-to-br from-sky-50 via-indigo-50/50 to-purple-50/50',
    border: 'border-sky-300/60',
    cardGlow: 'shadow-[0_12px_40px_rgba(56,189,248,0.25)]',
    mapBg: 'from-sky-100/60 via-indigo-50/40 to-blue-100/50',
    stations: [
      {
        id: 'g3-s1',
        title: 'Thể Thao Sôi Động',
        icon: '⚽',
        starsRequired: 0,
        words: [
          { id: 'bicycle', word: 'bicycle', pronunciation: '/ˈbaɪ.sɪ.kəl/', meaning: 'xe đạp', image: '/assets/kids/bicycle.jpg', emoji: '🚲', example: 'I ride my bicycle in the park.', exampleVi: 'Bé đạp xe đạp trong công viên.' },
          { id: 'football', word: 'football', pronunciation: '/ˈfʊt.bɔːl/', meaning: 'bóng đá', emoji: '⚽', example: 'Boys play football happily.', exampleVi: 'Các bạn chơi bóng đá thật vui.' },
          { id: 'swim', word: 'swim', pronunciation: '/swɪm/', meaning: 'bơi lội', emoji: '🏊', example: 'Fishes swim in cool water.', exampleVi: 'Cá bơi lội trong làn nước mát.' },
          { id: 'run', word: 'run', pronunciation: '/rʌn/', meaning: 'chạy bộ', emoji: '🏃', example: 'Run fast to catch the train.', exampleVi: 'Chạy nhanh để bắt kịp chuyến tàu.' },
        ],
      },
      {
        id: 'g3-s2',
        title: 'Trường Học Vui Nhộn',
        icon: '🏫',
        starsRequired: 3,
        words: [
          { id: 'teacher', word: 'teacher', pronunciation: '/ˈtiː.tʃər/', meaning: 'giáo viên', emoji: '👩‍🏫', example: 'Our teacher tells good stories.', exampleVi: 'Cô giáo kể cho bé những câu chuyện hay.' },
          { id: 'student', word: 'student', pronunciation: '/ˈstjuː.dənt/', meaning: 'học sinh', emoji: '🎒', example: 'I am a diligent student.', exampleVi: 'Bé là một học sinh chăm chỉ.' },
          { id: 'classroom', word: 'classroom', pronunciation: '/ˈklɑːs.ruːm/', meaning: 'lớp học', emoji: '🏫', example: 'Our classroom is clean and bright.', exampleVi: 'Lớp học của chúng mình sạch và sáng.' },
          { id: 'library', word: 'library', pronunciation: '/ˈlaɪ.brər.i/', meaning: 'thư viện', emoji: '📚', example: 'Read quiet books in the library.', exampleVi: 'Đọc sách yên tĩnh trong thư viện.' },
        ],
      },
      {
        id: 'g3-chest',
        isChest: true,
        title: 'Rương Thần Lớp 3',
        icon: '🎁',
        bonusStars: 5,
        starsRequired: 6,
      },
    ],
  },
  {
    grade: 4,
    id: 'island-4',
    name: 'Thung Lũng Thám Hiểm',
    badge: 'Chinh Phục Movers',
    subtitle: 'Thì Hiện tại tiếp diễn, Quá khứ đơn, Nghề nghiệp & Thiên nhiên',
    icon: '🧭',
    color: 'from-teal-400 via-emerald-500 to-amber-500',
    bgLight: 'bg-gradient-to-br from-teal-50 via-emerald-50/50 to-amber-50/50',
    border: 'border-teal-300/60',
    cardGlow: 'shadow-[0_12px_40px_rgba(20,184,166,0.22)]',
    mapBg: 'from-teal-100/60 via-emerald-50/40 to-lime-100/50',
    stations: [
      {
        id: 'g4-s1',
        title: 'Nghề Nghiệp Ước Mơ',
        icon: '👩‍⚕️',
        starsRequired: 0,
        words: [
          { id: 'doctor', word: 'doctor', pronunciation: '/ˈdɒk.tər/', meaning: 'bác sĩ', emoji: '🩺', example: 'The kind doctor helps sick people.', exampleVi: 'Bác sĩ tốt bụng chăm sóc người ốm.' },
          { id: 'police', word: 'police officer', pronunciation: '/pəˈliːs ˈɒf.ɪ.sər/', meaning: 'công an, cảnh sát', emoji: '👮', example: 'Police officers protect everyone.', exampleVi: 'Cảnh sát bảo vệ mọi người bình yên.' },
          { id: 'farmer', word: 'farmer', pronunciation: '/ˈfɑː.mər/', meaning: 'nông dân', emoji: '🧑‍🌾', example: 'The farmer grows sweet fruits.', exampleVi: 'Bác nông dân trồng những trái cây ngọt.' },
          { id: 'pilot', word: 'pilot', pronunciation: '/ˈpaɪ.lət/', meaning: 'phi công', emoji: '👨‍✈️', example: 'A brave pilot flies airplanes.', exampleVi: 'Phi công dũng cảm lái máy bay trên trời.' },
        ],
      },
      {
        id: 'g4-s2',
        title: 'Thế Giới Hoang Dã',
        icon: '🦒',
        starsRequired: 3,
        words: [
          { id: 'elephant', word: 'elephant', pronunciation: '/ˈel.ɪ.fənt/', meaning: 'con voi', emoji: '🐘', example: 'The huge elephant has big ears.', exampleVi: 'Chú voi to lớn có đôi tai thật to.' },
          { id: 'tiger', word: 'tiger', pronunciation: '/ˈtaɪ.ɡər/', meaning: 'con hổ', emoji: '🐅', example: 'The fast tiger runs in the jungle.', exampleVi: 'Chú hổ dũng mãnh chạy trong rừng già.' },
          { id: 'monkey', word: 'monkey', pronunciation: '/ˈmʌŋ.ki/', meaning: 'con khỉ', emoji: '🐒', example: 'The funny monkey climbs tall trees.', exampleVi: 'Chú khỉ tinh nghịch leo lên cây cao.' },
          { id: 'giraffe', word: 'giraffe', pronunciation: '/dʒɪˈrɑːf/', meaning: 'hươu cao cổ', emoji: '🦒', example: 'The giraffe has the longest neck.', exampleVi: 'Hươu cao cổ có chiếc cổ dài nhất.' },
        ],
      },
      {
        id: 'g4-chest',
        isChest: true,
        title: 'Rương Thần Lớp 4',
        icon: '🎁',
        bonusStars: 5,
        starsRequired: 6,
      },
    ],
  },
  {
    grade: 5,
    id: 'island-5',
    name: 'Vương Quốc Thủ Lĩnh',
    badge: 'Chinh Phục Flyers',
    subtitle: 'Thì Tương lai, So sánh nhất, Động từ khuyết thiếu & Chuyển cấp',
    icon: '👑',
    color: 'from-purple-500 via-pink-500 to-amber-400',
    bgLight: 'bg-gradient-to-br from-purple-50 via-pink-50/50 to-amber-50/50',
    border: 'border-purple-300/60',
    cardGlow: 'shadow-[0_12px_40px_rgba(168,85,247,0.25)]',
    mapBg: 'from-purple-100/60 via-pink-50/40 to-amber-100/50',
    stations: [
      {
        id: 'g5-s1',
        title: 'Hành Trình Tương Lai',
        icon: '🚀',
        starsRequired: 0,
        words: [
          { id: 'spaceship', word: 'spaceship', pronunciation: '/ˈspeɪs.ʃɪp/', meaning: 'tàu vũ trụ', emoji: '🛸', example: 'Astronauts travel by spaceship.', exampleVi: 'Các phi hành gia du hành bằng tàu vũ trụ.' },
          { id: 'future', word: 'future', pronunciation: '/ˈfjuː.tʃər/', meaning: 'tương lai', emoji: '🔮', example: 'Work hard for a bright future.', exampleVi: 'Chăm chỉ vì một tương lai tươi sáng.' },
          { id: 'island', word: 'island', pronunciation: '/ˈaɪ.lənd/', meaning: 'hòn đảo', emoji: '🏝️', example: 'We will visit a beautiful island.', exampleVi: 'Chúng mình sẽ ghé thăm một hòn đảo xinh đẹp.' },
          { id: 'champion', word: 'champion', pronunciation: '/ˈtʃæm.pi.ən/', meaning: 'nhà vô địch', emoji: '🏆', example: 'You will become a true champion.', exampleVi: 'Bé sẽ trở thành một nhà vô địch thực thụ.' },
        ],
      },
      {
        id: 'g5-s2',
        title: 'Sức Khỏe & Vệ Sinh',
        icon: '🩺',
        starsRequired: 3,
        words: [
          { id: 'healthy', word: 'healthy', pronunciation: '/ˈhel.θi/', meaning: 'khỏe mạnh', emoji: '💪', example: 'Eat vegetables to stay healthy.', exampleVi: 'Ăn rau xanh để cơ thể luôn khỏe mạnh.' },
          { id: 'exercise', word: 'exercise', pronunciation: '/ˈek.sə.saɪz/', meaning: 'tập thể dục', emoji: '🤸', example: 'Morning exercise makes you strong.', exampleVi: 'Tập thể dục buổi sáng giúp bé dẻo dai.' },
          { id: 'medicine', word: 'medicine', pronunciation: '/ˈmed.sən/', meaning: 'thuốc uống', emoji: '💊', example: 'Take medicine on time to recover.', exampleVi: 'Uống thuốc đúng giờ để mau khỏe nhé.' },
          { id: 'dentist', word: 'dentist', pronunciation: '/ˈden.tɪst/', meaning: 'nha sĩ', emoji: '🦷', example: 'Visit the dentist to keep teeth clean.', exampleVi: 'Khám nha sĩ định kỳ để răng luôn sáng đẹp.' },
        ],
      },
      {
        id: 'g5-chest',
        isChest: true,
        title: 'Rương Thần Lớp 5',
        icon: '🎁',
        bonusStars: 5,
        starsRequired: 6,
      },
    ],
  },
];

// Speech Synthesis with rate adjustment
function speakVoice(text, rate = 0.85) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.1; // Friendly higher pitch for kids
    window.speechSynthesis.speak(utterance);
  } catch {}
}

export default function KidsZone() {
  const [selectedGrade, setSelectedGrade] = useState(1);
  const [activeStationId, setActiveStationId] = useState(null);
  const [learningMode, setLearningMode] = useState('flashcard'); // 'flashcard' | 'quiz' | 'match'
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [isSlowAudio, setIsSlowAudio] = useState(false);

  // Gamification State (Saved in LocalStorage)
  const [earnedStars, setEarnedStars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kids_earned_stars_v2') || '{}');
    } catch {
      return {};
    }
  });

  const [openedChests, setOpenedChests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kids_opened_chests_v2') || '{}');
    } catch {
      return {};
    }
  });

  const [showBackpack, setShowBackpack] = useState(false);
  const [showParentGate, setShowParentGate] = useState(false);
  const [parentMathAnswer, setParentMathAnswer] = useState('');
  const [parentGatePassed, setParentGatePassed] = useState(false);
  const [parentQuestion, setParentQuestion] = useState({ a: 4, b: 3 });

  // Quiz state
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState(0);

  // Matching game state
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]);

  // Active Island
  const currentIsland = useMemo(() => {
    return ISLANDS.find((i) => i.grade === selectedGrade) || ISLANDS[0];
  }, [selectedGrade]);

  // Active Station
  const activeStation = useMemo(() => {
    if (!activeStationId) return null;
    return currentIsland.stations.find((s) => s.id === activeStationId) || null;
  }, [activeStationId, currentIsland]);

  const activeWords = activeStation?.words || [];
  const currentWord = activeWords[activeWordIdx] || activeWords[0];

  // Total Stars Earned across all islands
  const totalStars = useMemo(() => {
    const fromStations = Object.values(earnedStars).reduce((sum, n) => sum + (Number(n) || 0), 0);
    const fromChests = Object.keys(openedChests).length * 5;
    return fromStations + fromChests;
  }, [earnedStars, openedChests]);

  // Current Island Stars
  const islandStars = useMemo(() => {
    return currentIsland.stations.reduce((sum, s) => {
      if (s.isChest) {
        return sum + (openedChests[s.id] ? 5 : 0);
      }
      return sum + (earnedStars[s.id] || 0);
    }, 0);
  }, [currentIsland, earnedStars, openedChests]);

  // Save earned stars
  const awardStationStars = (stationId, count) => {
    const prev = earnedStars[stationId] || 0;
    if (count > prev) {
      const updated = { ...earnedStars, [stationId]: count };
      setEarnedStars(updated);
      localStorage.setItem('kids_earned_stars_v2', JSON.stringify(updated));
    }
  };

  // Open Treasure Chest
  const handleOpenChest = (chest) => {
    if (openedChests[chest.id]) return;
    playBotCheerSound();
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f43f5e', '#3b82f6', '#10b981', '#a855f7'],
    });
    const updated = { ...openedChests, [chest.id]: true };
    setOpenedChests(updated);
    localStorage.setItem('kids_opened_chests_v2', JSON.stringify(updated));
  };

  // Trigger Sound
  const playWordVoice = (text, rateOverride) => {
    const rate = rateOverride ?? (isSlowAudio ? 0.65 : 0.85);
    speakVoice(text, rate);
  };

  // Select Station to start
  const handleSelectStation = (station) => {
    playPopSound();
    if (station.isChest) {
      handleOpenChest(station);
      return;
    }
    setActiveStationId(station.id);
    setActiveWordIdx(0);
    setShowMeaning(false);
    setLearningMode('flashcard');
    setQuizAnswer(null);
    setQuizScore(0);
    setMatchedPairs([]);
    setSelectedLeft(null);

    if (station.words?.[0]) {
      setTimeout(() => playWordVoice(station.words[0].word), 250);
    }
  };

  // Move next word in Flashcard
  const handleNextWord = () => {
    playPopSound();
    if (activeWordIdx < activeWords.length - 1) {
      const nextIdx = activeWordIdx + 1;
      setActiveWordIdx(nextIdx);
      setShowMeaning(false);
      playWordVoice(activeWords[nextIdx].word);
    } else {
      // Award 2 stars for flashcard completion and switch to Quiz
      awardStationStars(activeStation.id, 2);
      playBotCheerSound();
      setLearningMode('quiz');
    }
  };

  // Move prev word
  const handlePrevWord = () => {
    playPopSound();
    if (activeWordIdx > 0) {
      const prevIdx = activeWordIdx - 1;
      setActiveWordIdx(prevIdx);
      setShowMeaning(false);
      playWordVoice(activeWords[prevIdx].word);
    }
  };

  // Handle Quiz answer
  const handleQuizAnswer = (word) => {
    const isCorrect = word.id === currentWord.id;
    setQuizAnswer({ wordId: word.id, isCorrect });

    if (isCorrect) {
      playCorrectSound();
      setQuizScore((s) => s + 1);
      setTimeout(() => {
        if (activeWordIdx < activeWords.length - 1) {
          const nextIdx = activeWordIdx + 1;
          setActiveWordIdx(nextIdx);
          setQuizAnswer(null);
          playWordVoice(activeWords[nextIdx].word);
        } else {
          // Completed Quiz -> Give 3 Stars!
          awardStationStars(activeStation.id, 3);
          playBotCheerSound();
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.65 },
          });
          setLearningMode('match');
        }
      }, 900);
    }
  };

  // Handle Matching
  const handleMatchSelect = (word, side) => {
    playPopSound();
    if (side === 'left') {
      setSelectedLeft(word);
      playWordVoice(word.word);
    } else if (side === 'right' && selectedLeft) {
      if (selectedLeft.id === word.id) {
        playCorrectSound();
        const nextMatched = [...matchedPairs, word.id];
        setMatchedPairs(nextMatched);
        setSelectedLeft(null);

        if (nextMatched.length === activeWords.length) {
          awardStationStars(activeStation.id, 3);
          playBotCheerSound();
          confetti({ particleCount: 65, spread: 80, origin: { y: 0.6 } });
        }
      } else {
        setSelectedLeft(null);
      }
    }
  };

  // Randomize Math for Parent Gate
  const openParentModal = () => {
    playPopSound();
    const num1 = Math.floor(Math.random() * 8) + 2;
    const num2 = Math.floor(Math.random() * 7) + 2;
    setParentQuestion({ a: num1, b: num2 });
    setParentMathAnswer('');
    setParentGatePassed(false);
    setShowParentGate(true);
  };

  const handleVerifyParent = (e) => {
    e.preventDefault();
    if (Number(parentMathAnswer) === parentQuestion.a + parentQuestion.b) {
      setParentGatePassed(true);
      playBotCheerSound();
    } else {
      alert('Chưa chính xác rồi ạ! Mời ba mẹ tính lại nhé.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-[#0c071d] py-4 sm:py-6 select-none transition-colors duration-300">
      <div className="mx-auto w-[94%] max-w-6xl space-y-6">
        {/* =========================================================
            1. TOP KID'S DOCK: STARS, BACKPACK & PARENT CORNER
        ========================================================= */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/60 bg-white/80 p-3.5 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 text-2xl shadow-md shadow-amber-400/30">
              🎈
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-800 dark:text-white sm:text-base">
                  KIDS ENGLISH ZONE
                </span>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">
                  TIỂU HỌC 1-5
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400">
                Chinh phục 5 hòn đảo · Thu thập kho báu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Total Stars Counter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-amber-300/40 bg-amber-400/10 px-3.5 py-2 text-xs font-black text-amber-600 shadow-sm dark:text-amber-300 sm:text-sm">
              <Star size={18} className="fill-amber-400 text-amber-400 animate-pulse" />
              <span>{totalStars}</span>
              <span className="hidden sm:inline font-bold text-slate-400">Sao</span>
            </div>

            {/* Backpack Button */}
            <button
              type="button"
              onClick={() => {
                playPopSound();
                setShowBackpack(true);
              }}
              className="flex items-center gap-1.5 rounded-2xl border border-sky-300/40 bg-sky-400/10 px-3.5 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-400/20 active:scale-95 dark:text-sky-300 sm:text-sm"
              title="Ba lô bảo bối"
            >
              <Backpack size={18} />
              <span className="hidden sm:inline">Ba Lô</span>
            </button>

            {/* Slow/Fast Audio Voice Toggle (Turtle / Rabbit) */}
            <button
              type="button"
              onClick={() => {
                playPopSound();
                setIsSlowAudio((v) => !v);
              }}
              className={`flex items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-black transition active:scale-95 ${
                isSlowAudio
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
              }`}
              title={isSlowAudio ? 'Giọng Rùa Chậm' : 'Giọng Thỏ Nhanh'}
            >
              <span className="text-base">{isSlowAudio ? '🐢' : '🐇'}</span>
              <span className="hidden min-[400px]:inline">
                {isSlowAudio ? 'Chậm' : 'Nhanh'}
              </span>
            </button>

            {/* Parent Shield Button */}
            <button
              type="button"
              onClick={openParentModal}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
              title="Góc Phụ Huynh"
            >
              <Shield size={18} />
            </button>
          </div>
        </header>

        {/* =========================================================
            2. FIVE ISLAND KINGDOMS SELECTOR (LỚP 1 - LỚP 5)
        ========================================================= */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
          {ISLANDS.map((island) => {
            const isSelected = selectedGrade === island.grade;
            return (
              <button
                key={island.id}
                type="button"
                onClick={() => {
                  playPopSound();
                  setSelectedGrade(island.grade);
                  setActiveStationId(null);
                }}
                className={`group relative overflow-hidden rounded-3xl border p-3 text-left transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? `bg-gradient-to-br ${island.color} text-white shadow-xl ${island.cardGlow} scale-[1.03] border-white/40 ring-4 ring-white/30`
                    : 'border-white/60 bg-white/70 text-slate-700 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl sm:text-3xl transition group-hover:scale-110">
                    {island.icon}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                    }`}
                  >
                    Lớp {island.grade}
                  </span>
                </div>

                <div className="mt-2 min-w-0">
                  <h3 className="truncate text-xs font-black sm:text-sm">
                    {island.name}
                  </h3>
                  <p
                    className={`truncate text-[10px] font-bold ${
                      isSelected ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    {island.badge}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* =========================================================
            3. ADVENTURE MAP VIEW (TREASURE ISLAND PATH)
        ========================================================= */}
        {!activeStation && (
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-b from-white/90 via-sky-50/60 to-amber-50/60 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:from-slate-900/90 dark:via-slate-900/95 dark:to-purple-950/40 sm:p-8">
            {/* Island Banner */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200/60 pb-5 dark:border-white/10 md:flex-row md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-300">
                  <span>{currentIsland.icon}</span>
                  <span>HÒN ĐẢO LỚP {currentIsland.grade}</span>
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  {currentIsland.name}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">
                  {currentIsland.subtitle}
                </p>
              </div>

              {/* Island Star Progress */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 p-3 shadow-xs dark:border-white/10 dark:bg-slate-800/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/20 text-amber-500">
                  <Trophy size={24} />
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">
                    Tiến độ đảo
                  </span>
                  <span className="text-base font-black text-slate-800 dark:text-white">
                    {islandStars} / {currentIsland.stations.length * 3} ⭐
                  </span>
                </div>
              </div>
            </div>

            {/* Winding Island Path (Interactive Stations) */}
            <div className="relative my-6 flex flex-col items-center justify-center py-4">
              {/* Vertical connector dashed trail */}
              <div className="absolute top-8 bottom-8 left-1/2 w-1 -translate-x-1/2 border-l-4 border-dashed border-sky-300/50 dark:border-sky-500/30" />

              <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8 sm:gap-10">
                {currentIsland.stations.map((station, idx) => {
                  const isChest = station.isChest;
                  const isOpenedChest = isChest && openedChests[station.id];
                  const stationStars = earnedStars[station.id] || 0;
                  const isLocked = islandStars < station.starsRequired;
                  const isLeft = idx % 2 === 0;

                  return (
                    <motion.div
                      key={station.id}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`flex w-full items-center ${
                        isLeft ? 'justify-start sm:pl-12' : 'justify-end sm:pr-12'
                      }`}
                    >
                      <div className="group relative flex items-center gap-3">
                        {/* 3D Circular Jelly Button */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleSelectStation(station)}
                          className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-xl transition-all duration-300 active:scale-95 sm:h-24 sm:w-24 ${
                            isLocked
                              ? 'border-slate-300 bg-slate-200 text-slate-400 opacity-70 dark:border-slate-700 dark:bg-slate-800'
                              : isChest
                                ? isOpenedChest
                                  ? 'border-amber-400 bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-900 shadow-amber-400/40'
                                  : 'border-pink-400 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 text-white shadow-pink-500/40 animate-bounce'
                                : stationStars === 3
                                  ? 'border-emerald-400 bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-emerald-400/30'
                                  : 'border-sky-400 bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-500 text-white shadow-sky-400/30 hover:scale-105'
                          }`}
                        >
                          {isLocked ? (
                            <Lock size={28} />
                          ) : (
                            <span className="text-3xl sm:text-4xl">
                              {station.icon}
                            </span>
                          )}

                          {/* 3-Star Badge under station */}
                          {!isChest && !isLocked && (
                            <div className="absolute -bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white bg-slate-900/90 px-2 py-0.5 text-[10px] text-amber-400 shadow dark:border-slate-800">
                              {[1, 2, 3].map((starNum) => (
                                <Star
                                  key={starNum}
                                  size={11}
                                  className={
                                    starNum <= stationStars
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-600'
                                  }
                                />
                              ))}
                            </div>
                          )}

                          {/* Floating Mascot indicator for current active uncompleted station */}
                          {!isLocked && !isChest && stationStars < 3 && (
                            <motion.div
                              animate={{ y: [-4, 4, -4] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                              className="pointer-events-none absolute -top-8 -right-3 flex h-10 w-10 items-center justify-center"
                            >
                              <img
                                src={chatbotImage}
                                alt="Bé bot"
                                className="h-full w-full object-contain drop-shadow"
                              />
                            </motion.div>
                          )}
                        </button>

                        {/* Station Card Details */}
                        <div
                          onClick={() => !isLocked && handleSelectStation(station)}
                          className={`cursor-pointer rounded-2xl border p-3 backdrop-blur-md transition group-hover:scale-102 ${
                            isLocked
                              ? 'border-slate-200 bg-slate-100/70 text-slate-400 dark:border-white/5 dark:bg-slate-800/40'
                              : 'border-white/80 bg-white/85 text-slate-800 shadow-sm hover:border-sky-300 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black">
                              {station.title}
                            </span>
                            {isChest && (
                              <span className="rounded-full bg-pink-500/20 px-1.5 py-0.5 text-[9px] font-black text-pink-600 dark:text-pink-300">
                                +5 SAO
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                            {isLocked
                              ? `Cần ${station.starsRequired} ⭐ để mở`
                              : isChest
                                ? isOpenedChest
                                  ? 'Đã mở khóa quà'
                                  : 'Chạm để nhận thưởng!'
                                : `${station.words?.length || 0} từ vựng mới`}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Mascot Advice Banner */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-pink-300/40 bg-gradient-to-r from-pink-400/15 via-purple-400/10 to-transparent p-3.5 dark:border-pink-500/20">
              <div className="h-10 w-10 shrink-0">
                <img src={chatbotImage} alt="Mascot" className="h-full w-full object-contain" />
              </div>
              <p className="text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-300">
                💡 <span className="font-black text-pink-600 dark:text-pink-400">Bé Bot mách nhỏ:</span> Mỗi trạm hoàn thành bạn sẽ rinh về 3 Ngôi Sao Vàng và mở khóa các Rương Báu thần kỳ đó nha!
              </p>
            </div>
          </div>
        )}

        {/* =========================================================
            4. ACTIVE LEARNING STATION VIEW (FLASHCARD / QUIZ / MATCH)
        ========================================================= */}
        {activeStation && (
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95 sm:p-8">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  playPopSound();
                  setActiveStationId(null);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft size={16} />
                <span>Bản đồ đảo</span>
              </button>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    setLearningMode('flashcard');
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    learningMode === 'flashcard'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  📖 1. Thẻ Nhớ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    setLearningMode('quiz');
                    setActiveWordIdx(0);
                    setQuizAnswer(null);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    learningMode === 'quiz'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  ⚡ 2. Thử Tài
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    setLearningMode('match');
                    setMatchedPairs([]);
                    setSelectedLeft(null);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    learningMode === 'match'
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  🍬 3. Nối Kẹo
                </button>
              </div>

              {/* Station Progress */}
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs font-black text-slate-500">
                <span>{activeWordIdx + 1}</span>
                <span>/</span>
                <span>{activeWords.length}</span>
              </div>
            </div>

            {/* ---------------------------------------------------------
                MODE 1: 3D TALKING FLASHCARD
            --------------------------------------------------------- */}
            {learningMode === 'flashcard' && currentWord && (
              <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-xl text-center">
                  {/* Card Frame */}
                  <div className="relative mx-auto flex h-72 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border-4 border-sky-300/40 bg-gradient-to-b from-sky-50 via-white to-amber-50/40 p-6 shadow-2xl dark:border-white/10 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-900 sm:h-80">
                    {/* Visual Asset: Image or 3D Emoji */}
                    {currentWord.image ? (
                      <img
                        src={currentWord.image}
                        alt={currentWord.word}
                        className="h-36 w-36 rounded-3xl object-cover shadow-md drop-shadow sm:h-40 sm:w-40"
                      />
                    ) : (
                      <span className="text-7xl sm:text-8xl animate-bounce">
                        {currentWord.emoji || '🌟'}
                      </span>
                    )}

                    {/* Word & Phonetic */}
                    <h3 className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                      {currentWord.word}
                    </h3>
                    <p className="mt-1 font-mono text-sm font-bold text-sky-600 dark:text-sky-300">
                      {currentWord.pronunciation}
                    </p>
                  </div>

                  {/* Audio Speaker Buttons (Fast Rabbit & Slow Turtle) */}
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => playWordVoice(currentWord.word, 0.85)}
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sky-500 px-5 text-sm font-black text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 active:scale-95"
                    >
                      <Volume2 size={20} />
                      <span>Nghe chuẩn 🐇</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => playWordVoice(currentWord.word, 0.6)}
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-300"
                      title="Phát âm chậm từng âm tiết"
                    >
                      <span>🐢 Chậm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playPopSound();
                        setShowMeaning((v) => !v);
                      }}
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <span>{showMeaning ? 'Ẩn nghĩa' : 'Xem nghĩa 💡'}</span>
                    </button>
                  </div>

                  {/* Bilingual Example Box */}
                  <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/50">
                    {showMeaning ? (
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {currentWord.meaning}
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-slate-400 italic">
                        Chạm vào "Xem nghĩa" để kiểm tra đáp án tiếng Việt nhé!
                      </p>
                    )}
                    <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                      "{currentWord.example}"
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {currentWord.exampleVi}
                    </p>
                  </div>

                  {/* Navigation Arrows */}
                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={activeWordIdx === 0}
                      onClick={handlePrevWord}
                      className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
                    >
                      <ChevronLeft size={18} />
                      <span>Từ trước</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextWord}
                      className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 px-6 text-sm font-black text-white shadow-xl shadow-indigo-500/25 transition hover:brightness-110 active:scale-95"
                    >
                      <span>
                        {activeWordIdx < activeWords.length - 1
                          ? 'Từ tiếp theo'
                          : 'Xong thẻ! Vào thi tài ⚡'}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------
                MODE 2: VISUAL QUIZ (CHỌN TRANH CHUẨN)
            --------------------------------------------------------- */}
            {learningMode === 'quiz' && currentWord && (
              <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-xl text-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-300">
                    <Sparkles size={14} /> THỬ TÀI ĐOÁN TỪ · CÂU {activeWordIdx + 1}/{activeWords.length} · ĐÚNG {quizScore} ⭐
                  </div>

                  {/* Question Sound Call */}
                  <div className="my-5 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => playWordVoice(currentWord.word)}
                      className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-rose-400 text-white shadow-xl shadow-amber-400/30 transition hover:scale-105 active:scale-95"
                    >
                      <Volume2 size={36} />
                    </button>
                    <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">
                      Bấm loa để nghe lại: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">"{currentWord.word}"</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Đâu là bức tranh tương ứng với từ này?
                    </p>
                  </div>

                  {/* 4 Choices Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {activeWords.map((choice) => {
                      const isChosen = quizAnswer?.wordId === choice.id;
                      const isCorrect = choice.id === currentWord.id;

                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handleQuizAnswer(choice)}
                          className={`flex flex-col items-center justify-center rounded-3xl border-2 p-4 transition-all duration-200 active:scale-95 ${
                            isChosen
                              ? isCorrect
                                ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 scale-102 ring-4 ring-emerald-400/30'
                                : 'border-rose-400 bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
                              : 'border-slate-200 bg-slate-50 hover:border-amber-400 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-4xl sm:text-5xl">{choice.emoji || '🍎'}</span>
                          <span className="mt-2 text-sm font-black text-slate-800 dark:text-white">
                            {choice.meaning}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------
                MODE 3: CANDY MATCHING GAME (GHÉP ĐÔI KẸO NGỌT)
            --------------------------------------------------------- */}
            {learningMode === 'match' && (
              <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-xl text-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/40 bg-pink-400/15 px-3 py-1 text-xs font-black text-pink-600 dark:text-pink-300">
                    🍬 NỐI KẸO TIẾNG ANH & TIẾNG VIỆT
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Chạm 1 viên kẹo tiếng Anh rồi chạm viên kẹo tiếng Việt tương ứng!
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {/* Left: English Candies */}
                    <div className="space-y-2.5">
                      {activeWords.map((item) => {
                        const isMatched = matchedPairs.includes(item.id);
                        const isSelected = selectedLeft?.id === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={isMatched}
                            onClick={() => handleMatchSelect(item, 'left')}
                            className={`flex min-h-12 w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left font-black transition-all ${
                              isMatched
                                ? 'border-emerald-400 bg-emerald-100 text-emerald-800 opacity-60 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : isSelected
                                  ? 'border-sky-500 bg-sky-100 text-sky-800 scale-102 ring-4 ring-sky-400/20 dark:bg-sky-950/50 dark:text-sky-200'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span className="text-sm sm:text-base">{item.word}</span>
                            {isMatched && <CheckCircle2 size={16} className="text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right: Vietnamese Candies */}
                    <div className="space-y-2.5">
                      {[...activeWords].reverse().map((item) => {
                        const isMatched = matchedPairs.includes(item.id);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={isMatched}
                            onClick={() => handleMatchSelect(item, 'right')}
                            className={`flex min-h-12 w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left font-black transition-all ${
                              isMatched
                                ? 'border-emerald-400 bg-emerald-100 text-emerald-800 opacity-60 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span className="text-sm sm:text-base">{item.meaning}</span>
                            <span className="text-lg">{item.emoji || '🍬'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Completion state */}
                  {matchedPairs.length === activeWords.length && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-6 rounded-3xl border border-emerald-400 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-950/40"
                    >
                      <h4 className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                        🎉 Tuyệt vời! Bạn nhỏ đã hoàn thành xuất sắc!
                      </h4>
                      <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                        Đã ghi nhớ trọn vẹn từ vựng trạm này và nhận đủ 3 Ngôi Sao Vàng!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          playPopSound();
                          setActiveStationId(null);
                        }}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 active:scale-95"
                      >
                        <span>Quay lại Bản đồ Đảo</span>
                        <ChevronRight size={16} />
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            5. BACKPACK MODAL (TỦ BẢO BỐI & PHẦN THƯỞNG)
        ========================================================= */}
        <AnimatePresence>
          {showBackpack && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBackpack(false)}
                className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
              />

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎒</span>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      Ba Lô Bảo Bối Của Bé
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBackpack(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Stars summary */}
                  <div className="flex items-center justify-between rounded-2xl bg-amber-400/15 p-4 border border-amber-300/40">
                    <div className="flex items-center gap-2.5">
                      <Star size={28} className="fill-amber-400 text-amber-400" />
                      <div>
                        <span className="block text-xl font-black text-amber-700 dark:text-amber-300">
                          {totalStars} Sao Vàng
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          Tích lũy qua các trạm học
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges unlocked */}
                  <div>
                    <span className="block text-xs font-black uppercase text-slate-400 mb-2">
                      HUY HIỆU ĐÃ MỞ KHÓA
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-slate-800/60">
                        <span className="text-2xl">🌱</span>
                        <span className="mt-1 block text-xs font-black text-slate-700 dark:text-slate-200">
                          Tân Binh Lớp 1
                        </span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-slate-800/60">
                        <span className="text-2xl">🚀</span>
                        <span className="mt-1 block text-xs font-black text-slate-700 dark:text-slate-200">
                          Phi Hành Gia
                        </span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-slate-800/60">
                        <span className="text-2xl">👑</span>
                        <span className="mt-1 block text-xs font-black text-slate-700 dark:text-slate-200">
                          Thủ Lĩnh Nhí
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* =========================================================
            6. PARENT CORNER MODAL (GÓC DÀNH CHO PHỤ HUYNH)
        ========================================================= */}
        <AnimatePresence>
          {showParentGate && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowParentGate(false)}
                className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
              />

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Shield size={20} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      Khu Vực Dành Cho Ba Mẹ 🛡️
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowParentGate(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                {!parentGatePassed ? (
                  <form onSubmit={handleVerifyParent} className="mt-4 space-y-4">
                    <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                      Để đảm bảo an toàn, mời ba mẹ giải phép tính nhanh này để mở khóa cài đặt:
                    </p>

                    <div className="rounded-2xl bg-indigo-50/70 p-4 text-center font-mono text-2xl font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {parentQuestion.a} + {parentQuestion.b} = ?
                    </div>

                    <input
                      type="number"
                      autoFocus
                      value={parentMathAnswer}
                      onChange={(e) => setParentMathAnswer(e.target.value)}
                      placeholder="Nhập kết quả..."
                      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-center text-lg font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                      required
                    />

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 active:scale-98"
                    >
                      Xác nhận mở khóa
                    </button>
                  </form>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      ✅ Đã xác minh phụ huynh thành công!
                    </div>

                    <div className="space-y-2">
                      <span className="block text-xs font-black uppercase text-slate-400">
                        BÁO CÁO TIẾN ĐỘ CỦA BÉ
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                          <span className="block text-xl font-black text-slate-800 dark:text-white">
                            {totalStars}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            Tổng Sao Tích Lũy
                          </span>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                          <span className="block text-xl font-black text-slate-800 dark:text-white">
                            15 phút
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            Hẹn Giờ Cho Mắt Nghỉ
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-3.5 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                      💡 <span className="font-bold text-amber-700 dark:text-amber-400">Lời khuyên:</span> Ba mẹ nên dành 10-15 phút mỗi ngày cùng con nghe lại từ vựng theo chế độ "Rùa Chậm 🐢" để con luyện cơ miệng phát âm tự nhiên nhất nhé!
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
