'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  CheckCircle2,
  Circle,
  RotateCcw,
  Sparkles,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { PantoneColor, WeightUnit } from '@/types/pantone';
import {
  calculateDoses,
  roundToTwoDecimals,
  getBaseInkColor,
} from '@/lib/calculator';

interface DosingModalProps {
  color: PantoneColor | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DosingModal: React.FC<DosingModalProps> = ({
  color,
  isOpen,
  onClose,
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !color) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-all duration-300"
    >
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Inner modal content with key to auto-reset state on color change */}
      <DosingContent key={color.id} color={color} onClose={onClose} />
    </div>
  );
};

interface DosingContentProps {
  color: PantoneColor;
  onClose: () => void;
}

const DosingContent: React.FC<DosingContentProps> = ({ color, onClose }) => {
  const [weightInput, setWeightInput] = useState<string>('500');
  const [unit, setUnit] = useState<WeightUnit>('g');
  // State for operator checklist: tracks checked base names
  const [checkedInks, setCheckedInks] = useState<Record<string, boolean>>({});

  const parsedWeight = parseFloat(weightInput) || 0;
  const calculatedDoses = calculateDoses(color, parsedWeight, unit);

  // Toggle checkbox for an ink
  const toggleInk = (baseName: string) => {
    setCheckedInks((prev) => ({
      ...prev,
      [baseName]: !prev[baseName],
    }));
  };

  const handleResetChecklist = () => {
    setCheckedInks({});
  };

  const totalCheckedCount = color.formula.filter((f) => checkedInks[f.baseName]).length;
  const isAllChecked = totalCheckedCount === color.formula.length && color.formula.length > 0;
  const progressPercent = Math.round((totalCheckedCount / color.formula.length) * 100);

  // Quick weight presets tailored for industrial mixing batches
  const quickPresets = [
    { label: '100 g', weight: 100, targetUnit: 'g' as WeightUnit },
    { label: '250 g', weight: 250, targetUnit: 'g' as WeightUnit },
    { label: '500 g', weight: 500, targetUnit: 'g' as WeightUnit },
    { label: '1 kg', weight: 1, targetUnit: 'kg' as WeightUnit },
    { label: '2.5 kg', weight: 2.5, targetUnit: 'kg' as WeightUnit },
    { label: '5 kg', weight: 5, targetUnit: 'kg' as WeightUnit },
  ];

  const applyPreset = (presetWeight: number, presetUnit: WeightUnit) => {
    setUnit(presetUnit);
    setWeightInput(presetWeight.toString());
  };

  // Calculate sum of doses to verify total matches perfectly
  const totalCalculatedGrams = calculatedDoses.reduce((acc, curr) => acc + curr.weightGrams, 0);
  const displayTotalWeight = unit === 'kg' 
    ? roundToTwoDecimals(totalCalculatedGrams / 1000) 
    : roundToTwoDecimals(totalCalculatedGrams);

  return (
    <div 
      className="relative w-full max-w-2xl bg-zinc-900 border-t sm:border border-zinc-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden z-10 animate-in slide-in-from-bottom duration-250"
    >
      {/* Mobile Drag Indicator Handle */}
      <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
        <div className="w-12 h-1.5 rounded-full bg-zinc-700" />
      </div>

      {/* Modal Header & Expanded Swatch */}
      <div className="relative overflow-hidden border-b border-zinc-800">
        <div
          className="w-full h-24 sm:h-28 relative flex items-end p-4 sm:p-6"
          style={{ backgroundColor: color.hex }}
        >
          {/* Gradient shadow for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

          {/* Header Content */}
          <div className="relative z-10 w-full flex items-end justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 mb-1 text-[11px] font-bold tracking-wider uppercase rounded bg-white/20 backdrop-blur-md text-white border border-white/20">
                {color.family}
              </span>
              <h2 id="modal-title" className="text-2xl sm:text-3xl font-black text-white font-mono drop-shadow">
                {color.code}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-zinc-200 drop-shadow">
                {color.name}
              </p>
            </div>

            <div className="flex flex-col items-end">
              <span className="font-mono text-xs sm:text-sm font-bold text-white/90 bg-black/50 px-2 py-1 rounded border border-white/20">
                {color.hex}
              </span>
              <span className="text-[11px] text-zinc-300 font-mono mt-1 drop-shadow">
                {color.formula.length} componentes
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de dosificación"
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-zinc-300 hover:text-white hover:bg-black/90 transition-transform active:scale-90 z-20 border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* Mixing Weight Formulation Input Section */}
        <div className="bg-zinc-950/80 rounded-2xl p-4 sm:p-5 border border-zinc-800 shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label 
              htmlFor="target-weight-input"
              className="text-xs sm:text-sm font-bold tracking-wide uppercase text-zinc-300 flex items-center gap-1.5"
            >
              <Scale className="w-4 h-4 text-amber-400" />
              Peso Total de Mezcla a Fabricar
            </label>

            {/* Unit Toggle (g vs kg) */}
            <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-700">
              <button
                type="button"
                onClick={() => setUnit('g')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  unit === 'g'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Gramos (g)
              </button>
              <button
                type="button"
                onClick={() => setUnit('kg')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  unit === 'kg'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Kilos (kg)
              </button>
            </div>
          </div>

          {/* Numeric Input */}
          <div className="relative flex items-center">
            <input
              id="target-weight-input"
              type="number"
              inputMode="decimal"
              step="any"
              min="0.01"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="Ingresa el peso a formular..."
              className="w-full h-14 pl-4 pr-16 bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-500 focus:border-amber-400 rounded-xl text-2xl sm:text-3xl font-black font-mono text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
            />
            <span className="absolute right-4 font-mono font-bold text-lg text-amber-400 pointer-events-none">
              {unit}
            </span>
          </div>

          {/* Batch Presets for Operators */}
          <div className="mt-3">
            <div className="text-[11px] font-medium text-zinc-400 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Preajustes rápidos de taller:
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset.weight, preset.targetUnit)}
                  className="py-1.5 px-2 text-xs font-mono font-bold rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-amber-300 transition-all text-center"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Checklist Progress Status */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                isAllChecked
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                  : 'bg-zinc-800 text-amber-400 border border-zinc-700'
              }`}
            >
              {isAllChecked ? (
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              ) : (
                `${progressPercent}%`
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {isAllChecked
                  ? '¡Pesaje completado al 100%!'
                  : `Control de Pesaje: ${totalCheckedCount} de ${color.formula.length} tintas en cubeta`}
              </p>
              <p className="text-xs text-zinc-400">
                {isAllChecked
                  ? 'La mezcla tiene todas las tintas base pesadas y verificadas.'
                  : 'Marca cada tinta conforme la viertas y peses en la balanza.'}
              </p>
            </div>
          </div>

          {totalCheckedCount > 0 && (
            <button
              type="button"
              onClick={handleResetChecklist}
              className="self-end sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar marcas
            </button>
          )}
        </div>

        {/* Dosing Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Tabla de Dosificación Exacta
            </h3>
            <span className="text-xs text-zinc-400 font-mono">
              Base: {color.name}
            </span>
          </div>

          {/* Interactive Cards/Table for Mobile Devices */}
          <div className="space-y-2.5">
            {calculatedDoses.map((dose, idx) => {
              const isChecked = !!checkedInks[dose.baseName];
              // Display dose in selected unit
              const displayDoseWeight = unit === 'kg'
                ? roundToTwoDecimals(dose.weightGrams / 1000)
                : dose.weightGrams;

              const inkColor = getBaseInkColor(dose.baseName);

              return (
                <div
                  key={idx}
                  onClick={() => toggleInk(dose.baseName)}
                  className={`group relative p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'bg-emerald-950/20 border-emerald-500/60 shadow-sm'
                      : 'bg-zinc-900/90 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Left: Checkbox + Ink Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Checkbox Icon */}
                    <button
                      type="button"
                      aria-label={`Marcar pesaje de ${dose.baseName}`}
                      className={`p-1 rounded-lg transition-transform active:scale-90 ${
                        isChecked
                          ? 'text-emerald-400'
                          : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-6 h-6 stroke-[2.2] fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-6 h-6 stroke-[1.8]" />
                      )}
                    </button>

                    {/* Ink Name and Color Sample */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full inline-block border border-black/30 shadow-sm flex-shrink-0"
                          style={{ backgroundColor: inkColor }}
                        />
                        <span
                          className={`font-bold text-sm sm:text-base truncate transition-colors ${
                            isChecked ? 'text-emerald-300 line-through opacity-80' : 'text-white'
                          }`}
                        >
                          {dose.baseName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-medium text-zinc-400">
                          Fórmula: {dose.percentage.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Exact Required Weight */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-lg sm:text-2xl font-black font-mono transition-colors ${
                        isChecked ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {displayDoseWeight.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">
                        {unit}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      Peso requerido
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Balance Total Summary Footer Card */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs sm:text-sm">
          <span className="text-zinc-400 font-medium">
            Suma total calculada:
          </span>
          <div className="font-mono font-bold text-white text-base">
            {displayTotalWeight.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-amber-400">{unit}</span>
          </div>
        </div>

        {parsedWeight <= 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Por favor ingresa un peso de mezcla mayor a 0 para calcular la balanza.</span>
          </div>
        )}
      </div>

      {/* Modal Action Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-400 hidden sm:block">
          Presiona <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 border border-zinc-700">ESC</kbd> o toca fuera para cerrar
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-extrabold text-sm transition-all shadow-lg shadow-amber-400/20 active:scale-95 ml-auto"
        >
          Listo / Cerrar
        </button>
      </div>
    </div>
  );
};
