import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-[70vh] flex items-center justify-center px-4">
    <div className="text-center animate-fade-in">
      <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6">
        404
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-3">Page not found</h1>
      <p className="text-slate-500 mb-8 max-w-sm mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Go Home</Link>
        <Link to="/properties" className="btn-secondary">Browse Properties</Link>
      </div>
    </div>
  </div>
);

export default NotFound;
