'use client';

import { UploadCloud, Settings2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ChangeEvent, useMemo } from 'react';

interface ControlPanelProps {
  maxColors: number;
  setMaxColors: (val: number) => void;
  disableDithering: boolean;
  setDisableDithering: (val: boolean) => void;
  targetHeight: number;
  setTargetHeight: (val: number) => void;
  maxTargetHeight: number;
  originalImageSrc: string | null;
  onImageUpload: (file: File) => void;
  onProcess: () => void;
  isProcessing: boolean;
  hasImage: boolean;
  canvasBgColor: string;
  setCanvasBgColor: (val: string) => void;
  lockedColorsText: string;
  setLockedColorsText: (val: string) => void;
  outlineThreshold: number;
  setOutlineThreshold: (val: number) => void;
}

export function ControlPanel({
  maxColors,
  setMaxColors,
  disableDithering,
  setDisableDithering,
  targetHeight,
  setTargetHeight,
  maxTargetHeight,
  originalImageSrc,
  onImageUpload,
  onProcess,
  isProcessing,
  hasImage,
  canvasBgColor,
  setCanvasBgColor,
  lockedColorsText,
  setLockedColorsText,
  outlineThreshold,
  setOutlineThreshold
}: ControlPanelProps) {
  
  const parsedCount = useMemo(() => {
    if (!lockedColorsText) return 0;
    const matches = lockedColorsText.match(/#[0-9A-Fa-f]{6}/g);
    if (!matches) return 0;
    return new Set(matches.map(c => c.toLowerCase())).size;
  }, [lockedColorsText]);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImageUpload(file);
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-zinc-900 border-r border-zinc-800 w-[320px] shrink-0 shadow-xl z-10 overflow-y-auto">
      <div>
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-400" />
          Quantizer Engine
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Technical artist tools</p>
      </div>

      <label className="relative flex flex-col items-center justify-center w-full min-h-[160px] max-h-[300px] h-auto border-2 border-dashed border-zinc-700 rounded-lg hover:border-indigo-500 hover:bg-zinc-800/30 transition-all cursor-pointer group overflow-hidden">
        {originalImageSrc ? (
          <div className="relative w-full h-auto flex items-center justify-center bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={originalImageSrc} 
              alt="Preview" 
              className="w-full h-auto max-h-[300px] object-contain pointer-events-none"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all duration-200">
              <UploadCloud className="w-6 h-6 text-indigo-400" />
              <span className="text-xs font-semibold text-zinc-300">Change Image</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
            <UploadCloud className="w-8 h-8 mb-3 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
            <p className="mb-2 text-sm text-zinc-400 group-hover:text-zinc-300">
              <span className="font-semibold">Click to upload</span>
            </p>
            <p className="text-xs text-zinc-500">PNG, JPG, WEBP</p>
          </div>
        )}
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>

      {hasImage && (
        <div className="flex flex-col gap-4">
          {/* Pixel-art Reduction height slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm font-medium text-zinc-300">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-zinc-500" />
                Pixel-art Height
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="8"
                  max={maxTargetHeight || 100}
                  value={targetHeight}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTargetHeight(Math.min(maxTargetHeight || 100, Math.max(8, val)));
                  }}
                  className="w-16 bg-zinc-950 border border-zinc-800 text-indigo-400 text-xs rounded px-1.5 py-0.5 text-right focus:border-indigo-500 outline-none font-mono"
                />
                <span className="text-xs text-zinc-500">px</span>
              </div>
            </div>
            <input
              type="range"
              min="8"
              max={maxTargetHeight || 100}
              value={targetHeight}
              onChange={(e) => setTargetHeight(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>8px</span>
              <span>Max: {maxTargetHeight}px (Original)</span>
            </div>
          </div>

          {/* Max Colors input */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-zinc-300 flex justify-between items-center">
              <span>Max Colors</span>
              <input
                type="number"
                min="2"
                max="256"
                value={maxColors}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxColors(Math.min(256, Math.max(2, val)));
                }}
                className="w-16 bg-zinc-950 border border-zinc-800 text-indigo-400 text-xs rounded px-1.5 py-0.5 text-right focus:border-indigo-500 outline-none font-mono"
              />
            </div>
            <input
              type="range"
              min="2"
              max="256"
              value={maxColors}
              onChange={(e) => setMaxColors(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Mandatory Colors Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-sm font-medium text-zinc-300">
              <span>Mandatory Colors (Optional)</span>
              <span className={`text-xs font-mono transition-colors ${
                parsedCount > maxColors ? 'text-rose-400 font-bold animate-pulse' : 'text-zinc-500'
              }`}
              title={parsedCount > maxColors ? "Excede el límite de Max Colors (se recortarán los excedentes)" : ""}
              >
                {parsedCount} / {maxColors}
              </span>
            </div>
            <textarea
              value={lockedColorsText}
              onChange={(e) => setLockedColorsText(e.target.value)}
              placeholder="#FF0000, #00FF00, #0000FF"
              className={`w-full h-16 bg-zinc-950 text-zinc-200 text-xs rounded-md p-2 outline-none resize-none font-mono transition-all ${
                parsedCount > maxColors 
                  ? 'border-rose-900/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20' 
                  : 'border-zinc-800 focus:border-indigo-500'
              }`}
            />
            <p className={`text-[10px] transition-colors ${
              parsedCount > maxColors ? 'text-rose-400/85' : 'text-zinc-500'
            }`}>
              {parsedCount > maxColors 
                ? '⚠️ Los colores que superen el límite configurado serán descartados.' 
                : 'Comma-separated hex colors to force into the final palette.'}
            </p>
          </div>

          {/* Dithering Switch */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-zinc-300 select-none">
              Disable Dithering
            </span>
            <button
              onClick={() => setDisableDithering(!disableDithering)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                disableDithering ? 'bg-indigo-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  disableDithering ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 -mt-2">
            Disabling dithering creates solid color blocks. Dithering creates fine granularity.
          </p>

          {/* Outline Cleaning Slider */}
          <div className="flex flex-col gap-2 mt-1">
            <div className="text-sm font-medium text-zinc-300 flex justify-between items-center">
              <span>Clean Outlines</span>
              <input
                type="number"
                min="0"
                max="255"
                value={outlineThreshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setOutlineThreshold(Math.min(255, Math.max(0, val)));
                }}
                className="w-16 bg-zinc-950 border border-zinc-800 text-indigo-400 text-xs rounded px-1.5 py-0.5 text-right focus:border-indigo-500 outline-none font-mono"
              />
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={outlineThreshold}
              onChange={(e) => setOutlineThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[11px] text-zinc-500 -mt-1">
              Forces dark/anti-aliased edge pixels to pure black. Useful for crisp line-art.
            </p>
          </div>

          {/* Canvas Background Color Picker */}
          <div className="flex items-center justify-between mt-1 border-t border-zinc-850 pt-3">
            <span className="text-sm text-zinc-300 select-none">
              Canvas Background
            </span>
            <div className="relative w-7 h-7 rounded border border-zinc-700 bg-zinc-950 overflow-hidden cursor-pointer">
              <input
                type="color"
                value={canvasBgColor}
                onChange={(e) => setCanvasBgColor(e.target.value)}
                className="absolute inset-[-4px] w-12 h-12 cursor-pointer"
              />
            </div>
          </div>

          {/* Process Image Button */}
          <button
            onClick={onProcess}
            disabled={isProcessing}
            className={`w-full py-2.5 px-4 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-2 ${
              isProcessing 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-650/30'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Process Image
              </>
            )}
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="mt-auto flex items-center justify-center gap-2 text-indigo-400 text-xs font-medium animate-pulse bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
          Quantization processing running in Web Worker...
        </div>
      )}
    </div>
  );
}
