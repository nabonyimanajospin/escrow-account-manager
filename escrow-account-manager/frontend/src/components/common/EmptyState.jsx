import React from 'react';
import { Link } from 'react-router-dom';

const EmptyState = ({
  icon,
  title,
  description,
  actionText,
  actionLink,
  actionOnClick
}) => {
  return (
    <div className="py-16 px-6 text-center animate-fade-in flex flex-col items-center justify-center h-full min-h-[300px]">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-5 border border-slate-100 relative group overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 text-slate-400 group-hover:text-primary-600 transition-colors duration-500">
          {icon || (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
        </div>
      </div>
      <h3 className="text-slate-900 text-lg font-bold font-sans tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">{description}</p>
      
      {actionText && (
        <div className="mt-2">
          {actionLink ? (
            <Link to={actionLink} className="btn-primary text-sm font-semibold px-6 py-2.5 shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-0.5">
              {actionText}
            </Link>
          ) : (
            <button onClick={actionOnClick} className="btn-primary text-sm font-semibold px-6 py-2.5 shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-0.5">
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
