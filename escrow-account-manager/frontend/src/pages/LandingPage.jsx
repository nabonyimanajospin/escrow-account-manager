import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl, getPropertyCoverImage, handlePropertyImageError } from '../utils/imageUtils';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';
import BrandLogo from '../components/BrandLogo';
import PropertyMapModal from '../components/PropertyMapModal';

const DYNAMIC_NAV_CAROUSEL = [
  {
    step: "01",
    navTitle: "Browse & Reserve",
    headline: "Verified Real Estate Listings Catalog",
    desc: "Browse verified properties with full parcel UPI details and zero seller-contact leaks. Inspect photos and GIS maps instantly.",
    badge: "Phase 1 • Property Selection",
    color: "from-slate-900 via-slate-800 to-indigo-950 text-white",
  },
  {
    step: "02",
    navTitle: "Lock Escrow Funds",
    headline: "Capital Locked in Neutral Virtual Vault",
    desc: "Buyer funds are locked safely in a neutral escrow account. Neither party can withdraw unilaterally until conditions are fulfilled.",
    badge: "Phase 2 • Capital Custody",
    color: "from-emerald-700 via-teal-800 to-slate-900 text-white",
  },
  {
    step: "03",
    navTitle: "Irembo Registry Check",
    headline: "Automated Land Deed Title Verification",
    desc: "No manual paperwork needed! Sellers request land deed verification directly via connected Irembo Sandbox API.",
    badge: "Phase 3 • Title Deed Verification",
    color: "from-indigo-700 via-blue-800 to-slate-900 text-white",
  },
  {
    step: "04",
    navTitle: "Instant Mutation & Payout",
    headline: "Title Transfer & Instant Settlement",
    desc: "Payment is released to Seller only after Irembo mutation is verified. Buyer receives full refund if title mutation fails.",
    badge: "Phase 4 • Final Transfer & Payout",
    color: "from-slate-900 via-purple-950 to-slate-900 text-white",
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

  // Dynamic rotating animated navigation cards (repeats every 3.5s, silent pause on hover)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setNavIndex((prev) => (prev + 1) % DYNAMIC_NAV_CAROUSEL.length);
    }, 3500);
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
      
      {/* ── PROFESSIONAL HERO SECTION ── */}
      <section className="relative pt-6 pb-10 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-50 text-slate-900 border-b border-slate-200 shadow-sm">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">

          {/* Top Header Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3.5">
              <BrandLogo variant="icon" imgClassName="h-10 w-auto drop-shadow-sm" />
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  <span>Verified Escrow Platform</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                  Escrow Account Manager
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/properties" className="btn-primary py-2 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
                Browse Catalog ({properties.length}) &rarr;
              </Link>
              <Link to="/register" className="btn-secondary py-2 px-4 text-xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50">
                Get Started
              </Link>
            </div>
          </div>

          {/* DYNAMIC REPLACING NAVIGATION CAROUSEL (Silent Pause on Hover) */}
          <div
            className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Left: Dynamic Navigation Tabs Indicator */}
            <div className="md:col-span-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Escrow Workflow Steps:
              </span>

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
                          ? 'bg-white border-emerald-500 text-slate-900 shadow-md scale-[1.01] ring-1 ring-emerald-500/20'
                          : 'bg-white/70 border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-mono font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {item.step}
                        </span>
                        <span className="text-xs font-bold">{item.navTitle}</span>
                      </div>
                      {isActive && <span className="text-emerald-600 text-xs font-bold">✦</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Dynamic Replacing Showcase Card */}
            <div className="md:col-span-8">
              <div
                key={currentNav.step}
                className={`p-6 rounded-2xl bg-gradient-to-r ${currentNav.color} shadow-xl transition-all duration-700 space-y-3 relative overflow-hidden border border-black/10 animate-fade-in`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full backdrop-blur-md">
                    {currentNav.badge}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold opacity-90">
                    <span>Step {currentNav.step} of 04</span>
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight font-sans transition-all">
                  {currentNav.headline}
                </h2>

                <p className="text-xs text-white/90 leading-relaxed max-w-xl font-medium">
                  {currentNav.desc}
                </p>

                {/* Animated Progress Bar */}
                <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((navIndex + 1) / DYNAMIC_NAV_CAROUSEL.length) * 100}%` }}
                  />
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-bold text-white/90 border-t border-white/15">
                  <span>Neutral Escrow Custody Protection</span>
                  <span className="opacity-80">Interactive Process Overview &rarr;</span>
                </div>
              </div>
            </div>
          </div>

          {/* FIRST-SIGHT PRODUCT CATALOG (Clean Corporate Grid) */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">
                  Featured Property Listings
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Verified Real Estate Catalog</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-56 bg-slate-200/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="p-6 bg-white rounded-xl text-center border border-slate-200 text-xs text-slate-500 font-medium">
                No properties available currently.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {properties.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
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
                      <div className="absolute bottom-2.5 left-2.5 bg-slate-900/90 text-emerald-400 font-bold px-2.5 py-1 rounded-lg text-xs border border-slate-800 font-mono shadow-md">
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
                            {p.location}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => handleOpenMap(p, e)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            View Map
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500">
                          {p.bedrooms} Beds • {p.area} sqm
                        </span>
                        <Link
                          to={`/properties/${p.id}`}
                          className="btn-primary py-1 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                        >
                          View Details &rarr;
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider">
            <span>About Escrow Account Manager</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans">
            How EscrowTrust Protects Your Property Transactions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold max-w-2xl mx-auto">
            Eliminating real estate buyer and seller fraud through neutral virtual escrow custody and official Irembo land registry integration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 bg-red-50/30 border-red-200/60 space-y-4">
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

          <div className="card p-6 bg-emerald-50/30 border-emerald-200/60 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
              <span>✓</span> Escrow Platform Protection
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
                className="card overflow-hidden group flex flex-col justify-between h-[380px] border border-slate-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
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
                        {p.location}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => handleOpenMap(p, e)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                      >
                        View Map
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
