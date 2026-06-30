import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} EscrowTrust Management System. Secure property transactions with verified title mutations.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Designed for secure escrow fund holding. Zero Trust, Zero Fraud.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
