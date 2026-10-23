'use client';

import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  resultCount?: number;
  totalCount?: number;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  resultCount,
  totalCount,
  placeholder = 'Buscar código (ej. 285), nombre o base (Pro. Blue)...',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div className="absolute left-3.5 flex items-center pointer-events-none text-zinc-400">
          <Search className="w-5 h-5" strokeWidth={2.2} />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar colores y fórmulas"
          className="w-full h-12 pl-11 pr-20 bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-500 focus:border-amber-400 focus:bg-zinc-950 text-white placeholder-zinc-400 rounded-xl text-base font-medium outline-none transition-all shadow-inner focus:ring-2 focus:ring-amber-400/20"
        />

        {/* Action icons / Clear button */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpiar búsqueda"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {typeof resultCount === 'number' && typeof totalCount === 'number' && (
            <span className="text-xs font-mono font-semibold px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 hidden sm:inline-block">
              {resultCount}/{totalCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
