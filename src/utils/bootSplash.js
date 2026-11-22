/**
 * Utility: Quản lý hiệu ứng khởi động mượt mà (App Boot Splash Handshake)
 * 1. Đảm bảo thời gian hiển thị tối thiểu để người học thấy mascot chào đón (không bị chớp giật quá nhanh).
 * 2. Kích hoạt hiệu ứng fade-out + scale nhẹ (120 FPS hardware accelerated).
 * 3. Hủy bỏ phần tử khỏi DOM sau khi hoàn tất hiệu ứng để tiết kiệm bộ nhớ.
 */

export function dismissAppBootSplash() {
  if (typeof window === 'undefined') return;
  const splash = document.getElementById('app-boot-splash');
  if (!splash) return;

  // Nếu đã bắt đầu hiệu ứng fade-out thì bỏ qua
  if (splash.classList.contains('splash-fade-out')) return;

  const startTime = window.__appBootStartTime || Date.now();
  const elapsed = Date.now() - startTime;
  
  // Thời gian hiển thị tối thiểu (800ms) tạo cảm giác chào đón cao cấp như Duolingo/ELSA
  const minDisplayTime = 800;
  const delay = Math.max(0, minDisplayTime - elapsed);

  setTimeout(() => {
    splash.classList.add('splash-fade-out');
    setTimeout(() => {
      try {
        splash.remove();
      } catch {}
    }, 550);
  }, delay);
}
