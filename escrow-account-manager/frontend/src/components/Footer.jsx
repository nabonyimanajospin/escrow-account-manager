import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-white border-t border-slate-200/80 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start gap-2">
          <BrandLogo to="/" variant="primary" imgClassName="h-7 w-auto" />
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Consensus-Driven Real Estate Escrow
          </p>
        </div>
        
        <div className="flex items-center gap-6 text-xs font-bold text-slate-500">
          <Link to="/properties" className="hover:text-primary-600 transition-colors">
            Properties Catalog
          </Link>
          <Link to="/dashboard" className="hover:text-primary-600 transition-colors">
            Member Workspace
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="hover:text-primary-600 transition-colors">
              Admin Console
            </Link>
          )}
        </div>
        
        <p className="text-[10px] text-slate-400 font-semibold font-mono">
          &copy; {new Date().getFullYear()} EscrowTrust. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
