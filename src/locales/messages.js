export const messages = {
  vi: {
    nav: {
      dashboard: 'Bảng điều khiển',
      dictionary: 'Từ điển TFlat',
      vocabulary: 'Từ vựng',
      exercises: 'Luyện tập',
      kids: 'Khu vực thiếu nhi',
      grammar: 'Ngữ pháp',
      listening: 'Luyện nghe',
      shadowing: 'Shadowing',
      speaking: 'Luyện nói',
      reading: 'Luyện đọc',
      writing: 'Luyện viết',
      library: 'Thư viện',
      admin: 'Quản trị',
    },
    common: {
      loading: 'Đang tải...',
      expandSidebar: 'Mở rộng thanh điều hướng',
      proPlan: 'GÓI PRO',
      upgradeCopy: 'Nâng cấp để mở khóa mọi tính năng',
      upgrade: 'Nâng cấp ngay',
    },
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      dictionary: 'TFlat Dictionary',
      vocabulary: 'Vocabulary',
      exercises: 'Exercises',
      kids: 'Kids Zone',
      grammar: 'Grammar',
      listening: 'Listening',
      shadowing: 'Shadowing',
      speaking: 'Speaking',
      reading: 'Reading',
      writing: 'Writing',
      library: 'Library',
      admin: 'Admin Panel',
    },
    common: {
      loading: 'Loading...',
      expandSidebar: 'Expand sidebar',
      proPlan: 'PRO PLAN',
      upgradeCopy: 'Upgrade to unlock all features',
      upgrade: 'Upgrade now',
    },
  },
};

export function translate(locale, key, fallback = key) {
  const value = key.split('.').reduce((current, part) => current?.[part], messages[locale]);
  return typeof value === 'string' ? value : fallback;
}
