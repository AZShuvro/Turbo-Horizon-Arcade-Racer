import React from 'react';
import { RotateCcw, Home, Trophy, Flame, Coins, Navigation, Users, Crown } from 'lucide-react';

export interface OnlineStandingResult {
  id: string;
  username: string;
  carName: string;
  rank: number | null;
  finishTime: number | null;
  finished: boolean;
  isLocal: boolean;
}

interface GameOverModalProps {
  score: number;
  highScore: number;
  isNewHigh: boolean;
  distance: number;
  coins: number;
  nearMisses: number;
  onRestart: () => void;
  onHome: () => void;
  gameMode?: string;
  onlineResults?: OnlineStandingResult[];
  isHost?: boolean;
  onBackToLobby?: () => void;
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
  gameMode,
  onlineResults,
  isHost,
  onBackToLobby,
}) => {
  const isOnline = gameMode === 'online';
  const localRank = onlineResults?.find((r) => r.isLocal)?.rank;

  const formatOrdinal = (rank: number) => {
    if (rank === 1) return '1ST PLACE';
    if (rank === 2) return '2ND PLACE';
    if (rank === 3) return '3RD PLACE';
    return `${rank}TH PLACE`;
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-6 z-40 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center gap-6">
        {/* Title Lockup */}
        <div className="text-center">
          {isOnline ? (
            <>
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                ONLINE MULTIPLAYER FINISH
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-wider font-['Chakra_Petch',sans-serif] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-cyan-400 mt-1">
                {localRank ? formatOrdinal(localRank) : 'RACE COMPLETE'}
              </h2>
            </>
          ) : (
            <>
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
                TIME&apos;S UP!
              </h2>
            </>
          )}
        </div>

        {/* Online Podium Standings OR Single-Player Score */}
        {isOnline && onlineResults && onlineResults.length > 0 ? (
          <div className="w-full flex flex-col gap-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
              FINAL STANDINGS
            </span>
            {onlineResults.map((r, idx) => {
              const displayRank = r.rank || idx + 1;
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-mono ${
                    r.isLocal
                      ? 'bg-amber-500/15 border-amber-500/60 text-white font-bold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-black ${
                        displayRank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : displayRank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : displayRank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {displayRank}
                    </span>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 font-['Chakra_Petch',sans-serif] text-sm">
                        {displayRank === 1 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        {r.username}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">{r.carName}</span>
                    </div>
                  </div>
                  <span className="tabular-nums text-cyan-300">
                    {r.finished && r.finishTime !== null
                      ? `${r.finishTime.toFixed(2)}s`
                      : 'RACING'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full py-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <span className="text-xs font-mono uppercase text-slate-400">Total Score</span>
            <span className="text-4xl md:text-5xl font-black font-['Chakra_Petch',sans-serif] text-amber-300 tabular-nums">
              {score.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-500 mt-1">
              BEST: <span className="text-slate-300 tabular-nums">{highScore.toLocaleString()} PTS</span>
            </span>
          </div>
        )}

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
          {isOnline ? (
            <>
              {isHost && onBackToLobby ? (
                <button
                  onClick={onBackToLobby}
                  className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wider rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 font-['Chakra_Petch',sans-serif] cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>BACK TO LOBBY</span>
                </button>
              ) : (
                <div className="w-full sm:flex-1 py-3 px-4 bg-slate-950/80 border border-slate-800 rounded-xl text-center text-xs font-mono text-cyan-300">
                  Waiting for host or exit to garage
                </div>
              )}

              <button
                onClick={onHome}
                className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 font-['Chakra_Petch',sans-serif] cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>GARAGE</span>
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
