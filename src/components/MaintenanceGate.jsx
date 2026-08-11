import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const SETTING_KEY = 'maintenance_mode';
const POLL_INTERVAL_MS = 30_000;

const defaultSetting = {
  enabled: false,
  title: 'Website đang bảo trì',
  message: 'Hệ thống đang được cập nhật. Vui lòng quay lại sau ít phút.',
};

const normalizeSetting = (value) => ({
  enabled: value?.enabled === true,
  title: typeof value?.title === 'string' && value.title.trim()
    ? value.title.trim()
    : defaultSetting.title,
  message: typeof value?.message === 'string' && value.message.trim()
    ? value.message.trim()
    : defaultSetting.message,
});

export default function MaintenanceGate({ children }) {
  const [setting, setSetting] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadSetting = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (error) {
      console.error('Không thể kiểm tra trạng thái bảo trì:', error);
      setLoadError(true);
      return;
    }

    setLoadError(false);
    setSetting(normalizeSetting(data?.value));
  }, []);

  useEffect(() => {
    loadSetting();
    const intervalId = window.setInterval(loadSetting, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadSetting]);

  if (!setting && loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <Wrench className="mx-auto mb-4 text-amber-300" size={42} />
          <h1 className="text-2xl font-extrabold">Không thể kiểm tra trạng thái website</h1>
          <p className="mt-3 text-slate-300">Vui lòng thử lại sau ít phút.</p>
          <button
            type="button"
            onClick={() => { setLoadError(false); loadSetting(); }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-fuchsia-500 px-4 py-2 font-bold text-white hover:bg-fuchsia-400"
          >
            <RefreshCw size={16} /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!setting) {
    return <div className="min-h-screen bg-slate-950" aria-busy="true" />;
  }

  if (!setting.enabled) return children;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fuchsia-950 via-slate-950 to-pink-950 px-6 text-center text-white">
      <div className="max-w-lg rounded-3xl border border-fuchsia-300/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-300">
          <Wrench size={34} />
        </div>
        <h1 className="text-3xl font-extrabold">{setting.title}</h1>
        <p className="mt-4 leading-7 text-slate-200">{setting.message}</p>
        <p className="mt-6 text-sm text-slate-400">Trang sẽ tự kiểm tra lại sau mỗi 30 giây.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-fuchsia-500 px-5 py-2.5 font-bold text-white transition hover:bg-fuchsia-400"
        >
          <RefreshCw size={16} /> Kiểm tra lại
        </button>
      </div>
    </div>
  );
}
