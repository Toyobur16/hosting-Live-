import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, Link as LinkIcon, Eye } from 'lucide-react';
import { StoreBanner } from '../../types';

export function AdminBannersManager() {
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<StoreBanner> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/banners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner?.title && !editingBanner?.titleBn) {
      setNotification({ type: 'error', text: 'ব্যানারের শিরোনাম দেওয়া আবশ্যক।' });
      return;
    }

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingBanner)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', text: data.error || 'ব্যানার সেভ করা যায়নি।' });
        return;
      }

      setNotification({ type: 'success', text: 'ব্যানার সফলভাবে সংরক্ষিত হয়েছে!' });
      setEditingBanner(null);
      fetchBanners();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('এই ব্যানারটি মুছে ফেলতে চান?')) return;
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({ type: 'success', text: 'ব্যানার ডিলিট করা হয়েছে।' });
        fetchBanners();
        setTimeout(() => setNotification(null), 2500);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>হোম ব্যানার ও স্লাইডার কন্ট্রোল (Hero Banners)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            হোমপেজের টপ স্লাইডারের ছবি, টাইটেল, অফার ব্যাজ ও লিঙ্ক নিয়ন্ত্রণ করুন
          </p>
        </div>

        <button
          onClick={() => {
            setIsNew(true);
            setEditingBanner({
              title: 'ওয়েব ফাইল কিনুন সাথে সাথে দামে',
              titleBn: 'ওয়েব ফাইল কিনুন সাথে সাথে দামে',
              subtitle: 'HTML5, CSS3, টেলিগ্রাম মিনি অ্যাপ এবং ফুল কোড ফাইল',
              subtitleBn: 'HTML5, CSS3, টেলিগ্রাম মিনি অ্যাপ এবং ফুল কোড ফাইল',
              badge: 'অল্প দামে',
              imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
              link: 'market',
              order: banners.length + 1,
              active: true
            });
          }}
          className="px-4 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ব্যানার যুক্ত করুন</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Edit/Add Form Modal */}
      {editingBanner && (
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
            <h4 className="text-xs font-black text-[#00d293] uppercase">
              {isNew ? 'নতুন ব্যানার তৈরি করুন' : 'ব্যানার এডিট করুন'}
            </h4>
            <button
              onClick={() => setEditingBanner(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              বাতিল
            </button>
          </div>

          <form onSubmit={handleSaveBanner} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  শিরোনাম (বাংলা) *
                </label>
                <input
                  type="text"
                  required
                  value={editingBanner.titleBn || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, titleBn: e.target.value })}
                  placeholder="e.g. ওয়েব ফাইল কিনুন সাথে সাথে দামে"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Title (English)
                </label>
                <input
                  type="text"
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  placeholder="e.g. Buy Web Files at Best Price"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  সাবটাইটেল / বিবরণ
                </label>
                <input
                  type="text"
                  value={editingBanner.subtitleBn || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitleBn: e.target.value })}
                  placeholder="e.g. HTML5, CSS3, টেলিগ্রাম মিনি অ্যাপ"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  হলুদ অফার ব্যাজ টেক্সট
                </label>
                <input
                  type="text"
                  value={editingBanner.badge || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                  placeholder="e.g. অল্প দামে / ৫০% ছাড়"
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ছবি বা আর্টওয়ার্ক URL (Image URL)
                </label>
                <input
                  type="text"
                  value={editingBanner.imageUrl || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ক্লিক লিংক গন্তব্য (Link target)
                </label>
                <select
                  value={editingBanner.link || 'market'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, link: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                >
                  <option value="market">Marketplace</option>
                  <option value="wallet">Wallet / Deposit</option>
                  <option value="plans">Hosting Plans</option>
                  <option value="support">Support Center</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBanner(null)}
                className="px-4 py-2 rounded-xl bg-[#111827] text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs shadow-md"
              >
                সংরক্ষণ করুন (Save)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banners List */}
      <div className="space-y-3">
        {banners.map((b) => (
          <div
            key={b.id}
            className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <img
                src={b.imageUrl}
                alt={b.title}
                className="w-20 h-14 rounded-xl object-cover border border-[#1e293b] shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{b.titleBn || b.title}</span>
                  {b.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30">
                      {b.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{b.subtitleBn || b.subtitle}</p>
                <span className="text-[10px] text-slate-500">Destination: {b.link}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => {
                  setIsNew(false);
                  setEditingBanner(b);
                }}
                className="p-2 rounded-xl bg-[#111827] hover:bg-[#1f293d] border border-[#1e293b] text-slate-300 hover:text-white cursor-pointer"
                title="Edit Banner"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteBanner(b.id)}
                className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-400 cursor-pointer"
                title="Delete Banner"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
