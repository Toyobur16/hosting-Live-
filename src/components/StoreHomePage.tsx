import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Folder,
  Bot,
  Sparkles,
  Crown,
  Heart,
  Download,
  Star,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Zap,
  ArrowRight
} from 'lucide-react';
import { StoreBanner, StoreCategory, StoreItem, AuthUser } from '../types';

interface StoreHomePageProps {
  user: AuthUser | null;
  onNavigateToWallet: () => void;
  onNavigateToMarket: (categoryId?: string) => void;
  onNavigateToPlans: () => void;
  onOpenAuthModal: () => void;
  onOpenAdminModal?: () => void;
  onItemPurchased?: (item: StoreItem) => void;
  wishlistIds: string[];
  onToggleWishlist: (itemId: string) => void;
}

export function StoreHomePage({
  user,
  onNavigateToWallet,
  onNavigateToMarket,
  onNavigateToPlans,
  onOpenAuthModal,
  onOpenAdminModal,
  onItemPurchased,
  wishlistIds,
  onToggleWishlist
}: StoreHomePageProps) {
  const isAdmin = Boolean(user && (user.role === 'admin' || user.email === 'toyoburrahman9090@gmail.com'));
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [featuredItems, setFeaturedItems] = useState<StoreItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [buying, setBuying] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [bannersRes, catsRes, itemsRes] = await Promise.all([
        fetch('/api/store/banners'),
        fetch('/api/store/categories'),
        fetch('/api/store/items?featured=true')
      ]);

      if (bannersRes.ok) {
        const bData = await bannersRes.json();
        setBanners(bData.banners || []);
      }
      if (catsRes.ok) {
        const cData = await catsRes.json();
        setCategories(cData.categories || []);
      }
      if (itemsRes.ok) {
        const iData = await itemsRes.json();
        setFeaturedItems(iData.items || []);
      }
    } catch {
      // Fallbacks
    } finally {
      setLoading(false);
    }
  };

  // Carousel Next/Prev
  const handlePrevBanner = () => {
    if (banners.length === 0) return;
    setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const handleNextBanner = () => {
    if (banners.length === 0) return;
    setCurrentBannerIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  // Auto-slide carousel every 6 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(handleNextBanner, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'folder':
        return <Folder className="w-5 h-5 text-amber-400" />;
      case 'bot':
        return <Bot className="w-5 h-5 text-sky-400" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'crown':
        return <Crown className="w-5 h-5 text-amber-300" />;
      default:
        return <Folder className="w-5 h-5 text-[#00d293]" />;
    }
  };

  const handleDownloadItem = (item: StoreItem) => {
    const token = localStorage.getItem('bot_auth_token') || '';
    if (item.fileUrl && (item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://'))) {
      window.open(item.fileUrl, '_blank');
    } else {
      window.open(`/api/store/items/${item.id}/download?token=${encodeURIComponent(token)}`, '_blank');
    }
  };

  const handleBuyItem = async (item: StoreItem) => {
    if (!user) {
      onOpenAuthModal();
      return;
    }

    const token = localStorage.getItem('bot_auth_token');
    try {
      setBuying(true);
      setPurchaseError(null);
      setDownloadLink(null);
      const res = await fetch(`/api/store/items/${item.id}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currency: 'BDT' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needsDeposit) {
          setPurchaseError(`পর্যাপ্ত ব্যালেন্স নেই! প্রয়োজন: ৳${item.priceBdt} BDT। অনুগ্রহ করে ওয়ালেটে টাকা জমা দিন।`);
        } else {
          setPurchaseError(data.error || 'ক্রয় সম্পন্ন করা সম্ভব হয়নি।');
        }
        return;
      }

      setPurchaseSuccess(data.message || `অভিনন্দন! ${item.title} সফলভাবে ক্রয় সম্পন্ন হয়েছে।`);
      setDownloadLink(data.downloadUrl || item.fileUrl || `/api/store/items/${item.id}/download`);
      if (onItemPurchased) onItemPurchased(item);
      fetchInitialData();
    } catch (err: any) {
      setPurchaseError(err.message || 'Error processing purchase');
    } finally {
      setBuying(false);
    }
  };

  const activeBanner = banners[currentBannerIndex] || {
    title: 'ওয়েব ফাইল কিনুন সাথে সাথে দামে',
    titleBn: 'ওয়েব ফাইল কিনুন সাথে সাথে দামে',
    subtitle: 'HTML5, CSS3, টেলিগ্রাম মিনি অ্যাপ এবং ফুল কোড ফাইল',
    subtitleBn: 'HTML5, CSS3, টেলিগ্রাম মিনি অ্যাপ এবং ফুল কোড ফাইল',
    badge: 'অল্প দামে',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    link: 'market'
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onNavigateToMarket();
          }}
          placeholder="Search files, bots & plans..."
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-sm text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#00d293] focus:ring-1 focus:ring-[#00d293] transition-all shadow-md"
        />
      </div>

      {/* Hero Banner Carousel matching Screenshot 1 */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0f1b2b] to-[#070e1a] border border-[#1e2e42] shadow-2xl min-h-[220px] sm:min-h-[260px] flex items-center">
        {/* Background Artwork */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity overflow-hidden">
          <img
            src={activeBanner.imageUrl}
            alt="Banner background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070e1a] via-[#070e1a]/85 to-transparent"></div>
        </div>

        {/* Banner Content matching Screenshot 1 */}
        <div className="relative z-10 p-6 sm:p-8 max-w-xl space-y-3">
          {activeBanner.badge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeBanner.badge}</span>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
            {activeBanner.titleBn || activeBanner.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
            {activeBanner.subtitleBn || activeBanner.subtitle}
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => {
                if (activeBanner.link === 'plans') onNavigateToPlans();
                else onNavigateToMarket();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-lg shadow-[#00d293]/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
            >
              <span>ব্রাউজ করুন</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToWallet}
              className="px-4 py-2.5 rounded-xl bg-[#111827]/80 hover:bg-[#1f293d] border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all"
            >
              ডিপোজিট করুন
            </button>
          </div>
        </div>

        {/* Carousel Navigation Arrows matching Screenshot 1 (< and > buttons) */}
        <button
          onClick={handlePrevBanner}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#0a0f1d]/80 hover:bg-[#00d293] hover:text-slate-950 border border-slate-700/80 text-white flex items-center justify-center cursor-pointer transition-all shadow-md"
          title="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <button
          onClick={handleNextBanner}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#0a0f1d]/80 hover:bg-[#00d293] hover:text-slate-950 border border-slate-700/80 text-white flex items-center justify-center cursor-pointer transition-all shadow-md"
          title="Next slide"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Slide Indicator Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentBannerIndex(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === currentBannerIndex ? 'w-6 bg-[#00d293]' : 'w-1.5 bg-slate-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Categories Section matching Screenshot 1 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-[#00d293]" />
            <span>ক্যাটেগরি (Categories)</span>
          </h3>
          <button
            onClick={() => onNavigateToMarket()}
            className="text-xs font-bold text-[#00d293] hover:underline cursor-pointer"
          >
            সব দেখুন →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                if (cat.id === 'hosting_plans') onNavigateToPlans();
                else onNavigateToMarket(cat.id);
              }}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0f172a] hover:bg-[#162238] border border-[#1e293b] hover:border-[#00d293]/40 cursor-pointer transition-all hover:scale-102 group shadow-sm text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1a263d] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {getCategoryIcon(cat.icon)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white group-hover:text-[#00d293] transition-colors truncate">
                  {cat.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {cat.count ? `${cat.count} files` : 'Explore'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Files Section matching Screenshot 1 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#00d293]" />
            <h3 className="text-base sm:text-lg font-black text-white">
              Featured Files
            </h3>
          </div>
          <button
            onClick={() => onNavigateToMarket()}
            className="text-xs font-bold text-[#00d293] hover:underline cursor-pointer"
          >
            View All →
          </button>
        </div>

        {/* Product Cards Grid matching Screenshot 1 */}
        {featuredItems.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#0f172a] border border-[#1e293b] text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#162238] text-[#00d293] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">বর্তমানে কোনো ডেমো ফাইল বা পণ্য নেই</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              ডেমো ফাইলগুলো সম্পূর্ণভাবে মুছে দেওয়া হয়েছে। অ্যাডমিন প্যানেল থেকে আপনার নিজস্ব থাম্বনেইল ছবি ও মূল ফাইল সরাসরি আপলোড করুন।
            </p>
            {isAdmin && (
              <button
                onClick={onOpenAdminModal}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer shadow-md inline-flex items-center gap-2 transition-all hover:scale-102"
              >
                <span>+ অ্যাডমিন প্যানেল থেকে ফাইল আপলোড করুন</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredItems.map((item) => {
              const isWishlisted = wishlistIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-[#00d293]/50 overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between"
                >
                  {/* Image Container with Badge and Wishlist Heart */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Yellow Discount Badge matching Screenshot 1 ("সাশ্রয়ী দামে") */}
                    {item.badge && (
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black shadow-md">
                        {item.badge}
                      </div>
                    )}

                    {/* Wishlist Heart Button matching Screenshot 1 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(item.id);
                      }}
                      className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all backdrop-blur-xs ${
                        isWishlisted
                          ? 'bg-rose-500 text-white shadow-md scale-110'
                          : 'bg-black/60 text-white hover:bg-rose-500 hover:text-white'
                      }`}
                      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Details matching Screenshot 1 */}
                  <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="text-[#00d293] font-bold">{item.categoryName || 'VIP FILE'}</span>
                        {item.originalFileName && (
                          <span className="text-slate-400 font-mono">{item.fileSizeFormatted || 'FILE'}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#00d293] transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {item.description || 'Premium Telegram bot & mini app package.'}
                      </p>
                    </div>

                    {/* Rating & Downloads matching Screenshot 1 */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-[#1e293b]">
                      <div className="flex items-center gap-1">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-300 ml-1">
                          {item.rating || 5}.0
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.downloads || 0}</span>
                      </div>
                    </div>

                    {/* Price & Action matching Screenshot 1 */}
                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-[#00d293]">
                          ৳{item.priceBdt}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          (${item.priceUsd})
                        </span>
                      </div>

                      {user?.purchasedItemIds?.includes(item.id) ? (
                        <button
                          onClick={() => handleDownloadItem(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all hover:scale-102 flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ডাউনলোড</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all hover:scale-102"
                        >
                          কিনুন (Buy)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item Purchase Confirmation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0d1424] border border-[#1e2e42] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#00d293] uppercase tracking-wide">
                  পণ্য বিস্তারিত ও ক্রয়
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setPurchaseError(null);
                  setPurchaseSuccess(null);
                  setDownloadLink(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#1e293b]">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="w-full aspect-video object-cover"
              />
            </div>

            <p className="text-xs text-slate-300">
              {selectedItem.description}
            </p>

            {/* Price breakdown */}
            <div className="p-3.5 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>মূল্য (Price):</span>
                <span className="font-bold text-white">৳{selectedItem.priceBdt} BDT (${selectedItem.priceUsd} USD)</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>আপনার ওয়ালেট ব্যালেন্স:</span>
                <span className="font-bold text-[#00d293]">
                  ৳{user?.balanceBdt || 0} BDT (${user?.balanceUsd || 0} USD)
                </span>
              </div>
            </div>

            {purchaseError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{purchaseError}</span>
              </div>
            )}

            {purchaseSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{purchaseSuccess}</span>
              </div>
            )}

            {/* Direct Download button right after purchase */}
            {downloadLink && (
              <button
                onClick={() => {
                  const token = localStorage.getItem('bot_auth_token') || '';
                  if (downloadLink.startsWith('http://') || downloadLink.startsWith('https://')) {
                    window.open(downloadLink, '_blank');
                  } else {
                    window.open(`${downloadLink}?token=${encodeURIComponent(token)}`, '_blank');
                  }
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102"
              >
                <Download className="w-4 h-4" />
                <span>📥 এখনই ফাইলটি ডাউনলোড করুন (Download File)</span>
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setPurchaseError(null);
                  setPurchaseSuccess(null);
                  setDownloadLink(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#111827] hover:bg-[#1f293d] text-slate-300 text-xs font-bold border border-[#1e293b] cursor-pointer"
              >
                বন্ধ করুন
              </button>

              {!downloadLink && (
                <>
                  {(user?.balanceBdt || 0) < selectedItem.priceBdt ? (
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        onNavigateToWallet();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>টাকা ডিপোজিট করুন</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyItem(selectedItem)}
                      disabled={buying}
                      className="flex-1 py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-lg shadow-[#00d293]/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {buying ? 'প্রক্রিয়া চলছে...' : 'ওয়ালেট দিয়ে কিনুন'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
