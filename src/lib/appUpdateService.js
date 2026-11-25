import { supabase } from './supabaseClient';

export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_VERSION_CODE = 1;

const DISMISSED_KEY = 'tenglish_dismissed_update_version';

export function isNativeApp() {
  return false;
}

/**
 * So sánh 2 chuỗi phiên bản dạng '1.0.1' và '1.0.0'
 * Trả về:
 *  1 nếu v1 > v2
 * -1 nếu v1 < v2
 *  0 nếu v1 == v2
 */
export function compareSemver(v1, v2) {
  const parts1 = String(v1 || '').replace(/[^0-9.]/g, '').split('.').map(Number);
  const parts2 = String(v2 || '').replace(/[^0-9.]/g, '').split('.').map(Number);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Lấy thông tin bản cập nhật mới nhất từ Supabase (có fallback sang GitHub Releases)
 * Chỉ áp dụng cho Native Mobile App, trên Web sẽ bỏ qua
 */
export async function fetchLatestUpdateInfo() {
  if (!isNativeApp()) {
    return {
      hasUpdate: false,
      version: CURRENT_APP_VERSION,
      versionCode: CURRENT_VERSION_CODE,
      apkUrl: '',
      releaseNotes: '',
      isForce: false,
      source: 'web_ignored',
    };
  }

  // 1. Nguồn ưu tiên số 1: Supabase bảng app_versions
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('is_active', true)
      .order('version_code', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && data.version) {
      const isNewer =
        (data.version_code && data.version_code > CURRENT_VERSION_CODE) ||
        compareSemver(data.version, CURRENT_APP_VERSION) > 0;

      return {
        hasUpdate: isNewer,
        version: data.version,
        versionCode: data.version_code || 1,
        apkUrl: data.apk_url || 'https://github.com/minhtridev03-oss/Toiec/releases/latest',
        releaseNotes: data.release_notes || 'Bản cập nhật tối ưu hiệu năng và sửa lỗi.',
        isForce: Boolean(data.is_force),
        source: 'supabase',
      };
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra Supabase app_versions, chuyển sang kiểm tra GitHub fallback:', err);
  }

  // 2. Nguồn dự phòng số 2: GitHub Releases API
  try {
    const res = await fetch('https://api.github.com/repos/minhtridev03-oss/Toiec/releases/latest', {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (res.ok) {
      const release = await res.json();
      const tagName = release.tag_name || '';
      const cleanVer = tagName.replace(/^v/i, '').trim();

      if (cleanVer && compareSemver(cleanVer, CURRENT_APP_VERSION) > 0) {
        // Tìm file APK trong assets nếu có
        let apkUrl = release.html_url;
        if (Array.isArray(release.assets)) {
          const apkAsset = release.assets.find(
            (a) => a.name && a.name.toLowerCase().endsWith('.apk')
          );
          if (apkAsset?.browser_download_url) {
            apkUrl = apkAsset.browser_download_url;
          }
        }

        return {
          hasUpdate: true,
          version: cleanVer,
          versionCode: 2,
          apkUrl,
          releaseNotes: release.body || 'Bản cập nhật tính năng và sửa lỗi mới nhất.',
          isForce: false,
          source: 'github',
        };
      }
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra GitHub releases:', err);
  }

  return {
    hasUpdate: false,
    version: CURRENT_APP_VERSION,
    versionCode: CURRENT_VERSION_CODE,
    apkUrl: '',
    releaseNotes: '',
    isForce: false,
    source: 'none',
  };
}

/**
 * Kiểm tra xem người dùng đã chọn "Để sau" với phiên bản này chưa
 */
export function isUpdateDismissed(version) {
  if (typeof window === 'undefined') return false;
  try {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    return dismissed === version;
  } catch {
    return false;
  }
}

/**
 * Lưu trạng thái "Để sau" của người dùng
 */
export function dismissUpdateForSession(version) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_KEY, version);
  } catch {}
}

/**
 * Mở đường dẫn tải file APK (trên Android hoặc Web)
 */
export function openApkDownload(apkUrl) {
  if (!apkUrl || typeof window === 'undefined') return;
  try {
    window.open(apkUrl, '_system');
  } catch {
    window.location.href = apkUrl;
  }
}
