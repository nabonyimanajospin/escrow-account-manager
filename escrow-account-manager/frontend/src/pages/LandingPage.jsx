import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';

const steps = [
  {
    num: '01',
    title: 'Cryptographic Agreement',
    desc: 'Buyer and Seller sign a digital contract online. A unique contract hash address (0x...) is registered on the system.',
    icon: (
      <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11V5a2 2 0 00-2-2H4a2 2 0 00-2 2v6a13.978 13.978 0 003.07 8.757m.01 0a13.9 13.9 0 003.41 2.217m0 0a13.9 13.9 0 003.41-2.217M12 11c1.744 2.772 2.753 6.054 2.753 9.571m-1.72-2.04l.054-.09A13.916 13.916 0 0015 11V5a2 2 0 00-2-2h-3a2 2 0 00-2 2v6a13.978 13.978 0 003.07 8.757" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Escrow Fund Lock',
    desc: 'Buyer deposits the property value. Capital is held in a secure lock-state. Neither party can withdraw without mutual consensus.',
    icon: (
      <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Mutation and Verification',
    desc: 'Seller initiates ownership transfer (mutation) and uploads deed files. Admin audits progress and settles/refunds securely.',
    icon: (
      <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const features = [
  {
    title: 'Zero-Trust Protocol',
    desc: 'Ensures transaction safety by checking both signatures and holding funds in simulated smart contracts.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: 'Immutable Ledger Audit',
    desc: 'All contract stages and approvals log directly into an immutable database block registry signed via SHA-256.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: 'Interactive Consensus',
    desc: 'Simulates cryptographic math validation where both parties must enter matching codes to unlock transitions.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v8a2 2 0 11-4 0V4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2a8 8 0 01-8-8v-2a2 2 0 014 0v4a2 2 0 004 0V4a2 2 0 114 0v3" />
      </svg>
    ),
  },
];

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
    <div className="space-y-16 pb-12">
      
      {/* Hero Section */}
      <section className="gradient-hero py-20 border-b border-slate-100 relative overflow-hidden hero-mesh">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <span className="text-xs font-bold text-primary-600 uppercase tracking-widest bg-primary-100 border border-primary-200 px-3 py-1 rounded-full">
            Real Estate Security Protocol
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto font-sans leading-tight">
            Online Escrow & Ownership mutation{' '}
            <span className="gradient-text">Verified by Consensus</span>
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed font-semibold">
            EscrowTrust acts as a trusted middleman. We lock buyer capital in secure contracts, coordinate cryptographic signatures, and release funds only after verified ownership transfer.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link to="/register" className="btn-primary font-bold text-sm">
              Get Started
            </Link>
            <Link to="/properties" className="btn-secondary font-bold text-sm">
              Browse Listings
            </Link>
          </div>
        </div>
      </section>

      {/* Protocol Visual Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pt-24">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 font-sans">How the Secure Escrow Works</h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Three-way settlement flow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="card p-6 bg-white flex flex-col items-start gap-4">
              <div className="flex justify-between w-full items-center">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-primary-600">
                  {step.icon}
                </div>
                <span className="text-3xl font-black text-slate-300 font-sans">{step.num}</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-2">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Column */}
      <section className="bg-slate-50 border-y border-slate-200/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 font-sans">Core Protocol Architecture</h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Features built for production deployment</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="p-2 rounded-lg bg-primary-50 border border-primary-100 text-primary-600 flex-shrink-0">
                  {feat.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">{feat.title}</h3>
                  <p className="text-xs text-slate-500 leading-normal font-semibold">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature properties section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-slate-900 font-sans">Featured Catalog Properties</h2>
            <p className="text-xs text-slate-500 font-semibold">Properties immediately available for escrow contract</p>
          </div>
          <Link to="/properties" className="text-sm font-bold text-primary-600 hover:text-primary-700">
            View All Properties &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-6 text-slate-500 text-sm font-medium">
            Fetching active real estate...
          </div>
        ) : properties.length === 0 ? (
          <div className="card p-8 text-center bg-white text-slate-500 text-sm font-semibold">
            No properties available in the catalog at this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((p) => (
              <div key={p.id} className="card overflow-hidden bg-white flex flex-col justify-between h-[360px]">
                <div className="h-40 bg-slate-100 relative">
                  {p.images && p.images[0] && (
                    <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white font-extrabold px-3 py-1 text-sm rounded-lg">
                    ${Number(p.price).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{p.title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{p.location}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">{p.description}</p>
                  </div>
                  <Link
                    to={`/properties/${p.id}`}
                    className="bg-slate-50 text-center py-2 text-xs font-bold text-slate-700 hover:text-primary-600 border-t border-slate-100 mt-4 block"
                  >
                    View Secure Workspace
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default LandingPage;
