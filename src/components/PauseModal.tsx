import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Music } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onHome }) => {
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
    <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center p-6 z-40 select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5">
        <h2 className="text-2xl font-black font-['Chakra_Petch',sans-serif] tracking-wider text-amber-300">
          GAME PAUSED
        </h2>

        {/* Audio Toggles */}
        <div className="flex items-center gap-3 w-full justify-center py-2">
          <button
            onClick={handleToggleMusic}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
              musicOn
                ? 'bg-slate-800 border-slate-700 text-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>MUSIC: {musicOn ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
              !muted
                ? 'bg-slate-800 border-slate-700 text-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>SFX: {!muted ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onResume}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 font-['Chakra_Petch',sans-serif] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 font-['Chakra_Petch',sans-serif] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART</span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 font-['Chakra_Petch',sans-serif] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
