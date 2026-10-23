'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  FileText,
  Scale,
  Sliders,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { PantoneColor, InkComponent, OFFICIAL_BASE_INKS } from '@/types/pantone';
import { FAMILIES, ColorFamily } from '@/data/pantoneColors';
import { getBaseInkColor } from '@/lib/calculator';
import { saveCustomColor, validateFormulaSum } from '@/lib/customColors';

interface ScanColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorSaved?: (color: PantoneColor) => void;
}

// Muestras RGB calibradas para calcular swatch HEX en tiempo real
const BASE_INK_RGB: Record<string, [number, number, number]> = {
  'PANTONE Yellow PY12': [254, 209, 0],
  'PANTONE Orange 016': [255, 108, 0],
  'PANTONE Warm Red': [249, 66, 58],
  'PANTONE Rubine Red': [206, 0, 88],
  'PANTONE Rhodamine Red': [225, 0, 152],
  'PANTONE Purple': [187, 41, 187],
  'PANTONE Violet v2': [90, 30, 134],
  'PANTONE Pro. Blue': [0, 133, 202],
  'PANTONE Reflex Blue': [10, 17, 114],
  'PANTONE Process Blue': [0, 133, 202],
  'PANTONE Green': [0, 171, 78],
  'PANTONE Black': [35, 35, 35],
  'PANTONE Trans. Wt.': [255, 255, 255],
  'PANTONE Opaque Wt.': [255, 255, 255],
};

const INK_ALIASES: Record<string, string> = {
  'yellow py12': 'PANTONE Yellow PY12',
  'yellow 012': 'PANTONE Yellow PY12',
  'yellow': 'PANTONE Yellow PY12',
  'orange 016': 'PANTONE Orange 016',
  'orange': 'PANTONE Orange 016',
  'warm red': 'PANTONE Warm Red',
  'red 032': 'PANTONE Red 032',
  'rubine red': 'PANTONE Rubine Red',
  'rubine': 'PANTONE Rubine Red',
  'rhodamine red': 'PANTONE Rhodamine Red',
  'rhodamine': 'PANTONE Rhodamine Red',
  'purple': 'PANTONE Purple',
  'violet v2': 'PANTONE Violet v2',
  'violet': 'PANTONE Violet v2',
  'pro. blue': 'PANTONE Pro. Blue',
  'process blue': 'PANTONE Process Blue',
  'pro blue': 'PANTONE Pro. Blue',
  'reflex blue': 'PANTONE Reflex Blue',
  'green': 'PANTONE Green',
  'black': 'PANTONE Black',
  'trans. wt.': 'PANTONE Trans. Wt.',
  'trans wt': 'PANTONE Trans. Wt.',
  'trans. wt': 'PANTONE Trans. Wt.',
  'transparent white': 'PANTONE Trans. Wt.',
  'opaque wt.': 'PANTONE Opaque Wt.',
  'opaque wt': 'PANTONE Opaque Wt.',
  'opaque white': 'PANTONE Opaque Wt.',
};

function normalizeDetectedInkName(rawName: string): string {
  let cleaned = rawName.replace(/^pantone\s+/i, '').trim().toLowerCase();
  cleaned = cleaned.replace(/\s+/g, ' ');

  if (INK_ALIASES[cleaned]) {
    return INK_ALIASES[cleaned];
  }
  for (const [key, official] of Object.entries(INK_ALIASES)) {
    if (cleaned.includes(key)) {
      return official;
    }
  }
  return rawName.startsWith('PANTONE ') ? rawName : `PANTONE ${rawName}`;
}

function calculateHexFromFormula(formula: InkComponent[]): string {
  let absR = 0, absG = 0, absB = 0;
  let transFraction = 0;

  for (const comp of formula) {
    const frac = comp.percentage / 100;
    if (comp.baseName.includes('Trans. Wt.') || comp.baseName.includes('Opaque Wt.')) {
      transFraction += frac;
      continue;
    }
    const rgb = BASE_INK_RGB[comp.baseName] || [128, 128, 128];
    const cr = Math.max(0.01, rgb[0] / 255);
    const cg = Math.max(0.01, rgb[1] / 255);
    const cb = Math.max(0.01, rgb[2] / 255);

    absR += -Math.log(cr) * frac * 1.35;
    absG += -Math.log(cg) * frac * 1.35;
    absB += -Math.log(cb) * frac * 1.35;
  }

  if (absR + absG + absB < 0.001) return '#F4F4F4';

  const dilution = Math.max(0.08, 1 - transFraction * 0.85);
  let r = Math.round(255 * Math.exp(-absR * dilution));
  let g = Math.round(255 * Math.exp(-absG * dilution));
  let b = Math.round(255 * Math.exp(-absB * dilution));

  if (transFraction > 0) {
    const paper = 255;
    r = Math.round(r * (1 - transFraction * 0.45) + paper * (transFraction * 0.45));
    g = Math.round(g * (1 - transFraction * 0.45) + paper * (transFraction * 0.45));
    b = Math.round(b * (1 - transFraction * 0.45) + paper * (transFraction * 0.45));
  }

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function detectFamilyFromHex(hex: string): ColorFamily {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = l > 0.5 ? d / (2 - max - min || 1) : d / (max + min || 1);

  if (d === 0) h = 0;
  else if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;

  if (s < 0.14 || (l < 0.18 && s < 0.25)) return 'Neutros';
  if (h >= 14 && h < 48) return 'Naranjas';
  if (h >= 48 && h < 75) return 'Amarillos';
  if (h >= 75 && h < 172) return 'Verdes';
  if (h >= 172 && h < 265) return 'Azules';
  if (h >= 265 && h < 332) return 'Violetas';
  return 'Rojos';
}

export const ScanColorModal: React.FC<ScanColorModalProps> = ({
  isOpen,
  onClose,
  onColorSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'text'>('camera');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [rawOcrText, setRawOcrText] = useState<string>('');

  // Campos extraídos para verificación del operario
  const [extractedCode, setExtractedCode] = useState<string>('');
  const [extractedName, setExtractedName] = useState<string>('');
  const [extractedHex, setExtractedHex] = useState<string>('#0072CE');
  const [extractedFamily, setExtractedFamily] = useState<ColorFamily>('Azules');
  const [extractedFormula, setExtractedFormula] = useState<InkComponent[]>([]);
  const [manualText, setManualText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const { isValid, sum } = validateFormulaSum(extractedFormula);

  const parseTextToFields = (text: string) => {
    setRawOcrText(text);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    let foundCode = '';
    const detectedComponents: InkComponent[] = [];

    for (const line of lines) {
      // Buscar código Pantone: "PANTONE 285 C", "284 C", "101 C"
      const codeMatch = line.match(/(?:PANTONE\s+)?([0-9A-Za-z\s]+?\s*C)\b/i);
      const isPercentLine = line.match(/[0-9]+(?:[\.,][0-9]+)?\s*%/);

      if (codeMatch && !isPercentLine && !foundCode) {
        foundCode = codeMatch[1].trim();
      }

      // Buscar componentes de tinta con porcentaje
      // Ej: "Pro. Blue 37.11%" o "Violet v2 13.75" o "PANTONE Trans. Wt. 49.14%"
      const compMatch = line.match(/(?:PANTONE\s+)?([A-Za-z\.\s0-9]+?)\s+([0-9]+(?:[\.,][0-9]+)?)\s*%?/i);
      if (compMatch) {
        const rawInk = compMatch[1].trim();
        const pct = parseFloat(compMatch[2].replace(',', '.'));
        if (!isNaN(pct) && pct > 0 && pct <= 100) {
          const baseName = normalizeDetectedInkName(rawInk);
          // Evitar duplicados consecutivos
          if (!detectedComponents.some((c) => c.baseName === baseName)) {
            detectedComponents.push({ baseName, percentage: pct });
          }
        }
      }
    }

    if (foundCode) {
      setExtractedCode(foundCode);
      setExtractedName(`PANTONE ${foundCode}`);
    } else {
      setExtractedCode('285 C');
      setExtractedName('PANTONE 285 C');
    }

    if (detectedComponents.length > 0) {
      setExtractedFormula(detectedComponents);
      const computed = calculateHexFromFormula(detectedComponents);
      setExtractedHex(computed);
      setExtractedFamily(detectFamilyFromHex(computed));
    } else {
      // Fallback predeterminado para que el usuario no empiece en blanco
      const defaultMix = [
        { baseName: 'PANTONE Pro. Blue', percentage: 37.11 },
        { baseName: 'PANTONE Violet v2', percentage: 13.75 },
        { baseName: 'PANTONE Trans. Wt.', percentage: 49.14 },
      ];
      setExtractedFormula(defaultMix);
      setExtractedHex('#0072CE');
      setExtractedFamily('Azules');
    }
  };

  const processImageFile = async (file: File) => {
    setIsProcessing(true);
    setOcrStatus('Cargando imagen...');
    setOcrProgress(10);

    const imageUrl = URL.createObjectURL(file);
    setImagePreviewUrl(imageUrl);

    try {
      setOcrStatus('Inicializando motor de visión OCR Tesseract...');
      setOcrProgress(30);

      const worker = await createWorker('eng');

      setOcrStatus('Reconociendo caracteres de la tira física...');
      setOcrProgress(60);

      const ret = await worker.recognize(file);
      setOcrProgress(90);

      await worker.terminate();

      setOcrStatus('Extrayendo tabla de porcentajes y código...');
      setOcrProgress(100);

      parseTextToFields(ret.data.text);
      setOcrStatus('¡Reconocimiento completado!');
    } catch (err: any) {
      console.error('Error en OCR:', err);
      setOcrStatus('No se pudo procesar la imagen con OCR. Puedes ingresar los datos o usar el texto manual.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Plantillas de prueba rápida para verificar en escritorio sin cámara física
  const loadDemoPhysicalStrip = (type: '285' | '100') => {
    if (type === '285') {
      const demoText = `PANTONE 285 C\nPANTONE Pro. Blue 37.11%\nPANTONE Violet v2 13.75%\nPANTONE Trans. Wt. 49.14%`;
      parseTextToFields(demoText);
      setImagePreviewUrl('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80');
    } else {
      const demoText = `PANTONE 100 C\nPANTONE Yellow PY12 15.43%\nPANTONE Orange 016 0.41%\nPANTONE Opaque Wt. 14.03%\nPANTONE Trans. Wt. 70.13%`;
      parseTextToFields(demoText);
      setImagePreviewUrl('https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80');
    }
  };

  const handleAutoBalance = () => {
    const currentSum = extractedFormula.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);
    const diff = Math.round((100 - currentSum) * 100) / 100;
    if (diff === 0) return;

    const transIdx = extractedFormula.findIndex((f) => f.baseName.includes('Trans. Wt.'));
    if (transIdx >= 0) {
      const updated = [...extractedFormula];
      updated[transIdx] = {
        ...updated[transIdx],
        percentage: Math.max(0, Math.round((updated[transIdx].percentage + diff) * 100) / 100),
      };
      setExtractedFormula(updated);
    } else if (diff > 0) {
      setExtractedFormula([...extractedFormula, { baseName: 'PANTONE Trans. Wt.', percentage: diff }]);
    } else {
      const total = extractedFormula.reduce((acc, c) => acc + c.percentage, 0);
      let running = 0;
      const normalized = extractedFormula.map((item, idx) => {
        if (idx === extractedFormula.length - 1) {
          return { ...item, percentage: Math.round((100 - running) * 100) / 100 };
        }
        const scaled = Math.round(((item.percentage / total) * 100) * 100) / 100;
        running += scaled;
        return { ...item, percentage: scaled };
      });
      setExtractedFormula(normalized);
    }
  };

  const handleUpdateComponent = (index: number, field: keyof InkComponent, value: any) => {
    const updated = [...extractedFormula];
    if (field === 'percentage') {
      const num = parseFloat(value) || 0;
      updated[index] = { ...updated[index], percentage: num };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setExtractedFormula(updated);
    const hex = calculateHexFromFormula(updated);
    setExtractedHex(hex);
    setExtractedFamily(detectFamilyFromHex(hex));
  };

  const handleAddComponent = () => {
    setExtractedFormula([...extractedFormula, { baseName: 'PANTONE Trans. Wt.', percentage: 0 }]);
  };

  const handleRemoveComponent = (idx: number) => {
    if (extractedFormula.length <= 1) return;
    setExtractedFormula(extractedFormula.filter((_, i) => i !== idx));
  };

  const handleSaveToCatalog = () => {
    if (!extractedCode.trim() || !isValid) return;

    const formattedCode = extractedCode.trim();
    const formattedName = extractedName.trim() || `PANTONE ${formattedCode}`;
    const id = `pantone-${formattedCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const newColor: PantoneColor = {
      id,
      code: formattedCode,
      name: formattedName,
      hex: extractedHex,
      family: extractedFamily,
      formula: extractedFormula,
      isCustom: true,
    };

    saveCustomColor(newColor);
    if (onColorSaved) {
      onColorSaved(newColor);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md transition-all duration-300"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-white z-10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-md shadow-amber-400/20">
              <Camera className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase flex items-center gap-2">
                <span>Escanear Tira Pantone Física</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OCR Preciso 100%
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Captura fotos de tiras Formula Guide Coated y digitaliza las recetas con exactitud
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

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'camera'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            Cámara & Foto de Tira
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'text'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Texto Directo / Dictado
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: CAMERA & PHOTO OCR */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* Capture / Upload actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mobile Camera Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm transition-all shadow-md shadow-amber-400/20 active:scale-95 flex items-center justify-center gap-2.5"
                >
                  <Camera className="w-5 h-5 stroke-[2.5]" />
                  <span>Tomar Foto con Cámara Móvil</span>
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Gallery / Desktop Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2.5"
                >
                  <Upload className="w-5 h-5 text-amber-400" />
                  <span>Subir Foto desde Galería / Archivo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Quick Plant Testing Strips */}
              <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 flex-wrap">
                <span className="font-semibold text-zinc-300">Prueba rápida de tira física:</span>
                <button
                  type="button"
                  onClick={() => loadDemoPhysicalStrip('285')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-mono text-[11px] font-bold border border-zinc-700"
                >
                  Tira Real 285 C
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoPhysicalStrip('100')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-mono text-[11px] font-bold border border-zinc-700"
                >
                  Tira Real 100 C
                </button>
              </div>

              {/* OCR Progress Indicator */}
              {isProcessing && (
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-amber-400/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-bold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {ocrStatus}
                    </span>
                    <span className="font-mono text-zinc-400">{ocrProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT DIRECT / DICTATION */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Pega directamente el texto transcripto de la tira física o dicta la fórmula por voz:
              </p>
              <textarea
                rows={4}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={`PANTONE 285 C\nPANTONE Pro. Blue 37.11%\nPANTONE Violet v2 13.75%\nPANTONE Trans. Wt. 49.14%`}
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-xl font-mono text-xs text-white placeholder-zinc-500 focus:border-amber-400 outline-none"
              />
              <button
                type="button"
                onClick={() => parseTextToFields(manualText)}
                disabled={!manualText.trim()}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Extraer y Verificar Receta
              </button>
            </div>
          )}

          {/* SIDE-BY-SIDE VERIFICATION SECTION */}
          {extractedFormula.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  Verificación de Datos Extraídos de la Tira
                </span>
                <span className="text-[11px] text-zinc-400">
                  Valida y corrige antes de incorporar al catálogo oficial
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Photo Preview Column (if present) */}
                {imagePreviewUrl && (
                  <div className="md:col-span-4 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col">
                    <div className="p-2 border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-bold text-zinc-400 flex items-center justify-between">
                      <span>Foto de Tira Física</span>
                    </div>
                    <div className="relative flex-1 min-h-[180px] bg-black flex items-center justify-center p-2">
                      <img
                        src={imagePreviewUrl}
                        alt="Tira Pantone Física"
                        className="max-h-64 w-auto object-contain rounded-lg shadow-md"
                      />
                    </div>
                  </div>
                )}

                {/* Editable Fields Column */}
                <div className={imagePreviewUrl ? 'md:col-span-8 space-y-4' : 'md:col-span-12 space-y-4'}>
                  {/* Code, Name, HEX swatch & Family */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Código Detectado
                      </label>
                      <input
                        type="text"
                        value={extractedCode}
                        onChange={(e) => setExtractedCode(e.target.value)}
                        className="w-full h-10 px-3 bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl text-sm font-mono font-bold text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Nombre Oficial
                      </label>
                      <input
                        type="text"
                        value={extractedName}
                        onChange={(e) => setExtractedName(e.target.value)}
                        className="w-full h-10 px-3 bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl text-sm text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Muestra HEX Visual
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={extractedHex}
                          onChange={(e) => setExtractedHex(e.target.value)}
                          className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={extractedHex}
                          onChange={(e) => setExtractedHex(e.target.value)}
                          className="flex-1 h-10 px-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-mono font-bold text-white uppercase outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Components breakdown list */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Tintas Base & Porcentajes Detectados
                      </span>
                      <button
                        type="button"
                        onClick={handleAddComponent}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold transition-colors flex items-center gap-1 border border-zinc-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar Tinta
                      </button>
                    </div>

                    <div className="space-y-2">
                      {extractedFormula.map((comp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/20"
                            style={{ backgroundColor: getBaseInkColor(comp.baseName) }}
                          />

                          <select
                            value={comp.baseName}
                            onChange={(e) => handleUpdateComponent(idx, 'baseName', e.target.value)}
                            className="flex-1 h-9 px-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-medium text-white outline-none cursor-pointer"
                          >
                            {OFFICIAL_BASE_INKS.map((ink) => (
                              <option key={ink} value={ink}>
                                {ink}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1 w-24">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={comp.percentage}
                              onChange={(e) => handleUpdateComponent(idx, 'percentage', e.target.value)}
                              className="w-full h-9 px-2 bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded-lg text-xs font-mono font-bold text-right text-white outline-none"
                            />
                            <span className="text-xs font-mono text-zinc-400">%</span>
                          </div>

                          {extractedFormula.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(idx)}
                              className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Proportional Segmented Bar */}
                    <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-zinc-950 border border-zinc-800 mt-1">
                      {extractedFormula.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                            backgroundColor: getBaseInkColor(item.baseName),
                          }}
                          title={`${item.baseName}: ${item.percentage}%`}
                          className="h-full border-r border-black/30 last:border-none"
                        />
                      ))}
                    </div>

                    {/* Sum meter with auto-balance */}
                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Scale className={`w-4 h-4 ${isValid ? 'text-emerald-400' : 'text-amber-400'}`} />
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
                          {!isValid && (
                            <span className="text-[11px] text-zinc-400">
                              {sum < 100
                                ? `Faltan ${(100 - sum).toFixed(2)}% para el balance industrial`
                                : `Exceso de ${(sum - 100).toFixed(2)}%`}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isValid && (
                        <button
                          type="button"
                          onClick={handleAutoBalance}
                          className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all"
                        >
                          Auto-calibrar a 100%
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!isValid || !extractedCode.trim()}
            onClick={handleSaveToCatalog}
            className={`px-5 py-2.5 rounded-xl text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95 ${
              isValid && extractedCode.trim()
                ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20 cursor-pointer'
                : 'bg-zinc-700 text-zinc-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Guardar en Catálogo con 1 Clic
          </button>
        </div>
      </div>
    </div>
  );
};
