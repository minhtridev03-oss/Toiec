export const praiseLearningBot = (message) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('learning-bot:praise', {
    detail: { message },
  }));
};
