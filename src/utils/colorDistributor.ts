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
