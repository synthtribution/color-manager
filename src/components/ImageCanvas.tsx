import { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { BoxSelect, Columns, Download } from 'lucide-react';

interface ImageCanvasProps {
  imageData: ImageData | null;
  originalImageSrc?: string | null;
  isSplitView?: boolean;
  setIsSplitView?: (val: boolean) => void;
  palette: string[];
  isLocked: boolean;
  onHoverColor: (index: number | null) => void;
  onSelectColor: (index: number) => void;
  canvasBg: string;
  isSelectionMode: boolean;
  setIsSelectionMode: (val: boolean) => void;
  onRegionSelected: (rect: { x1: number; y1: number; x2: number; y2: number }) => void;
}

export function ImageCanvas({ 
  imageData, 
  originalImageSrc,
  isSplitView,
  setIsSplitView,
  palette, 
  isLocked, 
  onHoverColor, 
  onSelectColor,
  canvasBg,
  isSelectionMode,
  setIsSelectionMode,
  onRegionSelected
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const wrapper1Ref = useRef<ReactZoomPanPinchRef>(null);
  const wrapper2Ref = useRef<ReactZoomPanPinchRef>(null);
  const activeWrapper = useRef<1 | 2>(2);
  const savedCenter = useRef<{ centerX: number; centerY: number; scale: number } | null>(null);

  const getCenterPixel = (wrapper: ReactZoomPanPinchRef | null) => {
    if (!wrapper) return null;
    const wrapperEl = wrapper.instance.wrapperComponent;
    const visualEl = wrapper.instance.contentComponent?.firstElementChild as HTMLElement;
    if (!wrapperEl || !visualEl) return null;

    const wrapperRect = wrapperEl.getBoundingClientRect();
    const visualRect = visualEl.getBoundingClientRect();
    if (wrapperRect.width === 0 || wrapperRect.height === 0) return null;

    const { scale } = wrapper.state;

    // Center of the viewport on screen
    const centerXScreen = wrapperRect.left + wrapperRect.width / 2;
    const centerYScreen = wrapperRect.top + wrapperRect.height / 2;

    // Position of viewport center relative to the top-left of the visual image/canvas
    const centerX = (centerXScreen - visualRect.left) / scale;
    const centerY = (centerYScreen - visualRect.top) / scale;

    return { centerX, centerY, scale };
  };

  const setCenterPixel = (wrapper: ReactZoomPanPinchRef | null, center: { centerX: number; centerY: number; scale: number }) => {
    if (!wrapper || !center) return;
    const wrapperEl = wrapper.instance.wrapperComponent;
    if (!wrapperEl) return;

    const wrapperRect = wrapperEl.getBoundingClientRect();
    const width = wrapperRect.width;
    const height = wrapperRect.height;
    if (width === 0 || height === 0) return;

    // Calculate unscaled visual dimensions to find the alignment offset inside the contentComponent
    const wrapperAspect = width / height;
    let visualUnscaledWidth = width;
    let visualUnscaledHeight = height;

    if (wrapperAspect > aspect) {
      visualUnscaledWidth = height * aspect;
      visualUnscaledHeight = height;
    } else {
      visualUnscaledWidth = width;
      visualUnscaledHeight = width / aspect;
    }

    const offsetX = (width - visualUnscaledWidth) / 2;
    const offsetY = (height - visualUnscaledHeight) / 2;

    const newPositionX = width / 2 - (center.centerX + offsetX) * center.scale;
    const newPositionY = height / 2 - (center.centerY + offsetY) * center.scale;

    wrapper.setTransform(newPositionX, newPositionY, center.scale, 0);
  };

  const toggleSplitView = () => {
    if (!setIsSplitView) return;
    
    // Capture the current center before layout changes
    const activeRef = activeWrapper.current === 1 ? wrapper1Ref.current : wrapper2Ref.current;
    const center = getCenterPixel(activeRef);
    if (center) {
      savedCenter.current = center;
    }
    
    setIsSplitView(!isSplitView);
  };

  const downloadCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'imagen-procesada.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTransformed1 = (ref: ReactZoomPanPinchRef) => {
    if (activeWrapper.current === 1) {
      wrapper2Ref.current?.setTransform(ref.state.positionX, ref.state.positionY, ref.state.scale, 0);
    }
  };

  const handleTransformed2 = (ref: ReactZoomPanPinchRef) => {
    if (activeWrapper.current === 2) {
      wrapper1Ref.current?.setTransform(ref.state.positionX, ref.state.positionY, ref.state.scale, 0);
    }
  };

  const handleInit1 = (ref: ReactZoomPanPinchRef) => {
    if (wrapper2Ref.current) {
      const center = getCenterPixel(wrapper2Ref.current);
      if (center) {
        requestAnimationFrame(() => {
          setCenterPixel(ref, center);
        });
      }
    }
  };

  // Sync zoom/pan state when split view is toggled, ensuring layout changes preserve focal point
  useEffect(() => {
    if (savedCenter.current) {
      const center = savedCenter.current;
      const timer = requestAnimationFrame(() => {
        if (isSplitView) {
          setCenterPixel(wrapper2Ref.current, center);
          setCenterPixel(wrapper1Ref.current, center);
        } else {
          setCenterPixel(wrapper2Ref.current, center);
        }
        savedCenter.current = null;
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isSplitView]);

  useEffect(() => {
    if (!imageData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isSelectionMode) {
      if (!selectionRect) return;
      setSelectionRect(prev => prev ? { ...prev, x2: e.clientX, y2: e.clientY } : null);
    } else {
      if (isLocked) return;
      const rect = canvas.getBoundingClientRect();
      
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
      
      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        if (pixel[3] < 10) {
          onHoverColor(null);
          return;
        }
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]).toLowerCase();
        const idx = palette.findIndex(c => c.toLowerCase() === hex);
        onHoverColor(idx !== -1 ? idx : null);
      }
    }
  };

  const mouseDownCoords = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelectionMode) {
      setSelectionRect({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
    } else {
      mouseDownCoords.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelectionMode) {
      if (!selectionRect) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      const mapToCanvasPixel = (clientX: number, clientY: number) => {
        const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
        const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);
        return {
          x: Math.max(0, Math.min(canvas.width - 1, x)),
          y: Math.max(0, Math.min(canvas.height - 1, y))
        };
      };

      const startPixel = mapToCanvasPixel(selectionRect.x1, selectionRect.y1);
      const endPixel = mapToCanvasPixel(selectionRect.x2, selectionRect.y2);

      const x1 = Math.min(startPixel.x, endPixel.x);
      const y1 = Math.min(startPixel.y, endPixel.y);
      const x2 = Math.max(startPixel.x, endPixel.x);
      const y2 = Math.max(startPixel.y, endPixel.y);
      
      if (x2 - x1 >= 1 || y2 - y1 >= 1) {
        onRegionSelected({ x1, y1, x2, y2 });
      }
      setSelectionRect(null);
    } else {
      if (!mouseDownCoords.current) return;
      const diffX = Math.abs(e.clientX - mouseDownCoords.current.x);
      const diffY = Math.abs(e.clientY - mouseDownCoords.current.y);
      mouseDownCoords.current = null;

      if (diffX > 5 || diffY > 5) {
        return; // Dragging occurred, cancel selection
      }

      handleCanvasClick(e);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    
    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      if (pixel[3] < 10) return; // Ignore transparent pixels
      const hex = rgbToHex(pixel[0], pixel[1], pixel[2]).toLowerCase();
      const idx = palette.findIndex(c => c.toLowerCase() === hex);
      if (idx !== -1) {
        onSelectColor(idx);
      }
    }
  };

  const handleMouseLeave = () => {
    if (isSelectionMode) {
      setSelectionRect(null);
    } else {
      if (!isLocked) {
        onHoverColor(null);
      }
    }
  };

  if (!imageData) {
    return (
      <div className="flex-1 flex items-center justify-center border border-zinc-800 rounded-lg bg-zinc-950/50 text-zinc-500 min-h-[300px]">
        <p>No image loaded</p>
      </div>
    );
  }

  const aspect = imageData.width / imageData.height;

  return (
    <div className="flex-1 w-full h-full flex gap-2 relative">
      {/* Floating Toolbar */}
      <div className="absolute top-4 right-4 z-30 bg-zinc-900/85 backdrop-blur border border-zinc-800 rounded-md p-1 shadow-xl flex items-center gap-1.5">
        {originalImageSrc && setIsSplitView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSplitView();
            }}
            className={`px-2 py-1 rounded transition-colors text-xs font-semibold flex items-center gap-1.5 ${
              isSplitView 
                ? 'bg-zinc-700 text-white' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Alternar vista dividida"
          >
            <Columns className="w-4 h-4" />
            <span>Split View</span>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSelectionMode(!isSelectionMode);
          }}
          className={`px-2 py-1 rounded transition-colors text-xs font-semibold flex items-center gap-1.5 ${
            isSelectionMode 
              ? 'bg-indigo-650 text-white hover:bg-indigo-600 shadow-md shadow-indigo-600/20' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title={isSelectionMode ? "Desactivar modo selección" : "Seleccionar región para sugerencias de color"}
        >
          <BoxSelect className="w-4 h-4" />
          <span>{isSelectionMode ? "Selección Activa" : "Sugerir Colores"}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadCanvasImage();
          }}
          className="px-2 py-1 rounded transition-colors text-xs font-semibold flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:scale-95"
          title="Descargar imagen procesada en formato PNG"
        >
          <Download className="w-4 h-4" />
          <span>Descargar</span>
        </button>
      </div>

      {isSelectionMode && (
        <div className="absolute bottom-4 left-4 z-30 bg-zinc-950/90 text-indigo-400 text-[10px] font-medium px-2 py-1 rounded border border-zinc-800 pointer-events-none select-none">
          Arrastra para seleccionar una región
        </div>
      )}

      {isSplitView && originalImageSrc && (
        <div 
          className="flex-1 overflow-hidden rounded-lg border border-zinc-800 relative"
          style={{ backgroundColor: canvasBg }}
          onMouseEnter={() => activeWrapper.current = 1}
        >
          <TransformWrapper
            ref={wrapper1Ref}
            onTransform={handleTransformed1}
            onInit={handleInit1}
            initialScale={1}
            minScale={0.5}
            maxScale={50}
            centerOnInit
            panning={{ disabled: isSelectionMode }}
            doubleClick={{ disabled: isSelectionMode }}
          >
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
              <img 
                src={originalImageSrc} 
                alt="Original"
                className="shadow-2xl"
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  aspectRatio: `${aspect}`
                }}
              />
            </TransformComponent>
          </TransformWrapper>
        </div>
      )}

      <div 
        className={`flex-1 overflow-hidden rounded-lg border border-zinc-800 relative ${
          isSelectionMode ? 'cursor-cell' : 'cursor-crosshair active:cursor-grabbing'
        }`}
        style={{ backgroundColor: canvasBg }}
        onMouseEnter={() => activeWrapper.current = 2}
      >
        {/* Selection Bounding Box Overlay (Viewport Fixed) */}
        {isSelectionMode && selectionRect && (
          <div 
            className="fixed border border-dashed border-indigo-400 bg-indigo-500/15 pointer-events-none z-50 shadow-[0_0_8px_rgba(99,102,241,0.25)]"
            style={{
              left: `${Math.min(selectionRect.x1, selectionRect.x2)}px`,
              top: `${Math.min(selectionRect.y1, selectionRect.y2)}px`,
              width: `${Math.abs(selectionRect.x2 - selectionRect.x1)}px`,
              height: `${Math.abs(selectionRect.y2 - selectionRect.y1)}px`,
            }}
          />
        )}

        <TransformWrapper
          ref={wrapper2Ref}
          onTransform={handleTransformed2}
          initialScale={1}
          minScale={0.5}
          maxScale={50}
          centerOnInit
          panning={{ disabled: isSelectionMode }}
          doubleClick={{ disabled: isSelectionMode }}
        >
          <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="shadow-2xl"
              style={{ 
                imageRendering: 'pixelated',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                display: 'block',
                aspectRatio: `${aspect}`
              }}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}
