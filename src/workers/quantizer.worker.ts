import { applyPaletteSync, buildPaletteSync, utils } from 'image-q';

export type QuantizeRequest = {
  imageData: ImageData;
  maxColors: number;
  disableDithering: boolean;
  customPaletteHex?: string[];
  lockedColorsHex?: string[];
};

export type QuantizeResponse = {
  quantizedImageData: ImageData;
  paletteHex: string[];
  error?: string;
};

self.onmessage = (event: MessageEvent<QuantizeRequest>) => {
  const { imageData, maxColors, disableDithering, customPaletteHex, lockedColorsHex } = event.data;

  try {
    const inPointContainer = utils.PointContainer.fromUint8Array(
      new Uint8Array(imageData.data),
      imageData.width,
      imageData.height
    );

    let palette: utils.Palette;
    const paletteHex: string[] = [];

    if (customPaletteHex && customPaletteHex.length > 0) {
      palette = new utils.Palette();
      for (const hex of customPaletteHex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        palette.add(utils.Point.createByRGBA(r, g, b, 255));
        paletteHex.push(hex.toLowerCase());
      }
    } else {
      // 1. Filter out transparent pixels for palette building
      const inPointArray = inPointContainer.getPointArray();
      const opaquePoints: utils.Point[] = [];
      for (const point of inPointArray) {
        if (point.a > 10) {
          opaquePoints.push(point);
        }
      }

      let paletteSourceContainer = inPointContainer;
      if (opaquePoints.length > 0) {
        const tempContainer = new utils.PointContainer();
        tempContainer.setWidth(opaquePoints.length);
        tempContainer.setHeight(1);
        const tempArray = tempContainer.getPointArray();
        for (let i = 0; i < opaquePoints.length; i++) {
          tempArray[i] = opaquePoints[i];
        }
        paletteSourceContainer = tempContainer;
      }

      // Calculate the number of extra colors needed (maxColors - lockedColorsCount)
      const lockedCount = lockedColorsHex?.length || 0;
      const extraColorsCount = Math.max(0, maxColors - lockedCount);

      let mergedHexList: string[] = [];
      if (lockedColorsHex && lockedColorsHex.length > 0) {
        mergedHexList = [...lockedColorsHex].map(c => c.toLowerCase());
      }

      if (extraColorsCount > 0) {
        const extraPalette = buildPaletteSync([paletteSourceContainer], {
          colors: extraColorsCount,
          colorDistanceFormula: 'euclidean',
          paletteQuantization: 'neuquant',
        });

        const pointArray = extraPalette.getPointContainer().getPointArray();
        for (const point of pointArray) {
          const r = point.r.toString(16).padStart(2, '0');
          const g = point.g.toString(16).padStart(2, '0');
          const b = point.b.toString(16).padStart(2, '0');
          const hex = `#${r}${g}${b}`.toLowerCase();
          if (!mergedHexList.includes(hex)) {
            mergedHexList.push(hex);
          }
        }
      }

      // Cap to maxColors
      mergedHexList = mergedHexList.slice(0, maxColors);

      // Build the final Palette object and populate paletteHex array
      palette = new utils.Palette();
      for (const hex of mergedHexList) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        palette.add(utils.Point.createByRGBA(r, g, b, 255));
        paletteHex.push(hex);
      }
    }

    const outPointContainer = applyPaletteSync(inPointContainer, palette, {
      imageQuantization: disableDithering ? 'nearest' : 'floyd-steinberg',
    });

    const outUint8Array = outPointContainer.toUint8Array();
    const outClamped = new Uint8ClampedArray(outUint8Array);
    const originalData = imageData.data;

    // 2. Map transparency back from original image
    for (let i = 3; i < originalData.length; i += 4) {
      if (originalData[i] < 10) {
        outClamped[i] = 0; // Force transparent
      } else {
        outClamped[i] = 255; // Keep opaque
      }
    }

    const quantizedImageData = new ImageData(
      outClamped,
      imageData.width,
      imageData.height
    );

    const rgbToHsv = (r: number, g: number, b: number) => {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      
      let h = 0;
      const s = max === 0 ? 0 : d / max;
      const v = max;

      if (max !== min) {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h: h * 360, s, v };
    };

    const getSortKeys = (hexColor: string) => {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const { h, s, v } = rgbToHsv(r, g, b);
      
      // Saturation threshold for grayscales, and low-light threshold for blacks
      const isAchromatic = (s < 0.08) || (v < 0.08);
      return { isAchromatic, h, s, v };
    };

    paletteHex.sort((a, b) => {
      const keysA = getSortKeys(a);
      const keysB = getSortKeys(b);

      // 1. Chromatic first, Achromatic (greyscales/blacks) last
      if (keysA.isAchromatic !== keysB.isAchromatic) {
        return keysA.isAchromatic ? 1 : -1;
      }

      if (keysA.isAchromatic) {
        // Sort achromatic: lightest to darkest (value descending)
        return keysB.v - keysA.v;
      }

      // 2. Chromatic: group by Hue buckets (e.g. steps of 24 degrees)
      const bucketA = Math.floor(keysA.h / 24);
      const bucketB = Math.floor(keysB.h / 24);

      if (bucketA !== bucketB) {
        return bucketA - bucketB;
      }

      // Within the same hue bucket, sort from lightest to darkest
      return keysB.v - keysA.v;
    });

    self.postMessage({
      quantizedImageData,
      paletteHex,
    } as QuantizeResponse);
    
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
