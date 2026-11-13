import { supabase } from './supabaseClient.js';

/**
 * Returns YYYY-MM-DD in local system timezone (safe from UTC offset bugs)
 */
export const getLocalDateString = (d = new Date()) => {
  const dateObj = d instanceof Date ? d : new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates current consecutive streak from an array of date strings.
 * An active streak requires checking in today OR yesterday.
 */
export const calculateStreakFromDates = (datesList = []) => {
  if (!datesList || !datesList.length) return 0;
  const uniqueSorted = Array.from(new Set(datesList)).filter(Boolean).sort().reverse();
  if (!uniqueSorted.length) return 0;

  const today = getLocalDateString(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  const latest = uniqueSorted[0];
  if (latest !== today && latest !== yesterday) {
    return 0; // Streak broken
  }

  let streak = 1;
  let cur = new Date(latest + 'T00:00:00');

  for (let i = 1; i < uniqueSorted.length; i++) {
    const prev = new Date(uniqueSorted[i] + 'T00:00:00');
    const diffMs = cur.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      cur = prev;
    } else if (diffDays === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Returns 7 days of the current week (from Monday to Sunday)
 */
export const getDaysOfCurrentWeek = (baseDate = new Date(), checkInDates = []) => {
  const d = new Date(baseDate);
  const dayOfWeek = d.getDay();
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - distanceToMonday);

  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const todayStr = getLocalDateString(baseDate);
  const checkSet = new Set(checkInDates || []);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dateStr = getLocalDateString(cur);
    days.push({
      label: labels[i],
      dayNum: cur.getDate(),
      dateStr,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      isCheckedIn: checkSet.has(dateStr),
    });
  }
  return days;
};

/**
 * Reads check-in dates from localStorage
 */
export const getLocalCheckInDates = (userId) => {
  try {
    const raw = localStorage.getItem(`toiec_checkins_${userId || 'guest'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

/**
 * Writes check-in dates to localStorage
 */
export const setLocalCheckInDates = (userId, dates) => {
  try {
    localStorage.setItem(`toiec_checkins_${userId || 'guest'}`, JSON.stringify(dates));
  } catch (e) {
    console.error('Failed to save check-in dates to localStorage:', e);
  }
};

/**
 * Pre-seed/fallback: fetch past activity dates from Supabase if user has no check-in dates yet
 */
export const fetchPastActivityDates = async (userId) => {
  if (!userId) return [];
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 90);
    const sinceIso = sinceDate.toISOString();

    const [vocabRes, practiceRes] = await Promise.all([
      supabase.from('user_topic_vocabularies').select('created_at').eq('user_id', userId).gte('created_at', sinceIso).limit(200),
      supabase.from('user_practice_sessions').select('created_at').eq('user_id', userId).gte('created_at', sinceIso).limit(200),
    ]);

    const combined = [...(vocabRes.data || []), ...(practiceRes.data || [])];
    return Array.from(new Set(
      combined.map((item) => getLocalDateString(new Date(item.created_at)))
    )).filter(Boolean).sort();
  } catch (e) {
    return [];
  }
};
