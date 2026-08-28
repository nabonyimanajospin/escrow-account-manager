import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl, getPropertyCoverImage, handlePropertyImageError } from '../utils/imageUtils';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';
import BrandLogo from '../components/BrandLogo';
import PropertyMapModal from '../components/PropertyMapModal';

// Decorative Postal-Card Corner Floral Filigree SVG Component (Light Mode)
const PostalCardCornerDecoration = ({ position }) => {
  const positionClasses = {
    'top-left': 'top-0 left-0 text-amber-600/30',
    'top-right': 'top-0 right-0 rotate-90 text-amber-600/30',
    'bottom-left': 'bottom-0 left-0 -rotate-90 text-amber-600/30',
    'bottom-right': 'bottom-0 right-0 rotate-180 text-amber-600/30',
  };

  return (
    <div className={`absolute w-32 h-32 pointer-events-none ${positionClasses[position]}`}>
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M10 10 C30 10 50 30 50 50 C30 50 10 30 10 10 Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 10 L110 10 M10 10 L10 110" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M25 25 C45 15 75 25 85 45 C65 55 45 45 25 25 Z" fill="currentColor" fillOpacity="0.1" />
        <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M15 40 C35 35 55 45 60 65" stroke="currentColor" strokeWidth="1.2" />
        <path d="M40 15 C35 35 45 55 65 60" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="5" cy="5" r="3" fill="currentColor" />
      </svg>
    </div>
  );
};

const DYNAMIC_NAV_CAROUSEL = [
  {
    step: "01",
    navTitle: "Browse & Reserve",
    headline: "Verified Real Estate Listings Catalog",
    desc: "Browse verified properties with full parcel UPI details and zero seller-contact leaks. Inspect photos and GIS maps on first sight.",
    badge: "Phase 1 • Selection & Map View",
    color: "from-amber-500 via-emerald-600 to-teal-700 text-white",
    icon: "🏠",
  },
  {
    step: "02",
    navTitle: "Lock Escrow Funds",
    headline: "Capital Locked in Neutral Virtual Vault",
    desc: "Buyer funds are locked safely in a neutral escrow account. Neither party can withdraw unilaterally until conditions are fulfilled.",
    badge: "Phase 2 • 100% Capital Custody",
    color: "from-emerald-600 via-teal-700 to-indigo-800 text-white",
    icon: "🔒",
  },
  {
    step: "03",
    navTitle: "Irembo Registry Check",
    headline: "Automated Land Deed Title Verification",
    desc: "No manual paperwork needed! Sellers request land deed verification directly via connected Irembo Sandbox API.",
    badge: "Phase 3 • Irembo Land Sandbox",
    color: "from-blue-600 via-indigo-700 to-purple-800 text-white",
    icon: "📄",
  },
  {
    step: "04",
    navTitle: "Instant Mutation & Payout",
    headline: "Title Transfer & Instant Settlement",
    desc: "Payment is released to Seller only after Irembo mutation is verified. Buyer receives full refund if title mutation fails.",
    badge: "Phase 4 • Final Transfer & Payout",
    color: "from-purple-600 via-indigo-700 to-slate-900 text-white",
    icon: "⚡",
  },
];

const LandingPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navIndex, setNavIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedMapProperty, setSelectedMapProperty] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  useEffect(() => {
    axios.get('/properties?status=AVAILABLE&limit=100')
      .then((res) => {
        setProperties(res.data.data || []);
      })
      .catch((err) => console.error('Failed to fetch properties:', err))
      .finally(() => setLoading(false));
  }, []);

  // Dynamic rotating animated navigation cards (coming, going, replacing one another every 3s)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setNavIndex((prev) => (prev + 1) % DYNAMIC_NAV_CAROUSEL.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentNav = DYNAMIC_NAV_CAROUSEL[navIndex];

  const handleOpenMap = (property, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedMapProperty(property);
    setIsMapModalOpen(true);
  };

  return (
    <div className="space-y-12 pb-20 font-sans">
      
      {/* ── ALIEXPRESS BRIGHT NEAR-WHITE POSTAL HERO SECTION ── */}
      <section className="relative pt-6 pb-10 overflow-hidden bg-gradient-to-br from-amber-50/70 via-white to-slate-50 text-slate-900 border-b border-amber-300/50 shadow-sm">
        
        {/* Postal Card Vintage Corner Floral Line-Art */}
        <PostalCardCornerDecoration position="top-left" />
        <PostalCardCornerDecoration position="top-right" />
        <PostalCardCornerDecoration position="bottom-left" />
        <PostalCardCornerDecoration position="bottom-right" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">

          {/* Top Header Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-200/80 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-md">
            <div className="flex items-center gap-3.5">
              <BrandLogo variant="icon" imgClassName="h-10 w-auto drop-shadow-sm" />
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-0.5">
                  <span>✉ Official Postal-Certified Escrow Platform</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-sans">
                  Escrow Account Manager
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/properties" className="btn-primary py-2 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/20">
                Browse Catalog ({properties.length}) &rarr;
              </Link>
              <Link to="/register" className="btn-secondary py-2 px-4 text-xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50">
                Get Started
              </Link>
            </div>
          </div>

          {/* DYNAMIC REPLACING NAVIGATION CAROUSEL (Coming & Going Animated Nav Cards) */}
          <div
            className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Left: Dynamic Navigation Tabs Indicator */}
            <div className="md:col-span-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Dynamic Escrow Workflow:
                </span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {isPaused ? '⏸ Paused' : '▶ Auto-Replacing'}
                </span>
              </div>

              <div className="space-y-1.5">
                {DYNAMIC_NAV_CAROUSEL.map((item, idx) => {
                  const isActive = idx === navIndex;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setNavIndex(idx)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all duration-500 flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-white border-emerald-500 text-slate-900 shadow-md shadow-emerald-500/10 scale-[1.02] ring-2 ring-emerald-500/20'
                          : 'bg-white/60 border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-mono font-black ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {item.step}
                        </span>
                        <span className="text-xs font-bold">{item.navTitle}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{item.icon}</span>
                        {isActive && <span className="text-emerald-600 text-xs font-black animate-pulse">✦</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Dynamic Replacing Card with Transition Keyframes */}
            <div className="md:col-span-8">
              <div
                key={currentNav.step}
                className={`p-6 rounded-2xl bg-gradient-to-r ${currentNav.color} shadow-xl transition-all duration-700 space-y-3 relative overflow-hidden border border-black/5 animate-fade-in`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                    {currentNav.badge}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold opacity-90">
                    <span>Phase {currentNav.step} / 04</span>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-3xl">{currentNav.icon}</span>
                  <h2 className="text-2xl font-black tracking-tight font-sans transition-all">
                    {currentNav.headline}
                  </h2>
                </div>

                <p className="text-xs text-white/95 leading-relaxed max-w-xl font-medium">
                  {currentNav.desc}
                </p>

                {/* Animated Progress Bar */}
                <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((navIndex + 1) / DYNAMIC_NAV_CAROUSEL.length) * 100}%` }}
                  />
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-bold text-white/90 border-t border-white/20">
                  <span className="flex items-center gap-1">✓ 100% Neutral Escrow Guarantee</span>
                  <span className="animate-pulse flex items-center gap-1">
                    Auto-switching dynamic showcase &rarr;
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FIRST-SIGHT PRODUCT CATALOG (AliExpress Bright Style — Immediately visible above fold) */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans">
                  Instant First-Sight Property Catalog (No Scroll Needed)
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-bold">AliExpress-Style Bright Grid</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-56 bg-slate-200/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="p-6 bg-white rounded-xl text-center border border-slate-200 text-xs text-slate-500">
                No properties available currently.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {properties.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all flex flex-col justify-between group shadow-lg hover:shadow-emerald-500/10"
                  >
                    {/* Image & Price Tag */}
                    <div className="h-36 bg-slate-100 relative overflow-hidden">
                      <img
                        src={resolveImageUrl(getPropertyCoverImage(p.images))}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handlePropertyImageError}
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 bg-slate-900/90 text-emerald-400 font-black px-2.5 py-1 rounded-lg text-xs border border-slate-800 font-mono shadow-md">
                        ${Number(p.price).toLocaleString()} USD
                      </div>
                    </div>

                    {/* Meta info & Map Button */}
                    <div className="p-3.5 space-y-2.5 bg-white">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 truncate font-sans group-hover:text-emerald-600 transition-colors">
                          {p.title}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                            📍 {p.location}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => handleOpenMap(p, e)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            📍 View on Map
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500">
                          {p.bedrooms} Beds • {p.area} sqm
                        </span>
                        <Link
                          to={`/properties/${p.id}`}
                          className="btn-primary py-1 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow"
                        >
                          Contract in Escrow &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── ABOUT US & TRUSTLESS SYSTEM EXPLANATION ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black uppercase tracking-wider">
            <span> About Escrow Account Manager</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans">
            How EscrowTrust Protects Your Property Transactions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold max-w-2xl mx-auto">
            Eliminating real estate buyer and seller fraud through neutral virtual escrow custody and official Irembo land registry integration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 bg-red-50/40 border-red-200/60 space-y-4">
            <div className="flex items-center gap-2 text-red-700 font-extrabold text-base">
              <span>✕</span> Traditional Property Transaction Risks
            </div>
            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span>
                <span><strong>Advance Payment Defaults:</strong> Buyers pay money upfront directly to sellers, risking default or sellers disappearing with capital.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span>
                <span><strong>Deed Transfer Delays:</strong> Sellers transfer official land title deeds without verified assurance of buyer payment.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span>
                <span><strong>Off-Platform Contact Leaks:</strong> Direct off-platform payments lead to scams, unverified contracts, and fee bypass.</span>
              </li>
            </ul>
          </div>

          <div className="card p-6 bg-emerald-50/40 border-emerald-200/60 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
              <span>✓</span> Escrow Platform Trustless Protection
            </div>
            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Neutral Capital Lock:</strong> Buyer funds are locked securely in a virtual escrow account until deed mutation is verified ($0 risk).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Automated Land Registry Check:</strong> Title deeds are verified directly via the connected Irembo Sandbox API.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Automated Payout & Refunds:</strong> Payment is released to Seller ONLY after verified land mutation; buyer receives full refund if mutation fails.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FULL PROPERTIES CATALOG GRID ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 font-sans">All Available Properties</h2>
            <p className="text-xs text-slate-500 font-semibold">Explore verified listings ready for instant escrow contracts.</p>
          </div>
          <Link to="/properties" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
            View All ({properties.length}) &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((p) => (
              <div
                key={p.id}
                className="card overflow-hidden group flex flex-col justify-between h-[380px] border border-slate-200 hover:border-emerald-500 transition-all shadow-md hover:shadow-xl"
              >
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={resolveImageUrl(getPropertyCoverImage(p.images))}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={handlePropertyImageError}
                  />
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-slate-900 font-extrabold px-3 py-1 text-xs rounded-lg shadow-sm">
                    ${Number(p.price).toLocaleString()} USD
                  </div>
                </div>

                <div className="p-5 flex-grow flex flex-col justify-between bg-white space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 truncate font-sans group-hover:text-emerald-600 transition-colors">
                      {p.title}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">
                        📍 {p.location}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => handleOpenMap(p, e)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                      >
                        📍 View Map
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 font-medium">
                      {p.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400">
                      {p.bedrooms} Beds • {p.area} sqm
                    </span>
                    <Link
                      to={`/properties/${p.id}`}
                      className="text-emerald-600 font-extrabold text-xs hover:text-emerald-700"
                    >
                      Buy in Escrow &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Property Location Map Modal */}
      <PropertyMapModal
        property={selectedMapProperty}
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
      />

    </div>
  );
};

export default LandingPage;
