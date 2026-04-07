import React, { useState } from 'react';
import { Badge } from '../atoms';
import { VotingPoll } from '../../types';

interface VotingOptionThumbnailProps {
  src: string;
  label: string;
}

const VotingOptionThumbnail: React.FC<VotingOptionThumbnailProps> = ({ src, label }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError || src.trim().length === 0) return null;

  return (
    <img
      src={src}
      alt={`Imagen opción ${label}`}
      loading="lazy"
      decoding="async"
      className="h-9 w-9 rounded-md border border-dark-200 bg-white object-cover shadow-sm"
      onError={() => setHasError(true)}
    />
  );
};

interface VotingCardProps {
  poll: VotingPoll;
  onVote?: (poll: VotingPoll, option: string) => void;
  userVote?: string | null;
}

export const VotingCard: React.FC<VotingCardProps> = ({ poll, onVote, userVote }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(userVote || null);

  const totalVotes = poll.total_votes || 0;
  const quorumDenominator = Math.max(poll.quorum_required, 1);
  const quorumPercentage = (totalVotes / quorumDenominator) * 100;
  const isQuorumMet = totalVotes >= poll.quorum_required;

  const handleVote = (optionId: string) => {
    setSelectedOption(optionId);
    onVote?.(poll, optionId);
  };

  return (
    <div className="bg-white rounded-lg border border-dark-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-dark-900">{poll.title}</h3>
        </div>
        <Badge variant={isQuorumMet ? 'success' : 'warning'} size="sm">
          {isQuorumMet ? 'Quórum alcanzado' : 'Pendiente'}
        </Badge>
      </div>

      {poll.description && (
        <p className="text-sm text-dark-600 mb-3">{poll.description}</p>
      )}

      <div className="space-y-2 mb-4">
        {poll.options.map((option) => (
          <div key={option.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={poll.id}
                  value={option.id}
                  checked={selectedOption === option.id}
                  onChange={() => handleVote(option.id)}
                  className="w-4 h-4 accent-primary-400"
                  disabled={poll.status !== 'active'}
                />
                <div className="flex items-center gap-2">
                  {option.image_url ? (
                    <VotingOptionThumbnail src={option.image_url} label={option.label} />
                  ) : null}
                  <span className="text-sm font-medium text-dark-900">{option.label}</span>
                </div>
              </label>
              <span className="text-sm font-medium text-primary-400">
                {option.vote_count} ({option.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-dark-100 rounded-full h-2">
              <div
                className="bg-primary-400 h-2 rounded-full transition-all"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-3 border-t border-dark-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-600">Avance del quórum</span>
          <span className="font-semibold text-dark-900">
            {totalVotes} / {poll.quorum_required}
          </span>
        </div>
        <div className="w-full bg-dark-100 rounded-full h-2">
          <div
            className="bg-primary-400 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(quorumPercentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
