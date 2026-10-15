import React from 'react';
import { RotateCcw, Home, Trophy, Flame, Coins, Navigation } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  highScore: number;
  isNewHigh: boolean;
  distance: number;
  coins: number;
  nearMisses: number;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  highScore,
  isNewHigh,
  distance,
  coins,
  nearMisses,
  onRestart,
  onHome,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-6 z-40 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center gap-6">
        {/* Title Lockup */}
        <div className="text-center">
          {isNewHigh ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500 rounded-full text-amber-300 font-mono text-xs mb-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              NEW HIGH SCORE RECORD!
            </div>
          ) : (
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              RACE FINISHED
            </span>
          )}
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-wider font-['Chakra_Petch',sans-serif] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">
            TIME'S UP!
          </h2>
        </div>

        {/* Big Score Display */}
        <div className="flex flex-col items-center justify-center w-full py-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
          <span className="text-xs font-mono uppercase text-slate-400">Total Score</span>
          <span className="text-4xl md:text-5xl font-black font-['Chakra_Petch',sans-serif] text-amber-300 tabular-nums">
            {score.toLocaleString()}
          </span>
          <span className="text-xs font-mono text-slate-500 mt-1">
            BEST: <span className="text-slate-300 tabular-nums">{highScore.toLocaleString()} PTS</span>
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <div className="flex flex-col items-center p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
            <Navigation className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-base font-bold font-['Chakra_Petch',sans-serif] text-white tabular-nums">
              {(distance / 1000).toFixed(2)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">KILOMETERS</span>
          </div>

          <div className="flex flex-col items-center p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
            <Coins className="w-4 h-4 text-yellow-400 mb-1" />
            <span className="text-base font-bold font-['Chakra_Petch',sans-serif] text-white tabular-nums">
              {coins}
            </span>
            <span className="text-[10px] font-mono text-slate-400">COINS</span>
          </div>

          <div className="flex flex-col items-center p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
            <Flame className="w-4 h-4 text-orange-400 mb-1" />
            <span className="text-base font-bold font-['Chakra_Petch',sans-serif] text-white tabular-nums">
              {nearMisses}
            </span>
            <span className="text-[10px] font-mono text-slate-400">NEAR MISSES</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRestart}
            className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-sm tracking-wider rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 font-['Chakra_Petch',sans-serif] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
            <span className="text-xs bg-slate-950/30 text-slate-900 px-2 py-0.5 rounded font-mono font-bold">
              SPACE
            </span>
          </button>

          <button
            onClick={onHome}
            className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 font-['Chakra_Petch',sans-serif] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>GARAGE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
