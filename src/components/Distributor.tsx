'use client';

import { useMemo, useState } from 'react';
import { distributeColors, distributeColorsByWorkload } from '@/utils/colorDistributor';
import { Users, BarChart3 } from 'lucide-react';

interface DistributorProps {
  palette: string[];
  colorCounts: { [hex: string]: number };
}

export function Distributor({ palette, colorCounts }: DistributorProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'collaborative'>('stats');
  const [accountsCount, setAccountsCount] = useState(2);
  const [distributionMode, setDistributionMode] = useState<'workload' | 'distance'>('workload');

  // Calculate total pixels in the image
  const totalPixels = useMemo(() => {
    return Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
  }, [colorCounts]);

  // Sort the full palette by pixel counts descending
  const sortedPaletteWithCounts = useMemo(() => {
    return [...palette].map(hex => ({
      hex,
      count: colorCounts[hex.toLowerCase()] || 0,
      percentage: totalPixels > 0 ? ((colorCounts[hex.toLowerCase()] || 0) / totalPixels) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }, [palette, colorCounts, totalPixels]);

  // Distribute colors based on selected mode
  const distributed = useMemo(() => {
    if (distributionMode === 'workload') {
      return distributeColorsByWorkload(palette, colorCounts, accountsCount);
    } else {
      return distributeColors(palette, accountsCount);
    }
  }, [palette, colorCounts, accountsCount, distributionMode]);

  // Helper to calculate total workload of an account
  const getAccountWorkload = (accountColors: string[]) => {
    const pixels = accountColors.reduce((sum, hex) => sum + (colorCounts[hex.toLowerCase()] || 0), 0);
    const percentage = totalPixels > 0 ? (pixels / totalPixels) * 100 : 0;
    return { pixels, percentage };
  };

  if (!palette || palette.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 w-full bg-zinc-900 border-t border-zinc-800 p-6 shadow-xl">
      {/* Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850 self-start">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'stats' 
                ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/15' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Pixel Count & Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('collaborative')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'collaborative' 
                ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/15' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Collaborative Workload</span>
          </button>
        </div>

        {/* Tab Controls / Header Information */}
        {activeTab === 'stats' ? (
          <span className="text-[11px] bg-zinc-950 border border-zinc-850 text-zinc-400 px-3 py-1.5 rounded-md font-mono self-end sm:self-center">
            Total Pixels: <strong className="text-indigo-400 font-bold">{totalPixels.toLocaleString()}</strong>
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-4 self-end sm:self-center">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-zinc-400">Accounts:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={accountsCount}
                onChange={(e) => setAccountsCount(Number(e.target.value))}
                className="w-12 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-md px-1.5 py-0.5 outline-none focus:border-indigo-500 text-center font-mono font-bold"
              />
            </div>

            <div className="flex bg-zinc-950 rounded p-0.5 border border-zinc-850 text-[10px]">
              <button
                onClick={() => setDistributionMode('workload')}
                className={`px-2 py-0.5 rounded transition-all font-semibold cursor-pointer ${
                  distributionMode === 'workload' 
                    ? 'bg-indigo-650 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Distribuye los colores para equilibrar la carga de píxeles a pintar por cada cuenta."
              >
                Workload
              </button>
              <button
                onClick={() => setDistributionMode('distance')}
                className={`px-2 py-0.5 rounded transition-all font-semibold cursor-pointer ${
                  distributionMode === 'distance' 
                    ? 'bg-indigo-650 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Distribuye los colores maximizando la diferencia visual entre ellos para evitar confusiones."
              >
                Colors
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Content */}
      <div className="w-full">
        {activeTab === 'stats' ? (
          /* Pixel Count & Stats Full Width Horizontal Bar Chart List */
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {sortedPaletteWithCounts.map(({ hex, count, percentage }, i) => (
              <div 
                key={`${hex}-${i}`} 
                className="flex items-center justify-between text-xs sm:text-sm p-2 rounded-lg bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-950/60 transition-all gap-4"
              >
                {/* Rank, Swatch and Hex Code (Fixed Width to prevent truncation) */}
                <div className="flex items-center gap-3 w-40 shrink-0">
                  <span className="text-zinc-600 font-mono text-[10px] w-6 text-right shrink-0">#{i + 1}</span>
                  <div 
                    className="w-7 h-7 rounded-md border border-zinc-800 shadow-sm shrink-0" 
                    style={{ backgroundColor: hex }} 
                  />
                  <span className="font-mono text-zinc-200 uppercase font-bold select-all tracking-wide shrink-0">{hex}</span>
                </div>

                {/* Progress Bar Chart */}
                <div className="flex-1 min-w-[50px] hidden md:block">
                  <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                </div>

                {/* Pixel count and percentage */}
                <div className="flex items-center gap-6 text-right shrink-0">
                  <span className="font-semibold text-zinc-300 font-mono w-24 shrink-0">{count.toLocaleString()} px</span>
                  <span className="font-bold text-indigo-400 font-mono w-16 shrink-0">{percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Collaborative Workload Full Width Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {distributed.map((accountColors, i) => {
              const workload = getAccountWorkload(accountColors);
              return (
                <div 
                  key={i} 
                  className="flex flex-col border border-zinc-800 rounded-lg bg-zinc-950/40 hover:border-zinc-700 transition-all"
                >
                  <div className="bg-zinc-900/40 px-3 py-2.5 text-xs font-semibold text-zinc-300 border-b border-zinc-850 flex items-center justify-between rounded-t-lg">
                    <span>Account {i + 1} ({accountColors.length} colors)</span>
                    <span className="text-[10px] text-zinc-400 font-mono" title="Total píxeles a pintar">
                      {workload.pixels.toLocaleString()} px ({workload.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  
                  {/* Account workload progress bar */}
                  <div className="w-full h-1 bg-zinc-850">
                    <div className="h-full bg-indigo-500" style={{ width: `${workload.percentage}%` }} />
                  </div>

                  <div className="p-3 flex flex-wrap gap-2 font-sans">
                    {accountColors.map((hex, j) => {
                      const count = colorCounts[hex.toLowerCase()] || 0;
                      return (
                        <div
                          key={`${hex}-${j}`}
                          className="w-8 h-8 rounded-md border border-zinc-800 flex items-center justify-center relative group hover:scale-105 transition-all shadow-sm cursor-pointer"
                          style={{ backgroundColor: hex }}
                        >
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-950 text-white text-[9px] px-2 py-1 rounded border border-zinc-850 whitespace-nowrap z-30 font-mono shadow-xl uppercase">
                            {hex}: {count.toLocaleString()} px
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
