import { useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../lib/api';

interface Props {
  matchedUserId: string;
  onRated?: (stars: number) => void;
}

export function RatingWidget({ matchedUserId, onRated }: Props) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rated, setRated] = useState(false);

  const submitRating = async (stars: number) => {
    if (saving) return;
    setSaving(true);
    setSelected(stars);
    try {
      await api.post(`/matches/${matchedUserId}/rate`, { stars });
      setRated(true);
      onRated?.(stars);
    } catch {
      setSelected(0);
    } finally {
      setSaving(false);
    }
  };

  if (rated) {
    return (
      <div className="flex items-center justify-center gap-1 py-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={18}
            className={s <= selected ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
        <span className="text-xs text-gray-400 ml-2">Calificaste a este jugador</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Calificar a este jugador
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => submitRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            disabled={saving}
            className="transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Star
              size={24}
              className={`transition-colors ${
                s <= (hovered || selected)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
      </div>
      {selected > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          {['', '1 - Muy malo', '2 - Malo', '3 - Normal', '4 - Bueno', '5 - Excelente'][selected]}
        </p>
      )}
    </div>
  );
}
