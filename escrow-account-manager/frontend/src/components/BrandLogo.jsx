import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: '/brand/logo-primary.svg',
  icon: '/brand/logo-icon.svg',
  wordmark: '/brand/logo-wordmark.svg',
  dark: '/brand/logo-dark.svg',
  badge: '/brand/badge-secure-escrow.svg',
};

const BrandLogo = ({
  variant = 'primary',
  className = '',
  imgClassName = '',
  alt = 'EscrowTrust',
  to,
  badge = false,
}) => {
  const src = VARIANTS[variant] || VARIANTS.primary;

  const content = (
    <>
      <img
        src={src}
        alt={alt}
        className={`block max-w-full h-auto ${imgClassName}`}
        draggable={false}
      />
      {badge && variant !== 'badge' && (
        <img
          src={VARIANTS.badge}
          alt="Secure Escrow"
          className="hidden sm:block h-6 w-auto shrink-0"
          draggable={false}
        />
      )}
    </>
  );

  const wrapperClass = `inline-flex items-center gap-2 shrink-0 ${className}`;

  if (to) {
    return (
      <Link to={to} className={wrapperClass} aria-label={alt}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
};

export default BrandLogo;
