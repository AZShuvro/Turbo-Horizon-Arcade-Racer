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
  Smartphone,
  Radio,
  Flame,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  KeyBindings,
  TransmissionType,
  CameraView,
  WeatherType,
  GraphicsQuality,
  Achievement,
  OnScreenControlSetting,
  RadioStation,
} from '../types/game';
import { DEFAULT_KEYBINDINGS, KEYBINDING_PRESETS } from '../data/cars';
import { soundManager } from '../audio/soundManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Controls
  transmission: TransmissionType;
  onChangeTransmission: (t: TransmissionType) => void;
  keyBindings: KeyBindings;
  onChangeKeyBindings: (kb: KeyBindings) => void;
  // Mobile / Touch controls
  touchControls: OnScreenControlSetting;
  onChangeTouchControls: (tc: OnScreenControlSetting) => void;
  // Camera & Weather
  cameraView: CameraView;
  onChangeCameraView: (cam: CameraView) => void;
  weather: WeatherType;
  onChangeWeather: (w: WeatherType) => void;
  // Graphics & Audio
  quality: GraphicsQuality;
  onChangeQuality: (q: GraphicsQuality) => void;
  radioStation: RadioStation;
  onChangeRadioStation: (rs: RadioStation) => void;
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
  touchControls,
  onChangeTouchControls,
  cameraView,
  onChangeCameraView,
  weather,
  onChangeWeather,
  quality,
  onChangeQuality,
  radioStation,
  onChangeRadioStation,
  achievements,
  totalCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'touch' | 'atmosphere' | 'graphics' | 'achievements'>('controls');
  const [rebindingAction, setRebindingAction] = useState<keyof KeyBindings | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [muted, setMuted] = useState(soundManager.getMuted());
  const [musicOn, setMusicOn] = useState(soundManager.isMusicOn());

  useEffect(() => {
    if (!rebindingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newCode = e.code;
      // Check if key is already assigned to another action
      const duplicateEntry = Object.entries(keyBindings).find(
        ([act, code]) => code === newCode && act !== rebindingAction
      );

      if (duplicateEntry) {
        setConflictWarning(`"${formatKeyName(newCode)}" was already assigned to ${duplicateEntry[0]}. Reassigned!`);
        setTimeout(() => setConflictWarning(null), 3500);
      }

      const newBindings: KeyBindings = {
        ...keyBindings,
        [rebindingAction]: newCode,
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

  const KEY_LABELS: { key: keyof KeyBindings; label: string; group: string; desc: string }[] = [
    { key: 'throttle', label: 'Throttle (Accelerate)', group: 'Primary Driving', desc: 'Accelerates the car forward' },
    { key: 'brake', label: 'Brake / Reverse', group: 'Primary Driving', desc: 'Slows down car or reverses when stopped' },
    { key: 'steerLeft', label: 'Steer Left', group: 'Primary Driving', desc: 'Turns the front wheels left' },
    { key: 'steerRight', label: 'Steer Right', group: 'Primary Driving', desc: 'Turns the front wheels right' },
    { key: 'drift', label: 'Handbrake Drift', group: 'Primary Driving', desc: 'Locks rear tires for high-angle drifting' },
    { key: 'nitro', label: 'Nitro Boost', group: 'Primary Driving', desc: 'Engages high-thrust nitrous injection' },
    { key: 'clutch', label: 'Manual Clutch', group: 'Manual Transmission', desc: 'Disengages drivetrain to allow smooth gear shifting' },
    { key: 'upshift', label: 'Upshift Gear (Hold Clutch)', group: 'Manual Transmission', desc: 'Shifts up to higher gear (1-6)' },
    { key: 'downshift', label: 'Downshift Gear (Hold Clutch)', group: 'Manual Transmission', desc: 'Shifts down to lower gear with exhaust pop' },
    { key: 'headlights', label: 'Toggle Headlights', group: 'Interactive Vehicle', desc: 'Switches low/high beam headlights' },
    { key: 'indicatorLeft', label: 'Left Turn Signal', group: 'Interactive Vehicle', desc: 'Blinks left amber indicator lamp' },
    { key: 'indicatorRight', label: 'Right Turn Signal', group: 'Interactive Vehicle', desc: 'Blinks right amber indicator lamp' },
    { key: 'hazardLights', label: 'Hazard Flashers', group: 'Interactive Vehicle', desc: 'Flashes all four amber corner lights' },
    { key: 'doors', label: 'Open / Close Doors', group: 'Interactive Vehicle', desc: 'Low-poly doors open/close animation' },
    { key: 'trunk', label: 'Open / Close Trunk', group: 'Interactive Vehicle', desc: 'Rear trunk lid open/close animation' },
    { key: 'horn', label: 'Car Horn Honk', group: 'Interactive Vehicle', desc: 'Sounds the dual-tone horn' },
    { key: 'cameraToggle', label: 'Switch Camera Angle', group: 'Views & Systems', desc: 'Toggles Third-Person / Hood / Top-Down' },
    { key: 'worldMap', label: 'Open-World Map & GPS', group: 'Views & Systems', desc: 'Opens interactive 4-zone map, GPS & fast travel' },
    { key: 'radio', label: 'Cycle Music Station', group: 'Views & Systems', desc: 'Synthwave / Retro Arcade / Lo-Fi / Mute' },
    { key: 'photoMode', label: 'Photo Mode Toggle', group: 'Views & Systems', desc: 'Freezes action for cinematic screenshot' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-6 bg-amber-500 rounded-sm" />
            <h2 className="text-xl font-black tracking-wider text-white font-['Chakra_Petch',sans-serif] uppercase">
              Settings & Custom Controls
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
        <div className="flex items-center gap-1 px-4 sm:px-6 py-2.5 border-b border-slate-800 bg-slate-950/40 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('controls')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'controls'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            KEY MAPPING
          </button>

          <button
            onClick={() => setActiveTab('touch')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'touch'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            MOBILE & TOUCH
          </button>

          <button
            onClick={() => setActiveTab('atmosphere')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'atmosphere'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            ATMOSPHERE & CAM
          </button>

          <button
            onClick={() => setActiveTab('graphics')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'graphics'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            GRAPHICS & RADIO
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'achievements'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            BADGES ({achievements.filter((a) => a.unlocked).length}/{achievements.length})
          </button>
        </div>

        {/* Conflict Notice Toast */}
        {conflictWarning && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 px-6 py-2 text-xs font-mono text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{conflictWarning}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
          {/* TAB 1: CONTROLS & KEY MAPPING */}
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
                      Choose between automatic effortless gears or full manual clutch shifting.
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
                    <div className="text-[11px] text-slate-400">Gears advance automatically with speed. Great for arcade cruising.</div>
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
                    <div className="text-[11px] text-slate-400">Hold Clutch to Shift Up/Down. Shifting without clutch grinds transmission!</div>
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm font-['Chakra_Petch',sans-serif]">
                    KEYBOARD PRESETS
                  </h3>
                  <button
                    onClick={() => {
                      onChangeKeyBindings(DEFAULT_KEYBINDINGS);
                      soundManager.playBlinker();
                    }}
                    className="text-xs font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Defaults
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {KEYBINDING_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        onChangeKeyBindings(p.bindings);
                        soundManager.playBlinker();
                      }}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:border-amber-500/60 text-left transition-all cursor-pointer"
                    >
                      <div className="font-bold text-xs text-slate-100 font-mono">{p.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Keymapping List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif]">
                      CUSTOM KEYBOARD MAPPING
                    </h3>
                    <p className="text-xs text-slate-400">
                      Click any key box and press any keyboard key to assign your preferred keybinding.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
                  {KEY_LABELS.map(({ key, label, group, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 px-4 hover:bg-slate-900/40 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 text-xs">{label}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-amber-500 font-mono font-bold uppercase">{group}</span>
                          <span className="text-[10px] text-slate-500">{desc}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setRebindingAction(key)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer min-w-28 text-center ${
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

          {/* TAB 2: MOBILE & TOUCH CONTROLS */}
          {activeTab === 'touch' && (
            <div className="space-y-6">
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-1">
                  ON-SCREEN TOUCH CONTROLS
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Dynamically overlays touch pedals, steering buttons, handbrake, and nitro for mobile and tablet browsers.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  {[
                    { id: 'auto', title: 'AUTO-DETECT (RECOMMENDED)', desc: 'Activates automatically when a touchscreen or mobile device is detected' },
                    { id: 'force_on', title: 'ALWAYS FORCE ON', desc: 'Keep on-screen pedals and buttons visible on any device (including desktop)' },
                    { id: 'force_off', title: 'ALWAYS FORCE OFF', desc: 'Hide on-screen touch controls completely and rely exclusively on keyboard' },
                  ].map((tc) => (
                    <button
                      key={tc.id}
                      onClick={() => {
                        onChangeTouchControls(tc.id as OnScreenControlSetting);
                        soundManager.playBlinker();
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        touchControls === tc.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white mb-1">{tc.title}</div>
                      <div className="text-[10px] text-slate-400">{tc.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* On-Screen Layout Overview */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-3">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-xs">
                  Touch Control Multi-Touch Layout
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                    <div className="font-bold text-white mb-1">Left Thumb:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                      <li>Steering Left (◀) & Steering Right (▶)</li>
                      <li>Headlights toggle & Indicator signals</li>
                      <li>Car Horn button (🔊)</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                    <div className="font-bold text-white mb-1">Right Thumb:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                      <li>GAS Accelerator pedal (Green)</li>
                      <li>BRAKE / Reverse pedal (Red)</li>
                      <li>DRIFT Handbrake button (Orange)</li>
                      <li>NITRO Boost button (Cyan)</li>
                    </ul>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  ⚡ Supports simultaneous multi-touch: steer, hold gas, and hit nitro all at once with zero lag.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ATMOSPHERE & CAMERA */}
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

          {/* TAB 4: GRAPHICS & RADIO */}
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

              {/* In-Game Radio Station Selector */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-1 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                  IN-GAME RADIO STATIONS
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Select your procedural soundtrack station or cycle with in-game hotkey (M).
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                  {[
                    { id: 'synthwave', title: 'SYNTHWAVE FM', desc: '128 BPM retro basslines & arpeggios' },
                    { id: 'retroArcade', title: '8-BIT ARCADE', desc: '144 BPM chiptune speed rush' },
                    { id: 'lofi', title: 'LO-FI CHILL', desc: '84 BPM relaxed warm jazz chords' },
                    { id: 'off', title: 'RADIO OFF', desc: 'Engine SFX and exhaust only' },
                  ].map((rs) => (
                    <button
                      key={rs.id}
                      onClick={() => {
                        onChangeRadioStation(rs.id as RadioStation);
                        soundManager.playBlinker();
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        radioStation === rs.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white mb-0.5">{rs.title}</div>
                      <div className="text-[10px] text-slate-400">{rs.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Audio Toggles */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif] mb-3">
                  AUDIO OUTPUT
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
                      <div className="text-xs font-bold text-white">SOUND EFFECTS</div>
                      <div className="text-[10px] text-slate-400">{muted ? 'Muted' : 'Enabled'}</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base font-['Chakra_Petch',sans-serif]">
                    RACING ACHIEVEMENTS & TROPHIES
                  </h3>
                  <p className="text-xs text-slate-400">
                    Unlock badges by performing stunts, maintaining top speeds, and surviving police pursuits.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full font-mono text-xs font-bold text-amber-400">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>TOTAL COINS: {totalCoins}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                      ach.unlocked
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800">
                      {ach.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs font-mono text-white">{ach.title}</span>
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
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded">ESC</kbd> to return to race
          </div>
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
