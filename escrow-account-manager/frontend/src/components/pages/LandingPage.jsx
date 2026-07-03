import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axiosConfig';

const steps = [
  {
    num: '01',
    title: 'Confirm Deposit',
    desc: 'Buyer confirms the exact property price. The amount is recorded and locked in the escrow account. No real money moves — this is a simulated escrow.',
    icon: (
      <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Seller Initiates Mutation',
    desc: 'Seller starts the legal ownership transfer process and uploads verified proof documents to the platform for review.',
    icon: (
      <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Admin Releases Payment',
    desc: 'Admin verifies the completed mutation and releases the escrowed funds to the seller. Deal closed securely.',
    icon: (
      <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const features = [
  {
    title: 'Zero-Trust Security',
    desc: 'Neither party can cheat. Funds are locked until verified mutation completion.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Tracking',
    desc: 'Both buyer and seller see every status change with full timestamped audit trails.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Role-Based Access',
    desc: 'BUYER, SELLER, and ADMIN roles with strict permission boundaries on every action.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Instant Verification',
    desc: 'Admin dashboard allows rapid document review and one-click fund release or refund.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Document Management',
    desc: 'Sellers upload mutation certificates. Full document history preserved for compliance.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Escrow Accounts',
    desc: 'Each transaction gets a unique escrow account with deposit and release history.',
    icon: (
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

const LandingPage = () => {
  const [properties, setProperties] = useState([]);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    axios.get('/properties?status=AVAILABLE').then((res) => {
      setProperties((res.data.data || []).slice(0, 3));
    }).catch(() => {});
    const t = setTimeout(() => setStatsVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="overflow-hidden">

      {/* HERO */}
      <section className="relative hero-mesh min-h-[88vh] flex items-center">
        <div className="particles-bg">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${5 + Math.random() * 90}%`,
              top:  `${5 + Math.random() * 90}%`,
              '--duration': `${5 + Math.random() * 7}s`,
              '--delay':    `${Math.random() * 4}s`,
              width:  `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              opacity: 0.3 + Math.random() * 0.3,
            }} />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                Secure Property Transactions
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-slate-900 mb-6">
                Property Deals<br />
                <span className="gradient-text">Without the Risk</span>
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg">
                EscrowTrust locks buyer funds in a secure escrow account until the seller completes
                verified property ownership mutation. Zero trust needed — the platform guarantees integrity.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary text-base !px-8 !py-3.5 shadow-lg shadow-primary-500/25">
                  Get Started
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link to="/properties" className="btn-secondary text-base !px-8 !py-3.5">
                  Browse Properties
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5 mt-10">
                {['JWT Encrypted', 'bcrypt Hashed', 'RBAC Protected'].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                    </div>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Hero card */}
            <div className="hidden lg:flex justify-center animate-slide-up">
              <div className="relative">
                <div className="card p-7 w-80 shadow-xl shadow-slate-200/80">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl gradient-accent flex items-center justify-center shadow-md shadow-primary-500/20">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Modern Villa</p>
                      <p className="text-xs text-slate-500">Nyarutarama, Kigali</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Price</span>
                      <span className="font-bold text-slate-900">$250,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Escrow Status</span>
                      <span className="badge badge-deposited text-[10px]">Funds Locked</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Mutation</span>
                      <span className="badge badge-mutation text-[10px]">In Progress</span>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>Transaction Progress</span>
                        <span className="font-semibold text-primary-600">65%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="gradient-accent h-2 rounded-full" style={{ width: '65%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-5 -right-6 card !p-3 shadow-lg animate-float" style={{ animationDelay: '0.5s' }}>
                  <p className="text-xs font-bold text-primary-600">$250K</p>
                  <p className="text-[10px] text-slate-500">Secured</p>
                </div>
                <div className="absolute -bottom-5 -left-6 card !p-3 shadow-lg animate-float" style={{ animationDelay: '1.5s' }}>
                  <p className="text-xs font-bold text-slate-800">Protected</p>
                  <p className="text-[10px] text-slate-500">Admin Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-14 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '100%', label: 'Transaction Security' },
              { value: '0',    label: 'Fraud Incidents' },
              { value: '3',    label: 'User Roles (RBAC)' },
              { value: '24/7', label: 'Platform Availability' },
            ].map((s, i) => (
              <div key={i} className={`${statsVisible ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: `${i * 0.1}s` }}>
                <p className="text-3xl font-extrabold gradient-text mb-1">{s.value}</p>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
              How It Works
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Three Steps to a <span className="gradient-text">Fraud-Proof</span> Deal
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Our escrow system eliminates all trust issues in property transactions.
              Every step is transparent, verified, and irreversible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className={`card p-8 text-center group stagger-${i + 1} animate-slide-up`}>
                <div className="text-[10px] font-bold text-primary-400 tracking-[0.3em] mb-4">STEP {step.num}</div>
                <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary-100 group-hover:scale-110 transition-all">
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
              Platform Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Built for <span className="gradient-text">Security & Transparency</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <div key={i} className={`card p-6 group stagger-${i + 1} animate-slide-up`}>
                <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-all">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      {properties.length > 0 && (
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
                Featured <span className="gradient-text">Properties</span>
              </h2>
              <p className="text-slate-500">Explore available listings ready for secure escrow transactions</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {properties.map((p) => (
                <Link key={p.id} to={`/properties/${p.id}`} className="card overflow-hidden group block">
                  <div className="h-44 bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-900 mb-1 line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {p.location}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-extrabold gradient-text">${Number(p.price).toLocaleString()}</p>
                      <span className="text-xs text-primary-600 font-semibold group-hover:translate-x-1 transition-transform inline-block">View</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/properties" className="btn-secondary !px-8">View All Properties</Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card-tinted p-12 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary-200/40 rounded-full blur-[60px]" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent-400/30 rounded-full blur-[60px]" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
                Ready to transact <span className="gradient-text">without fear</span>?
              </h2>
              <p className="text-slate-600 mb-8 max-w-xl mx-auto">
                Join EscrowTrust today. Whether you are buying your dream home or selling property,
                our escrow platform ensures zero fraud risk.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/register" className="btn-primary text-base !px-10 !py-3.5 shadow-lg shadow-primary-500/25">
                  Create Free Account
                </Link>
                <Link to="/login" className="btn-secondary text-base !px-10 !py-3.5">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
