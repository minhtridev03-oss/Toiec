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
      const { data } = await supabase.from('donations').select('id, donor_name, amount, message, paid_at').eq('status', 'paid').eq('is_public', true).order('paid_at', { ascending: false }).limit(5);
      if (mounted && data) setSupporters(data);
    };
    loadSupporters();
    const channel = supabase.channel('public-donations').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations', filter: 'status=eq.paid' }, loadSupporters).subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCreating(true);
      const current = trackingRef.current;
      const resolvedName = accountName || donorName.trim();
      const body = { amount, donorName: resolvedName || null, isPublic: Boolean(resolvedName), ...(current.id && current.code ? { donationId: current.id, transferCode: current.code } : {}) };
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
    return () => { cancelled = true; window.clearTimeout(timer); };
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
    const channel = supabase.channel(`donation-${trackingId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'donations', filter: `id=eq.${trackingId}` }, (payload) => {
      if (payload.new?.status === 'paid') setPaymentStatus('paid');
    }).subscribe();
    return () => { cancelled = true; window.clearInterval(poll); supabase.removeChannel(channel); };
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="donation-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-pink-200 bg-white p-6 shadow-2xl dark:border-fuchsia-800 dark:bg-[#21132b] sm:p-7">
        <button type="button" onClick={onClose} aria-label="Đóng" className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-fuchsia-900/50"><X size={18} /></button>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-fuchsia-100 p-3 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-300"><Heart size={22} /></div>
          <div><h2 id="donation-title" className="text-lg font-bold text-slate-900 dark:text-white">Ủng hộ dự án</h2><p className="text-sm text-slate-500 dark:text-slate-300">1 lần ủng hộ là web tối ưu phát triển nhiều hơn.</p></div>
        </div>
        {paymentStatus === 'paid' ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/20 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 size={64} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Cảm ơn bạn rất nhiều!</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-300">Sự ủng hộ của bạn giúp mình có thêm động lực duy trì và phát triển TEnglish.</p>
            <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
              <button type="button" onClick={startAnotherDonation} className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300 px-4 py-3 font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50 dark:border-fuchsia-700 dark:text-fuchsia-200 dark:hover:bg-fuchsia-950/40">
                <Coffee size={18} aria-hidden="true" /> Gửi thêm cà phê
              </button>
              <button type="button" onClick={goToLearning} className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-3 font-semibold text-white transition hover:bg-fuchsia-700">
                <BookOpen size={18} aria-hidden="true" /> Vào học
              </button>
            </div>
          </div>
        ) : (
          <>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(230px,.7fr)] lg:items-start">
          <div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[5000, 10000, 100000].map((value) => <button key={value} type="button" onClick={() => setAmount(value)} className={`rounded-xl border px-2 py-2 text-sm font-medium ${amount === value ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-200' : 'border-slate-200 text-slate-600 dark:border-fuchsia-800 dark:text-slate-300'}`}>{value.toLocaleString('vi-VN')}đ</button>)}
        </div>
        <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-200">Số tiền tùy chọn<input type="number" min="1000" step="1000" value={amount} onChange={(event) => setAmount(Math.max(0, Number(event.target.value)))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-fuchsia-500 dark:border-fuchsia-800 dark:bg-[#160B1E]" /></label>
        {!accountName && <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-200">Tên hiển thị<input value={donorName} onChange={(event) => setDonorName(event.target.value)} placeholder="Nhập tên để hiện trong danh sách ủng hộ" maxLength={80} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-500 dark:border-fuchsia-800 dark:bg-[#160B1E]" /></label>}
        {accountName && <p className="mb-4 rounded-xl bg-fuchsia-50 px-3 py-2 text-sm text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-200">Tên hiển thị: <strong>{accountName}</strong></p>}
        {qrUrl ? <div className="flex justify-center rounded-2xl bg-white p-3"><img src={qrUrl} alt="Mã QR chuyển khoản ủng hộ" className="h-52 w-52" /></div> : <div className="rounded-2xl border border-dashed border-fuchsia-300 p-6 text-center text-sm text-slate-500 dark:border-fuchsia-800 dark:text-slate-300"><QrCode className="mx-auto mb-2 text-fuchsia-500" />{creating ? 'Đang chuẩn bị mã thanh toán…' : 'Chưa cấu hình tài khoản nhận ủng hộ.'}</div>}
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-fuchsia-950/30"><p className="text-slate-500 dark:text-slate-300">Nội dung chuyển khoản</p>{note ? <button type="button" onClick={copyNote} className="mt-1 inline-flex items-center gap-2 font-semibold text-fuchsia-700 dark:text-fuchsia-200"><Copy size={15} />{copied ? 'Đã sao chép' : note}</button> : <span className="mt-1 block text-slate-400">Đang tạo mã…</span>}</div>
        {tracking && paymentStatus === 'pending' && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-center text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">Đang chờ xác nhận giao dịch…</p>}
        {submitError && <p className="mt-3 text-center text-xs text-rose-500">{submitError}</p>}
        <p className="mt-4 text-center text-xs text-slate-400">Sau khi chuyển khoản, đừng thoát vội đợi xác nhận nhanh lứm ạ, em cảm ơn.</p>
          </div>
          <aside className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 dark:border-fuchsia-900 dark:bg-fuchsia-950/20">
            <p className="mb-3 text-base font-semibold text-slate-800 dark:text-white">Những người đã donate cho em</p>
            {supporters.length > 0 ? <div className="space-y-3">{supporters.map((supporter) => <div key={supporter.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm dark:bg-[#21132b]/70"><span className="truncate text-slate-600 dark:text-slate-300">{supporter.donor_name}</span><span className="shrink-0 font-semibold text-fuchsia-600 dark:text-fuchsia-300">{Number(supporter.amount).toLocaleString('vi-VN')}đ</span></div>)}</div> : <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Hãy là người đầu tiên đồng hành cùng dự án.</p>}
          </aside>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
