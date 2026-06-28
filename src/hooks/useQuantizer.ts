import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuantizeRequest, QuantizeResponse } from '@/workers/quantizer.worker';

export function useQuantizer() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantizedImageData, setQuantizedImageData] = useState<ImageData | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/quantizer.worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event: MessageEvent<QuantizeResponse>) => {
      const { quantizedImageData, paletteHex, error } = event.data;
      if (error) {
        setError(error);
      } else {
        setQuantizedImageData(quantizedImageData);
        setPalette(paletteHex);
        setError(null);
      }
      setIsProcessing(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const quantize = useCallback((imageData: ImageData, maxColors: number, disableDithering: boolean, customPaletteHex?: string[], lockedColorsHex?: string[]) => {
    if (!workerRef.current) return;
    setIsProcessing(true);
    setError(null);
    workerRef.current.postMessage({
      imageData,
      maxColors,
      disableDithering,
      customPaletteHex,
      lockedColorsHex,
    });
  }, []);

  return { quantize, isProcessing, quantizedImageData, palette, error };
}
