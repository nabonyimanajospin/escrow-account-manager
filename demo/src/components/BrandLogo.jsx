import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: '/brand/logo-primary.svg',
  icon: '/brand/logo-icon.svg',
  wordmark: '/brand/logo-wordmark.svg',
};

export default function BrandLogo({ variant = 'primary', imgClassName = '', to }) {
  const img = (
    <img
      src={VARIANTS[variant] || VARIANTS.primary}
      alt="EscrowTrust"
      className={`block h-auto ${imgClassName}`}
      draggable={false}
    />
  );
  if (to) return <Link to={to} className="inline-flex shrink-0">{img}</Link>;
  return <div className="inline-flex shrink-0">{img}</div>;
}
