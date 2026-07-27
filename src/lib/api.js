import { supabase } from './supabaseClient';

const chunkArray = (items, size = 500) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * Fetch danh sách các chủ đề gợi ý (Categories) kèm theo tiến độ
 */
export const fetchSuggestedCategories = async (userId) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, img')
      .order('created_at', { ascending: true })
      .limit(3); // Lấy 3 chủ đề gợi ý

    if (error) throw error;

    const { data: progressRows, error: progressError } = await supabase
      .rpc('get_category_progress', { p_user_id: userId });

    if (progressError) throw progressError;

    const progressMap = {};
    (progressRows || []).forEach((row) => {
      const total = Number(row.total_count) || 0;
      const learned = Number(row.learned_count) || 0;
      progressMap[row.category_id] = total > 0 ? Math.round((learned / total) * 100) : 0;
    });

    const result = (categories || []).map((cat) => ({
      ...cat,
      icon: 'BookOpen',
      color: 'text-fuchsia-600',
      bg: 'bg-fuchsia-100',
      progress: progressMap[cat.id] || 0,
    }));

    return result;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * Tính toán chuỗi ngày học liên tiếp (Streak)
 */
export const fetchUserStreak = async (userId) => {
  if (!userId) return 0;
  try {
    // 1. Lấy các ngày học từ vựng
    const vocabPromise = supabase
      .from('user_topic_vocabularies')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10000);
      
    // 2. Lấy các ngày luyện tập (tất cả các kỹ năng khác)
    const practicePromise = supabase
      .from('user_practice_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10000);

    const [vocabRes, practiceRes] = await Promise.all([vocabPromise, practicePromise]);

    if (vocabRes.error) throw vocabRes.error;
    if (practiceRes.error) throw practiceRes.error;

    const combinedData = [...(vocabRes.data || []), ...(practiceRes.data || [])];
    
    if (combinedData.length === 0) return 0;

    // Lọc ra danh sách các ngày duy nhất (format YYYY-MM-DD theo múi giờ địa phương)
    const uniqueDates = [...new Set(
      combinedData
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(item => {
          const d = new Date(item.created_at);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          return d.toISOString().split('T')[0];
        })
    )];
    
    if (uniqueDates.length === 0) return 0;

    // Kiểm tra xem hôm nay hoặc hôm qua có hoạt động không
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const today = now.toISOString().split('T')[0];
    
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    yest.setMinutes(yest.getMinutes() - yest.getTimezoneOffset());
    const yesterday = yest.toISOString().split('T')[0];

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
      return 0; // Đã mất chuỗi
    }

    let streak = 1;
    let currentDate = new Date(uniqueDates[0]);

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(currentDate - prevDate);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
        currentDate = prevDate;
      } else {
        break; // Chuỗi bị đứt gãy
      }
    }

    return streak;
  } catch (error) {
    console.error('Error fetching streak:', error);
    return 0;
  }
};

/**
 * Tính tổng số từ vựng đã học
 */
export const fetchTotalLearnedWords = async (userId) => {
  if (!userId) return 0;
  try {
    const { count, error } = await supabase
      .from('user_topic_vocabularies')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_learned', true);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching learned words:', error);
    return 0;
  }
};

/**
 * Fetch danh sách câu hỏi cho phần luyện tập (lấy ngẫu nhiên các từ đã học)
 */
export const fetchPracticeQuestions = async (userId, limit = 10) => {
  if (!userId) return [];
  try {
    // Lấy tất cả từ đã học của user
    const { data, error } = await supabase
      .from('user_topic_vocabularies')
      .select('vocabulary_id')
      .eq('user_id', userId)
      .eq('is_learned', true)
      .order('created_at', { ascending: false })
      .limit(Math.max(limit * 20, 100));

    if (error) throw error;
    
    // Xáo trộn mảng để lấy ngẫu nhiên `limit` từ
    const learnedIds = [...new Set((data || []).map((item) => item.vocabulary_id).filter(Boolean))];
    if (learnedIds.length === 0) return [];

    const selectedIds = [...learnedIds].sort(() => 0.5 - Math.random()).slice(0, limit);
    const { data: vocabularies, error: vocabError } = await supabase
      .from('topic_vocabularies')
      .select('*')
      .in('id', selectedIds);

    if (vocabError) throw vocabError;
    
    // Trả về mảng các object vocabularies
    const vocabMap = new Map((vocabularies || []).map((word) => [word.id, word]));
    return selectedIds.map((id) => vocabMap.get(id)).filter(Boolean);
  } catch (error) {
    console.error('Error fetching practice questions:', error);
    return [];
  }
};

/**
 * Fetch all learned topic vocabularies and group them by sub-category for practice.
 */
export const fetchLearnedPracticeWords = async (userId) => {
  if (!userId) return { words: [], topics: [] };

  try {
    const pageSize = 1000;
    let from = 0;
    const learnedRows = [];

    while (true) {
      const { data, error } = await supabase
        .from('user_topic_vocabularies')
        .select('vocabulary_id, created_at')
        .eq('user_id', userId)
        .eq('is_learned', true)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const batch = data || [];
      learnedRows.push(...batch);

      if (batch.length < pageSize) break;
      from += pageSize;
    }

    const vocabularyIds = [...new Set(learnedRows.map((item) => item.vocabulary_id).filter(Boolean))];
    if (vocabularyIds.length === 0) {
      return { words: [], topics: [] };
    }

    const vocabularyRows = [];
    for (const ids of chunkArray(vocabularyIds)) {
      const { data, error } = await supabase
        .from('topic_vocabularies')
        .select('id, word, pro, pos, mean, example, example_mean, sub_category_id')
        .in('id', ids);

      if (error) throw error;
      vocabularyRows.push(...(data || []));
    }

    const wordMap = new Map(vocabularyRows.map((word) => [word.id, word]));
    const words = vocabularyIds.map((id) => wordMap.get(id)).filter(Boolean);
    const subCategoryIds = [...new Set(words.map((word) => word.sub_category_id).filter(Boolean))];
    const subCategoryMap = new Map();
    const categoryMap = new Map();

    if (subCategoryIds.length > 0) {
      const { data: subCategories, error: subCategoryError } = await supabase
        .from('sub_categories')
        .select('id, name, category_id')
        .in('id', subCategoryIds);

      if (subCategoryError) throw subCategoryError;

      const categoryIds = [...new Set((subCategories || []).map((item) => item.category_id).filter(Boolean))];
      for (const ids of chunkArray(categoryIds)) {
        const { data: categories, error: categoryError } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', ids);

        if (categoryError) throw categoryError;
        (categories || []).forEach((category) => {
          categoryMap.set(category.id, category.name || 'Từ vựng');
        });
      }

      (subCategories || []).forEach((subCategory) => {
        subCategoryMap.set(subCategory.id, {
          id: subCategory.id,
          name: subCategory.name || 'Chủ đề chưa đặt tên',
          categoryId: subCategory.category_id,
          categoryName: categoryMap.get(subCategory.category_id) || 'Từ vựng',
        });
      });
    }

    const topicMap = new Map();
    words.forEach((word) => {
      const topic = subCategoryMap.get(word.sub_category_id) || {
        id: word.sub_category_id || 'uncategorized',
        name: 'Chưa phân loại',
        categoryId: null,
        categoryName: 'Từ vựng',
      };

      if (!topicMap.has(topic.id)) {
        topicMap.set(topic.id, { ...topic, words: [] });
      }

      topicMap.get(topic.id).words.push(word);
    });

    const topics = Array.from(topicMap.values()).sort((a, b) => {
      const categoryCompare = a.categoryName.localeCompare(b.categoryName, 'vi');
      if (categoryCompare !== 0) return categoryCompare;
      return a.name.localeCompare(b.name, 'vi');
    });

    return { words, topics };
  } catch (error) {
    console.error('Error fetching learned practice words:', error);
    return { words: [], topics: [] };
  }
};

/**
 * Fetch các từ nhiễu (distractors) để làm đáp án sai.
 */
export const fetchDistractors = async (limit = 100) => {
  try {
    // Lấy một lượng lớn từ trong CSDL để làm nguồn nhiễu
    const { data, error } = await supabase
      .from('topic_vocabularies')
      .select('id, word, pro, mean')
      .limit(Math.min(Math.max(limit * 5, 100), 500)); 

    if (error) throw error;

    // Xáo trộn và lấy ra `limit` từ
    const shuffled = [...(data || [])].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  } catch (error) {
    console.error('Error fetching distractors:', error);
    return [];
  }
};
