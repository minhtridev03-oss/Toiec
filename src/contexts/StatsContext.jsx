import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchTotalLearnedWords } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import {
  getLocalDateString,
  calculateStreakFromDates,
  getLocalCheckInDates,
  setLocalCheckInDates,
  fetchPastActivityDates,
} from '../lib/attendance';
import {
  fetchLevelConfigs,
  fetchExpRules,
  syncUserLearningExp,
  calculateLevelFromExp,
  DEFAULT_LEVEL_CONFIGS,
  DEFAULT_EXP_RULES,
} from '../lib/levels';

const StatsContext = createContext({
  streak: 0,
  learnedWords: 0,
  checkInDates: [],
  isCheckedInToday: false,
  isCheckingIn: false,
  checkIn: async () => {},
  refreshStats: () => {},
  totalExp: 0,
  userLevel: 1,
  levelTitle: 'Tân Binh Khởi Hành',
  levelInfo: {},
  activityCounts: {
    vocabCount: 0,
    grammarCount: 0,
    readingCount: 0,
    writingCount: 0,
    dictationCount: 0,
  },
  levelConfigs: DEFAULT_LEVEL_CONFIGS,
  expRules: DEFAULT_EXP_RULES,
  reloadLevels: async () => {},
});

export function StatsProvider({ children }) {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [learnedWords, setLearnedWords] = useState(0);
  const [checkInDates, setCheckInDates] = useState([]);
  const [isCheckedInToday, setIsCheckedInToday] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [totalExp, setTotalExp] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [levelTitle, setLevelTitle] = useState('Tân Binh Khởi Hành');
  const [levelInfo, setLevelInfo] = useState({});
  const [activityCounts, setActivityCounts] = useState({
    vocabCount: 0,
    grammarCount: 0,
    readingCount: 0,
    writingCount: 0,
    dictationCount: 0,
  });
  const [levelConfigs, setLevelConfigs] = useState(DEFAULT_LEVEL_CONFIGS);
  const [expRules, setExpRules] = useState(DEFAULT_EXP_RULES);
  const refreshTimerRef = useRef(null);

  const refreshStats = useCallback(async () => {
    const today = getLocalDateString(new Date());
    const userId = user?.id || null;

    try {
      // 1. Get dates from user_metadata and localStorage
      const localDates = getLocalCheckInDates(userId);
      const metaDates = user?.user_metadata?.check_in_dates;
      let merged = Array.from(
        new Set([...(Array.isArray(metaDates) ? metaDates : []), ...localDates])
      ).filter(Boolean).sort();

      // If empty for authenticated user, attempt to seed from activity history
      if (merged.length === 0 && userId) {
        const past = await fetchPastActivityDates(userId);
        if (past.length > 0) {
          merged = past;
          setLocalCheckInDates(userId, merged);
          try {
            await supabase.auth.updateUser({
              data: { check_in_dates: merged },
            });
          } catch {}
        }
      }

      const currentStreak = calculateStreakFromDates(merged);
      const checkedToday = merged.includes(today);

      setCheckInDates(merged);
      setIsCheckedInToday(checkedToday);
      setStreak(currentStreak);

      if (userId) {
        const [w, levelCfgs, rules, expResult] = await Promise.all([
          fetchTotalLearnedWords(userId),
          fetchLevelConfigs(),
          fetchExpRules(),
          syncUserLearningExp(userId),
        ]);
        setLearnedWords(w);
        if (levelCfgs) setLevelConfigs(levelCfgs);
        if (rules) setExpRules(rules);

        if (expResult) {
          const exp = Number(expResult.total_exp ?? 0);
          setTotalExp(exp);
          setUserLevel(Number(expResult.current_level ?? 1));
          setLevelTitle(expResult.level_title || 'Tân Binh Khởi Hành');
          setActivityCounts({
            vocabCount: Number(expResult.vocab_count ?? 0),
            grammarCount: Number(expResult.grammar_count ?? 0),
            readingCount: Number(expResult.reading_count ?? 0),
            writingCount: Number(expResult.writing_count ?? 0),
            dictationCount: Number(expResult.dictation_count ?? 0),
          });
          const calculated = calculateLevelFromExp(exp, levelCfgs || DEFAULT_LEVEL_CONFIGS);
          setLevelInfo(calculated);
        }
      }
    } catch (err) {
      console.error('StatsContext: refresh failed', err);
    }
  }, [user?.id, user?.user_metadata]);

  const reloadLevels = useCallback(async () => {
    try {
      const [cfgs, rules] = await Promise.all([fetchLevelConfigs(), fetchExpRules()]);
      setLevelConfigs(cfgs);
      setExpRules(rules);
      if (user?.id) {
        const expResult = await syncUserLearningExp(user.id);
        if (expResult) {
          const exp = Number(expResult.total_exp ?? 0);
          setTotalExp(exp);
          setUserLevel(Number(expResult.current_level ?? 1));
          setLevelTitle(expResult.level_title || 'Tân Binh Khởi Hành');
          setActivityCounts({
            vocabCount: Number(expResult.vocab_count ?? 0),
            grammarCount: Number(expResult.grammar_count ?? 0),
            readingCount: Number(expResult.reading_count ?? 0),
            writingCount: Number(expResult.writing_count ?? 0),
            dictationCount: Number(expResult.dictation_count ?? 0),
          });
          setLevelInfo(calculateLevelFromExp(exp, cfgs));
        }
      }
    } catch (e) {
      console.warn('Lỗi reloadLevels:', e);
    }
  }, [user?.id]);

  const checkIn = useCallback(async (targetDate = null) => {
    setIsCheckingIn(true);
    const today = getLocalDateString(new Date());
    const dateToCheckIn = targetDate || today;
    const userId = user?.id || null;

    // Strict validation: do not allow checking in for past dates or future dates
    if (dateToCheckIn < today) {
      setIsCheckingIn(false);
      return { success: false, reason: 'PAST_DATE', message: 'Không thể điểm danh lại ngày cũ đã qua.' };
    }
    if (dateToCheckIn > today) {
      setIsCheckingIn(false);
      return { success: false, reason: 'FUTURE_DATE', message: 'Không thể điểm danh trước ngày tương lai.' };
    }

    try {
      const currentDates = Array.isArray(checkInDates) ? checkInDates : [];
      if (currentDates.includes(dateToCheckIn)) {
        if (dateToCheckIn === today) setIsCheckedInToday(true);
        return { success: true, alreadyCheckedIn: true, streak };
      }

      const updatedDates = Array.from(new Set([...currentDates, dateToCheckIn])).sort();
      const newStreak = calculateStreakFromDates(updatedDates);

      // Optimistic update
      setCheckInDates(updatedDates);
      if (updatedDates.includes(today)) {
        setIsCheckedInToday(true);
      }
      setStreak(newStreak);
      setLocalCheckInDates(userId, updatedDates);

      if (userId) {
        try {
          await supabase.auth.updateUser({
            data: {
              check_in_dates: updatedDates,
              last_check_in: today,
            },
          });
        } catch (err) {
          console.error('Failed to sync check-in to Supabase:', err);
        }
      }

      return { success: true, alreadyCheckedIn: false, streak: newStreak, date: dateToCheckIn };
    } finally {
      setIsCheckingIn(false);
    }
  }, [checkInDates, streak, user?.id]);

  // Heartbeat-based practice tracking can create several realtime events in a
  // short period. Coalesce them so one session does not trigger repeated
  // streak/word queries.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      refreshStats();
    }, 1500);
  }, [refreshStats]);

  // Fetch on mount / user change
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Realtime: lắng nghe các bảng tiến độ học tập và cấp độ
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`stats-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_topic_vocabularies', filter: `user_id=eq.${user.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_tense_exercises', filter: `user_id=eq.${user.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_reading_progress', filter: `user_id=eq.${user.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_writing_progress', filter: `user_id=eq.${user.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_dictation_progress', filter: `user_id=eq.${user.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'level_configs' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exp_activity_rules' },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [user?.id, scheduleRefresh]);

  return (
    <StatsContext.Provider
      value={{
        streak,
        learnedWords,
        checkInDates,
        isCheckedInToday,
        isCheckingIn,
        checkIn,
        refreshStats,
        totalExp,
        userLevel,
        levelTitle,
        levelInfo,
        activityCounts,
        levelConfigs,
        expRules,
        reloadLevels,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export const useStats = () => useContext(StatsContext);
