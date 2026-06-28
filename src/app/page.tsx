'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuantizer } from '@/hooks/useQuantizer';
import { ControlPanel } from '@/components/ControlPanel';
import { ImageCanvas } from '@/components/ImageCanvas';
import { PaletteGrid } from '@/components/PaletteGrid';
import { Distributor } from '@/components/Distributor';
import { AlertCircle, GripHorizontal, BoxSelect } from 'lucide-react';
import chroma from 'chroma-js';

function parseLockedColors(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[0-9A-Fa-f]{6}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map(c => c.toLowerCase())));
}

export default function Home() {
  const { quantize, isProcessing, quantizedImageData, palette, error } = useQuantizer();

  const [maxColors, setMaxColors] = useState(16);
  const [disableDithering, setDisableDithering] = useState(true);
  const [targetHeight, setTargetHeight] = useState(100);
  const [maxTargetHeight, setMaxTargetHeight] = useState(100);
  const [outlineThreshold, setOutlineThreshold] = useState(0);
  
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const [customPaletteHex, setCustomPaletteHex] = useState<string[] | null>(null);
  const [lockedColorsText, setLockedColorsText] = useState('');
  
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Region selection and color recommendation state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [recommendedColors, setRecommendedColors] = useState<string[]>([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);

  // Canvas height resizing state
  const [canvasHeight, setCanvasHeight] = useState(400);
  const [canvasBgColor, setCanvasBgColor] = useState('#0f0f0f');
  const isDraggingResizer = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    startY.current = e.clientY;
    startHeight.current = canvasHeight;
    isDraggingResizer.current = true;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeStop);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isDraggingResizer.current) return;
    const deltaY = e.clientY - startY.current;
    const newHeight = Math.max(200, Math.min(900, startHeight.current + deltaY));
    setCanvasHeight(newHeight);
  };

  const handleResizeStop = () => {
    isDraggingResizer.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeStop);
  };

  // Clear selections if base palette changes (e.g. new image processed)
  useEffect(() => {
    setActiveColorIndex(null);
    setIsLocked(false);
  }, [palette]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setOriginalImageSrc(src);
      
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setMaxTargetHeight(img.height);
        setTargetHeight(img.height);
        setCustomPaletteHex(null); // Clear custom palette
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const processImage = (useCustomPalette?: string[]) => {
    const img = originalImageRef.current;
    if (!img) return;

    // Calculate dimensions
    const ratio = targetHeight / img.height;
    const targetWidth = Math.round(img.width * ratio);

    // Create offscreen canvas for scaling
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable smoothing for sharp pixel-art look during downscaling
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const scaledImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    
    // Purify Outlines: forces very dark pixels to black to avoid anti-aliasing color noise
    if (outlineThreshold > 0) {
      const data = scaledImageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 10) continue; // Ignore transparent pixels
        
        const brightness = (r + g + b) / 3;
        if (brightness < outlineThreshold) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
      }
    }
    
    // Trigger quantization
    const lockedColors = parseLockedColors(lockedColorsText);
    quantize(scaledImageData, maxColors, disableDithering, useCustomPalette, lockedColors);
  };

  const handleProcessClick = () => {
    setCustomPaletteHex(null); // Reset custom edits when running general process
    processImage(undefined);
  };

  const handleColorChange = (oldHex: string, newHex: string) => {
    const currentPalette = customPaletteHex || [...palette];
    const updated = currentPalette.map(c => c.toLowerCase() === oldHex.toLowerCase() ? newHex : c);
    setCustomPaletteHex(updated);
    processImage(updated);
  };

  const handleColorDelete = (hexToDelete: string) => {
    const currentPalette = customPaletteHex || [...palette];
    const updated = currentPalette.filter(c => c.toLowerCase() !== hexToDelete.toLowerCase());
    setCustomPaletteHex(updated);
    processImage(updated);
  };

  const handleRegionSelected = (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    const originalImage = originalImageRef.current;
    if (!originalImage || !quantizedImageData) return;

    const canvasWidth = quantizedImageData.width;
    const canvasHeight = quantizedImageData.height;

    // Scale coordinates to the high-resolution original image space
    const scaleX = originalImage.width / canvasWidth;
    const scaleY = originalImage.height / canvasHeight;

    const origX1 = Math.floor(rect.x1 * scaleX);
    const origY1 = Math.floor(rect.y1 * scaleY);
    const origX2 = Math.min(originalImage.width - 1, Math.ceil(rect.x2 * scaleX));
    const origY2 = Math.min(originalImage.height - 1, Math.ceil(rect.y2 * scaleY));

    const origW = origX2 - origX1 + 1;
    const origH = origY2 - origY1 + 1;

    if (origW <= 0 || origH <= 0) return;

    // Extract sub-region from the original high-resolution image using an offscreen canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = origW;
    tempCanvas.height = origH;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(
      originalImage,
      origX1, origY1, origW, origH,
      0, 0, origW, origH
    );

    const originalRegionData = tempCtx.getImageData(0, 0, origW, origH);
    const data = originalRegionData.data;

    const rgbToHex = (r: number, g: number, b: number) => {
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const colorCounts: { [hex: string]: number } = {};
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 10) continue; // Ignore transparent pixels

      const hex = rgbToHex(r, g, b).toLowerCase();
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }

    // Filter colors that are sufficiently distant from the active palette (Delta E > 10)
    const candidates = Object.keys(colorCounts)
      .map(hex => ({ hex, count: colorCounts[hex] }))
      .filter(candidate => {
        let minDistance = Infinity;
        for (const paletteColor of activePalette) {
          const dist = chroma.deltaE(candidate.hex, paletteColor);
          if (dist < minDistance) minDistance = dist;
        }
        return minDistance > 10;
      })
      .sort((a, b) => b.count - a.count);

    // Select up to 5 distinct dominant colors (Delta E between recommendations > 12)
    const recommendations: string[] = [];
    for (const candidate of candidates) {
      if (recommendations.length >= 5) break;

      let tooClose = false;
      for (const rec of recommendations) {
        if (chroma.deltaE(candidate.hex, rec) < 12) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        recommendations.push(candidate.hex);
      }
    }

    setRecommendedColors(recommendations);
    setSelectedRecommendations(recommendations);
    setShowRecommendationsModal(true);
  };

  const activePalette = useMemo(() => {
    const basePalette = customPaletteHex !== null ? customPaletteHex : palette;
    
    return [...basePalette].sort((colorA, colorB) => {
      const hslA = chroma(colorA).hsl();
      const hslB = chroma(colorB).hsl();

      const hA = isNaN(hslA[0]) ? 0 : hslA[0];
      const sA = isNaN(hslA[1]) ? 0 : hslA[1];
      const lA = isNaN(hslA[2]) ? 0 : hslA[2];

      const hB = isNaN(hslB[0]) ? 0 : hslB[0];
      const sB = isNaN(hslB[1]) ? 0 : hslB[1];
      const lB = isNaN(hslB[2]) ? 0 : hslB[2];

      // Treat grayscales (very low saturation) as a single family at the end
      const isGrayA = sA < 0.08;
      const isGrayB = sB < 0.08;

      if (isGrayA !== isGrayB) {
        return isGrayA ? 1 : -1; // Chromatic first, grayscale last
      }

      if (isGrayA && isGrayB) {
        // Sort achromatic: lightest to darkest (Value/Lightness descending)
        if (Math.abs(lB - lA) > 0.001) {
          return lB - lA;
        }
        return sB - sA;
      }

      // 1. Group in families by Hue (30 degree buckets)
      const bucketA = Math.floor(hA / 30);
      const bucketB = Math.floor(hB / 30);

      if (bucketA !== bucketB) {
        return bucketA - bucketB;
      }

      // 2. Sort by Lightness (Luminosity) from highest to lowest
      if (Math.abs(lB - lA) > 0.001) {
        return lB - lA;
      }

      // 3. Tie-breaker: Saturation from highest to lowest
      return sB - sA;
    });
  }, [customPaletteHex, palette]);

  return (
    <main className="flex h-screen w-full bg-black text-zinc-200 overflow-hidden font-sans">
      <ControlPanel 
        maxColors={maxColors}
        setMaxColors={setMaxColors}
        disableDithering={disableDithering}
        setDisableDithering={setDisableDithering}
        targetHeight={targetHeight}
        setTargetHeight={setTargetHeight}
        maxTargetHeight={maxTargetHeight}
        originalImageSrc={originalImageSrc}
        onImageUpload={handleImageUpload}
        onProcess={handleProcessClick}
        isProcessing={isProcessing}
        hasImage={!!originalImageSrc}
        canvasBgColor={canvasBgColor}
        setCanvasBgColor={setCanvasBgColor}
        lockedColorsText={lockedColorsText}
        setLockedColorsText={setLockedColorsText}
        outlineThreshold={outlineThreshold}
        setOutlineThreshold={setOutlineThreshold}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-y-auto">
        {error && (
          <div className="bg-red-950/50 border-b border-red-900/50 text-red-400 p-3 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span><strong>Worker Error:</strong> {error}</span>
          </div>
        )}

        <div className="w-full flex flex-col min-h-0 shrink-0">
          <div 
            style={{ height: `${canvasHeight}px` }}
            className="p-6 pb-0 flex items-center justify-center min-h-0 overflow-hidden w-full"
          >
            <ImageCanvas 
              imageData={quantizedImageData} 
              palette={activePalette}
              isLocked={isLocked}
              onHoverColor={(index) => {
                if (!isLocked) {
                  setActiveColorIndex(index);
                }
              }}
              onSelectColor={(index) => {
                setActiveColorIndex(index);
                setIsLocked(true);
              }}
              canvasBg={canvasBgColor}
              isSelectionMode={isSelectionMode}
              setIsSelectionMode={setIsSelectionMode}
              isSplitView={isSplitView}
              setIsSplitView={setIsSplitView}
              originalImageSrc={originalImageSrc}
              onRegionSelected={handleRegionSelected}
            />
          </div>
          <div
            onMouseDown={handleResizeStart}
            className="h-4 flex items-center justify-center cursor-row-resize hover:bg-zinc-800/40 active:bg-zinc-850/60 select-none transition-colors border-b border-zinc-850"
          >
            <GripHorizontal className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
          </div>
        </div>
        
        <div className="p-6 flex flex-col gap-6 shrink-0">
          <PaletteGrid 
            palette={activePalette} 
            activeColorIndex={activeColorIndex}
            setActiveColorIndex={setActiveColorIndex}
            isLocked={isLocked}
            setIsLocked={setIsLocked}
            onColorChange={handleColorChange}
            onColorDelete={handleColorDelete}
            lockedColors={useMemo(() => parseLockedColors(lockedColorsText), [lockedColorsText])}
          />
        </div>
        
        <Distributor palette={activePalette} />
      </div>

      {/* Recommendations Modal */}
      {showRecommendationsModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <BoxSelect className="w-5 h-5 text-indigo-400" />
                Recomendaciones para Región Seleccionada
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Colores de la imagen original en alta resolución dentro de la región seleccionada que no están en la paleta actual (máx. 5 colores).
              </p>
            </div>

            {recommendedColors.length > 0 ? (
              <div className="flex flex-col gap-2 my-2">
                {recommendedColors.map((hex) => {
                  const isChecked = selectedRecommendations.includes(hex);
                  return (
                    <label 
                      key={hex}
                      className="flex items-center justify-between p-2.5 rounded-md bg-zinc-950 border border-zinc-850 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedRecommendations(prev => prev.filter(c => c !== hex));
                            } else {
                              setSelectedRecommendations(prev => [...prev, hex]);
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-650 focus:ring-indigo-500 accent-indigo-500 cursor-pointer"
                        />
                        <div 
                          className="w-6 h-6 rounded border border-zinc-800" 
                          style={{ backgroundColor: hex }}
                        />
                        <span className="text-xs font-mono text-zinc-300 uppercase">{hex}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-950/50 rounded-md border border-zinc-850 my-2">
                Todos los colores de esta región ya están representados en la paleta actual.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-zinc-850 pt-4 mt-2">
              <button
                onClick={() => {
                  setShowRecommendationsModal(false);
                  setIsSelectionMode(false);
                }}
                className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              {recommendedColors.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedRecommendations.length > 0) {
                      const currentPalette = customPaletteHex || [...palette];
                      const updated = [...currentPalette, ...selectedRecommendations];
                      setCustomPaletteHex(updated);
                      processImage(updated);
                    }
                    setShowRecommendationsModal(false);
                    setIsSelectionMode(false);
                  }}
                  disabled={selectedRecommendations.length === 0}
                  className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
                    selectedRecommendations.length === 0
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-650/20'
                  }`}
                >
                  Confirmar e Incluir ({selectedRecommendations.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
