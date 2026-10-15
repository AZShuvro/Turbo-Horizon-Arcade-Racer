import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Keyboard,
  Sun,
  Camera,
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  Check,
  Trophy,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  KeyBindings,
  TransmissionType,
  CameraView,
  WeatherType,
  GraphicsQuality,
  Achievement,
} from '../types/game';
import { DEFAULT_KEYBINDINGS } from '../data/cars';
import { soundManager } from '../audio/soundManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Controls
  transmission: TransmissionType;
  onChangeTransmission: (t: TransmissionType) => void;
  keyBindings: KeyBindings;
  onChangeKeyBindings: (kb: KeyBindings) => void;
  // Camera & Weather
  cameraView: CameraView;
  onChangeCameraView: (cam: CameraView) => void;
  weather: WeatherType;
  onChangeWeather: (w: WeatherType) => void;
  // Graphics & Audio
  quality: GraphicsQuality;
  onChangeQuality: (q: GraphicsQuality) => void;
  // Achievements
  achievements: Achievement[];
  totalCoins: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  transmission,
  onChangeTransmission,
  keyBindings,
  onChangeKeyBindings,
  cameraView,
  onChangeCameraView,
  weather,
  onChangeWeather,
  quality,
  onChangeQuality,
  achievements,
  totalCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'atmosphere' | 'graphics' | 'achievements'>('controls');
  const [rebindingAction, setRebindingAction] = useState<keyof KeyBindings | null>(null);

  const [muted, setMuted] = useState(soundManager.getMuted());
  const [musicOn, setMusicOn] = useState(soundManager.isMusicOn());

  useEffect(() => {
    if (!rebindingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newBindings = {
        ...keyBindings,
        [rebindingAction]: e.code,
      };
      onChangeKeyBindings(newBindings);
      setRebindingAction(null);
      soundManager.playBlinker();
    };

    window.addEventListener('keydown', handleKeyDown, { once: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rebindingAction, keyBindings, onChangeKeyBindings]);

  if (!isOpen) return null;

  const formatKeyName = (code: string) => {
    if (!code) return 'None';
    return code
      .replace('Key', '')
      .replace('Digit', '')
      .replace('Arrow', '↑ ')
      .replace('BracketLeft', '[')
      .replace('BracketRight', ']')
      .replace('AltLeft', 'Left Alt')
      .replace('AltRight', 'Right Alt')
      .replace('ControlLeft', 'Left Ctrl')
      .replace('ControlRight', 'Right Ctrl')
      .replace('ShiftLeft', 'Left Shift')
      .replace('ShiftRight', 'Right Shift');
  };

  const KEY_LABELS: { key: keyof KeyBindings; label: string; group: string }[] = [
    { key: 'throttle', label: 'Throttle (Accelerate)', group: 'Driving' },
    { key: 'brake', label: 'Brake / Reverse', group: 'Driving' },
    { key: 'steerLeft', label: 'Steer Left', group: 'Driving' },
    { key: 'steerRight', label: 'Steer Right', group: 'Driving' },
    { key: 'drift', label: 'Handbrake Drift', group: 'Driving' },
    { key: 'nitro', label: 'Nitro Boost', group: 'Driving' },
    { key: 'clutch', label: 'Manual Clutch', group: 'Manual Transmission' },
    { key: 'upshift', label: 'Upshift Gear (Hold Clutch)', group: 'Manual Transmission' },
    { key: 'downshift', label: 'Downshift Gear (Hold Clutch)', group: 'Manual Transmission' },
    { key: 'headlights', label: 'Toggle Headlights', group: 'Car Controls' },
    { key: 'indicatorLeft', label: 'Left Turn Signal', group: 'Car Controls' },
    { key: 'indicatorRight', label: 'Right Turn Signal', group: 'Car Controls' },
    { key: 'hazardLights', label: 'Hazard Warning Flashers', group: 'Car Controls' },
    { key: 'doors', label: 'Open / Close Doors', group: 'Interactive Openables' },
    { key: 'trunk', label: 'Open / Close Trunk', group: 'Interactive Openables' },
    { key: 'cameraToggle', label: 'Switch Camera View', group: 'Views' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-6 bg-amber-500 rounded-sm" />
            <h2 className="text-xl font-black tracking-wider text-white font-['Chakra_Petch',sans-serif] uppercase">
              Game Settings & Controls
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-6 py-2.5 border-b border-slate-800 bg-slate-950/30 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('controls')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'controls'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            CONTROLS & SHIFTING
          </button>
          <button
            onClick={() => setActiveTab('atmosphere')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'atmosphere'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            WEATHER & CAMERA
          </button>
          <button
            onClick={() => setActiveTab('graphics')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'graphics'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            GRAPHICS & AUDIO
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'achievements'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            ACHIEVEMENTS ({achievements.filter((a) => a.unlocked).length}/{achievements.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
          {/* TAB 1: CONTROLS & SHIFTING */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Transmission Toggle */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif]">
                      TRANSMISSION SYSTEM
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Choose between effortless automatic gear progression or authentic clutch manual shifting.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <button
                    onClick={() => {
                      onChangeTransmission('automatic');
                      soundManager.playBlinker();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      transmission === 'automatic'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-white mb-1">AUTOMATIC</div>
                    <div className="text-[11px] text-slate-400">Gears auto-shift seamlessly with speed. Just throttle and steer.</div>
                  </button>

                  <button
                    onClick={() => {
                      onChangeTransmission('manual');
                      soundManager.playBlinker();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      transmission === 'manual'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-white mb-1">MANUAL SHIFTING</div>
                    <div className="text-[11px] text-slate-400">Hold Clutch key to Upshift/Downshift. Shift without clutch triggers grinding!</div>
                  </button>
                </div>
              </div>

              {/* Keybindings List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif]">
                    KEYBOARD MAPPING
                  </h3>
                  <button
                    onClick={() => {
                      onChangeKeyBindings(DEFAULT_KEYBINDINGS);
                      soundManager.playBlinker();
                    }}
                    className="text-xs font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Defaults
                  </button>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                  {KEY_LABELS.map(({ key, label, group }) => (
                    <div key={key} className="flex items-center justify-between p-3 px-4 hover:bg-slate-900/40 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 text-xs">{label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{group}</span>
                      </div>

                      <button
                        onClick={() => setRebindingAction(key)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer min-w-24 text-center ${
                          rebindingAction === key
                            ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                            : 'bg-slate-900 border-slate-700 text-amber-300 hover:border-amber-500 hover:text-white'
                        }`}
                      >
                        {rebindingAction === key ? 'Press Key...' : formatKeyName(keyBindings[key])}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATMOSPHERE & CAMERA */}
          {activeTab === 'atmosphere' && (
            <div className="space-y-6">
              {/* Weather & Lighting */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-1">
                  WEATHER & LIGHTING ATMOSPHERE
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Select track atmosphere with dynamic road reflections and rain physics.
                </p>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  {[
                    { id: 'sunny', title: 'SUNNY DAY', desc: 'Crisp bright skies and high visibility' },
                    { id: 'sunset', title: 'GOLDEN SUNSET', desc: 'Warm dusk hour with rich horizon gradients' },
                    { id: 'night', title: 'CYBER NIGHT', desc: 'Midnight gloom illuminated by headlights & neon' },
                    { id: 'rain', title: 'RAIN & WET ASPHALT', desc: 'Glossy tarmac reflections and slick low-traction drift' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        onChangeWeather(w.id as WeatherType);
                        soundManager.playBlinker();
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        weather === w.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white mb-0.5">{w.title}</div>
                      <div className="text-[10px] text-slate-400">{w.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Angle Toggle */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-1">
                  CAMERA ANGLE VIEW
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Switch between chase follow, immersive cockpit hood view, or classic arcade bird's eye.
                </p>

                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  {[
                    { id: 'thirdPerson', title: 'THIRD-PERSON', desc: 'Dynamic chase follow behind car' },
                    { id: 'hood', title: 'HOOD / COCKPIT', desc: 'Low-slung bonnet camera speed rush' },
                    { id: 'topDown', title: 'TOP-DOWN ARCADE', desc: 'Retro aerial perspective overhead' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onChangeCameraView(c.id as CameraView);
                        soundManager.playBlinker();
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        cameraView === c.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white mb-0.5">{c.title}</div>
                      <div className="text-[10px] text-slate-400">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GRAPHICS & AUDIO */}
          {activeTab === 'graphics' && (
            <div className="space-y-6">
              {/* Graphics Presets */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-1">
                  GRAPHICS PRESETS (OPTIMIZATION)
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Tailored to maintain a rock-solid 60 FPS on any laptop or integrated GPU.
                </p>

                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  {[
                    { id: 'low', title: 'ECO 60 (LOW)', desc: '1.0x native, shadows off, max framerate for budget laptops' },
                    { id: 'balanced', title: 'BALANCED', desc: '1.25x pixel ratio, PCF shadows, ideal default' },
                    { id: 'high', title: 'ULTRA HIGH', desc: '2.0x retina resolution, soft shadows, max visual flair' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        onChangeQuality(q.id as GraphicsQuality);
                        soundManager.playBlinker();
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        quality === q.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white mb-0.5">{q.title}</div>
                      <div className="text-[10px] text-slate-400">{q.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Controls */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-3">
                  AUDIO & MUSIC
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const isM = soundManager.toggleMusic();
                      setMusicOn(isM);
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
                  >
                    <Music className={`w-5 h-5 ${musicOn ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div className="text-left font-mono">
                      <div className="text-xs font-bold text-white">SYNTH MUSIC</div>
                      <div className="text-[10px] text-slate-400">{musicOn ? 'Enabled' : 'Muted'}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      const isM = soundManager.toggleMute();
                      setMuted(isM);
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer"
                  >
                    {muted ? (
                      <VolumeX className="w-5 h-5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-amber-400" />
                    )}
                    <div className="text-left font-mono">
                      <div className="text-xs font-bold text-white">ALL SOUND EFFECTS</div>
                      <div className="text-[10px] text-slate-400">{muted ? 'Muted' : 'Enabled'}</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif]">
                    RACE ACHIEVEMENTS
                  </h3>
                  <p className="text-xs text-slate-400">
                    Complete challenges during races to earn bonus reward coins!
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                  TOTAL COINS: {totalCoins.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                      ach.unlocked
                        ? 'bg-amber-950/20 border-amber-500/40 text-slate-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 opacity-75'
                    }`}
                  >
                    <div className="text-2xl p-2 rounded-xl bg-slate-900 border border-slate-800">
                      {ach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{ach.title}</span>
                        {ach.unlocked ? (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> UNLOCKED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            +{ach.rewardCoins} COINS
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs uppercase transition-all cursor-pointer shadow-lg"
          >
            Apply & Return
          </button>
        </div>
      </div>
    </div>
  );
};
