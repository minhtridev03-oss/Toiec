import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalSkeletonLoader() {
  return (
    <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0f19] text-slate-500 dark:text-slate-400">
      <Loader2 className="w-9 h-9 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
      <p className="text-sm font-medium animate-pulse">Loading...</p>
    </div>
  );
}
