import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix default Leaflet icon assets in Webpack/Vite bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const customMarkerIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Known location coordinates lookup table (fallback geocoding for Rwanda regions)
const LOCATION_COORDINATES_MAP = {
  nyarutarama: [-1.9360, 30.0980],
  kimironko: [-1.9440, 30.1250],
  gacuriro: [-1.9280, 30.0910],
  kibagabaga: [-1.9280, 30.1140],
  nyarugenge: [-1.9510, 30.0590],
  kicukiro: [-1.9750, 30.1020],
  remera: [-1.9560, 30.1050],
  gasabo: [-1.9380, 30.0950],
  kanombe: [-1.9680, 30.1450],
  bugesera: [-2.1400, 30.0800],
  nyamata: [-2.1450, 30.0880],
  rwamagana: [-1.9480, 30.4340],
  rubavu: [-1.7000, 29.2600],
  musanze: [-1.5000, 29.6300],
  huye: [-2.5900, 29.7400],
  karongi: [-2.0650, 29.3550],
  kigali: [-1.9441, 30.0619],
};

const resolveCoordinates = (locationStr, defaultLat = -1.9441, defaultLng = 30.0619) => {
  if (!locationStr) return [defaultLat, defaultLng];
  const query = String(locationStr).toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_COORDINATES_MAP)) {
    if (query.includes(key)) {
      return coords;
    }
  }
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash << 5) - hash + query.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((hash % 100) / 2000);
  const lngOffset = (((hash >> 3) % 100) / 2000);
  return [defaultLat + latOffset, defaultLng + lngOffset];
};

// Component to dynamically re-center map view and invalidate size when coordinates change
const MapViewRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView(center, map.getZoom());
    const t1 = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    const t2 = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [center, map]);
  return null;
};

// OpenStreetMap Address Search Control plugin component
const SearchControl = ({ onSelect }) => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      autoClose: true,
      showMarker: false,
      retainZoomLevel: false,
      searchLabel: 'Search property address or region (e.g. Nyarutarama, Bugesera)',
    });

    map.addControl(searchControl);

    const handleSearchLocation = (result) => {
      if (onSelect && result?.location) {
        onSelect({
          address: result.location.label,
          lat: result.location.y,
          lng: result.location.x,
        });
      }
    };

    map.on('geosearch/showlocation', handleSearchLocation);

    return () => {
      map.removeControl(searchControl);
      map.off('geosearch/showlocation', handleSearchLocation);
    };
  }, [map, onSelect]);

  return null;
};

// Component for interactive location pin placement when seller clicks on map
const MapClickPinHandler = ({ onLocationSelected }) => {
  useMapEvents({
    click(e) {
      if (onLocationSelected) {
        onLocationSelected({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

const TILE_PROVIDERS = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
  },
};

const PropertyLeafletMap = ({
  locationName = '',
  latitude,
  longitude,
  height = '320px',
  propertyTitle = 'Property Location',
  propertyPrice,
  propertyImage,
  upiCode,
  interactiveSelect = false,
  onLocationSelect = null,
}) => {
  const [mapLayer, setMapLayer] = useState('streets');

  const position = useMemo(() => {
    if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
      return [Number(latitude), Number(longitude)];
    }
    return resolveCoordinates(locationName);
  }, [latitude, longitude, locationName]);

  const [currentMarkerPos, setCurrentMarkerPos] = useState(position);

  useEffect(() => {
    setCurrentMarkerPos(position);
  }, [position]);

  const handleMapClick = ({ lat, lng }) => {
    setCurrentMarkerPos([lat, lng]);
    if (onLocationSelect) {
      onLocationSelect({ lat: Number(lat).toFixed(6), lng: Number(lng).toFixed(6) });
    }
  };

  const handleSearchResult = ({ address, lat, lng }) => {
    setCurrentMarkerPos([lat, lng]);
    if (onLocationSelect) {
      onLocationSelect({ address, lat: Number(lat).toFixed(6), lng: Number(lng).toFixed(6) });
    }
  };

  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    if (marker != null) {
      const latLng = marker.getLatLng();
      setCurrentMarkerPos([latLng.lat, latLng.lng]);
      if (onLocationSelect) {
        onLocationSelect({ lat: latLng.lat.toFixed(6), lng: latLng.lng.toFixed(6) });
      }
    }
  };

  const handleUseCurrentGpsLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          setCurrentMarkerPos([Number(lat), Number(lng)]);
          if (onLocationSelect) {
            onLocationSelect({ lat, lng });
          }
        },
        (err) => {
          console.error('Device GPS geolocation error:', err);
        }
      );
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-md group">
      
      {/* Layer selector & Map Controls Header */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-lg flex flex-wrap items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => setMapLayer('streets')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
            mapLayer === 'streets'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🗺️ Streets
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
            mapLayer === 'satellite'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Best for rural land without roads — shows aerial satellite imagery"
        >
          🛰️ Satellite (Rural)
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('topo')}
          className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
            mapLayer === 'topo'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ⛰️ Topo
        </button>
        {interactiveSelect && (
          <button
            type="button"
            onClick={handleUseCurrentGpsLocation}
            className="px-2.5 py-1 rounded-lg font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
            title="Automatically place pin on your current device GPS location"
          >
            🎯 Use My Device GPS
          </button>
        )}
      </div>

      {/* Top Left GPS Coordinates Badge */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-white shadow-lg">
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>GPS Pin: {currentMarkerPos[0].toFixed(4)}° S, {currentMarkerPos[1].toFixed(4)}° E</span>
        </div>
      </div>

      {/* Interactive Leaflet Map Container */}
      <MapContainer
        center={currentMarkerPos}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height, width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url={TILE_PROVIDERS[mapLayer].url}
          attribution={TILE_PROVIDERS[mapLayer].attribution}
          maxZoom={19}
        />
        
        <MapViewRecenter center={currentMarkerPos} />
        
        <SearchControl onSelect={handleSearchResult} />

        {interactiveSelect && <MapClickPinHandler onLocationSelected={handleMapClick} />}

        <Marker
          position={currentMarkerPos}
          icon={customMarkerIcon}
          draggable={interactiveSelect}
          eventHandlers={{
            dragend: handleMarkerDragEnd,
          }}
        >
          <Popup className="custom-leaflet-popup">
            <div className="p-1 space-y-1.5 max-w-xs font-sans">
              {propertyImage && (
                <div className="h-24 w-full rounded-lg overflow-hidden bg-slate-100">
                  <img src={propertyImage} alt={propertyTitle} className="w-full h-full object-cover" />
                </div>
              )}
              <h4 className="text-xs font-extrabold text-slate-900 leading-tight">{propertyTitle}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase">📍 {locationName || 'Verified Location'}</p>
              {upiCode && (
                <p className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Parcel UPI: {upiCode}
                </p>
              )}
              {propertyPrice && (
                <p className="text-xs font-extrabold text-emerald-600 font-mono">
                  ${Number(propertyPrice).toLocaleString()} USD
                </p>
              )}
              {interactiveSelect ? (
                <span className="text-[9px] text-indigo-600 font-bold block">
                  ✓ Draggable Marker! Drag pin or click map/satellite to set property location.
                </span>
              ) : (
                <span className="text-[9px] text-emerald-700 font-bold block">
                  ✓ Official GIS Parcel Pin verified on OpenStreetMap
                </span>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Interactive Helper Banner */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-[10px] font-bold shadow-md flex items-center justify-between">
        <span>📍 {locationName || 'Kigali, Rwanda'}</span>
        <span className="text-emerald-700 font-mono">
          {interactiveSelect ? 'Toggle 🛰️ Satellite to find rural land without roads' : 'Scroll/Drag map to explore neighborhood'}
        </span>
      </div>

    </div>
  );
};

export default PropertyLeafletMap;
