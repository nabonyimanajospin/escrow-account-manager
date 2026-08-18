import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const NotFound = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
    <BrandLogo to="/" variant="icon" imgClassName="h-16 w-auto opacity-90" />
    <h1 className="text-4xl font-extrabold text-slate-900 font-sans">404 - Page Not Found</h1>
    <p className="text-slate-500 max-w-sm text-sm font-semibold leading-relaxed">
      The transaction record or portal section you are looking for does not exist or has been archived.
    </p>
    <Link to="/dashboard" className="btn-primary text-xs font-bold">
      Return to Safety Dashboard
    </Link>
  </div>
);

export default NotFound;
