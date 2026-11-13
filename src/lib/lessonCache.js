import { supabase } from './supabaseClient';

export const writingLessonCache = new Map();
export const readingLessonCache = new Map();
export const dictationLessonCache = new Map();

/**
 * Tải trước dữ liệu bài luyện viết ngay khi hover vào card bài học
 */
export const prefetchWritingLesson = (lessonId) => {
  if (!lessonId || writingLessonCache.has(lessonId)) return;

  Promise.all([
    supabase
      .from('writing_lessons')
      .select('id, title, level, full_content, created_at')
      .eq('id', lessonId)
      .single(),
    supabase
      .from('writing_sentences')
      .select('id, lesson_id, text_to_translate, suggested_translation, order_num')
      .eq('lesson_id', lessonId)
      .order('order_num', { ascending: true }),
  ])
    .then(([lRes, sRes]) => {
      if (lRes.data && sRes.data) {
        writingLessonCache.set(lessonId, {
          lesson: lRes.data,
          sentences: sRes.data || [],
        });
      }
    })
    .catch(() => {});
};

/**
 * Tải trước dữ liệu bài luyện đọc ngay khi hover vào card bài học
 */
export const prefetchReadingLesson = (lessonId) => {
  if (!lessonId || readingLessonCache.has(lessonId)) return;

  Promise.all([
    supabase
      .from('reading_lessons')
      .select('id, title, content, level')
      .eq('id', lessonId)
      .single(),
    supabase
      .from('reading_questions')
      .select('id, lesson_id, question, options, correct_answer, explanation')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true }),
  ])
    .then(([lRes, qRes]) => {
      if (lRes.data && qRes.data) {
        readingLessonCache.set(lessonId, {
          lesson: lRes.data,
          questions: qRes.data || [],
        });
      }
    })
    .catch(() => {});
};

/**
 * Tải trước dữ liệu bài luyện nghe chép chính tả ngay khi hover vào card bài học
 */
export const prefetchDictationLesson = (lessonId) => {
  if (!lessonId || dictationLessonCache.has(lessonId)) return;

  Promise.all([
    supabase
      .from('dictation_videos')
      .select('id, title, description, youtube_id, thumbnail_url, level, category, audio_storage_path')
      .eq('id', lessonId)
      .single(),
    supabase
      .from('dictation_segments')
      .select('id, video_id, step_order, start_time, end_time, mode, display_template, answer, transcript')
      .eq('video_id', lessonId)
      .order('step_order', { ascending: true }),
  ])
    .then(([vRes, sRes]) => {
      if (vRes.data && sRes.data) {
        dictationLessonCache.set(lessonId, {
          video: vRes.data,
          segments: sRes.data || [],
        });
      }
    })
    .catch(() => {});
};
