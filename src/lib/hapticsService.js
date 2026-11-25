export const hapticsService = {
  async selection() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch {}
    }
  },

  async success() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 40, 20]); } catch {}
    }
  },

  async warning() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([50, 50, 50]); } catch {}
    }
  },

  async heavy() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(50); } catch {}
    }
  },
};
