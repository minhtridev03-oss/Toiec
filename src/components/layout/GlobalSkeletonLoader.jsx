import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalSkeletonLoader() {
  return (
    <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#160B1E] text-slate-500 dark:text-slate-400">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
      <p className="text-sm font-medium animate-pulse">Loading...</p>
    </div>
  );
}
