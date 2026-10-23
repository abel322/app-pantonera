'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Droplets,
  Scale,
} from 'lucide-react';
import { PantoneColor, InkComponent, OFFICIAL_BASE_INKS } from '@/types/pantone';
import { FAMILIES, ColorFamily } from '@/data/pantoneColors';
import { getBaseInkColor } from '@/lib/calculator';
import { saveCustomColor, validateFormulaSum } from '@/lib/customColors';

interface CreateColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorCreated?: (color: PantoneColor) => void;
}

export const CreateColorModal: React.FC<CreateColorModalProps> = ({
  isOpen,
  onClose,
  onColorCreated,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#0072CE');
  const [family, setFamily] = useState<ColorFamily>('Azules');
  const [formula, setFormula] = useState<InkComponent[]>([
    { baseName: 'PANTONE Pro. Blue', percentage: 87.50 },
    { baseName: 'PANTONE Reflex Blue', percentage: 12.50 },
  ]);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const { isValid, sum } = validateFormulaSum(formula);

  const handleAddComponent = () => {
    // Escoger una tinta que no esté repetida si es posible
    const existingNames = new Set(formula.map((f) => f.baseName));
    const available = OFFICIAL_BASE_INKS.find((ink) => !existingNames.has(ink)) || 'PANTONE Trans. Wt.';
    setFormula([...formula, { baseName: available, percentage: 0 }]);
  };

  const handleRemoveComponent = (index: number) => {
    if (formula.length <= 1) return;
    setFormula(formula.filter((_, i) => i !== index));
  };

  const handleUpdateComponent = (index: number, field: keyof InkComponent, value: any) => {
    const updated = [...formula];
    if (field === 'percentage') {
      const num = parseFloat(value) || 0;
      updated[index] = { ...updated[index], percentage: num };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormula(updated);
  };

  const handleAutoBalance = () => {
    const currentSum = formula.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);
    const diff = Math.round((100 - currentSum) * 100) / 100;

    if (diff === 0) return;

    // Si falta porcentaje, agregarlo a Trans. Wt. o al último elemento
    const transIdx = formula.findIndex((f) => f.baseName.includes('Trans. Wt.'));
    if (transIdx >= 0) {
      const updated = [...formula];
      const newPct = Math.max(0, Math.round((updated[transIdx].percentage + diff) * 100) / 100);
      updated[transIdx] = { ...updated[transIdx], percentage: newPct };
      setFormula(updated);
    } else if (diff > 0) {
      setFormula([...formula, { baseName: 'PANTONE Trans. Wt.', percentage: diff }]);
    } else {
      // Si hay exceso, normalizar todos proporcionalmente
      const total = formula.reduce((acc, c) => acc + c.percentage, 0);
      let running = 0;
      const normalized = formula.map((item, idx) => {
        if (idx === formula.length - 1) {
          return { ...item, percentage: Math.round((100 - running) * 100) / 100 };
        }
        const scaled = Math.round(((item.percentage / total) * 100) * 100) / 100;
        running += scaled;
        return { ...item, percentage: scaled };
      });
      setFormula(normalized);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!code.trim()) {
      setErrorMessage('Ingresa un código de color para taller (ej. 285 C o TALLER-01).');
      return;
    }

    if (!isValid) {
      setErrorMessage(`La suma de los porcentajes debe ser exactamente 100.00%. Actual: ${sum}%.`);
      return;
    }

    const formattedCode = code.trim();
    const formattedName = name.trim() || `PANTONE ${formattedCode}`;
    const id = `custom-${formattedCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    const newColor: PantoneColor = {
      id,
      code: formattedCode,
      name: formattedName,
      hex: hex.toUpperCase(),
      family: family === 'Todos' || family === 'Favoritos' ? 'Neutros' : family,
      formula,
      isCustom: true,
    };

    saveCustomColor(newColor);
    if (onColorCreated) {
      onColorCreated(newColor);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md transition-all duration-300"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-white z-10">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-md shadow-amber-400/20">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">
                Nueva Fórmula de Color en Planta
              </h2>
              <p className="text-xs text-zinc-400">
                Alta de receta industrial con validación estricta al 100.00%
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Identification fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Código del Color <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ej. 285 C, TALLER-AZUL-01"
                className="w-full h-11 px-3.5 bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl text-sm font-medium outline-none transition-colors text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Nombre de la Fórmula
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Azul Corporativo Cliente A"
                className="w-full h-11 px-3.5 bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl text-sm font-medium outline-none transition-colors text-white"
              />
            </div>
          </div>

          {/* Color Swatch & Chromatic Family */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Muestra HEX de Referencia
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  className="w-11 h-11 rounded-xl bg-transparent border-0 cursor-pointer p-0 overflow-hidden"
                />
                <input
                  type="text"
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  placeholder="#0072CE"
                  className="flex-1 h-11 px-3.5 bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl text-sm font-mono font-bold uppercase outline-none transition-colors text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Familia Cromática
              </label>
              <select
                value={family}
                onChange={(e) => setFamily(e.target.value as ColorFamily)}
                className="w-full h-11 px-3.5 bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl text-sm font-medium outline-none transition-colors text-white cursor-pointer"
              >
                {FAMILIES.filter((f) => f !== 'Todos' && f !== 'Favoritos').map((fam) => (
                  <option key={fam} value={fam}>
                    {fam}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Base Inks Formula Selector */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
                  Composición de Tintas Base
                </span>
                <span className="text-[11px] text-zinc-500">
                  Selecciona las tintas de la Formula Guide y sus porcentajes en peso
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddComponent}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 text-xs font-bold transition-colors flex items-center gap-1 border border-zinc-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Tinta
              </button>
            </div>

            {/* List of Component Rows */}
            <div className="space-y-2.5">
              {formula.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800"
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-white/20 shadow-sm"
                    style={{ backgroundColor: getBaseInkColor(item.baseName) }}
                  />

                  {/* Base ink selector */}
                  <select
                    value={item.baseName}
                    onChange={(e) => handleUpdateComponent(idx, 'baseName', e.target.value)}
                    className="flex-1 h-9 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-medium text-white outline-none cursor-pointer"
                  >
                    {OFFICIAL_BASE_INKS.map((ink) => (
                      <option key={ink} value={ink}>
                        {ink}
                      </option>
                    ))}
                  </select>

                  {/* Percentage input */}
                  <div className="flex items-center gap-1 w-28">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.percentage}
                      onChange={(e) => handleUpdateComponent(idx, 'percentage', e.target.value)}
                      className="w-full h-9 px-2 bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded-lg text-xs font-mono font-bold text-right text-white outline-none"
                    />
                    <span className="text-xs font-mono text-zinc-400">%</span>
                  </div>

                  {/* Remove button */}
                  {formula.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(idx)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                      title="Eliminar tinta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Proportional Segmented Preview Bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-zinc-950 border border-zinc-800 mt-2">
              {formula.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                    backgroundColor: getBaseInkColor(item.baseName),
                  }}
                  title={`${item.baseName}: ${item.percentage}%`}
                  className="h-full border-r border-black/30 last:border-none transition-all"
                />
              ))}
            </div>

            {/* Strict 100% Sum Meter */}
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isValid
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-zinc-400 font-medium">Suma Total:</span>
                    <span
                      className={`text-sm font-mono font-black ${
                        isValid ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {sum.toFixed(2)}%
                    </span>
                    <span className="text-xs text-zinc-500">/ 100.00%</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 block">
                    {isValid
                      ? '¡Fórmula balanceada al 100.00%!'
                      : sum < 100
                      ? `Faltan ${(100 - sum).toFixed(2)}% para completar el lote`
                      : `Exceso de ${(sum - 100).toFixed(2)}%`}
                  </span>
                </div>
              </div>

              {!isValid && (
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all active:scale-95"
                >
                  Auto-equilibrar a 100%
                </button>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isValid || !code.trim()}
              className={`px-5 py-2.5 rounded-xl text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95 ${
                isValid && code.trim()
                  ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20 cursor-pointer'
                  : 'bg-zinc-700 text-zinc-400 opacity-50 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Guardar Fórmula en Taller
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
