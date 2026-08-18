import { useEffect } from 'react';
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
const HEARTBEAT_INTERVAL_MS = 30_000;
const IDLE_TIMEOUT_MS = 60_000;
const ACTIVITY_CACHE_TTL_MS = 30_000;

const activityCache = new Map();
const activityInflight = new Map();

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

  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  })();
  const cacheKey = `${userId}:${skill}:${locale}:${start.toISOString()}:${timezone}`;
  const cached = activityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data.map((day) => ({ ...day }));
  }
  if (activityInflight.has(cacheKey)) return activityInflight.get(cacheKey);

  const request = (async () => {
    const dayMap = new Map(days.map((day) => [day.key, day]));
    const addRowsToDays = (rows, aggregated = false) => {
      (rows || []).forEach((session) => {
        // RPC returns a date already converted to the user's timezone. The
        // fallback query returns timestamps and is grouped in the browser.
        const key = aggregated
          ? String(session.practice_date).slice(0, 10)
          : getLocalDateKey(new Date(session.created_at));
        const seconds = aggregated ? session.total_seconds : session.duration_seconds;
        const day = dayMap.get(key);
        if (!day) return;

        day.seconds += Number(seconds) || 0;
        day.minutes = Number((day.seconds / 60).toFixed(1));
      });
    };

    try {
      const { data: aggregatedData, error: aggregateError } = await supabase.rpc('get_practice_activity', {
        p_skill: skill,
        p_since: start.toISOString(),
        p_timezone: timezone,
      });

      if (!aggregateError) {
        addRowsToDays(aggregatedData, true);
        activityCache.set(cacheKey, { data: days, expiresAt: Date.now() + ACTIVITY_CACHE_TTL_MS });
        return days.map((day) => ({ ...day }));
      }
    } catch {
      // The RPC is deployed separately from the frontend. Fall back while a
      // deployment is in progress or when an older project has no RPC yet.
    }

    const { data, error } = await supabase
      .from('user_practice_sessions')
      .select('duration_seconds, created_at')
      .eq('user_id', userId)
      .eq('skill', skill)
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    addRowsToDays(data, false);
    activityCache.set(cacheKey, { data: days, expiresAt: Date.now() + ACTIVITY_CACHE_TTL_MS });
    return days.map((day) => ({ ...day }));
  })();

  activityInflight.set(cacheKey, request);
  try {
    return await request;
  } catch (error) {
    console.warn('Practice activity data is unavailable:', error.message || error);
    return days;
  } finally {
    activityInflight.delete(cacheKey);
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
    return;
  }

  for (const key of activityCache.keys()) {
    if (key.startsWith(`${userId}:${skill}:`)) activityCache.delete(key);
  }
};

export const usePracticeSessionTimer = (skill, user, enabled = true, mediaPlaying = false) => {
  useEffect(() => {
    if (!enabled || !user?.id || !skill) return undefined;

    // Count active segments instead of the whole time the page stays open.
    // This prevents background tabs, idle time and long pauses from inflating
    // the dashboard while still allowing reading sessions without constant
    // mouse/keyboard input (the idle grace period is one minute).
    let segmentStartedAt = document.visibilityState === 'visible' ? Date.now() : null;
    let lastActivityAt = Date.now();
    let isIdle = false;
    let unsavedSeconds = 0;
    let writeQueue = Promise.resolve();

    const queueWrite = () => {
      const wholeSeconds = Math.floor(unsavedSeconds);
      if (wholeSeconds < MIN_SESSION_SECONDS) return;

      unsavedSeconds -= wholeSeconds;
      writeQueue = writeQueue
        .then(() => recordPracticeSession({
          userId: user.id,
          skill,
          durationSeconds: wholeSeconds,
        }))
        .catch((error) => {
          // Keep the timer alive if a single write fails. The error is already
          // logged by recordPracticeSession, so this avoids an unhandled promise.
          console.warn('Practice session write failed:', error?.message || error);
        });
    };

    const pauseSegment = () => {
      if (segmentStartedAt === null) return;
      unsavedSeconds += Math.max(0, (Date.now() - segmentStartedAt) / 1000);
      segmentStartedAt = null;
      queueWrite();
    };

    const resumeSegment = () => {
      if (document.visibilityState !== 'visible' || isIdle || segmentStartedAt !== null) return;
      segmentStartedAt = Date.now();
    };

    const markActivity = () => {
      lastActivityAt = Date.now();
      if (isIdle) {
        isIdle = false;
        resumeSegment();
      }
    };

    const checkIdle = () => {
      if (document.visibilityState !== 'visible') return;
      if (mediaPlaying) {
        lastActivityAt = Date.now();
        if (isIdle) {
          isIdle = false;
          resumeSegment();
        }
        return;
      }
      if (!isIdle && Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
        isIdle = true;
        pauseSegment();
      }
    };

    const heartbeat = () => {
      if (segmentStartedAt !== null) {
        unsavedSeconds += Math.max(0, (Date.now() - segmentStartedAt) / 1000);
        segmentStartedAt = Date.now();
      }
      queueWrite();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pauseSegment();
        return;
      }

      lastActivityAt = Date.now();
      isIdle = false;
      resumeSegment();
    };

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    window.addEventListener('pagehide', pauseSegment);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const idleInterval = window.setInterval(checkIdle, 15_000);
    const heartbeatInterval = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(idleInterval);
      window.clearInterval(heartbeatInterval);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.removeEventListener('pagehide', pauseSegment);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      pauseSegment();
      queueWrite();
    };
  }, [enabled, mediaPlaying, skill, user?.id]);
};
