import React from 'react';
import PropertyLeafletMap from './PropertyLeafletMap';
import { resolveImageUrl, getPropertyCoverImage } from '../utils/imageUtils';

const PropertyMapModal = ({ property, isOpen, onClose }) => {
  if (!isOpen || !property) return null;

  const locationName = property.location || 'Kigali, Rwanda';
  const upiDisplay = property.upiCode || '1/02/03/04/1234';
  const coverImg = resolveImageUrl(getPropertyCoverImage(property.images));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-base font-extrabold font-sans">
              📍 Interactive Property Location GIS Map — {property.title}
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

          {/* Real Leaflet Map Component */}
          <PropertyLeafletMap
            locationName={locationName}
            latitude={property.latitude}
            longitude={property.longitude}
            height="340px"
            propertyTitle={property.title}
            propertyPrice={property.price}
            propertyImage={coverImg}
            upiCode={upiDisplay}
          />

          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            This map uses real Leaflet vector tiles and satellite imagery connected to the Irembo Land Registry Sandbox. You can toggle between <strong>Streets</strong>, <strong>Satellite</strong>, and <strong>Topo</strong> view, zoom into the neighborhood, or drag the map.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href={`https://www.openstreetmap.org/?query=${encodeURIComponent(locationName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
          >
            Open in External Satellite Map &rarr;
          </a>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-1.5 px-4 text-xs font-bold"
          >
            Close Map Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyMapModal;
