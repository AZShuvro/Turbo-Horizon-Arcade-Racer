import React, { useState, useEffect } from 'react';
import { X, User, Check, Trophy, Coins, Flag, Award } from 'lucide-react';
import { PlayerProfile } from '../types/game';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  highScore: number;
  totalCoins: number;
  onSaveProfile: (updated: PlayerProfile) => void;
}

const TAG_COLORS = [
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Electric Cyan', hex: '#06b6d4' },
  { name: 'Crimson Red', hex: '#ef4444' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Violet Pulse', hex: '#a855f7' },
  { name: 'Pure White', hex: '#f8fafc' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  highScore,
  totalCoins,
  onSaveProfile,
}) => {
  const [username, setUsername] = useState(profile.username);
  const [tagColor, setTagColor] = useState(profile.tagColor || '#f59e0b');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername(profile.username);
      setTagColor(profile.tagColor || '#f59e0b');
      setError('');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().toUpperCase().replace(/[^A-Z0-9 _-]/g, '');
    if (trimmed.length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }
    onSaveProfile({
      ...profile,
      username: trimmed.slice(0, 14),
      tagColor,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-black font-['Chakra_Petch',sans-serif] tracking-wider text-white uppercase">
                DRIVER PROFILE
              </h2>
              <p className="text-xs font-mono text-zinc-400">
                Displayed on HUD, leaderboards &amp; 3D car nameplate
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close driver profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Username input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="driver-username-input"
              className="text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Driver Username (2–14 chars)
            </label>
            <input
              id="driver-username-input"
              type="text"
              maxLength={14}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="ENTER CALLSIGN"
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-amber-400 focus:outline-none rounded-xl text-base font-black font-['Chakra_Petch',sans-serif] tracking-widest text-white uppercase"
              autoFocus
            />
            {error && <span className="text-xs font-mono text-rose-400">{error}</span>}
          </div>

          {/* Tag Accent Color */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Nameplate Accent Color
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              {TAG_COLORS.map((c) => {
                const active = tagColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setTagColor(c.hex)}
                    title={c.name}
                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-transform cursor-pointer ${
                      active ? 'border-white scale-105' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {active && <Check className="w-4 h-4 text-zinc-950 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live 3D Tag Preview */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase">3D Tag Preview</span>
            <div
              className="px-3 py-1 rounded-lg bg-slate-950 border-2 flex items-center gap-2"
              style={{ borderColor: tagColor }}
            >
              <span className="w-1.5 h-3.5 rounded-sm" style={{ backgroundColor: tagColor }} />
              <span className="text-xs font-black font-['Chakra_Petch',sans-serif] text-white tracking-wider">
                {(username.trim() || 'DRIVER 01').toUpperCase().slice(0, 14)}
              </span>
            </div>
          </div>

          {/* Career Stats Summary */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2.5">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Best Score</span>
                <span className="text-sm font-black font-['Chakra_Petch',sans-serif] text-white tabular-nums">
                  {highScore.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-yellow-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Banked Coins</span>
                <span className="text-sm font-black font-['Chakra_Petch',sans-serif] text-white tabular-nums">
                  {totalCoins.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2.5">
              <Flag className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Online Races</span>
                <span className="text-sm font-black font-['Chakra_Petch',sans-serif] text-white tabular-nums">
                  {profile.racesCompleted}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2.5">
              <Award className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Podium Wins</span>
                <span className="text-sm font-black font-['Chakra_Petch',sans-serif] text-white tabular-nums">
                  {profile.wins}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black font-['Chakra_Petch',sans-serif] tracking-wider uppercase rounded-xl transition-colors cursor-pointer"
          >
            SAVE PROFILE
          </button>
        </form>
      </div>
    </div>
  );
};
