import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

interface LocationValue {
  address: string;
  lat?: number;
  lng?: number;
}

interface LocationCellProps {
  value: LocationValue | undefined;
  onChange: (val: LocationValue) => void;
}

const LocationCell: React.FC<LocationCellProps> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState(value?.address || '');
  const [lat, setLat] = useState(value?.lat?.toString() || '');
  const [lng, setLng] = useState(value?.lng?.toString() || '');

  const handleSave = () => {
    const result: LocationValue = { address: address.trim() };
    if (lat && !isNaN(Number(lat))) result.lat = Number(lat);
    if (lng && !isNaN(Number(lng))) result.lng = Number(lng);
    onChange(result);
    setEditing(false);
  };

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => {
          setAddress(value?.address || '');
          setLat(value?.lat?.toString() || '');
          setLng(value?.lng?.toString() || '');
          setEditing(true);
        }}
        className="w-full h-full flex items-center justify-center gap-1 font-density-cell text-foreground px-1"
      >
        {value?.address ? (
          <>
            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="truncate">{value.address}</span>
          </>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </button>
      {editing && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEditing(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[260px] animate-fade-in">
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Endereco</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Digite o endereco..."
                  className="w-full bg-muted rounded px-2 py-1.5 font-density-cell text-foreground outline-none mt-0.5"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Latitude</label>
                  <input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="-23.550"
                    className="w-full bg-muted rounded px-2 py-1 font-density-cell text-foreground outline-none mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Longitude</label>
                  <input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="-46.633"
                    className="w-full bg-muted rounded px-2 py-1 font-density-cell text-foreground outline-none mt-0.5"
                  />
                </div>
              </div>
              <div className="flex gap-1 justify-end pt-1">
                <button
                  onClick={() => setEditing(false)}
                  className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-2 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationCell;
