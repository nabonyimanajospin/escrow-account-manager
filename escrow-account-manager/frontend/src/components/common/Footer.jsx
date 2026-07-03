import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-white border-t border-slate-100 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Brand */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center text-white font-bold text-base shadow-sm">E</div>
            <span className="text-lg font-bold gradient-text">EscrowTrust</span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            Secure, transparent property transactions powered by digital escrow.
            Zero trust needed between buyers and sellers — the platform guarantees integrity.
          </p>
          <div className="flex gap-2 mt-5">
            {['Secure', 'Transparent', 'Verified'].map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Platform links */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Platform</h4>
          <ul className="space-y-2.5">
            {[
              { to: '/properties',   label: 'Browse Properties' },
              { to: '/dashboard',    label: 'Dashboard' },
              { to: '/transactions', label: 'Transactions' },
              { to: '/register',     label: 'Create Account' },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm text-slate-500 hover:text-primary-600 transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">About</h4>
          <ul className="space-y-2.5 text-sm text-slate-500">
            <li>Kigali, Rwanda</li>
            <li>AUCA — Faculty of IT</li>
            <li>Jospin Nabonyimana</li>
            <li>URUTI HUB Internship</li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} EscrowTrust Management System. All rights reserved.
        </p>

        {/* URUTI HUB credit */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">Developed at</span>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Icon mark */}
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span
                className="text-base font-extrabold tracking-[0.12em] uppercase"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                URUTI HUB
              </span>
            </div>
          </div>
          {/* Pulse dot — live/active indicator */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
