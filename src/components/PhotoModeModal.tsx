import React, { useState } from 'react';
import { Camera, X, Download, Sliders, Sparkles, Eye, Check } from 'lucide-react';

interface PhotoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTakeScreenshot: () => void;
  fov: number;
  onChangeFov: (fov: number) => void;
  filter: 'normal' | 'vintage' | 'cyber' | 'noir';
  onChangeFilter: (f: 'normal' | 'vintage' | 'cyber' | 'noir') => void;
}

export const PhotoModeModal: React.FC<PhotoModeModalProps> = ({
  isOpen,
  onClose,
  onTakeScreenshot,
  fov,
  onChangeFov,
  filter,
  onChangeFilter,
}) => {
  const [photoSnapped, setPhotoSnapped] = useState(false);

  if (!isOpen) return null;

  const handleCapture = () => {
    setPhotoSnapped(true);
    onTakeScreenshot();
    setTimeout(() => setPhotoSnapped(false), 2000);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* Cinematic Viewfinder Letterbox Bars */}
      <div className="absolute inset-x-0 top-0 h-10 bg-black/60 pointer-events-none border-b border-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-black/60 pointer-events-none border-t border-white/10" />

      {/* Top Header */}
      <div className="flex items-center justify-between w-full pointer-events-auto z-50">
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-full px-4 py-1.5 shadow-lg backdrop-blur">
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="font-['Chakra_Petch',sans-serif] font-bold text-xs uppercase tracking-wider text-white">
            PHOTO MODE & CINEMATIC CAMERA
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg backdrop-blur"
          title="Exit Photo Mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Center Viewfinder Reticle */}
      <div className="self-center my-auto pointer-events-none flex flex-col items-center opacity-40">
        <div className="w-16 h-16 border border-white/50 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
        </div>
        <span className="text-[10px] font-mono text-white/70 mt-2">DRAG MOUSE TO ORBIT CAR</span>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="w-full max-w-xl mx-auto bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-2xl pointer-events-auto flex flex-col gap-3 backdrop-blur z-50">
        <div className="flex items-center justify-between">
          {/* FOV Lens Slider */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Field of View</span>
            <input
              type="range"
              min={35}
              max={95}
              value={fov}
              onChange={(e) => onChangeFov(parseInt(e.target.value, 10))}
              className="w-28 sm:w-36 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-amber-400">{fov}°</span>
          </div>

          {/* Color Filters */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl text-xs font-mono">
            {[
              { id: 'normal', label: 'Raw' },
              { id: 'vintage', label: '80s' },
              { id: 'cyber', label: 'Neon' },
              { id: 'noir', label: 'B&W' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => onChangeFilter(f.id as any)}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel & Return (ESC / F)
          </button>

          <button
            onClick={handleCapture}
            className={`px-6 py-2.5 rounded-xl font-bold font-['Chakra_Petch',sans-serif] text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              photoSnapped
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            {photoSnapped ? (
              <>
                <Check className="w-4 h-4" />
                <span>PHOTO SAVED!</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>TAKE PHOTO & SAVE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
