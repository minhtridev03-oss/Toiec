/**
 * Utility: Quản lý hiệu ứng khởi động mượt mà (App Boot Splash Handshake)
 * Đảm bảo người học trên cả Web và Android APK luôn nhìn thấy màn hình chào đón
 * của chú robot T-English trong ít nhất 1.8 giây trước khi mờ dần êm ái vào Dashboard.
 */

export function dismissAppBootSplash(displayDuration = 1800) {
  if (typeof window === 'undefined') return;
  const splash = document.getElementById('app-boot-splash');
  if (!splash) return;

  // Nếu đã bắt đầu hiệu ứng fade-out thì bỏ qua
  if (splash.classList.contains('splash-fade-out')) return;

  setTimeout(() => {
    splash.classList.add('splash-fade-out');
    setTimeout(() => {
      try {
        splash.remove();
      } catch {}
    }, 550);
  }, displayDuration);
}
