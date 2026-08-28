import React from 'react';

const PropertyMapModal = ({ property, isOpen, onClose }) => {
  if (!isOpen || !property) return null;

  const locationName = property.location || 'Kigali, Rwanda';
  const upiDisplay = property.upiCode || '1/02/03/04/1234';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-base font-extrabold font-sans">
              📍 Property GIS Location Map — {property.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold leading-none cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wide">Location:</span>{' '}
              <span className="font-extrabold text-slate-800">{locationName}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wide">Parcel UPI:</span>{' '}
              <span className="font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                {upiDisplay}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wide">Area:</span>{' '}
              <span className="font-extrabold text-emerald-600">{property.area} sqm</span>
            </div>
          </div>

          {/* Embedded Interactive Map */}
          <div className="h-72 w-full rounded-xl relative overflow-hidden border border-slate-300 shadow-inner group">
            <iframe
              title={`GIS Location Map for ${property.title}`}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight="0"
              marginWidth="0"
              src="https://www.openstreetmap.org/export/embed.html?bbox=30.0500%2C-1.9550%2C30.0750%2C-1.9350&amp;layer=mapnik&amp;marker=-1.9441%2C30.0619"
              className="w-full h-full filter contrast-105"
            />

            {/* Floating Info Overlay */}
            <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-white shadow-md">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Verified GPS Pin: -1.9441° S, 30.0619° E
              </div>
            </div>

            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-[10px] font-bold shadow-md">
              Target Price: ${Number(property.price).toLocaleString()} USD
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            This land parcel location is registered on the connected Irembo Land Registry Sandbox. Exact deed details and seller mutation keys unlock automatically inside the Escrow workspace once funds are locked.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href="https://www.openstreetmap.org/?mlat=-1.9441&amp;mlon=30.0619#map=15/-1.9441/30.0619"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
          >
            Open in Full Satellite Map &rarr;
          </a>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-1.5 px-4 text-xs font-bold"
          >
            Close Map Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyMapModal;
