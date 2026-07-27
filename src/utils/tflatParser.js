const BLOB_KEY_A = 2;
const BLOB_KEY_B = 7;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const DICT_CLASS_RE = /^[meidub]{1,2}$/;
const RECOGNIZED_CLASSES = new Set(['ub', 'b', 'm', 'dm', 'de', 'e', 'em', 'id', 'im']);

const POS_VI = {
  v: 'ĐỘNG TỪ',
  n: 'DANH TỪ',
  adj: 'TÍNH TỪ',
  adv: 'TRẠNG TỪ',
  vi: 'NỘI ĐỘNG TỪ',
  vt: 'NGOẠI ĐỘNG TỪ',
  prep: 'GIỚI TỪ',
  pron: 'ĐẠI TỪ',
  conj: 'LIÊN TỪ',
  int: 'THÁN TỪ',
  det: 'HẠN ĐỊNH TỪ',
};

function fixText(text = '') {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/^★\s*/, '')
    .trim();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getClassTokens(element) {
  return Array.from(element.classList || []);
}

function hasAnyClass(element, classes) {
  const tokens = getClassTokens(element);
  return classes.some((className) => tokens.includes(className));
}

function isDictionaryElement(element) {
  const tokens = getClassTokens(element);
  return tokens.some((className) => RECOGNIZED_CLASSES.has(className) || DICT_CLASS_RE.test(className));
}

function ensurePart(parts, key) {
  if (!parts[key]) {
    parts[key] = {
      meanings: [],
      phrases: [],
    };
  }
  return parts[key];
}

function normalizePartLabel(part) {
  if (!part || part === '_') return null;
  return POS_VI[part] || part.toUpperCase();
}

/**
 * Restore TFlat custom shorthand tags to standard HTML.
 * This mirrors FluentDict's Python restore_html().
 */
export function restoreTFlatHtml(htmlDoc = '') {
  return htmlDoc
    .replace(/<d1/g, '<div class="')
    .replace(/<d3>/g, '</div></div></div>')
    .replace(/<a1/g, '<a href="')
    .replace(/<s1/g, '<span class="')
    .replace(/<s2>/g, '</span></span>');
}

function base64ToBytes(value) {
  if (typeof atob === 'function') {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'base64'));
  }

  throw new Error('Base64 decoding is not supported in this browser.');
}

function decryptBlobBytes(blob) {
  const orgLength = blob.length;
  const length = Math.floor(orgLength / BLOB_KEY_A);
  const output = new Uint8Array(orgLength);

  for (let x = 0; x < length * 2; x += 2) {
    if (x > BLOB_KEY_B * 2 + length) {
      output[x] = blob[x];
      output[x + 1] = blob[x + 1];
    } else {
      output[x] = blob[x + 1];
      output[x + 1] = blob[x];
    }
  }

  if (orgLength % 2 === 1) {
    output[orgLength - 1] = blob[orgLength - 1];
  }

  return output;
}

async function gunzipBytes(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Gzip decompression is not supported in this browser.');
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export async function decodeTFlatAv(rawAv) {
  if (!rawAv) return '';
  if (typeof rawAv !== 'string') return String(rawAv);

  const value = rawAv.trim();
  if (!value || value.includes('<d1') || value.includes('<div') || value.includes('##')) {
    return rawAv;
  }

  const compact = value.replace(/\s+/g, '');
  if (compact.length % 4 !== 0 || !BASE64_RE.test(compact)) {
    return rawAv;
  }

  const bytes = base64ToBytes(compact);
  if (bytes.length > 3 && bytes[0] === bytes[1] && bytes[1] === bytes[2]) {
    const decrypted = decryptBlobBytes(bytes.slice(3));
    return gunzipBytes(decrypted);
  }

  return new TextDecoder('utf-8').decode(bytes);
}

function createEntry() {
  return {
    pronunciation: '',
    parts: {
      _: {
        meanings: [],
        phrases: [],
      },
    },
  };
}

function addMeaning(part, text, isEnglish = false) {
  const meaning = {
    text,
    isEnglish,
    examples: [],
  };
  part.meanings.push(meaning);
  return meaning;
}

function parseTabContent(content, entry) {
  if (!content || content.length <= 3 || typeof window === 'undefined' || !window.DOMParser) {
    return entry;
  }

  let html = content.trim();
  if (!html.startsWith('<div')) {
    html = `<div><div class="m">${escapeHtml(fixText(html))}</div></div>`;
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<div id="tflat-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('tflat-root');
  if (!root) return entry;

  const pronNode = root.querySelector('.p5l.fl');
  const wordNode = root.querySelector('.w');
  let pronunciation = fixText(pronNode?.textContent || '');

  if (!pronunciation && wordNode?.parentElement) {
    const clonedParent = wordNode.parentElement.cloneNode(true);
    clonedParent.querySelector('.w')?.remove();
    pronunciation = fixText(clonedParent.textContent || '');
  }

  if (pronunciation && !entry.pronunciation) {
    entry.pronunciation = pronunciation;
  }

  const firstMeaningNode = Array.from(root.querySelectorAll('*')).find(isDictionaryElement);
  const body = firstMeaningNode?.parentElement;
  if (!body) return entry;

  const nodes = Array.from(body.querySelectorAll('*')).filter(isDictionaryElement);
  let currentPartKey = '_';
  let currentPart = ensurePart(entry.parts, currentPartKey);
  let currentMeaning = null;
  let currentExample = null;
  let currentPhrase = '';

  for (const node of nodes) {
    const text = fixText((node.textContent || '').replace(/^Ví dụ\s*/i, ''));
    if (!text) continue;

    if (hasAnyClass(node, ['ub', 'b'])) {
      currentPartKey = text.toLowerCase();
      currentPart = ensurePart(entry.parts, currentPartKey);
      currentMeaning = null;
      currentExample = null;
      currentPhrase = '';
      continue;
    }

    if (hasAnyClass(node, ['m', 'dm'])) {
      currentMeaning = addMeaning(currentPart, text);
      currentExample = null;
      continue;
    }

    if (hasAnyClass(node, ['de'])) {
      currentMeaning = addMeaning(currentPart, text, true);
      currentExample = null;
      continue;
    }

    if (hasAnyClass(node, ['e'])) {
      if (!currentMeaning) {
        currentMeaning = addMeaning(currentPart, '');
      }
      currentExample = { en: text, vi: '' };
      currentMeaning.examples.push(currentExample);
      continue;
    }

    if (hasAnyClass(node, ['em'])) {
      if (!currentMeaning) {
        currentMeaning = addMeaning(currentPart, '');
      }

      if (currentExample && !currentExample.vi) {
        currentExample.vi = text;
      } else {
        currentMeaning.examples.push({ en: '', vi: text });
      }
      continue;
    }

    if (hasAnyClass(node, ['id'])) {
      currentPhrase = text;
      continue;
    }

    if (hasAnyClass(node, ['im']) && currentPhrase) {
      currentPart.phrases.push({ text: currentPhrase, meaning: text });
      currentPhrase = '';
    }
  }

  return entry;
}

function entryToSections(entry) {
  return Object.entries(entry.parts)
    .map(([part, data]) => ({
      pos: normalizePartLabel(part),
      meanings: data.meanings.filter((meaning) => meaning.text || meaning.examples.length > 0),
      phrases: data.phrases,
    }))
    .filter((section) => section.meanings.length > 0 || section.phrases.length > 0);
}

export function parseTFlatEntry(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return null;

  const restored = restoreTFlatHtml(rawHtml);
  const tabContents = restored.split('##');
  const entry = createEntry();

  parseTabContent(tabContents[0], entry);
  if (tabContents.length > 2) {
    parseTabContent(tabContents[2], entry);
  }

  const sections = entryToSections(entry);
  if (sections.length === 0 && !entry.pronunciation) {
    return null;
  }

  return {
    pronunciation: entry.pronunciation,
    sections,
  };
}

export function parseTFlatHtml(rawHtml) {
  return parseTFlatEntry(rawHtml)?.sections || null;
}
