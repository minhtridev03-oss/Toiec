export function normalizeAnswer(text) {
  if (!text) return '';

  let normalized = text.toLowerCase().trim();

  // Thu gọn khoảng trắng đúp
  normalized = normalized.replace(/\s+/g, ' ');

  // Chuyển đổi các dạng viết tắt phổ biến
  const contractions = {
    "'s": " is",
    "’s": " is",
    "'re": " are",
    "’re": " are",
    "'m": " am",
    "’m": " am",
    "n't": " not",
    "n’t": " not",
    "'ve": " have",
    "’ve": " have",
    "'ll": " will",
    "’ll": " will"
  };

  for (const [contraction, fullForm] of Object.entries(contractions)) {
    // Escape single quotes for regex
    const regex = new RegExp(contraction.replace(/'/g, "\\'"), 'g');
    normalized = normalized.replace(regex, fullForm);
  }

  // Thu gọn khoảng trắng đúp lại lần nữa sau khi replace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Loại bỏ các ký tự đặc biệt còn lại, chỉ giữ chữ cái, số và khoảng trắng
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');

  return normalized.trim();
}
