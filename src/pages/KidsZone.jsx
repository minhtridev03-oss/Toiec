import { useEffect, useMemo, useState } from 'react';
import {
  Backpack,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Headphones,
  RotateCcw,
  Shapes,
  Sparkles,
  Star,
  Trophy,
  Volume2,
} from 'lucide-react';

const gradeOptions = [1, 2, 3, 4, 5, 6];

const topics = [
  {
    id: 'starter',
    name: 'Starter Words',
    label: 'Lớp 1-2',
    description: 'Từ ngắn, dễ đọc, dễ nhớ.',
    minGrade: 1,
    maxGrade: 2,
    icon: Sparkles,
    accent: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/12 dark:text-amber-200 dark:border-amber-400/20',
    button: 'bg-amber-400 text-amber-950',
  },
  {
    id: 'school',
    name: 'School Things',
    label: 'Lớp 1-4',
    description: 'Đồ dùng và lớp học.',
    minGrade: 1,
    maxGrade: 4,
    icon: Backpack,
    accent: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/12 dark:text-sky-200 dark:border-sky-400/20',
    button: 'bg-sky-400 text-sky-950',
  },
  {
    id: 'home',
    name: 'Family & Home',
    label: 'Lớp 2-5',
    description: 'Người thân và sinh hoạt.',
    minGrade: 2,
    maxGrade: 5,
    icon: Shapes,
    accent: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-200 dark:border-emerald-400/20',
    button: 'bg-emerald-400 text-emerald-950',
  },
  {
    id: 'daily',
    name: 'Daily Life',
    label: 'Lớp 3-6',
    description: 'Từ dùng trong mỗi ngày.',
    minGrade: 3,
    maxGrade: 6,
    icon: Trophy,
    accent: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/12 dark:text-fuchsia-200 dark:border-fuchsia-400/20',
    button: 'bg-fuchsia-400 text-fuchsia-950',
  },
];

const kidsWords = [
  {
    id: 'apple',
    word: 'apple',
    meaning: 'quả táo',
    pronunciation: '/ˈæp.əl/',
    topicId: 'starter',
    grade: 1,
    example: 'I eat an apple.',
    exampleVi: 'Con ăn một quả táo.',
    image: '/assets/kids/apple.jpg',
    imagePrompt: 'cute soft pastel children workbook illustration of one red apple on a small plate',
  },
  {
    id: 'book',
    word: 'book',
    meaning: 'quyển sách',
    pronunciation: '/bʊk/',
    topicId: 'starter',
    grade: 1,
    example: 'This is my book.',
    exampleVi: 'Đây là quyển sách của con.',
    image: '/assets/kids/book.jpg',
    imagePrompt: 'cute soft pastel children workbook illustration of a closed story book',
  },
  {
    id: 'pencil',
    word: 'pencil',
    meaning: 'bút chì',
    pronunciation: '/ˈpen.səl/',
    topicId: 'school',
    grade: 1,
    example: 'I write with a pencil.',
    exampleVi: 'Con viết bằng bút chì.',
    image: '/assets/kids/pencil.jpg',
    imagePrompt: 'cute soft pastel children workbook illustration of a yellow pencil',
  },
  {
    id: 'backpack',
    word: 'backpack',
    meaning: 'ba lô',
    pronunciation: '/ˈbæk.pæk/',
    topicId: 'school',
    grade: 2,
    example: 'My backpack is blue.',
    exampleVi: 'Ba lô của con màu xanh.',
    image: '/assets/kids/backpack.jpg',
    imagePrompt: 'cute soft pastel children workbook illustration of a school backpack',
  },
  {
    id: 'family',
    word: 'family',
    meaning: 'gia đình',
    pronunciation: '/ˈfæm.əl.i/',
    topicId: 'home',
    grade: 2,
    example: 'I love my family.',
    exampleVi: 'Con yêu gia đình của con.',
    image: '/assets/kids/family.jpg',
    imagePrompt: 'cute soft pastel children workbook illustration of a happy family standing together',
  },
  {
    id: 'bicycle',
    word: 'bicycle',
    meaning: 'xe đạp',
    pronunciation: '/ˈbaɪ.sɪ.kəl/',
    topicId: 'daily',
    grade: 3,
    example: 'I ride a bicycle.',
    exampleVi: 'Con đạp xe đạp.',
    image: '/assets/kids/bicycle.jpg',
    imagePrompt: 'cute soft pastel children workbook illustration of a small bicycle',
  },
];

const gradeThemes = {
  1: 'from-rose-100 via-amber-50 to-sky-100 dark:from-rose-500/15 dark:via-amber-500/10 dark:to-sky-500/15',
  2: 'from-amber-100 via-emerald-50 to-sky-100 dark:from-amber-500/15 dark:via-emerald-500/10 dark:to-sky-500/15',
  3: 'from-sky-100 via-fuchsia-50 to-amber-100 dark:from-sky-500/15 dark:via-fuchsia-500/10 dark:to-amber-500/15',
  4: 'from-emerald-100 via-sky-50 to-rose-100 dark:from-emerald-500/15 dark:via-sky-500/10 dark:to-rose-500/15',
  5: 'from-fuchsia-100 via-sky-50 to-emerald-100 dark:from-fuchsia-500/15 dark:via-sky-500/10 dark:to-emerald-500/15',
  6: 'from-violet-100 via-rose-50 to-amber-100 dark:from-violet-500/15 dark:via-rose-500/10 dark:to-amber-500/15',
};

const meaningOrder = [2, 4, 1, 5, 0, 3];

function speakEnglish(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

function getTopic(topicId) {
  return topics.find((topic) => topic.id === topicId) || topics[0];
}

export default function KidsZone() {
  const [selectedGrade, setSelectedGrade] = useState(1);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedWordId, setSelectedWordId] = useState('apple');
  const [showMeaning, setShowMeaning] = useState(false);
  const [meaningAnswer, setMeaningAnswer] = useState(null);
  const [selectedMatchWordId, setSelectedMatchWordId] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [matchFeedback, setMatchFeedback] = useState(null);

  const visibleTopics = useMemo(
    () => topics.filter((topic) => selectedGrade >= topic.minGrade && selectedGrade <= topic.maxGrade),
    [selectedGrade],
  );

  const activeTopic = useMemo(() => {
    if (selectedTopic === 'all') return 'all';
    return visibleTopics.some((topic) => topic.id === selectedTopic) ? selectedTopic : 'all';
  }, [selectedTopic, visibleTopics]);

  const visibleWords = useMemo(() => {
    const visibleTopicIds = new Set(visibleTopics.map((topic) => topic.id));
    return kidsWords.filter((word) => {
      const canShowByGrade = word.grade <= selectedGrade && visibleTopicIds.has(word.topicId);
      const canShowByTopic = activeTopic === 'all' || word.topicId === activeTopic;
      return canShowByGrade && canShowByTopic;
    });
  }, [activeTopic, selectedGrade, visibleTopics]);

  const selectedWord = useMemo(() => {
    return visibleWords.find((word) => word.id === selectedWordId) || visibleWords[0] || kidsWords[0];
  }, [selectedWordId, visibleWords]);

  const selectedTopicMeta = getTopic(selectedWord.topicId);
  const SelectedTopicIcon = selectedTopicMeta.icon;

  const quizChoices = useMemo(() => {
    const others = kidsWords
      .filter((word) => word.id !== selectedWord.id)
      .slice(0, 3);
    const insertAt = selectedWord.word.length % 4;
    return [...others.slice(0, insertAt), selectedWord, ...others.slice(insertAt)].slice(0, 4);
  }, [selectedWord]);

  const matchWords = useMemo(() => visibleWords.slice(0, 6), [visibleWords]);

  const shuffledMeanings = useMemo(() => {
    const ordered = meaningOrder.map((index) => matchWords[index]).filter(Boolean);
    const missing = matchWords.filter((word) => !ordered.some((item) => item.id === word.id));
    return [...ordered, ...missing];
  }, [matchWords]);

  const learnedCount = matchedIds.length;
  const progressPercent = matchWords.length > 0 ? Math.round((learnedCount / matchWords.length) * 100) : 0;

  useEffect(() => {
    setShowMeaning(false);
    setMeaningAnswer(null);
  }, [selectedWord.id]);

  useEffect(() => {
    setMatchedIds([]);
    setSelectedMatchWordId(null);
    setMatchFeedback(null);
  }, [activeTopic, selectedGrade]);

  const chooseGrade = (grade) => {
    setSelectedGrade(grade);
    setSelectedTopic('all');
    const firstWord = kidsWords.find((word) => word.grade <= grade);
    if (firstWord) setSelectedWordId(firstWord.id);
  };

  const chooseWord = (word) => {
    setSelectedWordId(word.id);
    speakEnglish(word.word);
  };

  const goNextWord = () => {
    if (visibleWords.length === 0) return;
    const currentIndex = visibleWords.findIndex((word) => word.id === selectedWord.id);
    const nextWord = visibleWords[(currentIndex + 1) % visibleWords.length];
    setSelectedWordId(nextWord.id);
    speakEnglish(nextWord.word);
  };

  const handleMeaningChoice = (choice) => {
    const isCorrect = choice.id === selectedWord.id;
    setMeaningAnswer({ choiceId: choice.id, isCorrect });
    if (isCorrect) {
      setShowMeaning(true);
      speakEnglish(selectedWord.word);
    }
  };

  const resetMatching = () => {
    setMatchedIds([]);
    setSelectedMatchWordId(null);
    setMatchFeedback(null);
  };

  const handleMatchMeaning = (meaningWordId) => {
    if (!selectedMatchWordId || matchedIds.includes(meaningWordId)) return;

    if (selectedMatchWordId === meaningWordId) {
      setMatchedIds((current) => [...new Set([...current, meaningWordId])]);
      setMatchFeedback({ type: 'success', text: 'Đúng rồi' });
      setSelectedMatchWordId(null);
      return;
    }

    setMatchFeedback({ type: 'error', text: 'Thử lại nhé' });
  };

  const getQuizChoiceClassName = (choice) => {
    const base = 'min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all';
    if (!meaningAnswer) {
      return `${base} border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-sky-400/10`;
    }
    if (choice.id === selectedWord.id) {
      return `${base} border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-300/70 dark:bg-emerald-400/15 dark:text-emerald-100`;
    }
    if (meaningAnswer.choiceId === choice.id) {
      return `${base} border-rose-400 bg-rose-100 text-rose-800 dark:border-rose-300/70 dark:bg-rose-400/15 dark:text-rose-100`;
    }
    return `${base} border-slate-200 bg-white/70 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500`;
  };

  return (
    <div className="w-[92%] max-w-[1500px] mx-auto py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
            <Sparkles size={14} />
            Kids Zone
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Học từ vựng cho lớp {selectedGrade}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-base">
            Chọn lớp, chọn chủ đề, nghe phát âm và chơi mini game theo từng từ.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/5 sm:flex">
          {gradeOptions.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => chooseGrade(grade)}
              className={`h-12 rounded-2xl px-4 text-sm font-extrabold transition-all ${
                selectedGrade === grade
                  ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-[#160B1E]'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              Lớp {grade}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className={`rounded-[28px] border border-white/80 bg-gradient-to-br ${gradeThemes[selectedGrade]} p-5 shadow-sm dark:border-white/10`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold uppercase text-slate-500 dark:text-slate-300">Nhiệm vụ</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">12 sao hôm nay</h2>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm dark:bg-white/10">
                <Star size={28} fill="currentColor" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {['Nghe', 'Đọc', 'Ghép'].map((item, index) => (
                <div key={item} className="rounded-2xl bg-white/80 p-3 text-center dark:bg-white/10">
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white">{index + 2}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1E1226]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Chủ đề</h2>
              <BookOpen size={18} className="text-slate-400" />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedTopic('all')}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                  activeTopic === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-[#160B1E]'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                <span className="text-sm font-extrabold">Tất cả từ</span>
                <span className="mt-1 block text-xs opacity-70">{visibleWords.length} từ đang mở</span>
              </button>

              {visibleTopics.map((topic) => {
                const TopicIcon = topic.icon;
                const count = kidsWords.filter((word) => word.topicId === topic.id && word.grade <= selectedGrade).length;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                      activeTopic === topic.id
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-[#160B1E]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${topic.accent}`}>
                        <TopicIcon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-extrabold">{topic.name}</span>
                        <span className="mt-0.5 block text-xs opacity-70">{topic.label} - {count} từ</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="grid gap-5 lg:grid-cols-[minmax(260px,420px)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1E1226]">
              <div className="aspect-square bg-[#fff7e6]">
                <img
                  src={selectedWord.image}
                  alt={selectedWord.word}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E1226] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${selectedTopicMeta.accent}`}>
                  <SelectedTopicIcon size={14} />
                  {selectedTopicMeta.name}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  <GraduationCap size={14} />
                  Lớp {selectedWord.grade}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-sm font-extrabold uppercase text-slate-400 dark:text-slate-500">Flashcard</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white sm:text-6xl">
                      {selectedWord.word}
                    </h2>
                    <p className="mt-2 text-lg font-bold text-slate-400 dark:text-slate-500">{selectedWord.pronunciation}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakEnglish(selectedWord.word)}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-sky-400 px-5 text-sm font-extrabold text-sky-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-300"
                  >
                    <Volume2 size={20} />
                    Nghe từ
                  </button>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Nghĩa tiếng Việt</p>
                  <p className={`mt-2 text-2xl font-extrabold ${showMeaning ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}>
                    {showMeaning ? selectedWord.meaning : 'Ẩn hiện nghĩa để tự kiểm tra'}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setShowMeaning((current) => !current)}
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-extrabold text-emerald-950 transition-all hover:-translate-y-0.5 hover:bg-emerald-300"
                  >
                    <CheckCircle2 size={19} />
                    {showMeaning ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
                  </button>
                  <button
                    type="button"
                    onClick={goNextWord}
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-fuchsia-400 px-5 text-sm font-extrabold text-fuchsia-950 transition-all hover:-translate-y-0.5 hover:bg-fuchsia-300"
                  >
                    Từ tiếp theo
                    <ChevronRight size={19} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1E1226] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Bảng từ</h2>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                {visibleWords.length} từ
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {visibleWords.map((word) => (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => chooseWord(word)}
                  className={`group rounded-3xl border p-2 text-left transition-all ${
                    selectedWord.id === word.id
                      ? 'border-fuchsia-400 bg-fuchsia-50 shadow-md shadow-fuchsia-500/10 dark:border-fuchsia-300/70 dark:bg-fuchsia-400/10'
                      : 'border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                  }`}
                >
                  <img
                    src={word.image}
                    alt={word.word}
                    className="aspect-square w-full rounded-2xl object-cover"
                    loading="lazy"
                  />
                  <span className="mt-2 block truncate px-1 text-sm font-extrabold text-slate-800 dark:text-white">
                    {word.word}
                  </span>
                  <span className="block truncate px-1 pb-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                    {word.meaning}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E1226]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Chọn nghĩa đúng</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{selectedWord.example}</p>
                </div>
                <Headphones className="text-sky-400" size={24} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {quizChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => handleMeaningChoice(choice)}
                    className={getQuizChoiceClassName(choice)}
                  >
                    {choice.meaning}
                  </button>
                ))}
              </div>

              <div className="mt-4 min-h-12 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">
                {meaningAnswer
                  ? meaningAnswer.isCorrect
                    ? `${selectedWord.exampleVi}`
                    : 'Gần đúng rồi, chọn lại đáp án màu xanh nhé.'
                  : 'Từ đang hỏi: ' + selectedWord.word}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E1226]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Ghép cặp</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{progressPercent}% hoàn thành</p>
                </div>
                <button
                  type="button"
                  onClick={resetMatching}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                  title="Làm lại"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  {matchWords.map((word) => {
                    const isMatched = matchedIds.includes(word.id);
                    const isSelected = selectedMatchWordId === word.id;
                    return (
                      <button
                        key={word.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => {
                          setSelectedMatchWordId(word.id);
                          setMatchFeedback(null);
                          speakEnglish(word.word);
                        }}
                        className={`flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition-all ${
                          isMatched
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-300/50 dark:bg-emerald-400/15 dark:text-emerald-100'
                            : isSelected
                              ? 'border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-300/70 dark:bg-sky-400/15 dark:text-sky-100'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {word.word}
                        {isMatched && <CheckCircle2 size={17} />}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {shuffledMeanings.map((word) => {
                    const isMatched = matchedIds.includes(word.id);
                    return (
                      <button
                        key={word.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => handleMatchMeaning(word.id)}
                        className={`min-h-12 w-full rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition-all ${
                          isMatched
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-300/50 dark:bg-emerald-400/15 dark:text-emerald-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-amber-400/10'
                        }`}
                      >
                        {word.meaning}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`mt-4 min-h-11 rounded-2xl px-4 py-3 text-sm font-extrabold ${
                matchFeedback?.type === 'success'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100'
                  : matchFeedback?.type === 'error'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-100'
                    : 'bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300'
              }`}>
                {matchFeedback?.text || 'Chọn một từ tiếng Anh rồi chọn nghĩa phù hợp.'}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
