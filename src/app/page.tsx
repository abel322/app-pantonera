'use client';

import React, { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import Fuse from 'fuse.js';
import {
  Palette,
  Droplets,
  Star,
  Scale,
  RefreshCw,
  Database,
  Plus,
  Sparkles,
  ChevronDown,
  Layers,
  Wrench,
  Camera,
} from 'lucide-react';
import { PANTONE_COLORS, FAMILIES, ColorFamily } from '@/data/pantoneColors';
import { PantoneColor } from '@/types/pantone';
import { SearchBar } from '@/components/SearchBar';
import { ColorCard } from '@/components/ColorCard';
import { DosingModal } from '@/components/DosingModal';
import { DataManagementModal } from '@/components/DataManagementModal';
import { CreateColorModal } from '@/components/CreateColorModal';
import { ScanColorModal } from '@/components/ScanColorModal';
import {
  getCustomColors,
  CUSTOM_COLORS_EVENT,
} from '@/lib/customColors';

const FAVORITES_STORAGE_KEY = 'pantone_formula_favorites_v1';
const EMPTY_FAVORITES: string[] = [];
const PAGE_SIZE = 32;

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
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Catálogo base cargado desde /data/pantone-database.json
  const [baseColors, setBaseColors] = useState<PantoneColor[]>(PANTONE_COLORS);
  // Fórmulas personalizadas de taller guardadas en localStorage
  const [customColors, setCustomColors] = useState<PantoneColor[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Paginación por bloques para rendimiento móvil ultraligero
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  // 1. Cargar base de datos JSON estática en segundo plano
  useEffect(() => {
    let isMounted = true;
    fetch('/data/pantone-database.json')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar pantone-database.json');
        return res.json();
      })
      .then((data: PantoneColor[]) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setBaseColors(data);
          setIsLoadingCatalog(false);
        }
      })
      .catch((err) => {
        console.warn('Uso de catálogo de respaldo local:', err);
        setIsLoadingCatalog(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Cargar y sincronizar fórmulas personalizadas de taller desde localStorage
  useEffect(() => {
    const loadCustom = () => {
      setCustomColors(getCustomColors());
    };
    loadCustom();

    window.addEventListener(CUSTOM_COLORS_EVENT, loadCustom);
    window.addEventListener('storage', loadCustom);
    return () => {
      window.removeEventListener(CUSTOM_COLORS_EVENT, loadCustom);
      window.removeEventListener('storage', loadCustom);
    };
  }, []);

  // Hydration-safe external store for localStorage favorites
  const favorites = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );

  // Guardar favoritos reactivamente
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

  // 3. Catálogo combinado: fórmulas de taller priorizadas + catálogo masivo
  const allColors = useMemo(() => {
    if (customColors.length === 0) return baseColors;

    const customCodes = new Set(customColors.map((c) => c.code.toLowerCase()));
    const nonOverriddenBase = baseColors.filter((c) => !customCodes.has(c.code.toLowerCase()));
    return [...customColors, ...nonOverriddenBase];
  }, [baseColors, customColors]);

  // 4. Configurar Fuse.js en memoria para búsqueda ultra-veloz
  const fuse = useMemo(() => {
    return new Fuse(allColors, {
      keys: [
        { name: 'code', weight: 0.5 },
        { name: 'name', weight: 0.3 },
        { name: 'formula.baseName', weight: 0.2 },
      ],
      threshold: 0.32,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, [allColors]);

  // 5. Filtrar colores según consulta y familia
  const filteredColors = useMemo(() => {
    let pool = allColors;
    const query = searchQuery.trim();

    if (query.length > 0) {
      const searchResults = fuse.search(query);
      pool = searchResults.map((res) => res.item);
    }

    if (selectedFamily === 'Favoritos') {
      return pool.filter((color) => favorites.includes(color.id));
    }
    if (selectedFamily === 'Taller') {
      return pool.filter((color) => color.isCustom);
    }
    if (selectedFamily !== 'Todos') {
      return pool.filter((color) => color.family === selectedFamily);
    }

    return pool;
  }, [searchQuery, selectedFamily, favorites, fuse, allColors]);

  // 6. Resetear paginación cuando cambia búsqueda o filtro
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedFamily]);

  // 7. Scroll infinito con IntersectionObserver para teléfonos móviles
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredColors.length));
        }
      },
      { rootMargin: '400px' }
    );

    const target = observerTargetRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [filteredColors.length]);

  // Rebanada activa para el renderizado DOM virtualizado
  const displayedColors = useMemo(() => {
    return filteredColors.slice(0, visibleCount);
  }, [filteredColors, visibleCount]);

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

  const handleLoadMoreManual = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredColors.length));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col selection:bg-amber-400 selection:text-black">
      {/* Top Plant/Workshop Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-black shadow-md shadow-amber-500/20 flex-shrink-0">
              <Droplets className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Pantonera Pro
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Solid Coated
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hidden md:inline">
                  {allColors.length} Fórmulas
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium hidden xs:block">
                Guía de Formulación & Dosificación de Taller
              </p>
            </div>
          </div>

          {/* Plant Workshop Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Escanear Tira Pantone Física */}
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5"
              title="Escanear con cámara o subir foto de una tira física de la pantonera"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Escanear Tira</span>
            </button>

            {/* Nueva Fórmula Button */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all shadow-md shadow-amber-400/20 active:scale-95 flex items-center gap-1.5"
              title="Dar de alta una nueva fórmula en planta"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Nueva Fórmula</span>
            </button>

            {/* Import / Export Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsDataModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Importar / Exportar catálogo CSV y JSON"
            >
              <Database className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Gestión CSV/JSON</span>
            </button>

            {/* Favorites Count Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-300 text-xs font-mono">
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
            totalCount={allColors.length}
          />
        </div>

        {/* Scrollable Chromatic Family Chips */}
        <div className="border-t border-zinc-800 bg-zinc-950/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {FAMILIES.map((family) => {
              const isActive = selectedFamily === family;
              const isFav = family === 'Favoritos';
              const isTaller = family === 'Taller';

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
                        isActive ? 'fill-black text-black' : 'fill-amber-400 text-amber-400'
                      }`}
                    />
                  )}
                  {isTaller && (
                    <Wrench
                      className={`w-3.5 h-3.5 ${
                        isActive ? 'text-black' : 'text-amber-400'
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
                  {isTaller && customColors.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-black/20 text-black' : 'bg-amber-400/20 text-amber-300'
                      }`}
                    >
                      {customColors.length}
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
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-zinc-300 font-bold">
              {filteredColors.length} {filteredColors.length === 1 ? 'color' : 'colores'}
            </span>
            {filteredColors.length > visibleCount && (
              <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                (Mostrando {displayedColors.length} de {filteredColors.length})
              </span>
            )}
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

        {/* Color Grid with Virtualized / Block Paged Slices */}
        {displayedColors.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {displayedColors.map((color) => (
                <ColorCard
                  key={color.id}
                  color={color}
                  isFavorite={favorites.includes(color.id)}
                  onToggleFavorite={toggleFavorite}
                  onSelectColor={handleOpenDosing}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel Target */}
            <div ref={observerTargetRef} className="h-10 w-full" />

            {/* Load More Button for Mobile / Manual paging */}
            {visibleCount < filteredColors.length && (
              <div className="pt-6 pb-8 flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadMoreManual}
                  className="px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                  <span>
                    Cargar más colores ({visibleCount} de {filteredColors.length})
                  </span>
                </button>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Desliza hacia abajo para continuar cargando automáticamente
                </span>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="p-8 sm:p-12 text-center rounded-3xl bg-zinc-900/50 border border-zinc-800/80 my-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-500 mb-4">
              {selectedFamily === 'Favoritos' ? (
                <Star className="w-8 h-8 text-amber-400" />
              ) : selectedFamily === 'Taller' ? (
                <Wrench className="w-8 h-8 text-amber-400" />
              ) : (
                <Palette className="w-8 h-8 text-zinc-400" />
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {selectedFamily === 'Favoritos' && favorites.length === 0
                ? 'No tienes colores en Favoritos'
                : selectedFamily === 'Taller' && customColors.length === 0
                ? 'No hay fórmulas de taller creadas aún'
                : 'No se encontraron colores'}
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              {selectedFamily === 'Favoritos' && favorites.length === 0
                ? 'Toca el ícono de la estrella en cualquier color del catálogo para guardarlo aquí y acceder rápido durante tus pesajes.'
                : selectedFamily === 'Taller' && customColors.length === 0
                ? 'Haz clic en "Nueva Fórmula" para ingresar una receta de planta o importa un archivo CSV/JSON.'
                : `No hubo coincidencias para "${searchQuery}" en la categoría seleccionada.`}
            </p>
            {selectedFamily === 'Taller' && customColors.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition-all shadow-md shadow-amber-400/20 active:scale-95"
              >
                Crear primera fórmula de taller
              </button>
            ) : (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition-all shadow-md shadow-amber-400/20 active:scale-95"
              >
                Ver todos los colores
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Buttons (FAB) on Mobile */}
      <div className="fixed bottom-6 right-5 z-40 sm:hidden flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setIsScanModalOpen(true)}
          aria-label="Escanear tira física con cámara"
          className="w-13 h-13 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shadow-xl shadow-emerald-500/40 border border-emerald-400 font-black active:scale-90 transition-transform"
        >
          <Camera className="w-6 h-6 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          aria-label="Dar de alta fórmula en planta"
          className="w-13 h-13 rounded-2xl bg-amber-400 text-black flex items-center justify-center shadow-xl shadow-amber-400/40 border border-amber-300 font-black active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* Plant Workshop Footer info */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-4 px-4 text-center text-xs text-zinc-500">
        <p className="flex items-center justify-center gap-1.5 flex-wrap">
          <Scale className="w-4 h-4 text-amber-400 inline" />
          <span>Formulación estricta al 100.00% con {allColors.length} colores en memoria para imprenta, serigrafía y flexografía.</span>
        </p>
      </footer>

      {/* Interactive Dosing Sheet / Modal */}
      <DosingModal
        color={selectedColor}
        isOpen={isModalOpen}
        onClose={handleCloseDosing}
      />

      {/* CSV / JSON Import & Export Management Modal */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        allColors={allColors}
        customColorsCount={customColors.length}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Plant Floor Manual Color Creation Modal */}
      <CreateColorModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onColorCreated={(newColor) => {
          setSelectedColor(newColor);
          setIsModalOpen(true);
        }}
      />

      {/* Physical Strip Camera & OCR Scan Modal */}
      <ScanColorModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onColorSaved={(newColor) => {
          setSelectedColor(newColor);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}
