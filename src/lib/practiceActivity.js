import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export const PRACTICE_SKILLS = [
  { id: 'dictation', labels: { vi: 'Chính tả', en: 'Dictation' } },
  { id: 'shadowing', labels: { vi: 'Shadowing', en: 'Shadowing' } },
  { id: 'speaking', labels: { vi: 'Nói', en: 'Speaking' } },
  { id: 'vocabulary', labels: { vi: 'Từ vựng', en: 'Vocabulary' } },
  { id: 'writing', labels: { vi: 'Viết', en: 'Writing' } },
  { id: 'reading', labels: { vi: 'Đọc hiểu', en: 'Reading' } },
];

const MIN_SESSION_SECONDS = 10;
const MAX_SESSION_SECONDS = 4 * 60 * 60;

const pad2 = (value) => String(value).padStart(2, '0');

const getLocalDateKey = (date) => (
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
);

const formatPracticeDay = (date, locale) => {
  if (locale === 'en') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return `${date.getDate()} thg ${date.getMonth() + 1}`;
};

export const getPracticeSkillLabel = (skill, locale = 'vi') => (
  PRACTICE_SKILLS.find((item) => item.id === skill)?.labels?.[locale]
  || PRACTICE_SKILLS.find((item) => item.id === skill)?.labels?.en
  || skill
);

export const buildLast7PracticeDays = (now = new Date(), locale = 'vi') => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      key: getLocalDateKey(date),
      label: formatPracticeDay(date, locale),
      minutes: 0,
      seconds: 0,
    };
  });
};

export const fetchPracticeActivityLast7Days = async (userId, skill, locale = 'vi') => {
  const days = buildLast7PracticeDays(new Date(), locale);
  if (!userId || !skill) return days;

  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  try {
    const { data, error } = await supabase
      .from('user_practice_sessions')
      .select('duration_seconds, created_at')
      .eq('user_id', userId)
      .eq('skill', skill)
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const dayMap = new Map(days.map((day) => [day.key, day]));
    (data || []).forEach((session) => {
      const key = getLocalDateKey(new Date(session.created_at));
      const day = dayMap.get(key);
      if (!day) return;

      day.seconds += Number(session.duration_seconds) || 0;
      day.minutes = Number((day.seconds / 60).toFixed(1));
    });

    return days;
  } catch (error) {
    console.warn('Practice activity data is unavailable:', error.message || error);
    return days;
  }
};

export const fetchPracticeLeaderboard = async (period = 'week', limit = 10) => {
  try {
    const { data, error } = await supabase.rpc('get_practice_leaderboard', {
      p_period: period,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Practice leaderboard is unavailable:', error.message || error);
    return [];
  }
};

export const recordPracticeSession = async ({ userId, skill, durationSeconds }) => {
  const safeSeconds = Math.min(Math.max(Math.round(durationSeconds || 0), 0), MAX_SESSION_SECONDS);
  if (!userId || !skill || safeSeconds < MIN_SESSION_SECONDS) return;

  const { error } = await supabase
    .from('user_practice_sessions')
    .insert({
      user_id: userId,
      skill,
      duration_seconds: safeSeconds,
    });

  if (error) {
    console.warn('Could not record practice session:', error.message || error);
  }
};

export const usePracticeSessionTimer = (skill, user, enabled = true) => {
  const startRef = useRef(Date.now());
  const flushedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !user?.id || !skill) return undefined;

    startRef.current = Date.now();
    flushedRef.current = false;

    const flushSession = () => {
      if (flushedRef.current) return;

      const durationSeconds = (Date.now() - startRef.current) / 1000;
      if (durationSeconds < MIN_SESSION_SECONDS) return;

      flushedRef.current = true;
      recordPracticeSession({
        userId: user.id,
        skill,
        durationSeconds,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushSession();
    };

    window.addEventListener('pagehide', flushSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushSession();
    };
  }, [enabled, skill, user?.id]);
};
