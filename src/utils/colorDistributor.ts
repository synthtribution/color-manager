import chroma from 'chroma-js';

export function distributeColors(paletteHex: string[], accountsCount: number): string[][] {
  if (accountsCount <= 0) return [];
  if (accountsCount === 1) return [paletteHex];

  const accounts: string[][] = Array.from({ length: accountsCount }, () => []);

  for (const newColor of paletteHex) {
    let bestAccountIndex = 0;
    let maxMinDistance = -1;

    for (let i = 0; i < accountsCount; i++) {
      const accountColors = accounts[i];
      
      if (accountColors.length === 0) {
        bestAccountIndex = i;
        maxMinDistance = Infinity;
        break; 
      }

      let minDistanceInAccount = Infinity;
      for (const existingColor of accountColors) {
        const distance = chroma.deltaE(newColor, existingColor);
        if (distance < minDistanceInAccount) {
          minDistanceInAccount = distance;
        }
      }

      if (minDistanceInAccount > maxMinDistance) {
        maxMinDistance = minDistanceInAccount;
        bestAccountIndex = i;
      }
    }

    accounts[bestAccountIndex].push(newColor);
  }

  return accounts;
}

export function distributeColorsByWorkload(
  paletteHex: string[],
  colorCounts: { [hex: string]: number },
  accountsCount: number
): string[][] {
  if (accountsCount <= 0) return [];
  if (accountsCount === 1) return [paletteHex];

  // Sort colors by pixel counts descending
  const sortedPalette = [...paletteHex].sort((a, b) => {
    const countA = colorCounts[a.toLowerCase()] || 0;
    const countB = colorCounts[b.toLowerCase()] || 0;
    return countB - countA;
  });

  const accounts: string[][] = Array.from({ length: accountsCount }, () => []);
  const workloads = new Array(accountsCount).fill(0);

  for (const color of sortedPalette) {
    let minWorkloadIndex = 0;
    let minWorkload = workloads[0];

    for (let i = 1; i < accountsCount; i++) {
      if (workloads[i] < minWorkload) {
        minWorkload = workloads[i];
        minWorkloadIndex = i;
      }
    }

    accounts[minWorkloadIndex].push(color);
    workloads[minWorkloadIndex] += colorCounts[color.toLowerCase()] || 0;
  }

  return accounts;
}
