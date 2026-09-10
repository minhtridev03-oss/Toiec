import { useState } from 'react';
import useSWR from 'swr';
import { Link } from 'react-router-dom';
import { BookOpen, Gamepad2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import WordRocketGame from '../features/games/wordRocket/WordRocketGame';
import { fetchWordRocketWords } from '../features/games/wordRocket/gameWords';

const COPY = {
  vi: {
    eyebrow: 'Học mà chơi', title: 'Trung tâm trò chơi',
    subtitle: 'Ghi nhớ từ vựng bằng phản xạ, tốc độ và những nhiệm vụ ngắn đầy thú vị.',
    loading: 'Đang chuẩn bị kho từ cho bạn...', error: 'Không thể chuẩn bị trò chơi lúc này.', retry: 'Thử lại',
    emptyTitle: 'Bạn chưa có từ đã học để chơi',
    emptyCopy: 'Hãy học hoặc đánh dấu một số từ đã thuộc, sau đó quay lại chinh phục trò chơi nhé.',
    learnWords: 'Đi học từ vựng',
  },
  en: {
    eyebrow: 'Learn by playing', title: 'Game Center',
    subtitle: 'Build vocabulary through quick reactions, speed and playful missions.',
    loading: 'Preparing your word collection...', error: 'The game could not be prepared right now.', retry: 'Try again',
    emptyTitle: 'You have no learned words to play yet',
    emptyCopy: 'Learn or mark a few words as learned, then return to start the game.',
    learnWords: 'Learn vocabulary',
  },
};

export default function Games() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = COPY[locale] || COPY.vi;
  const [gameActive, setGameActive] = useState(false);
  const { data: words = [], error, isLoading, mutate } = useSWR(
    user?.id ? `word-rocket-learned-words:v2:${user.id}` : null,
    () => fetchWordRocketWords(user.id),
    { revalidateOnFocus: true, dedupingInterval: 60 * 1000 },
  );

  return (
    <div className={`flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.09),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_28%)] px-3 sm:px-6 lg:px-8 ${gameActive ? 'py-1.5 sm:py-3' : 'py-3 sm:py-5'}`}>
      <div className="mx-auto w-full max-w-7xl">
        {!gameActive && (
          <div className="mb-3 flex items-end justify-between gap-4 sm:mb-4">
            <div>
              <div className="mb-1.5 hidden items-center gap-2 rounded-full border border-fuchsia-200 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fuchsia-600 shadow-sm backdrop-blur dark:border-fuchsia-800 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 sm:inline-flex">
                <Sparkles size={13} /> {text.eyebrow}
              </div>
              <h1 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                <Gamepad2 className="text-fuchsia-500" /> {text.title}
              </h1>
              <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 md:block">{text.subtitle}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[520px] items-center justify-center rounded-[1.75rem] border border-fuchsia-200 bg-white/60 dark:border-fuchsia-900 dark:bg-[#170d22]/60">
            <div className="text-center text-slate-500 dark:text-slate-300">
              <Loader2 className="mx-auto mb-3 animate-spin text-fuchsia-500" size={32} />
              <p className="font-semibold">{text.loading}</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/20">
            <p className="font-semibold text-rose-700 dark:text-rose-200">{text.error}</p>
            <button type="button" onClick={() => mutate()} className="mt-4 rounded-xl bg-rose-500 px-5 py-2.5 font-bold text-white">{text.retry}</button>
          </div>
        ) : words.length === 0 ? (
          <div className="flex min-h-[520px] items-center justify-center rounded-[1.75rem] border border-fuchsia-200 bg-white/70 p-6 text-center shadow-sm dark:border-fuchsia-900 dark:bg-[#170d22]/70">
            <div className="max-w-md">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20 text-fuchsia-500 ring-1 ring-fuchsia-300/30 dark:text-fuchsia-200">
                <BookOpen size={40} />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">{text.emptyTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{text.emptyCopy}</p>
              <Link to="/categories" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-bold text-white shadow-lg shadow-fuchsia-500/20 transition hover:-translate-y-0.5 hover:brightness-110">
                {text.learnWords}
              </Link>
            </div>
          </div>
        ) : (
          <WordRocketGame words={words} user={user} locale={locale} onPhaseChange={setGameActive} />
        )}
      </div>
    </div>
  );
}
