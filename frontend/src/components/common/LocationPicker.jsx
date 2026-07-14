import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { FiSearch, FiMapPin, FiLoader } from 'react-icons/fi';

// Fix leaflet default icon (same pattern used in DeliveryTracking.jsx)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const pickerIcon = L.divIcon({
  html: `<div style="background:#22c55e;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.3);border:3px solid white;"><span style="transform:rotate(45deg);font-size:14px;">📍</span></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bengaluru fallback

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom() < 14 ? 15 : map.getZoom());
  }, [center]);
  return null;
}

/**
 * LocationPicker
 * props:
 *  - value: { address, lat, lng }
 *  - onChange: ({ address, lat, lng }) => void
 *  - addressLabel: label for the address input (default "Address")
 */
export default function LocationPicker({ value, onChange, addressLabel = 'Address' }) {
  const [mode, setMode] = useState('search'); // 'search' | 'map'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const debounceRef = useRef(null);

  const hasPoint = value?.lat && value?.lng;
  const center = hasPoint ? [parseFloat(value.lat), parseFloat(value.lng)] : DEFAULT_CENTER;

  // Debounced address search via OpenStreetMap Nominatim (free, no API key)
  useEffect(() => {
    if (mode !== 'search' || !query || query.length < 3) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [query, mode]);

  const selectResult = (r) => {
    onChange({
      address: r.display_name,
      lat: parseFloat(r.lat).toFixed(6),
      lng: parseFloat(r.lon).toFixed(6),
    });
    setResults([]);
    setQuery(r.display_name);
  };

  const pickOnMap = async (lat, lng) => {
    onChange({ ...value, lat: lat.toFixed(6), lng: lng.toFixed(6) });
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data?.display_name) {
        onChange({ address: data.display_name, lat: lat.toFixed(6), lng: lng.toFixed(6) });
      }
    } catch {
      // Reverse geocoding failing is not fatal — coordinates are still set.
    } finally {
      setReverseLoading(false);
    }
  };

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMode('search')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all ${mode === 'search' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
        >
          <FiSearch size={13} /> Search Address
        </button>
        <button
          type="button"
          onClick={() => setMode('map')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all ${mode === 'map' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
        >
          <FiMapPin size={13} /> Select on Map
        </button>
      </div>

      {mode === 'search' && (
        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an address, restaurant, or landmark…"
            className="w-full pl-9 pr-9 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm"
          />
          {searching && <FiLoader className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 animate-spin" size={15} />}
          {results.length > 0 && (
            <div className="absolute z-[1000] left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-h-56 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map (shown in both modes: 'map' for click-to-pick, 'search' to preview the selected point) */}
      <div className="rounded-xl overflow-hidden mb-3 relative" style={{ height: 260, border: '1.5px solid #e5e7eb' }}>
        <MapContainer center={center} zoom={hasPoint ? 15 : 12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {mode === 'map' && <ClickToPick onPick={pickOnMap} />}
          {hasPoint && <Marker position={center} icon={pickerIcon} />}
          <RecenterMap center={hasPoint ? center : null} />
        </MapContainer>
        {mode === 'map' && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-gray-600 text-center pointer-events-none">
            {reverseLoading ? 'Looking up address…' : 'Tap anywhere on the map to drop a pin'}
          </div>
        )}
      </div>

      {/* Editable address + coordinates (auto-filled, but always overridable) */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">{addressLabel}</label>
          <textarea
            value={value?.address || ''}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            rows={2}
            placeholder="Full pickup address"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Latitude</label>
            <input
              type="number" step="any"
              value={value?.lat || ''}
              onChange={(e) => onChange({ ...value, lat: e.target.value })}
              placeholder="12.9716"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Longitude</label>
            <input
              type="number" step="any"
              value={value?.lng || ''}
              onChange={(e) => onChange({ ...value, lng: e.target.value })}
              placeholder="77.5946"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
