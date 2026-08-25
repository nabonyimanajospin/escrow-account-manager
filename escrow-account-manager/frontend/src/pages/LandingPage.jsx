import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl, getPropertyCoverImage, handlePropertyImageError } from '../utils/imageUtils';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';
import BrandLogo from '../components/BrandLogo';

const DYNAMIC_HEADLINES = [
  { main: "Trustless Property Escrow,", highlight: "Without the Risk." },
  { main: "Locked Escrow Capital,", highlight: "Verified Deeds." },
  { main: "Connected to Irembo Sandbox,", highlight: "Instant Mutation." },
  { main: "Guaranteed Real Estate Deals,", highlight: "100% Secured." },
];

const LandingPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    axios.get('/properties?status=AVAILABLE&limit=100')
      .then((res) => {
        setProperties(res.data.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Dynamic rotating animated hero navigation / headline (cycles every 2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % DYNAMIC_HEADLINES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentHeadline = DYNAMIC_HEADLINES[headlineIndex];

  return (
    <div className="space-y-12 pb-20">
      
      {/* ── ALIEXPRESS-STYLE HERO SECTION (Instant First-Sight Products Above The Fold) ── */}
      <section className="relative pt-4 pb-8 overflow-hidden bg-slate-900 text-white hero-mesh border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">

          {/* Compact Top Header Strip (Low-height banner) */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 shadow-lg">
            <div className="flex items-center gap-4 text-left">
              <BrandLogo variant="icon" imgClassName="h-10 w-auto drop-shadow-md shrink-0" />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Connected to Official Irembo Sandbox
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                  {currentHeadline.main}{' '}
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-primary-400 bg-clip-text text-transparent">
                    {currentHeadline.highlight}
                  </span>
                </h1>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/properties" className="btn-primary py-2 px-5 text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-500/20 whitespace-nowrap">
                Browse All Properties ({properties.length}) &rarr;
              </Link>
              <Link to="/register" className="btn-secondary py-2 px-4 text-xs bg-slate-700 hover:bg-slate-600 text-white border-slate-600 whitespace-nowrap">
                Sign Up
              </Link>
            </div>
          </div>

          {/* FIRST-SIGHT PRODUCT CATALOG GRID (AliExpress Style — Immediately visible above fold) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-sans">
                  Instant First-Sight Listings (Escrow Ready • Zero Scroll)
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">AliExpress-Style Direct Showcase</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-64 bg-slate-800 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="p-8 bg-slate-800/60 rounded-2xl text-center border border-slate-700">
                <p className="text-sm font-bold text-slate-300">No active listings available right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {properties.slice(0, 3).map((p) => (
                  <div key={p.id} className="bg-slate-800/90 rounded-2xl overflow-hidden border border-slate-700/90 hover:border-emerald-500/50 transition-all flex flex-col justify-between group shadow-xl hover:shadow-emerald-500/10">
                    
                    {/* Image Header with Price Badge */}
                    <div className="h-44 bg-slate-950 relative overflow-hidden">
                      <img
                        src={resolveImageUrl(getPropertyCoverImage(p.images))}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handlePropertyImageError}
                      />
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md text-emerald-400 font-black px-3 py-1 rounded-lg text-xs border border-slate-700 shadow-md font-mono">
                        ${Number(p.price).toLocaleString()} USD
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-slate-800">
                      <div>
                        <h3 className="text-base font-extrabold text-white truncate font-sans group-hover:text-emerald-400 transition-colors">
                          {p.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mt-0.5 flex items-center gap-1">
                          📍 {p.location}
                        </p>
                        <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed font-medium">
                          {p.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">
                          {p.bedrooms} Beds • {p.area} sqm
                        </span>
                        <Link
                          to={`/properties/${p.id}`}
                          className="btn-primary py-1.5 px-3.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-lg shadow"
                        >
                          Buy in Escrow &rarr;
                        </Link>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ── ABOUT US & TRUSTLESS ESCROW MECHANICS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 font-sans">Why Escrow Account Manager?</h2>
          <p className="text-xs text-slate-500 font-semibold max-w-2xl mx-auto">
            Traditional real estate deals suffer from fraud and zero transparency. Our platform locks capital in neutral escrow and verifies deeds directly via Irembo Sandbox.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Traditional Risky Deal */}
          <div className="card p-5 bg-red-50/40 border-red-200/60 space-y-3">
            <div className="flex items-center gap-2 text-red-600 font-bold text-base">
              <span>✕</span> Traditional Property Deals (High Risk)
            </div>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span> Buyer pays upfront before land deed mutation $\rightarrow$ seller vanishes with money.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span> Seller transfers land title deed first $\rightarrow$ buyer defaults on payment.
              </li>
            </ul>
          </div>

          {/* Escrow Solution */}
          <div className="card p-5 bg-emerald-50/40 border-emerald-200/60 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
              <span>✓</span> Escrow Platform Solution (Zero Risk)
            </div>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span> Capital locked in neutral escrow account — neither party can touch it alone.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span> Connected directly to official Irembo Land Sandbox API for deed verification & title transfer.
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* ── ALL PROPERTIES CATALOG ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 font-sans">Full Escrow Property Catalog</h2>
            <p className="text-xs text-slate-500 font-semibold">Browse all verified property listings ready for instant purchase.</p>
          </div>
          <Link to="/properties" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
            View All ({properties.length}) &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((p) => (
              <Link key={p.id} to={`/properties/${p.id}`} className="card overflow-hidden group flex flex-col justify-between h-[360px] cursor-pointer block border border-slate-200">
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
                <div className="p-5 flex-grow flex flex-col justify-between bg-white">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 truncate font-sans group-hover:text-emerald-600 transition-colors">{p.title}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{p.location}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 font-medium">{p.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400">{p.bedrooms} Beds • {p.area} sqm</span>
                    <span className="text-emerald-600 font-extrabold text-xs">Buy in Escrow &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default LandingPage;
