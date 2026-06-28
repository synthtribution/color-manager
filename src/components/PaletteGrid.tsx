'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Check, Copy } from 'lucide-react';

interface PaletteGridProps {
  palette: string[];
  activeColorIndex: number | null;
  setActiveColorIndex: (index: number | null) => void;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  onColorChange?: (oldHex: string, newHex: string) => void;
  onColorDelete?: (hex: string) => void;
  lockedColors: string[];
}

export function PaletteGrid({ 
  palette, 
  activeColorIndex, 
  setActiveColorIndex, 
  isLocked, 
  setIsLocked, 
  onColorChange, 
  onColorDelete,
  lockedColors
}: PaletteGridProps) {
  const [tempHex, setTempHex] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const activeBlockRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [popoverLeft, setPopoverLeft] = useState<string>('50%');
  const [popoverTransform, setPopoverTransform] = useState<string>('translateX(-50%)');

  // Sync tempHex and reset position when activeColorIndex changes
  useEffect(() => {
    if (activeColorIndex !== null && palette[activeColorIndex]) {
      setTempHex(palette[activeColorIndex]);
    } else {
      setTempHex('');
      setPopoverLeft('50%');
      setPopoverTransform('translateX(-50%)');
    }
  }, [activeColorIndex, palette]);

  // Adjust popover position to fit within grid boundaries
  useEffect(() => {
    if (activeColorIndex === null || !gridRef.current || !activeBlockRef.current || !popoverRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!gridRef.current || !activeBlockRef.current || !popoverRef.current) return;
      
      const gridRect = gridRef.current.getBoundingClientRect();
      const blockRect = activeBlockRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();

      const popoverWidth = popoverRect.width || 150; // fallback min-w
      const blockCenter = blockRect.left + blockRect.width / 2;

      // Ideal left position relative to viewport
      const idealLeft = blockCenter - popoverWidth / 2;

      // Restrict position within grid boundaries with 4px margin
      const minLeft = gridRect.left + 4;
      const maxLeft = gridRect.right - popoverWidth - 4;

      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, idealLeft));
      const relativeLeft = clampedLeft - blockRect.left;

      setPopoverLeft(`${relativeLeft}px`);
      setPopoverTransform('none');
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeColorIndex, palette]);

  // Close color menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveColorIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setActiveColorIndex]);

  if (!palette || palette.length === 0) return null;

  const handleBlockClick = (index: number) => {
    if (activeColorIndex === index && isLocked) {
      setActiveColorIndex(null);
      setIsLocked(false);
    } else {
      setActiveColorIndex(index);
      setIsLocked(true);
    }
  };

  const handleCopyPalette = () => {
    const text = palette.join(', ');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col w-full" ref={containerRef}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Generated Palette ({palette.length} colors)
          </h3>
          <button
            onClick={handleCopyPalette}
            className="flex items-center gap-1.5 py-0.5 px-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-[9px] font-semibold text-zinc-300 hover:text-zinc-100 transition-all active:scale-95"
            title="Copiar paleta completa (formato '#hex, #hex')"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                <span>Copiar Paleta</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-zinc-500">
          {isLocked ? 'Palette Locked. Click the active color to release.' : 'Hover canvas to inspect. Click canvas or block to lock.'}
        </p>
      </div>
      
      <div className="flex flex-wrap w-full bg-zinc-950 border border-zinc-900 relative" ref={gridRef}>
        {palette.map((hex, index) => {
          const isActive = activeColorIndex === index;
          return (
            <div
              key={`${hex}-${index}`}
              ref={isActive ? activeBlockRef : null}
              onClick={() => handleBlockClick(index)}
              className={`w-10 h-10 aspect-square cursor-pointer hover:scale-105 hover:z-20 transition-all relative ${
                isActive ? 'ring-2 ring-indigo-500 z-10 scale-105 shadow-lg' : ''
              }`}
              style={{ backgroundColor: hex }}
              title={`Color ${index + 1}: ${hex}`}
            >
              {/* Popover overlay for editing / deleting (only visible if active) */}
              {isActive && (
                <div 
                  ref={popoverRef}
                  className="absolute top-full z-30 mt-2 bg-zinc-900 border border-zinc-800 rounded-md p-3 shadow-2xl flex flex-col gap-2 min-w-[150px]"
                  style={{ left: popoverLeft, transform: popoverTransform }}
                  onClick={(e) => e.stopPropagation()} // Prevent clicking popover from triggering block click
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">{tempHex || hex}</span>
                      <div className="relative w-6 h-6 rounded overflow-hidden border border-zinc-700 bg-zinc-950">
                        <input
                          type="color"
                          value={tempHex || hex}
                          onChange={(e) => setTempHex(e.target.value)}
                          className="absolute inset-[-4px] w-10 h-10 cursor-pointer"
                        />
                      </div>
                    </div>
                    <span className={`text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded self-start ${
                      lockedColors.includes(hex.toLowerCase())
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700'
                    }`}>
                      {lockedColors.includes(hex.toLowerCase()) ? 'Registrado' : 'Generado'}
                    </span>
                  </div>

                  <div className="h-px bg-zinc-800 my-1" />

                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        if (tempHex) {
                          onColorChange?.(hex, tempHex);
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-indigo-650 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Apply Color
                    </button>

                    <button
                      onClick={() => {
                        onColorDelete?.(hex);
                        setActiveColorIndex(null);
                        setIsLocked(false);
                      }}
                      className="flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-red-950/35 hover:bg-red-900/50 text-red-400 text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Color
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
