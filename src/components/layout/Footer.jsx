import { Heart } from 'lucide-react';
import { useState } from 'react';
import DonationModal from './DonationModal';

export default function Footer() {
  const [isDonationOpen, setDonationOpen] = useState(false);

  return (
    <>
      <footer className="mt-auto py-3.5 px-4 flex items-center justify-center select-none z-10">
        <button
          type="button"
          onClick={() => setDonationOpen(true)}
          className="group glass-panel inline-flex items-center gap-2.5 rounded-full px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-bold shadow-lg shadow-black/5 dark:shadow-black/20 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-white/70 dark:border-white/15"
          title="Tặng mình ly cafe tiếp thêm động lực nhé!"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15 dark:bg-rose-500/25">
            <Heart size={13} className="fill-rose-500 text-rose-500 transition-transform duration-200 group-hover:scale-125" />
          </span>
          <span className="text-rose-700 dark:text-rose-300 font-extrabold tracking-wide">
            Tặng mình ly cafe tiếp thêm động lực nhé!
          </span>
        </button>
      </footer>
      <DonationModal open={isDonationOpen} onClose={() => setDonationOpen(false)} />
    </>
  );
}
