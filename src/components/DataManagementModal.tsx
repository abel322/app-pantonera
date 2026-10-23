'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Database,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { PantoneColor } from '@/types/pantone';
import {
  parseCSVColors,
  parseJSONColors,
  exportToJSONFile,
  exportToCSVFile,
  getCustomColors,
  clearAllCustomColors,
  CUSTOM_STORAGE_KEY,
  CUSTOM_COLORS_EVENT,
} from '@/lib/customColors';
import { getBaseInkColor } from '@/lib/calculator';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  allColors: PantoneColor[];
  customColorsCount: number;
  onImportSuccess?: (count: number) => void;
  onOpenCreateModal?: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  allColors,
  customColorsCount,
  onImportSuccess,
  onOpenCreateModal,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [parsedPreview, setParsedPreview] = useState<PantoneColor[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = (file: File) => {
    setImportErrors([]);
    setSuccessMessage('');
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const isJson = file.name.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[');

      if (isJson) {
        const { colors, errors } = parseJSONColors(text);
        setParsedPreview(colors);
        setImportErrors(errors);
      } else {
        const { colors, errors } = parseCSVColors(text);
        setParsedPreview(colors);
        setImportErrors(errors);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;

    const currentCustom = getCustomColors();
    // Merge by ID or Code
    const map = new Map<string, PantoneColor>();
    currentCustom.forEach((c) => map.set(c.code.toLowerCase(), c));
    parsedPreview.forEach((c) => map.set(c.code.toLowerCase(), { ...c, isCustom: true }));

    const merged = Array.from(map.values());
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(CUSTOM_COLORS_EVENT));

    const importedCount = parsedPreview.length;
    setSuccessMessage(`¡Se importaron ${importedCount} fórmulas de taller exitosamente!`);
    setParsedPreview([]);
    setImportFileName('');
    if (onImportSuccess) onImportSuccess(importedCount);
  };

  const handleClearCustomColors = () => {
    if (window.confirm('¿Deseas eliminar todas las fórmulas personalizadas importadas del taller? La base Pantone original permanecerá intacta.')) {
      clearAllCustomColors();
      setSuccessMessage('Fórmulas de taller eliminadas. Base original restablecida.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md transition-all duration-300"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-white z-10">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
              <Database className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                <span>Gestión de Catálogo & Taller</span>
                {customColorsCount > 0 && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    +{customColorsCount} personalizadas
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                Importación y exportación de fórmulas CSV/JSON con persistencia local
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

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/20 px-5 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setSuccessMessage('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Importar Fórmulas (CSV / JSON)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setSuccessMessage('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Exportar / Respaldo
          </button>
        </div>

        {/* Body Container */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400">
                  <Upload className="w-6 h-6 stroke-[2.2]" />
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    {importFileName ? importFileName : 'Arrastra o haz clic para subir tu archivo'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Soporta archivos <span className="text-amber-400 font-mono">.CSV</span> o{' '}
                    <span className="text-amber-400 font-mono">.JSON</span> con validación al 100.00%
                  </p>
                </div>
              </div>

              {/* CSV Format Reference Box & Direct Paste */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>Formato CSV / Excel de Planta:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleCsv = `Codigo,Nombre,HEX,Familia,Tinta1:Porcentaje1,Tinta2:Porcentaje2,Tinta3:Porcentaje3\n285 C,PANTONE 285 C,#0072CE,Azules,PANTONE Pro. Blue:37.11,PANTONE Violet v2:13.75,PANTONE Trans. Wt.:49.14\n100 C,PANTONE 100 C,#F6EB61,Amarillos,PANTONE Yellow PY12:15.43,PANTONE Orange 016:0.41,PANTONE Opaque Wt.:14.03,PANTONE Trans. Wt.:70.13\n`;
                      const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'plantilla-pantone-taller.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
                  >
                    Descargar Plantilla CSV de Ejemplo
                  </button>
                </div>
                <pre className="font-mono text-[11px] bg-black/60 p-2 rounded-xl text-zinc-300 overflow-x-auto border border-zinc-800">
                  Codigo,Nombre,HEX,Familia,Tinta1:Porcentaje1,Tinta2:Porcentaje2,...
                  <br />
                  <span className="text-zinc-500">
                    Ejemplo: 285 C,PANTONE 285 C,#0072CE,Azules,PANTONE Pro. Blue:37.11,PANTONE Violet v2:13.75,PANTONE Trans. Wt.:49.14
                  </span>
                </pre>

                {/* Direct Paste Area */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    O pega texto CSV directamente aquí (desde Excel o correo):
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      placeholder="Pega aquí filas CSV de Excel..."
                      id="direct-csv-input"
                      className="flex-1 p-2 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-[11px] text-white placeholder-zinc-600 outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('direct-csv-input') as HTMLTextAreaElement;
                        if (el && el.value.trim()) {
                          const { colors, errors } = parseCSVColors(el.value);
                          setParsedPreview(colors);
                          setImportErrors(errors);
                          setImportFileName('Texto Pegado');
                        }
                      }}
                      className="px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-bold border border-zinc-700"
                    >
                      Procesar
                    </button>
                  </div>
                </div>
              </div>

              {/* Validation errors */}
              {importErrors.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800 text-xs text-red-300 space-y-1 max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-1.5 font-bold text-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Errores de formato encontrados ({importErrors.length}):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table of Colors to Import */}
              {parsedPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Vista previa de importación ({parsedPreview.length} fórmulas válidas)
                    </span>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-md shadow-amber-400/20 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar e Incorporar al Catálogo
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 sticky top-0 font-bold border-b border-zinc-800">
                        <tr>
                          <th className="p-2.5">Muestra</th>
                          <th className="p-2.5">Código / Nombre</th>
                          <th className="p-2.5">Familia</th>
                          <th className="p-2.5">Fórmula de Tintas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {parsedPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/50">
                            <td className="p-2.5">
                              <div
                                className="w-6 h-6 rounded-md border border-white/20 shadow-sm"
                                style={{ backgroundColor: item.hex }}
                              />
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold font-mono text-white block">{item.code}</span>
                              <span className="text-[11px] text-zinc-400">{item.name}</span>
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                                {item.family}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap gap-1">
                                {item.formula.map((f, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono"
                                  >
                                    {f.baseName.replace('PANTONE ', '')}: {f.percentage}%
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <p className="text-xs text-zinc-300">
                Descarga una copia completa de la base de datos Pantone activa (incluyendo las fórmulas oficiales y las creadas o importadas en tu taller) para auditorías, transferencias entre plantas o respaldo sin conexión.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export JSON Card */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <FileCode className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Respaldo Completo en JSON</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Estructura completa de {allColors.length} colores con nombres, swatches HEX y componentes.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportToJSONFile(allColors)}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-zinc-700"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    Descargar Respaldo JSON ({allColors.length} colores)
                  </button>
                </div>

                {/* Export CSV Card */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Exportar a Planilla CSV</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Formato compatible con Excel, Google Sheets y sistemas de dosificación de planta.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportToCSVFile(allColors)}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-zinc-700"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Descargar CSV de Planta
                  </button>
                </div>
              </div>

              {/* Custom Workshop formulas maintenance */}
              {customColorsCount > 0 && (
                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-300 block">
                      Fórmulas propias en memoria: {customColorsCount}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Almacenadas en el almacenamiento seguro local de este dispositivo
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearCustomColors}
                    className="px-3.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Restablecer a Originales
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          {onOpenCreateModal ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateModal();
              }}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              ¿Quieres formular un color a mano? Abre el formulario manual
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
