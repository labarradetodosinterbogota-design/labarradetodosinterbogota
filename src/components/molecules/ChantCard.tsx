import React, { useState } from 'react';
import { Music, Play, Pause } from 'lucide-react';
import { Badge, Button } from '../atoms';
import { Chant } from '../../types';
import { chantStatusLabels } from '../../locales/es';

interface ChantCardProps {
  chant: Chant;
  onSelect?: (chant: Chant) => void;
}

export const ChantCard: React.FC<ChantCardProps> = ({ chant, onSelect }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const statusLabel = chantStatusLabels[chant.status] ?? chant.status;

  return (
    <div className="bg-white rounded-lg border border-dark-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-dark-900">{chant.title}</h3>
          <p className="text-sm text-dark-500 mt-1">{chant.category}</p>
        </div>
        <Badge variant="primary" size="sm">
          {statusLabel}
        </Badge>
      </div>

      <p className="text-sm text-dark-600 line-clamp-2 mb-3">{chant.lyrics}</p>

      <div className="flex gap-2">
        {chant.audio_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayToggle}
            className="flex-1"
            type="button"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Reproducir
              </>
            )}
          </Button>
        )}
        {!chant.audio_url && (
          <Button variant="ghost" size="sm" className="flex-1" disabled type="button">
            <Music className="w-4 h-4 mr-1" />
            Sin audio
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSelect?.(chant)}
          className="flex-1"
          type="button"
        >
          Ver
        </Button>
      </div>
    </div>
  );
};
