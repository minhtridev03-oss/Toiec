import { BookOpen, CheckCircle2, Coffee, Copy, Heart, QrCode, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const BANK_CODE = import.meta.env.VITE_DONATION_BANK_CODE || '';
const ACCOUNT_NUMBER = import.meta.env.VITE_DONATION_ACCOUNT_NUMBER || '';
const ACCOUNT_NAME = import.meta.env.VITE_DONATION_ACCOUNT_NAME || '';

function buildQrUrl(amount, note) {
  if (!BANK_CODE || !ACCOUNT_NUMBER) return '';
  const params = new URLSearchParams({ amount: String(amount || 0), addInfo: note });
  if (ACCOUNT_NAME) params.set('accountName', ACCOUNT_NAME);
  return `https://img.vietqr.io/image/${encodeURIComponent(BANK_CODE)}-${encodeURIComponent(ACCOUNT_NUMBER)}-compact2.png?${params}`;
}

export default function DonationModal({ open, onClose }) {
  const { user } = useAuth();
  const accountName = String(user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || '').trim();
  const [amount, setAmount] = useState(50000);
  const [donorName, setDonorName] = useState('');
  const [copied, setCopied] = useState(false);
  const [trackingId, setTrackingId] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [submitError, setSubmitError] = useState('');
  const [supporters, setSupporters] = useState([]);
  const [note, setNote] = useState('');
  const [donationCycle, setDonationCycle] = useState(0);
  const trackingRef = useRef({ id: '', code: '' });
  const navigate = useNavigate();
  const qrUrl = buildQrUrl(amount, note);

  useEffect(() => {
    if (!open) return undefined;
    let mounted = true;
    const loadSupporters = async () => {
      const { data } = await supabase
        .from('donations')
        .select('id, donor_name, amount, message, paid_at')
        .eq('status', 'paid')
        .eq('is_public', true)
        .order('paid_at', { ascending: false })
        .limit(5);
      if (mounted && data) setSupporters(data);
    };
    loadSupporters();
    const channel = supabase
      .channel('public-donations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations', filter: 'status=eq.paid' }, loadSupporters)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCreating(true);
      const current = trackingRef.current;
      const resolvedName = accountName || donorName.trim();
      const body = {
        amount,
        donorName: resolvedName || null,
        isPublic: Boolean(resolvedName),
        ...(current.id && current.code ? { donationId: current.id, transferCode: current.code } : {}),
      };
      const { data, error } = await supabase.functions.invoke('create-donation', { body });
      if (cancelled) return;
      if (error || !data?.donation) {
        setSubmitError('Chưa tạo được mã thanh toán. Vui lòng thử lại sau.');
        setCreating(false);
        return;
      }
      const donation = data.donation;
      trackingRef.current = { id: donation.id, code: donation.transfer_code };
      setNote(donation.transfer_code);
      setTrackingId(donation.id);
      setTracking(true);
      setPaymentStatus('pending');
      setSubmitError('');
      setCreating(false);
    }, trackingRef.current.id ? 500 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, amount, donorName, accountName, donationCycle]);

  useEffect(() => {
    if (!trackingId) return undefined;
    let cancelled = false;
    const checkStatus = async () => {
      const { data } = await supabase.functions.invoke('donation-status', { body: { id: trackingId, transferCode: note } });
      if (!cancelled && data?.donation?.status === 'paid') setPaymentStatus('paid');
    };
    checkStatus();
    const poll = window.setInterval(checkStatus, 3000);
    const channel = supabase
      .channel(`donation-${trackingId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'donations', filter: `id=eq.${trackingId}` }, (payload) => {
        if (payload.new?.status === 'paid') setPaymentStatus('paid');
      })
      .subscribe();
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [trackingId, note]);

  if (!open) return null;

  const copyNote = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(note);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const startAnotherDonation = () => {
    trackingRef.current = { id: '', code: '' };
    setTrackingId(null);
    setTracking(false);
    setPaymentStatus('idle');
    setNote('');
    setSubmitError('');
    setDonationCycle((cycle) => cycle + 1);
  };

  const goToLearning = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="relative max-h-[calc(100vh-2.5rem)] w-full max-w-4xl overflow-y-auto rounded-[2.25rem] glass-panel p-6 sm:p-8 shadow-2xl border border-white/70 dark:border-white/10 transition-all select-none">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4.5 top-4.5 flex h-9 w-9 items-center justify-center rounded-full glass-panel text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xs border border-white/60 dark:border-white/10"
        >
          <X size={17} />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3.5 pb-4 border-b border-slate-300/40 dark:border-white/10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 dark:bg-rose-500/25 text-rose-500 dark:text-rose-400 shadow-xs">
            <Heart size={22} className="fill-rose-500" />
          </div>
          <div>
            <h2 id="donation-title" className="text-xl font-black text-slate-950 dark:text-white">
              Ủng hộ dự án
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              Mỗi ly cafe là nguồn động lực to lớn giúp T-English ngày càng hoàn thiện hơn.
            </p>
          </div>
        </div>

        {paymentStatus === 'paid' ? (
          <div className="flex flex-col items-center py-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={52} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-black text-slate-950 dark:text-white">Cảm ơn bạn rất nhiều!</h3>
            <p className="mt-2 max-w-sm text-xs sm:text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
              Sự ủng hộ của bạn là món quà quý giá tiếp thêm động lực cho mình duy trì và phát triển T-English.
            </p>
            <div className="mt-7 grid w-full max-w-md gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={startAnotherDonation}
                className="glass-panel inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-xs sm:text-sm text-slate-800 dark:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/60 dark:border-white/10 shadow-xs"
              >
                <Coffee size={16} aria-hidden="true" className="text-amber-500" />
                <span>Gửi thêm cà phê</span>
              </button>
              <button
                type="button"
                onClick={goToLearning}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3 font-black text-xs sm:text-sm text-white shadow-lg shadow-rose-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <BookOpen size={16} aria-hidden="true" />
                <span>Tiếp tục học ngay</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(240px,.7fr)] lg:items-start">
            <div>
              {/* Preset Buttons */}
              <div className="mb-4 grid grid-cols-3 gap-2.5">
                {[5000, 10000, 100000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className={`rounded-2xl py-2.5 px-3 text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer ${
                      amount === value
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-[1.02] border-transparent'
                        : 'glass-panel text-slate-700 dark:text-slate-200 hover:scale-[1.02] active:scale-95 border-white/60 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10'
                    }`}
                  >
                    {value.toLocaleString('vi-VN')}đ
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <label className="mb-4 block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  Số tiền tùy chọn
                </span>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={amount}
                  onChange={(event) => setAmount(Math.max(0, Number(event.target.value)))}
                  className="w-full rounded-2xl glass-panel px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border border-white/60 dark:border-white/10 focus:border-rose-400 dark:focus:border-rose-500 focus:ring-2 focus:ring-rose-400/20 transition-all shadow-xs"
                />
              </label>

              {/* Donor Name */}
              {!accountName ? (
                <label className="mb-4 block">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                    Tên hiển thị
                  </span>
                  <input
                    value={donorName}
                    onChange={(event) => setDonorName(event.target.value)}
                    placeholder="Nhập tên để hiện trong danh sách ủng hộ"
                    maxLength={80}
                    className="w-full rounded-2xl glass-panel px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border border-white/60 dark:border-white/10 focus:border-rose-400 dark:focus:border-rose-500 focus:ring-2 focus:ring-rose-400/20 transition-all shadow-xs"
                  />
                </label>
              ) : (
                <div className="mb-4 rounded-2xl glass-panel px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 border border-white/60 dark:border-white/10">
                  <span>Tên hiển thị: </span>
                  <strong className="text-rose-600 dark:text-rose-400">{accountName}</strong>
                </div>
              )}

              {/* VietQR Display */}
              {qrUrl ? (
                <div className="flex flex-col items-center justify-center rounded-3xl glass-panel p-4 border border-white/60 dark:border-white/10 shadow-sm">
                  <div className="rounded-2xl bg-white p-3 shadow-md shadow-black/5">
                    <img src={qrUrl} alt="Mã QR chuyển khoản ủng hộ" className="h-48 w-48 sm:h-52 sm:w-52 object-contain" />
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl glass-panel border border-dashed border-rose-300/60 dark:border-rose-500/30 p-6 text-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <QrCode className="mx-auto mb-2 text-rose-500" />
                  {creating ? 'Đang chuẩn bị mã thanh toán…' : 'Chưa cấu hình tài khoản nhận ủng hộ.'}
                </div>
              )}

              {/* Transfer Note */}
              <div className="mt-4 rounded-2xl glass-panel p-3.5 border border-white/60 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Nội dung chuyển khoản
                  </span>
                  {note ? (
                    <span className="text-sm sm:text-base font-black font-mono tracking-wider text-rose-600 dark:text-rose-400 truncate block mt-0.5">
                      {note}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 block mt-0.5">Đang tạo mã…</span>
                  )}
                </div>
                {note && (
                  <button
                    type="button"
                    onClick={copyNote}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      copied
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                )}
              </div>

              {/* Status Message */}
              {tracking && paymentStatus === 'pending' && (
                <div className="mt-3.5 rounded-2xl glass-panel border border-amber-300/40 dark:border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-center flex items-center justify-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-300">
                    Đang chờ xác nhận giao dịch…
                  </span>
                </div>
              )}

              {submitError && (
                <p className="mt-3 text-center text-xs font-bold text-rose-500">{submitError}</p>
              )}

              <p className="mt-3 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Sau khi chuyển khoản, đừng thoát vội đợi xác nhận nhanh lứm ạ, em cảm ơn.
              </p>
            </div>

            {/* Supporter List Aside */}
            <aside className="rounded-3xl glass-panel p-5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-300/40 dark:border-white/10">
                <Heart size={16} className="text-rose-500 fill-rose-500" />
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  Những người đã donate cho em
                </span>
              </div>
              {supporters.length > 0 ? (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {supporters.map((supporter) => (
                    <div
                      key={supporter.id}
                      className="flex items-center justify-between gap-3 rounded-2xl glass-panel bg-white/40 dark:bg-white/5 px-3.5 py-2.5 text-xs sm:text-sm border border-white/50 dark:border-white/5 transition-transform hover:scale-[1.01]"
                    >
                      <span className="truncate font-bold text-slate-800 dark:text-slate-200">
                        {supporter.donor_name}
                      </span>
                      <span className="shrink-0 font-black text-rose-600 dark:text-rose-400">
                        {Number(supporter.amount).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                  Hãy là người đầu tiên đồng hành cùng dự án.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
