import { parseTFlatHtml } from './tflatParser';

/**
 * Lấy nghĩa ngắn gọn, sạch sẽ nhất để hiển thị ở list
 */
export function getShortMeaning(word) {
  if (!word) return '';

  if (word.av) {
    try {
      const parts = word.av.split('##');
      const sections = parseTFlatHtml(parts[0]);
      if (sections && sections.length > 0) {
        // Tìm nghĩa đầu tiên (bỏ qua [EN])
        for (const sec of sections) {
          for (const m of sec.meanings) {
            if (!m.text.startsWith('[EN]')) {
              return m.text;
            }
          }
        }
        return sections[0].meanings[0].text;
      }
    } catch (e) { }
  }

  // Nếu có mean, thử parse bằng parseRawDictionaryData để lấy nghĩa tiếng Việt đầu tiên
  if (word.mean) {
    try {
      const parsed = parseRawDictionaryData(word.mean);
      if (parsed && parsed.parts) {
        for (const partKey in parsed.parts) {
          const part = parsed.parts[partKey];
          if (part.meanings) {
            const meanKeys = Object.keys(part.meanings);
            if (meanKeys.length > 0) {
              // Loại bỏ các ký tự thừa trong key nếu có
              return meanKeys[0].trim();
            }
          }
        }
      }
    } catch (e) { }
  }

  // Fallback làm sạch mean cơ bản nếu cả 2 cách trên thất bại
  let cleanMean = word.mean || '';

  // Xử lý chuỗi bắt đầu bằng @ (chứa tiếng Anh và phiên âm)
  if (cleanMean.startsWith('@')) {
    // Nếu có dấu '-' hoặc '*', phần nghĩa tiếng Việt thường nằm sau đó
    const parts = cleanMean.split(/[-*]/);
    if (parts.length > 1) {
      cleanMean = parts.slice(1).join(' '); // Lấy tất cả sau dấu '-' hoặc '*' đầu tiên
    } else {
      // Nếu không, thử xóa từ tiếng Anh (@word) và phiên âm ([...] hoặc /.../)
      cleanMean = cleanMean
        .replace(/^@[^\s]+\s*/, '') // Xóa @word
        .replace(/\[[^\]]+\]\s*/g, '') // Xóa phiên âm [...]
        .replace(/\/[^\/]+\/\s*/g, ''); // Xóa phiên âm /.../
    }
  }

  // Dọn dẹp lại các ký tự đặc biệt còn sót
  let finalMeaning = cleanMean
    .replace(/&\s*9733/g, '') 
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#;=_*+@-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Lấy câu đầu tiên nếu nó quá dài hoặc có chữ "Cách viết khác"
  if (finalMeaning.includes('Cách viết khác')) {
    finalMeaning = finalMeaning.split('Cách viết khác')[0].trim();
  }
  
  return finalMeaning;
}

/**
 * Chuyển đổi dữ liệu từ điển thô sang cấu trúc JSON
 * @param {string} rawString Dữ liệu thô từ database (VD: chứa các ký tự *, -, =, #, ;, \n)
 * @returns {object|null} Object JSON đã được phân tách, hoặc null nếu lỗi
 */
export function parseRawDictionaryData(rawString) {
  if (!rawString || typeof rawString !== 'string') return null;

  try {
    const result = {
      pronunciation: '',
      parts: {}
    };

    // 1. Tiền xử lý chuỗi:
    // Đổi các thẻ HTML ngắt dòng thành \n
    let cleanString = rawString
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '') // Xoá các thẻ HTML còn lại
      .replace(/;/g, '\n')
      .replace(/#/g, '\n');

    // Tách chuỗi thành từng dòng, loại bỏ các khoảng trắng dư thừa và dòng trống
    const lines = cleanString.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let currentPart = ''; // Lưu từ loại hiện tại (VD: "DANH TỪ")
    let currentMeaning = ''; // Lưu nghĩa hiện tại
    let isParsingPhrase = false; // Cờ kiểm tra xem đang phân tích cụm từ hay từ chính

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 2. Xử lý phiên âm (thường nằm trong [ ] hoặc / / ở đầu)
      if (i === 0 && (line.startsWith('[') || line.startsWith('/'))) {
        result.pronunciation = line;
        continue;
      }

      // 3. Phân tách Từ loại (Bắt đầu bằng dấu *)
      if (line.startsWith('*')) {
        currentPart = line.substring(1).trim().toUpperCase();
        isParsingPhrase = false;

        if (!result.parts[currentPart]) {
          result.parts[currentPart] = { meanings: {}, phrases: {} };
        }
        continue;
      }

      // 4. Phân tách Cụm từ (Bắt đầu bằng dấu !)
      if (line.startsWith('!')) {
        isParsingPhrase = true;
        currentMeaning = line.substring(1).trim();
        continue;
      }

      // 5. Phân tách Nghĩa của từ (Bắt đầu bằng dấu -)
      if (line.startsWith('-') || line.startsWith('+')) {
        currentMeaning = line.substring(1).trim();

        if (isParsingPhrase) {
          if (currentPart && result.parts[currentPart]) {
            result.parts[currentPart].phrases[currentMeaning] = '';
          }
        } else {
          if (!currentPart) {
            currentPart = "CHUNG";
            result.parts[currentPart] = { meanings: {}, phrases: {} };
          }
          result.parts[currentPart].meanings[currentMeaning] = {};
        }
        continue;
      }

      // 6. Phân tách Câu ví dụ (Bắt đầu bằng dấu =)
      if (line.startsWith('=')) {
        let exampleText = line.substring(1).trim();
        let translationText = "";

        if (exampleText.includes('+')) {
          const parts = exampleText.split('+');
          exampleText = parts[0].trim();
          translationText = parts.slice(1).join('+').trim();
        } else if (exampleText.includes(':')) {
          const parts = exampleText.split(':');
          exampleText = parts[0].trim();
          translationText = parts.slice(1).join(':').trim();
        }

        if (currentPart && result.parts[currentPart]) {
          if (!isParsingPhrase && currentMeaning) {
            result.parts[currentPart].meanings[currentMeaning][exampleText] = translationText;
          }
        }
        continue;
      }

      // 7. Xử lý text bình thường (không có ký hiệu)
      // Rất nhiều từ trong DB chỉ lưu dạng: "nghĩa 1; nghĩa 2"
      // Vì đã replace ';' thành '\n' ở bước 1, nên chúng rớt xuống đây
      if (line) {
        currentMeaning = line;
        if (!currentPart) {
          currentPart = "CHUNG";
          result.parts[currentPart] = { meanings: {}, phrases: {} };
        }

        if (isParsingPhrase) {
          result.parts[currentPart].phrases[currentMeaning] = '';
        } else {
          // Lưu nghĩa vào mảng meanings
          result.parts[currentPart].meanings[currentMeaning] = {};
        }
      }
    }

    return result;

  } catch (error) {
    console.error("Lỗi khi parse dữ liệu từ điển thô:", error);
    return null;
  }
}
