import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  LogIn,
  Copy,
  Check,
  Crown,
  Play,
  LogOut,
  MapPin,
  Wifi,
} from 'lucide-react';
import {
  CarStats,
  MultiplayerRoomState,
  PlayerProfile,
  TrackId,
} from '../types/game';
import { TRACKS_CATALOG } from '../data/cars';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  currentCar: CarStats;
  selectedTrack: TrackId;
  room: MultiplayerRoomState | null;
  selfId: string | null;
  errorMsg: string | null;
  statusBanner: string | null;
  isBusy: boolean;
  onCreateRoom: (trackId: TrackId, totalLaps: number) => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onSetTrack: (trackId: TrackId, totalLaps: number) => void;
  onStartRace: () => void;
  onOpenProfile: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  profile,
  currentCar,
  selectedTrack,
  room,
  selfId,
  errorMsg,
  statusBanner,
  isBusy,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onSetTrack,
  onStartRace,
  onOpenProfile,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [hostTrack, setHostTrack] = useState<TrackId>(selectedTrack);
  const [hostLaps, setHostLaps] = useState(3);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isHost = Boolean(room && selfId && room.hostId === selfId);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-black font-['Chakra_Petch',sans-serif] tracking-wider text-white uppercase">
                ONLINE MULTIPLAYER RACING
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>DRIVER:</span>
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-2 cursor-pointer"
                >
                  {profile.username}
                </button>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-300">{currentCar.name}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close multiplayer lobby"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inline error or status notice */}
        {errorMsg && (
          <div className="px-4 py-3 rounded-xl bg-rose-950/70 border border-rose-500/70 text-rose-200 text-xs font-mono">
            {errorMsg}
          </div>
        )}
        {statusBanner && !errorMsg && (
          <div className="px-4 py-3 rounded-xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 text-xs font-mono">
            {statusBanner}
          </div>
        )}

        {/* VIEW 1: CREATE OR JOIN ROOM */}
        {!room && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Host Game Card */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Plus className="w-4 h-4" />
                  <h3 className="text-sm font-black font-['Chakra_Petch',sans-serif] tracking-wider uppercase text-white">
                    CREATE ROOM / HOST GAME
                  </h3>
                </div>
                <p className="text-xs text-zinc-400">
                  Generate a shareable room code and race up to 4 players in real time.
                </p>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono uppercase text-zinc-400">Circuit</span>
                  <div className="flex flex-col gap-1.5">
                    {TRACKS_CATALOG.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setHostTrack(t.id)}
                        className={`h-10 px-3 rounded-xl border text-xs font-mono text-left flex items-center justify-between cursor-pointer transition-colors ${
                          hostTrack === t.id
                            ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>{t.name}</span>
                        <span className="text-[10px] text-zinc-500">{t.difficulty}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono uppercase text-zinc-400">Race Laps</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 5].map((lapOpt) => (
                      <button
                        key={lapOpt}
                        type="button"
                        onClick={() => setHostLaps(lapOpt)}
                        className={`w-10 h-10 rounded-lg font-mono text-xs font-bold border cursor-pointer transition-colors ${
                          hostLaps === lapOpt
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {lapOpt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => onCreateRoom(hostTrack, hostLaps)}
                className="w-full h-12 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black font-['Chakra_Petch',sans-serif] tracking-wider uppercase rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isBusy ? 'CONNECTING...' : 'HOST RACE ROOM'}</span>
              </button>
            </div>

            {/* Join Room Card */}
            <form
              onSubmit={handleJoinSubmit}
              className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <LogIn className="w-4 h-4" />
                  <h3 className="text-sm font-black font-['Chakra_Petch',sans-serif] tracking-wider uppercase text-white">
                    JOIN ROOM
                  </h3>
                </div>
                <p className="text-xs text-zinc-400">
                  Enter a 6-character room code shared by the host to jump directly onto the starting grid.
                </p>

                <div className="flex flex-col gap-2 mt-2">
                  <label
                    htmlFor="room-code-input"
                    className="text-[11px] font-mono uppercase text-zinc-400"
                  >
                    Room Code
                  </label>
                  <input
                    id="room-code-input"
                    type="text"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="E.G. RAC7X2"
                    className="w-full h-12 px-4 bg-zinc-950 border border-zinc-700 focus:border-cyan-400 focus:outline-none rounded-xl text-lg font-black font-mono tracking-[0.25em] text-white uppercase text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy || joinCode.trim().length < 3}
                className="w-full h-12 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black font-['Chakra_Petch',sans-serif] tracking-wider uppercase rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{isBusy ? 'JOINING...' : 'JOIN RACE'}</span>
              </button>
            </form>
          </div>
        )}

        {/* VIEW 2: ACTIVE MULTIPLAYER ROOM LOBBY */}
        {room && (
          <div className="flex flex-col gap-4">
            {/* Room Code & Status Banner */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">
                    ROOM CODE · SHARE WITH FRIENDS
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono tracking-[0.22em] text-amber-400">
                      {room.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="h-9 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-zinc-300">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>{room.players.length} / 4 RACERS</span>
                <span className="text-zinc-600">/</span>
                <span>{room.totalLaps} LAPS</span>
              </div>
            </div>

            {/* Track Selection Bar (Editable by Host, View-only for Guests) */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span className="text-zinc-400">CIRCUIT:</span>
                <span className="font-bold text-white">
                  {TRACKS_CATALOG.find((t) => t.id === room.trackId)?.name || room.trackId}
                </span>
              </div>

              {isHost && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TRACKS_CATALOG.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSetTrack(t.id, room.totalLaps)}
                      className={`h-9 px-3 rounded-lg text-[11px] font-mono border cursor-pointer transition-colors ${
                        room.trackId === t.id
                          ? 'bg-cyan-500 text-zinc-950 border-cyan-400 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.name.split(' ')[0]}
                    </button>
                  ))}
                  {[1, 3, 5].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => onSetTrack(room.trackId, l)}
                      className={`h-9 px-2.5 rounded-lg text-[11px] font-mono border cursor-pointer transition-colors ${
                        room.totalLaps === l
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {l}L
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Connected Racers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((slotIndex) => {
                const player = room.players[slotIndex];
                if (!player) {
                  return (
                    <div
                      key={slotIndex}
                      className="p-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 flex items-center justify-between text-xs font-mono text-zinc-600"
                    >
                      <span>GRID SLOT #{slotIndex + 1}</span>
                      <span>WAITING FOR RACER...</span>
                    </div>
                  );
                }

                const isSelf = player.id === selfId;
                return (
                  <div
                    key={player.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      isSelf
                        ? 'bg-amber-500/10 border-amber-500/60'
                        : 'bg-zinc-900/70 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Paint Color Swatch */}
                      <div
                        className="w-10 h-10 rounded-xl border-2 border-white/20 shrink-0 flex items-center justify-center text-xs font-black font-mono text-white shadow"
                        style={{ backgroundColor: player.car.primaryColor }}
                      >
                        P{slotIndex + 1}
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black font-['Chakra_Petch',sans-serif] text-white tracking-wider">
                            {player.username}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-mono text-amber-400 font-bold">
                              (YOU)
                            </span>
                          )}
                          {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {player.car.name} · {player.car.decalType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: player.car.accentColor }}
                      title="Accent Trim"
                    />
                  </div>
                );
              })}
            </div>

            {/* Lobby Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={onLeaveRoom}
                className="w-full sm:w-auto h-11 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>LEAVE ROOM</span>
              </button>

              {isHost ? (
                <button
                  type="button"
                  onClick={onStartRace}
                  className="w-full sm:w-auto h-12 px-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black font-['Chakra_Petch',sans-serif] tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START ONLINE RACE</span>
                </button>
              ) : (
                <div className="text-xs font-mono text-cyan-300">
                  Waiting for host to launch race countdown...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
