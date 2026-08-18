import { Heart } from 'lucide-react';
import { useState } from 'react';
import DonationModal from './DonationModal';

export default function Footer() {
  const [isDonationOpen, setDonationOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-pink-200/80 bg-white/70 px-4 py-5 text-sm text-slate-600 backdrop-blur dark:border-fuchsia-900/60 dark:bg-[#1E1226]/80 dark:text-slate-300 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-slate-800 dark:text-white">T-English</p>
            <p className="text-xs">Học tiếng Anh hiệu quả hơn mỗi ngày.</p>
          </div>
          <button
            type="button"
            onClick={() => setDonationOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300 bg-fuchsia-50 px-4 py-2 font-medium text-fuchsia-700 transition hover:-translate-y-0.5 hover:bg-fuchsia-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 dark:border-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:hover:bg-fuchsia-900/50"
          >
            <Heart size={16} aria-hidden="true" />
            Tặng mình li cafe cảm ưn các bạn!
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} T-English</p>
        </div>
      </footer>
      <DonationModal open={isDonationOpen} onClose={() => setDonationOpen(false)} />
    </>
  );
}
