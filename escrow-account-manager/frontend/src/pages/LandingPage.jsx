import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../utils/imageUtils';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';

const LandingPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/properties?status=AVAILABLE')
      .then((res) => {
        setProperties(res.data.data?.slice(0, 3) || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-24 pb-20">
      
      {/* ── HERO SECTION ── */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-slate-50 hero-mesh border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
            
            {/* Animated Pill Badge */}
            <div className="animate-slide-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 uppercase tracking-wider">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Property Exchange Engine
            </div>

            {/* Headline */}
            <h1 className="animate-slide-up stagger-1 text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] font-sans">
              Real Estate Transactions, <br className="hidden sm:block" />
              <span className="gradient-text">Without the Risk.</span>
            </h1>

            {/* Sub-headline */}
            <p className="animate-slide-up stagger-2 text-lg sm:text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
              EscrowTrust provides a unified, zero-trust protocol to lock funds, verify deeds, and instantly mutate ownership. Absolute certainty for buyers and sellers.
            </p>

            {/* CTA Buttons */}
            <div className="animate-slide-up stagger-3 flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full">
              <Link to="/register" className="btn-primary py-3.5 px-8 text-base shadow-lg shadow-primary-500/30 w-full sm:w-auto">
                Create Secure Wallet
              </Link>
              <Link to="/properties" className="btn-secondary py-3.5 px-8 text-base bg-white w-full sm:w-auto">
                Explore Listings
              </Link>
            </div>
            
            {/* Trust Metrics */}
            <div className="animate-fade-in stagger-4 pt-12 flex items-center justify-center gap-8 sm:gap-16 text-slate-400">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-700">$0</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Stolen Funds</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-700">100%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Audit Trail</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-700">Bank-Grade</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Data Security</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary-400/10 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />
      </section>

      {/* ── BENTO BOX FEATURES ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-900 font-sans">Engineered for Trust</h2>
          <p className="text-sm text-slate-500 font-semibold max-w-2xl mx-auto">
            Our infrastructure is built to guarantee mathematically verifiable security at every step of the transaction process.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
          
          {/* Bento Card 1: Large Span */}
          <div className="md:col-span-2 card p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-white opacity-50 z-0"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Multi-signature Escrow Lock</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-md">
                  Capital is locked in an immutable state. Funds cannot be routed, withdrawn, or reversed without mutual cryptographic consensus from both parties.
                </p>
              </div>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-100/50 rounded-full blur-2xl group-hover:bg-primary-200/50 transition-colors"></div>
          </div>

          {/* Bento Card 2: Vertical */}
          <div className="card p-8 bg-slate-900 text-white relative overflow-hidden group">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:rotate-12 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Automated Dispute Resolution</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Dedicated admin oversight with legally-binding evidence vaults for rapid, impartial settlement.
                </p>
              </div>
            </div>
          </div>

          {/* Bento Card 3: Standard */}
          <div className="card p-8 relative overflow-hidden group">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-primary-600 group-hover:-translate-y-1 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                
                {/* New Mini UI Graphic */}
                <div className="w-24 h-12 bg-primary-50 rounded-lg border border-primary-100 flex flex-col justify-center px-3 group-hover:border-primary-200 transition-colors">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '400ms' }}></div>
                  </div>
                  <div className="h-1.5 w-12 bg-primary-200 rounded-full mt-2"></div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Settlement</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Immediate ledger updates post-consensus, slashing closing times from weeks to minutes.
                </p>
              </div>
            </div>
          </div>

          {/* Bento Card 4: Standard Span */}
          <div className="md:col-span-2 card p-8 relative overflow-hidden group bg-emerald-50/30">
            <div className="relative z-10 h-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Immutable Audit Trail</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-md">
                  Every interaction, signature, and transfer is cryptographically hashed and permanently recorded, guaranteeing absolute transparency.
                </p>
              </div>
              <div className="w-full sm:w-64 h-32 bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden flex flex-col justify-center">
                <div className="space-y-3 relative z-10">
                  <div className="h-2 w-3/4 bg-slate-100 rounded-full"></div>
                  <div className="h-2 w-1/2 bg-slate-100 rounded-full"></div>
                  <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-4 w-12 bg-emerald-100 rounded text-[8px] font-bold text-emerald-700 flex items-center justify-center">SIGNED</div>
                    <div className="h-4 w-16 bg-slate-100 rounded text-[8px] font-bold text-slate-400 flex items-center justify-center">0xA72B...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── FEATURED PROPERTIES ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pt-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 font-sans">Available for Escrow</h2>
            <p className="text-sm text-slate-500 font-semibold">Premium properties ready for secure digital transfer.</p>
          </div>
          <Link to="/properties" className="btn-ghost flex items-center gap-2 font-bold group">
            Browse Catalog <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
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
                  <div className="h-16 bg-slate-200 rounded w-full mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="card-tinted p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
              <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Listings Found</h3>
            <p className="text-slate-500 text-sm max-w-sm">There are currently no properties available. Check back later or create a seller account to list your own.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {properties.map((p) => (
              <Link key={p.id} to={`/properties/${p.id}`} className="card overflow-hidden group flex flex-col justify-between h-[400px] cursor-pointer block">
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  {p.images && p.images[0] ? (
                    <img 
                      src={resolveImageUrl(p.images[0])} 
                      alt={p.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="absolute top-4 right-4">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm text-slate-900 font-extrabold px-3.5 py-1.5 text-sm rounded-lg shadow-sm border border-slate-100/50">
                    ${Number(p.price).toLocaleString()}
                  </div>
                </div>
                <div className="p-6 flex-grow flex flex-col justify-between bg-white z-10 relative">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 truncate font-sans group-hover:text-primary-600 transition-colors">{p.title}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      {p.location}
                    </p>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-3 leading-relaxed font-medium">{p.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> {p.bedrooms} Beds</span>
                      <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg> {p.area} sqm</span>
                    </div>
                    <span className="text-primary-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </span>
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
