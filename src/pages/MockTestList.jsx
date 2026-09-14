import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Clock, FileText, BarChart2 } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { motion } from 'framer-motion';

const mockTests = [
  { id: 'ets-2022-1', title: 'ETS TOEIC 2022 - Test 1', duration: 120, questions: 200, level: 'Phù hợp mọi trình độ', completed: false },
  { id: 'ets-2022-2', title: 'ETS TOEIC 2022 - Test 2', duration: 120, questions: 200, level: 'Phù hợp mọi trình độ', completed: false },
  { id: 'hacker-1', title: 'Hacker TOEIC - Test 1', duration: 120, questions: 200, level: 'Độ khó cao (700+)', completed: true, score: 750 },
  { id: 'economy-1', title: 'Economy TOEIC - Vol 1', duration: 120, questions: 200, level: 'Cơ bản (450+)', completed: false },
];

export default function MockTestList() {
  const { t } = useLocale();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-pink-500" />
          Thi thử TOEIC (Mock Tests)
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Làm bài thi thử với cấu trúc chuẩn ETS. Tính giờ và chấm điểm tự động.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTests.map((test, index) => (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 border border-slate-200 dark:border-[#3A2F43] shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-pink-600 transition-colors">
                {test.title}
              </h3>
              {test.completed && (
                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  Hoàn thành
                </span>
              )}
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm">
                <Clock className="w-4 h-4 mr-2 text-pink-500" />
                {test.duration} phút
              </div>
              <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm">
                <FileText className="w-4 h-4 mr-2 text-pink-500" />
                {test.questions} câu hỏi
              </div>
              <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm">
                <BarChart2 className="w-4 h-4 mr-2 text-pink-500" />
                {test.level}
              </div>
            </div>

            {test.completed ? (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Điểm gần nhất: <span className="font-bold text-pink-600 dark:text-pink-400">{test.score}</span>
                </div>
                <Link
                  to={`/mock-tests/${test.id}`}
                  className="text-pink-600 dark:text-pink-400 hover:underline text-sm font-semibold"
                >
                  Làm lại
                </Link>
              </div>
            ) : (
              <Link
                to={`/mock-tests/${test.id}`}
                className="w-full flex items-center justify-center gap-2 bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 py-2.5 rounded-xl font-bold hover:bg-pink-200 dark:hover:bg-pink-900/40 transition-colors"
              >
                Bắt đầu làm bài
              </Link>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
