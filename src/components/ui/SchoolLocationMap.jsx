import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths for Leaflet in bundlers like Vite
// (avoids missing marker icon issue)
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function ClickHandler({ onChange }) {
  useMapEvents({
    click(e) {
      if (!onChange) return;
      const { lat, lng } = e.latlng;
      onChange(lat, lng);
    }
  });
  return null;
}

export default function SchoolLocationMap({ latitude, longitude, onChange }) {
  const center = useMemo(() => {
    const lat = typeof latitude === 'number' && !Number.isNaN(latitude)
      ? latitude
      : 11.5678901;
    const lng = typeof longitude === 'number' && !Number.isNaN(longitude)
      ? longitude
      : 104.9123456;
    return [lat, lng];
  }, [latitude, longitude]);

  const hasMarker =
    typeof latitude === 'number' && !Number.isNaN(latitude) &&
    typeof longitude === 'number' && !Number.isNaN(longitude);

  return (
    <div className="w-full h-64 rounded-md border border-gray-200 overflow-hidden">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <ClickHandler onChange={onChange} />
        {hasMarker && (
          <Marker position={[latitude, longitude]} icon={defaultIcon} />
        )}
      </MapContainer>
    </div>
  );
}
