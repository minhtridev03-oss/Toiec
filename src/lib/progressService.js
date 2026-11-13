import { supabase } from './supabaseClient';

// Short in-memory cache to prevent duplicate fetches
let cachedProgress = null;
let lastFetchTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Standard progress calculator with rigorous constraints:
 * - Constraint 1: completed === 0 -> 0%
 * - Constraint 2: 0 < completed < total -> clamped to [1%, 99%] so users see progress without false 100%
 * - Constraint 3: completed >= total && total > 0 -> exactly 100%
 * - Constraint 4: total <= 0 or invalid -> 0% (divide-by-zero guard)
 */
export function calculatePercentage(completed, total) {
  const c = Math.max(0, Number(completed) || 0);
  const t = Math.max(0, Number(total) || 0);

  if (t === 0 || c === 0) return 0;
  if (c >= t) return 100;

  const pct = Math.round((c / t) * 100);
  return Math.min(99, Math.max(1, pct));
}

/**
 * Fetch and calculate standardized learning progress for all 6 core skills:
 * 1. Kho từ vựng (Vocabulary)
 * 2. Ngữ pháp (Grammar)
 * 3. Nghe chép chính tả (Dictation)
 * 4. Shadowing (Luyện nhại)
 * 5. Luyện đọc (Reading)
 * 6. Luyện viết (Writing)
 */
export async function fetchAllSkillsProgress(userId, forceRefresh = false) {
  if (!userId) {
    return getEmptyProgress();
  }

  const now = Date.now();
  if (!forceRefresh && cachedProgress && cachedProgress.userId === userId && now - lastFetchTime < CACHE_TTL) {
    return cachedProgress.data;
  }

  try {
    const [
      vocabResult,
      grammarResult,
      dictationResult,
      shadowingResult,
      readingResult,
      writingResult,
    ] = await Promise.allSettled([
      fetchVocabularyProgress(userId),
      fetchGrammarProgress(userId),
      fetchDictationProgress(userId),
      fetchShadowingProgress(userId),
      fetchReadingProgress(userId),
      fetchWritingProgress(userId),
    ]);

    const skills = {
      vocabulary: vocabResult.status === 'fulfilled' ? vocabResult.value : getEmptySkill('vocabulary'),
      grammar: grammarResult.status === 'fulfilled' ? grammarResult.value : getEmptySkill('grammar'),
      dictation: dictationResult.status === 'fulfilled' ? dictationResult.value : getEmptySkill('dictation'),
      shadowing: shadowingResult.status === 'fulfilled' ? shadowingResult.value : getEmptySkill('shadowing'),
      reading: readingResult.status === 'fulfilled' ? readingResult.value : getEmptySkill('reading'),
      writing: writingResult.status === 'fulfilled' ? writingResult.value : getEmptySkill('writing'),
    };

    // Calculate overall progress across skills with active learning
    const activeSkills = Object.values(skills).filter((s) => s.activeTopics > 0 || s.completedItems > 0);
    const overallProgress = activeSkills.length > 0
      ? Math.round(activeSkills.reduce((sum, s) => sum + s.percentage, 0) / activeSkills.length)
      : 0;

    const result = {
      overallProgress,
      activeSkillsCount: activeSkills.length,
      skills,
    };

    cachedProgress = { userId, data: result };
    lastFetchTime = now;

    return result;
  } catch (error) {
    console.error('Error fetching all skills progress:', error);
    return getEmptyProgress();
  }
}

/**
 * 1. Kho từ vựng
 * % học phần = (Số từ đã thuộc / Tổng số từ trong kho) * 100
 * Điều kiện 'Đang học': Đã học ít nhất 1 từ trong chủ đề
 */
async function fetchVocabularyProgress(userId) {
  try {
    const { data: progressRows, error } = await supabase.rpc('get_sub_category_progress', { p_user_id: userId });
    if (error) throw error;

    let totalTopics = 0;
    let activeTopics = 0;
    let totalLearnedWords = 0;
    let totalWordsCount = 0;

    (progressRows || []).forEach((row) => {
      totalTopics++;
      const total = Number(row.total_count) || 0;
      const learned = Number(row.learned_count) || 0;

      totalWordsCount += total;
      totalLearnedWords += learned;

      if (learned > 0) {
        activeTopics++;
      }
    });

    const percentage = calculatePercentage(totalLearnedWords, totalWordsCount);

    return {
      id: 'vocabulary',
      title: 'Kho từ vựng',
      percentage,
      activeTopics,
      totalTopics,
      completedItems: totalLearnedWords,
      totalItems: totalWordsCount,
      itemUnit: 'từ đã thuộc',
      topicUnit: 'chủ đề',
      conditionText: 'Đã học ít nhất 1 từ trong chủ đề',
      path: '/categories',
    };
  } catch (error) {
    console.warn('fetchVocabularyProgress fallback:', error);
    return getEmptySkill('vocabulary');
  }
}

/**
 * 2. Ngữ pháp
 * % học phần = (Số câu bài tập làm đúng / Tổng số câu bài tập) * 100
 * Điều kiện 'Đang học': Đã làm ít nhất 1 câu bài tập của chuyên đề
 */
async function fetchGrammarProgress(userId) {
  try {
    const [tensesRes, exercisesRes, userExRes] = await Promise.all([
      supabase.from('tenses').select('id, name_en, name_vi').order('id', { ascending: true }),
      supabase.from('tense_exercises').select('id, tense_id').limit(10000),
      supabase.from('user_tense_exercises').select('exercise_id').eq('user_id', userId).limit(10000),
    ]);

    const tenses = tensesRes.data || [];
    const exercises = exercisesRes.data || [];
    const completedSet = new Set((userExRes.data || []).map((c) => String(c.exercise_id)));

    const tenseMap = {};
    tenses.forEach((t) => {
      tenseMap[String(t.id)] = { total: 0, completed: 0 };
    });

    let totalCompleted = 0;
    exercises.forEach((ex) => {
      const tid = String(ex.tense_id);
      if (tenseMap[tid]) {
        tenseMap[tid].total++;
        if (completedSet.has(String(ex.id))) {
          tenseMap[tid].completed++;
          totalCompleted++;
        }
      } else if (completedSet.has(String(ex.id))) {
        totalCompleted++;
      }
    });

    let activeTopics = 0;
    Object.values(tenseMap).forEach((t) => {
      if (t.completed > 0) {
        activeTopics++;
      }
    });

    const totalExercises = exercises.length;
    const percentage = calculatePercentage(totalCompleted, totalExercises);

    return {
      id: 'grammar',
      title: 'Ngữ pháp',
      percentage,
      activeTopics,
      totalTopics: tenses.length,
      completedItems: totalCompleted,
      totalItems: totalExercises,
      itemUnit: 'câu đúng',
      topicUnit: 'chuyên đề',
      conditionText: 'Đã làm ít nhất 1 câu bài tập của chuyên đề',
      path: '/tenses',
    };
  } catch (error) {
    console.warn('fetchGrammarProgress error:', error);
    return getEmptySkill('grammar');
  }
}

/**
 * 3. Nghe chép chính tả
 * % học phần = (Số câu đã chép đúng / Tổng số câu trong video) * 100
 * Điều kiện 'Đang học': Đã chép đúng ít nhất 1 câu trong video
 */
async function fetchDictationProgress(userId) {
  try {
    const [videosRes, segmentsRes, userProgRes] = await Promise.all([
      supabase.from('dictation_videos').select('id').eq('is_active', true),
      supabase.from('dictation_segments').select('id, video_id').limit(10000),
      supabase.from('user_dictation_progress').select('video_id, segment_id').eq('user_id', userId).eq('is_completed', true).limit(10000),
    ]);

    const videos = videosRes.data || [];
    const segments = segmentsRes.data || [];
    const userProgress = userProgRes.data || [];

    const completedSegmentsSet = new Set(userProgress.map((p) => String(p.segment_id)));
    const activeVideoIds = new Set(userProgress.map((p) => String(p.video_id)));

    let totalCompleted = 0;
    segments.forEach((s) => {
      if (completedSegmentsSet.has(String(s.id))) {
        totalCompleted++;
      }
    });

    const totalSegments = segments.length;
    const percentage = calculatePercentage(totalCompleted, totalSegments);

    return {
      id: 'dictation',
      title: 'Nghe chép chính tả',
      percentage,
      activeTopics: activeVideoIds.size,
      totalTopics: videos.length,
      completedItems: totalCompleted,
      totalItems: totalSegments,
      itemUnit: 'câu đã chép',
      topicUnit: 'video',
      conditionText: 'Đã chép đúng ít nhất 1 câu trong video',
      path: '/dictation',
    };
  } catch (error) {
    console.warn('fetchDictationProgress error:', error);
    return getEmptySkill('dictation');
  }
}

/**
 * 4. Shadowing
 * % học phần = (Số câu đạt yêu cầu / Tổng số câu trong bài) * 100
 * Điều kiện 'Đang học': Đã thực hành ít nhất 1 câu trong bài
 */
async function fetchShadowingProgress(userId) {
  try {
    const [videosRes, segmentsRes, userProgRes] = await Promise.all([
      supabase.from('dictation_videos').select('id').eq('is_active', true),
      supabase.from('dictation_segments').select('id, video_id').limit(10000),
      supabase.from('user_dictation_progress').select('video_id, segment_id').eq('user_id', userId).eq('is_completed', true).limit(10000),
    ]);

    const videos = videosRes.data || [];
    const segments = segmentsRes.data || [];
    const userProgress = userProgRes.data || [];

    const completedSegmentsSet = new Set(userProgress.map((p) => String(p.segment_id)));
    const activeVideoIds = new Set(userProgress.map((p) => String(p.video_id)));

    let totalCompleted = 0;
    segments.forEach((s) => {
      if (completedSegmentsSet.has(String(s.id))) {
        totalCompleted++;
      }
    });

    const totalSegments = segments.length;
    const percentage = calculatePercentage(totalCompleted, totalSegments);

    return {
      id: 'shadowing',
      title: 'Shadowing (Luyện nhại)',
      percentage,
      activeTopics: activeVideoIds.size,
      totalTopics: videos.length,
      completedItems: totalCompleted,
      totalItems: totalSegments,
      itemUnit: 'câu đạt chuẩn',
      topicUnit: 'bài nhại',
      conditionText: 'Đã thực hành ít nhất 1 câu trong bài',
      path: '/shadowing',
    };
  } catch (error) {
    console.warn('fetchShadowingProgress error:', error);
    return getEmptySkill('shadowing');
  }
}

/**
 * 5. Luyện đọc
 * % học phần = (Số bài đọc hoàn thành / Tổng số bài đọc) * 100
 * Điều kiện 'Đang học': Đã hoàn thành bài đọc
 */
async function fetchReadingProgress(userId) {
  try {
    const [lessonsRes, userProgRes] = await Promise.all([
      supabase.from('reading_lessons').select('id, title').order('id', { ascending: true }),
      supabase.from('user_reading_progress').select('lesson_id').eq('user_id', userId).limit(10000),
    ]);

    const lessons = lessonsRes.data || [];
    const completedSet = new Set((userProgRes.data || []).map((d) => String(d.lesson_id)));

    let totalCompleted = 0;
    lessons.forEach((l) => {
      if (completedSet.has(String(l.id))) {
        totalCompleted++;
      }
    });

    const totalLessons = lessons.length;
    const percentage = calculatePercentage(totalCompleted, totalLessons);

    return {
      id: 'reading',
      title: 'Luyện đọc',
      percentage,
      activeTopics: totalCompleted,
      totalTopics: totalLessons,
      completedItems: totalCompleted,
      totalItems: totalLessons,
      itemUnit: 'bài hoàn thành',
      topicUnit: 'bài đọc',
      conditionText: 'Đã hoàn thành bài đọc',
      path: '/reading',
    };
  } catch (error) {
    console.warn('fetchReadingProgress error:', error);
    return getEmptySkill('reading');
  }
}

/**
 * 6. Luyện viết
 * % học phần = (Số câu đã dịch hoàn thành / Tổng số câu trong bài viết) * 100
 * Điều kiện 'Đang học': Đã dịch xong ít nhất 1 câu trong bài
 */
async function fetchWritingProgress(userId) {
  try {
    const [lessonsRes, sentencesRes, completedRes] = await Promise.all([
      supabase.from('writing_lessons').select('id, title').order('id', { ascending: true }),
      supabase.from('writing_sentences').select('id, lesson_id').limit(10000),
      supabase.from('user_writing_progress').select('sentence_id').eq('user_id', userId).limit(10000),
    ]);

    const lessons = lessonsRes.data || [];
    const sentences = sentencesRes.data || [];
    const completedSet = new Set((completedRes.data || []).map((c) => String(c.sentence_id)));

    const lessonMap = {};
    lessons.forEach((l) => {
      lessonMap[String(l.id)] = { total: 0, completed: 0 };
    });

    let totalCompleted = 0;
    sentences.forEach((s) => {
      const lid = String(s.lesson_id);
      if (lessonMap[lid]) {
        lessonMap[lid].total++;
        if (completedSet.has(String(s.id))) {
          lessonMap[lid].completed++;
          totalCompleted++;
        }
      } else if (completedSet.has(String(s.id))) {
        totalCompleted++;
      }
    });

    let activeTopics = 0;
    Object.values(lessonMap).forEach((l) => {
      if (l.completed > 0) {
        activeTopics++;
      }
    });

    const totalSentences = sentences.length;
    const percentage = calculatePercentage(totalCompleted, totalSentences);

    return {
      id: 'writing',
      title: 'Luyện viết',
      percentage,
      activeTopics,
      totalTopics: lessons.length,
      completedItems: totalCompleted,
      totalItems: totalSentences,
      itemUnit: 'câu đã dịch',
      topicUnit: 'bài viết',
      conditionText: 'Đã dịch xong ít nhất 1 câu trong bài',
      path: '/writing',
    };
  } catch (error) {
    console.warn('fetchWritingProgress error:', error);
    return getEmptySkill('writing');
  }
}

function getEmptySkill(id) {
  const titles = {
    vocabulary: 'Kho từ vựng',
    grammar: 'Ngữ pháp',
    dictation: 'Nghe chép chính tả',
    shadowing: 'Shadowing (Luyện nhại)',
    reading: 'Luyện đọc',
    writing: 'Luyện viết',
  };
  const paths = {
    vocabulary: '/categories',
    grammar: '/tenses',
    dictation: '/dictation',
    shadowing: '/shadowing',
    reading: '/reading',
    writing: '/writing',
  };
  return {
    id,
    title: titles[id] || id,
    percentage: 0,
    activeTopics: 0,
    totalTopics: 0,
    completedItems: 0,
    totalItems: 0,
    itemUnit: 'mục hoàn thành',
    topicUnit: 'chủ đề',
    conditionText: '',
    path: paths[id] || '/dashboard',
  };
}

function getEmptyProgress() {
  return {
    overallProgress: 0,
    activeSkillsCount: 0,
    skills: {
      vocabulary: getEmptySkill('vocabulary'),
      grammar: getEmptySkill('grammar'),
      dictation: getEmptySkill('dictation'),
      shadowing: getEmptySkill('shadowing'),
      reading: getEmptySkill('reading'),
      writing: getEmptySkill('writing'),
    },
  };
}
