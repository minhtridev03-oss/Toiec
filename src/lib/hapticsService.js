import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const hapticsService = {
  // Rung nhẹ khi chạm tab, bấm nút bấm tương tác
  async selection() {
    if (!Capacitor.isNativePlatform()) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
      return;
    }
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Graceful fallback
    }
  },

  // Rung nhẹ khi trả lời đúng / thành công
  async success() {
    if (!Capacitor.isNativePlatform()) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 40, 20]);
      }
      return;
    }
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Graceful fallback
    }
  },

  // Rung cảnh báo khi trả lời sai
  async warning() {
    if (!Capacitor.isNativePlatform()) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
      return;
    }
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      // Graceful fallback
    }
  },

  // Rung nặng hơn cho sự kiện lớn (ví dụ chuỗi streak, nhận cup)
  async heavy() {
    if (!Capacitor.isNativePlatform()) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      return;
    }
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Graceful fallback
    }
  },
};
