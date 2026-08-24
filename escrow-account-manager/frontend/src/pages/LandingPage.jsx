import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl, getPropertyCoverImage, handlePropertyImageError } from '../utils/imageUtils';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';
import BrandLogo from '../components/BrandLogo';

const DYNAMIC_HEADLINES = [
  { main: "Real Estate Transactions,", highlight: "Without the Risk." },
  { main: "Locked Escrow Capital,", highlight: "Verified Deeds." },
  { main: "Connected to Irembo Land Sandbox,", highlight: "Instant Mutation." },
  { main: "Trustless Property Ownership,", highlight: "100% Secured." },
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
    <div className="space-y-16 pb-20">
      
      {/* ── HERO SECTION (Above the fold with immediate properties strip) ── */}
      <section className="relative pt-8 sm:pt-12 pb-12 overflow-hidden bg-slate-900 text-white hero-mesh border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">

            {/* Brand mark & Dynamic Pill */}
            <div className="flex flex-col items-center gap-3">
              <BrandLogo variant="icon" imgClassName="h-14 sm:h-20 w-auto drop-shadow-md" />
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Official Government Irembo Registry Sandbox Connected
              </div>
            </div>

            {/* Dynamic Rotating Headline */}
            <div className="h-28 sm:h-32 flex items-center justify-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] font-sans transition-all duration-700 ease-in-out">
                {currentHeadline.main} <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-primary-400 bg-clip-text text-transparent">
                  {currentHeadline.highlight}
                </span>
              </h1>
            </div>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-slate-300 font-medium max-w-2xl leading-relaxed">
              AliExpress-style instant property escrow platform. Lock buyer funds securely, verify land titles directly via Irembo Sandbox, and release payment only when deed mutation is confirmed.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 w-full">
              <Link to="/properties" className="btn-primary py-3.5 px-8 text-base shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black w-full sm:w-auto">
                Explore Property Catalog &rarr;
              </Link>
              <Link to="/register" className="btn-secondary py-3.5 px-8 text-base bg-slate-800 text-white border-slate-700 hover:bg-slate-700 w-full sm:w-auto">
                Register Buyer / Seller Account
              </Link>
            </div>
            
            {/* Direct Above-The-Fold Property Preview Strip (AliExpress Style) */}
            <div className="w-full pt-8 text-left">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Instant First-Sight Listings (No Scroll Needed)
                </span>
                <Link to="/properties" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
                  View All ({properties.length}) &rarr;
                </Link>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-36 bg-slate-800 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {properties.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      to={`/properties/${p.id}`}
                      className="group bg-slate-800/90 rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-500/50 transition-all p-2.5 flex items-center gap-3 shadow-md hover:shadow-emerald-500/10"
                    >
                      <img
                        src={resolveImageUrl(getPropertyCoverImage(p.images))}
                        alt={p.title}
                        className="w-16 h-16 rounded-lg object-cover group-hover:scale-105 transition-transform"
                        onError={handlePropertyImageError}
                      />
                      <div className="overflow-hidden flex-1">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">{p.title}</h4>
                        <p className="text-xs text-slate-400 truncate">{p.location}</p>
                        <p className="text-xs font-black text-emerald-400 mt-1">${Number(p.price).toLocaleString()} USD</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ── ABOUT US & TRUSTLESS ESCROW MECHANICS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-900 font-sans">About Escrow Account Manager</h2>
          <p className="text-sm text-slate-500 font-semibold max-w-2xl mx-auto">
            Why traditional property deals fail, and how our platform guarantees safety for both Buyer and Seller.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Traditional Risky Deal */}
          <div className="card p-6 bg-red-50/40 border-red-200/60 space-y-4">
            <div className="flex items-center gap-3 text-red-600 font-bold text-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              Traditional Property Transactions (High Risk)
            </div>
            <ul className="space-y-2 text-sm text-slate-600 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span> Buyer pays upfront before land deed mutation $\rightarrow$ seller vanishes with funds.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span> Seller transfers land title deed first $\rightarrow$ buyer fails to send payment.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✕</span> Zero transparency into official government land registries during deal.
              </li>
            </ul>
          </div>

          {/* EscrowTrust System Solution */}
          <div className="card p-6 bg-emerald-50/40 border-emerald-200/60 space-y-4">
            <div className="flex items-center gap-3 text-emerald-700 font-bold text-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Escrow Account Manager Solution (Zero Risk)
            </div>
            <ul className="space-y-2 text-sm text-slate-600 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span> Money locked in neutral Escrow account — neither party can touch it alone.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span> Connected directly to Irembo Land Sandbox API for official title deed verification.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span> Payment released to Seller ONLY after Irembo mutation is verified; refunded if failed.
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* ── FULL PROPERTIES CATALOG GRID ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 font-sans">All Available Properties</h2>
            <p className="text-sm text-slate-500 font-semibold">Browse verified property listings ready for instant escrow purchase.</p>
          </div>
          <Link to="/properties" className="btn-ghost flex items-center gap-2 font-bold group">
            Open Full Catalog <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card h-[380px] bg-slate-50 animate-pulse flex flex-col">
                <div className="h-48 bg-slate-200 rounded-t-2xl"></div>
                <div className="p-5 space-y-4 flex-grow">
                  <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {properties.map((p) => (
              <Link key={p.id} to={`/properties/${p.id}`} className="card overflow-hidden group flex flex-col justify-between h-[400px] cursor-pointer block">
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  <img
                    src={resolveImageUrl(getPropertyCoverImage(p.images))}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={handlePropertyImageError}
                  />
                  <div className="absolute top-4 right-4">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm text-slate-900 font-extrabold px-3.5 py-1.5 text-sm rounded-lg shadow-sm">
                    ${Number(p.price).toLocaleString()} USD
                  </div>
                </div>
                <div className="p-6 flex-grow flex flex-col justify-between bg-white z-10 relative">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 truncate font-sans group-hover:text-primary-600 transition-colors">{p.title}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mt-1">{p.location}</p>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-3 font-medium">{p.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400">{p.bedrooms} Beds • {p.area} sqm</span>
                    <span className="text-emerald-600 font-extrabold text-sm">Escrow Ready &rarr;</span>
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
