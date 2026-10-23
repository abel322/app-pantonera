'use client';

import React from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { PantoneColor } from '@/types/pantone';
import { getBaseInkColor } from '@/lib/calculator';

interface ColorCardProps {
  color: PantoneColor;
  isFavorite: boolean;
  onToggleFavorite: (colorId: string) => void;
  onSelectColor: (color: PantoneColor) => void;
}

export const ColorCard: React.FC<ColorCardProps> = ({
  color,
  isFavorite,
  onToggleFavorite,
  onSelectColor,
}) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(color.id);
  };

  return (
    <div
      onClick={() => onSelectColor(color)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectColor(color);
        }
      }}
      className="group relative flex flex-col bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-600 rounded-2xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-black/40 cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400"
    >
      {/* Top Swatch Section */}
      <div className="relative h-28 w-full transition-transform group-hover:scale-[1.01]">
        <div
          className="w-full h-full border-b border-black/20"
          style={{ backgroundColor: color.hex }}
        />
        
        {/* Subtle overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10 pointer-events-none" />

        {/* Favorite Star Button - Large touch target */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/40 backdrop-blur-md text-zinc-300 hover:text-amber-400 hover:bg-black/60 transition-all active:scale-90"
        >
          <Star
            className={`w-5 h-5 transition-transform ${
              isFavorite ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'stroke-white'
            }`}
          />
        </button>

        {/* Family Pill */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm">
            {color.family}
          </span>
        </div>
      </div>

      {/* Card Info Section */}
      <div className="p-3.5 flex flex-col flex-grow justify-between gap-3">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-extrabold text-white tracking-tight font-mono">
              {color.code}
            </span>
            <span className="text-[11px] font-mono font-medium text-zinc-400 uppercase">
              {color.hex}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-300 truncate mt-0.5">
            {color.name}
          </p>
        </div>

        {/* Proportional Components Breakdown Bar */}
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>{color.formula.length} tintas base</span>
            <span className="font-mono text-zinc-400">100%</span>
          </div>

          {/* Proportional Segmented Bar */}
          <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-zinc-950 border border-zinc-700/60 shadow-inner">
            {color.formula.map((item, idx) => (
              <div
                key={idx}
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: getBaseInkColor(item.baseName),
                }}
                title={`${item.baseName}: ${item.percentage}%`}
                className="h-full border-r border-black/30 last:border-none transition-all hover:brightness-125"
              />
            ))}
          </div>

          {/* Key Component Badges (truncated preview) */}
          <div className="flex flex-wrap gap-1 pt-1">
            {color.formula.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: getBaseInkColor(item.baseName) }}
                />
                <span className="truncate max-w-[100px]">{item.baseName.replace('PANTONE ', '')}</span>
                <span className="font-mono text-zinc-400">{item.percentage}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Action Prompt */}
        <div className="flex items-center justify-end text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors pt-1">
          <span className="flex items-center gap-1">
            Calcular dosificación
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </div>
  );
};
