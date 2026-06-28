'use client';

import { useMemo, useState } from 'react';
import { distributeColors } from '@/utils/colorDistributor';
import { Users } from 'lucide-react';

interface DistributorProps {
  palette: string[];
}

export function Distributor({ palette }: DistributorProps) {
  const [accountsCount, setAccountsCount] = useState(2);

  const distributed = useMemo(() => {
    return distributeColors(palette, accountsCount);
  }, [palette, accountsCount]);

  if (!palette || palette.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 w-full bg-zinc-900 border-t border-zinc-800 p-6 shadow-xl">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-zinc-100">Logistic Distributor</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-zinc-400">Accounts:</label>
          <input
            type="number"
            min="1"
            max="10"
            value={accountsCount}
            onChange={(e) => setAccountsCount(Number(e.target.value))}
            className="w-16 bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-md px-2 py-1 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {distributed.map((accountColors, i) => (
          <div key={i} className="flex flex-col border border-zinc-800 rounded-md overflow-hidden bg-zinc-950">
            <div className="bg-zinc-800/50 px-3 py-1.5 text-xs font-semibold text-zinc-300 border-b border-zinc-800">
              Account {i + 1} ({accountColors.length} colors)
            </div>
            <div className="flex flex-wrap w-full">
              {accountColors.map((hex, j) => (
                <div
                  key={`${hex}-${j}`}
                  className="h-8 flex-1 min-w-[1.5rem]"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
