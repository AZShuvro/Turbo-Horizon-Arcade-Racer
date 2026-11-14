import React from 'react';
import {
  Play,
  RotateCcw,
  Home,
  Volume2,
  VolumeX,
  Music,
  Camera,
  LocateFixed,
  SlidersHorizontal,
  Film,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onOpenSettings?: () => void;
  onTogglePhotoMode?: () => void;
  onResetCar?: () => void;
  canReplay?: boolean;
  onWatchReplay?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  onOpenSettings,
  onTogglePhotoMode,
  onResetCar,
  canReplay = false,
  onWatchReplay,
}) => {
  const [muted, setMuted] = React.useState(soundManager.getMuted());
  const [musicOn, setMusicOn] = React.useState(soundManager.isMusicOn());

  const handleToggleMute = () => {
    const isM = soundManager.toggleMute();
    setMuted(isM);
  };

  const handleToggleMusic = () => {
    const isM = soundManager.toggleMusic();
    setMusicOn(isM);
  };

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/55 flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-sm backdrop-blur-xl bg-black/70 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-hud-toast">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-2xl font-black italic font-['Chakra_Petch',sans-serif] tracking-wider text-white uppercase">
            Paused
          </h2>
          <span className="text-[11px] font-mono text-zinc-400">RACE MENU</span>
        </div>

        {/* Quick Tools Grid (Secondary Actions kept out of Driving HUD) */}
        <div className="grid grid-cols-2 gap-2.5">
          {onTogglePhotoMode && (
            <button
              type="button"
              onClick={() => {
                onResume();
                onTogglePhotoMode();
              }}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-medium text-cyan-300 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Photo Mode</span>
            </button>
          )}

          {onResetCar && (
            <button
              type="button"
              onClick={() => {
                onResetCar();
                onResume();
              }}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-medium text-amber-300 transition-colors cursor-pointer"
            >
              <LocateFixed className="w-4 h-4 shrink-0" />
              <span>Reset Car</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleMusic}
            className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              musicOn
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-black/40 border-white/10 text-zinc-500'
            }`}
          >
            <Music className={`w-4 h-4 shrink-0 ${musicOn ? 'text-amber-400' : 'text-zinc-500'}`} />
            <span>Music {musicOn ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              !muted
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-black/40 border-white/10 text-rose-400'
            }`}
          >
            {muted ? <VolumeX className="w-4 h-4 shrink-0" /> : <Volume2 className="w-4 h-4 shrink-0 text-amber-400" />}
            <span>Audio {muted ? 'Muted' : 'On'}</span>
          </button>
        </div>

        {/* Primary Action Stack */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-black italic text-sm tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 font-['Chakra_Petch',sans-serif] shadow-[0_0_24px_rgba(245,158,11,0.35)] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          {canReplay && onWatchReplay && (
            <button
              type="button"
              onClick={onWatchReplay}
              className="w-full min-h-[44px] py-2.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-bold text-xs tracking-wide rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Film className="w-4 h-4" />
              <span>Watch 10s Replay</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[44px] py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs tracking-wide rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="min-h-[44px] py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs tracking-wide rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Settings</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onHome}
            className="w-full min-h-[44px] py-2.5 bg-black/40 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-semibold text-xs tracking-wide rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Exit to Showroom</span>
          </button>
        </div>
      </div>
    </div>
  );
};
