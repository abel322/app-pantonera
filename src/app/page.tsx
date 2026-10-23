'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import Fuse from 'fuse.js';
import {
  Palette,
  Droplets,
  Star,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { PANTONE_COLORS, FAMILIES, ColorFamily } from '@/data/pantoneColors';
import { PantoneColor } from '@/types/pantone';
import { SearchBar } from '@/components/SearchBar';
import { ColorCard } from '@/components/ColorCard';
import { DosingModal } from '@/components/DosingModal';

const FAVORITES_STORAGE_KEY = 'pantone_formula_favorites_v1';
const EMPTY_FAVORITES: string[] = [];

let cachedFavoritesRaw: string | null = null;
let cachedFavoritesParsed: string[] = EMPTY_FAVORITES;

function subscribeToFavorites(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('favorites-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('favorites-updated', callback);
  };
}

function getFavoritesSnapshot(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw !== cachedFavoritesRaw) {
      cachedFavoritesRaw = raw;
      cachedFavoritesParsed = raw ? JSON.parse(raw) : EMPTY_FAVORITES;
    }
    return cachedFavoritesParsed;
  } catch {
    return EMPTY_FAVORITES;
  }
}

function getServerFavoritesSnapshot(): string[] {
  return EMPTY_FAVORITES;
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<ColorFamily>('Todos');
  const [selectedColor, setSelectedColor] = useState<PantoneColor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hydration-safe external store for localStorage favorites
  const favorites = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );

  // Save favorites when updated
  const toggleFavorite = (colorId: string) => {
    const current = getFavoritesSnapshot();
    const exists = current.includes(colorId);
    const updated = exists ? current.filter((id) => id !== colorId) : [...current, colorId];
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('favorites-updated'));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
    }
  };

  // Configure Fuse.js for real-time predictive fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(PANTONE_COLORS, {
      keys: [
        { name: 'code', weight: 0.5 },
        { name: 'name', weight: 0.3 },
        { name: 'formula.baseName', weight: 0.2 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, []);

  // Filter colors based on search query and selected family
  const filteredColors = useMemo(() => {
    let pool: PantoneColor[] = PANTONE_COLORS;

    // 1. Apply Fuse search if query is present
    if (searchQuery.trim().length > 0) {
      const searchResults = fuse.search(searchQuery.trim());
      pool = searchResults.map((res) => res.item);
    }

    // 2. Apply Family filter
    if (selectedFamily === 'Favoritos') {
      return pool.filter((color) => favorites.includes(color.id));
    }
    if (selectedFamily !== 'Todos') {
      return pool.filter((color) => color.family === selectedFamily);
    }

    return pool;
  }, [searchQuery, selectedFamily, favorites, fuse]);

  const handleOpenDosing = (color: PantoneColor) => {
    setSelectedColor(color);
    setIsModalOpen(true);
  };

  const handleCloseDosing = () => {
    setIsModalOpen(false);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedFamily('Todos');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col selection:bg-amber-400 selection:text-black">
      {/* Top Plant/Workshop Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-black shadow-md shadow-amber-500/20">
              <Droplets className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Pantonera Pro
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Solid Coated
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">
                Guía de Formulación & Dosificación de Taller
              </p>
            </div>
          </div>

          {/* Plant Workshop Status Badges */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Offline Ready</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-300 text-xs font-mono">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{favorites.length}</span>
            </div>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 pt-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={filteredColors.length}
            totalCount={PANTONE_COLORS.length}
          />
        </div>

        {/* Scrollable Chromatic Family Chips */}
        <div className="border-t border-zinc-800 bg-zinc-950/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {FAMILIES.map((family) => {
              const isActive = selectedFamily === family;
              const isFav = family === 'Favoritos';

              return (
                <button
                  key={family}
                  type="button"
                  onClick={() => setSelectedFamily(family)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {isFav && (
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isActive
                          ? 'fill-black text-black'
                          : 'fill-amber-400 text-amber-400'
                      }`}
                    />
                  )}
                  <span>{family}</span>
                  {isFav && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {favorites.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Results summary header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-400">
              {selectedFamily === 'Todos' ? 'Catálogo General' : `Familia: ${selectedFamily}`}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-zinc-300 font-bold">
              {filteredColors.length} {filteredColors.length === 1 ? 'color' : 'colores'}
            </span>
          </div>

          {(searchQuery || selectedFamily !== 'Todos') && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restablecer filtros
            </button>
          )}
        </div>

        {/* Color Grid */}
        {filteredColors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredColors.map((color) => (
              <ColorCard
                key={color.id}
                color={color}
                isFavorite={favorites.includes(color.id)}
                onToggleFavorite={toggleFavorite}
                onSelectColor={handleOpenDosing}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="p-8 sm:p-12 text-center rounded-3xl bg-zinc-900/50 border border-zinc-800/80 my-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-500 mb-4">
              {selectedFamily === 'Favoritos' ? (
                <Star className="w-8 h-8 text-amber-400" />
              ) : (
                <Palette className="w-8 h-8 text-zinc-400" />
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {selectedFamily === 'Favoritos' && favorites.length === 0
                ? 'No tienes colores en Favoritos'
                : 'No se encontraron colores'}
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              {selectedFamily === 'Favoritos' && favorites.length === 0
                ? 'Toca el ícono de la estrella en cualquier color del catálogo para guardarlo aquí y acceder rápido durante tus pesajes.'
                : `No hubo coincidencias para "${searchQuery}" en la categoría seleccionada.`}
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition-all shadow-md shadow-amber-400/20 active:scale-95"
            >
              Ver todos los colores
            </button>
          </div>
        )}
      </main>

      {/* Floating Quick Action info bar for Mobile */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-4 px-4 text-center text-xs text-zinc-500">
        <p className="flex items-center justify-center gap-1">
          <Scale className="w-4 h-4 text-amber-400 inline" />
          <span>Formulación estricta al 100.00% en memoria para taller de serigrafía, offset y flexografía.</span>
        </p>
      </footer>

      {/* Interactive Dosing Sheet / Modal */}
      <DosingModal
        color={selectedColor}
        isOpen={isModalOpen}
        onClose={handleCloseDosing}
      />
    </div>
  );
}
