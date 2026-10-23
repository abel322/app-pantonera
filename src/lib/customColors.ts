import { PantoneColor, InkComponent } from '@/types/pantone';

export const CUSTOM_STORAGE_KEY = 'pantone_custom_workshop_formulas_v1';
export const CUSTOM_COLORS_EVENT = 'pantone-custom-colors-updated';

/**
 * Obtiene las fórmulas personalizadas guardadas por el operario en localStorage.
 */
export function getCustomColors(): PantoneColor[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error al leer fórmulas personalizadas de localStorage:', err);
    return [];
  }
}

/**
 * Guarda una nueva fórmula de color personalizada en localStorage.
 */
export function saveCustomColor(color: PantoneColor): void {
  if (typeof window === 'undefined') return;
  const current = getCustomColors();
  const existingIdx = current.findIndex((c) => c.id === color.id || c.code.toLowerCase() === color.code.toLowerCase());

  let updated: PantoneColor[];
  const stampedColor: PantoneColor = {
    ...color,
    isCustom: true,
  };

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = stampedColor;
  } else {
    updated = [stampedColor, ...current];
  }

  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(CUSTOM_COLORS_EVENT));
}

/**
 * Elimina una fórmula personalizada por ID.
 */
export function deleteCustomColor(id: string): void {
  if (typeof window === 'undefined') return;
  const current = getCustomColors();
  const filtered = current.filter((c) => c.id !== id);
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event(CUSTOM_COLORS_EVENT));
}

/**
 * Limpia todas las fórmulas personalizadas.
 */
export function clearAllCustomColors(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CUSTOM_STORAGE_KEY);
  window.dispatchEvent(new Event(CUSTOM_COLORS_EVENT));
}

/**
 * Valida que una fórmula sume exactamente 100.00% (margen de tolerancia de 0.05 por redondeo).
 */
export function validateFormulaSum(formula: InkComponent[]): { isValid: boolean; sum: number } {
  const sum = formula.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);
  const roundedSum = Math.round(sum * 100) / 100;
  const isValid = Math.abs(roundedSum - 100.0) <= 0.05;
  return { isValid, sum: roundedSum };
}

/**
 * Normaliza los porcentajes para que la suma sea exactamente 100.00%.
 */
export function normalizeFormulaPercentages(formula: InkComponent[]): InkComponent[] {
  const valid = formula.filter((c) => c.percentage > 0);
  if (valid.length === 0) return [];
  const total = valid.reduce((acc, c) => acc + c.percentage, 0);

  let runningSum = 0;
  const result: InkComponent[] = [];

  for (let i = 0; i < valid.length; i++) {
    if (i === valid.length - 1) {
      const remaining = Math.round((100 - runningSum) * 100) / 100;
      result.push({
        baseName: valid[i].baseName,
        percentage: remaining,
      });
    } else {
      const pct = Math.round(((valid[i].percentage / total) * 100) * 100) / 100;
      runningSum += pct;
      result.push({
        baseName: valid[i].baseName,
        percentage: pct,
      });
    }
  }

  return result;
}

/**
 * Parsea un archivo CSV con formato:
 * Codigo,Nombre,HEX,Familia,Tinta1:Porcentaje1,Tinta2:Porcentaje2,...
 */
export function parseCSVColors(csvText: string): { colors: PantoneColor[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const colors: PantoneColor[] = [];
  const errors: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Omitir cabecera común si existe
    if (idx === 0 && line.toLowerCase().startsWith('codigo') || line.toLowerCase().startsWith('code')) {
      continue;
    }

    const parts = line.split(',');
    if (parts.length < 5) {
      errors.push(`Línea ${idx + 1}: columnas insuficientes. Debe tener al menos Código, Nombre, HEX, Familia y una tinta.`);
      continue;
    }

    const code = parts[0].trim();
    const name = parts[1].trim();
    let hex = parts[2].trim();
    if (!hex.startsWith('#')) {
      hex = `#${hex}`;
    }

    const family = parts[3].trim() || 'Neutros';

    // Parsear tintas base restantes (parts[4], parts[5], ...)
    const rawFormula: InkComponent[] = [];
    let lineFormatError = false;

    for (let c = 4; c < parts.length; c++) {
      const inkChunk = parts[c].trim();
      if (!inkChunk) continue;

      const sepIdx = inkChunk.lastIndexOf(':');
      if (sepIdx === -1) {
        errors.push(`Línea ${idx + 1}: Tinta "${inkChunk}" no tiene formato Tinta:Porcentaje`);
        lineFormatError = true;
        break;
      }

      const baseName = inkChunk.substring(0, sepIdx).trim();
      const pctStr = inkChunk.substring(sepIdx + 1).trim();
      const percentage = parseFloat(pctStr);

      if (isNaN(percentage) || percentage <= 0) {
        errors.push(`Línea ${idx + 1}: Porcentaje inválido para tinta "${baseName}"`);
        lineFormatError = true;
        break;
      }

      rawFormula.push({ baseName, percentage });
    }

    if (lineFormatError || rawFormula.length === 0) continue;

    // Validar suma de porcentajes
    const { isValid, sum } = validateFormulaSum(rawFormula);
    let normalized = rawFormula;
    if (!isValid) {
      if (sum >= 95 && sum <= 105) {
        // Auto-calibrar si está muy cerca por redondeo
        normalized = normalizeFormulaPercentages(rawFormula);
      } else {
        errors.push(`Línea ${idx + 1} (${code}): Los porcentajes suman ${sum}%, no el 100.00% requerido.`);
        continue;
      }
    }

    const id = `pantone-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    colors.push({
      id,
      code,
      name,
      hex,
      family,
      formula: normalized,
      isCustom: true,
    });
  }

  return { colors, errors };
}

/**
 * Parsea un archivo JSON con formato de arreglo de PantoneColor.
 */
export function parseJSONColors(jsonText: string): { colors: PantoneColor[]; errors: string[] } {
  const errors: string[] = [];
  try {
    const data = JSON.parse(jsonText);
    const list: any[] = Array.isArray(data) ? data : data.colors ? data.colors : [];

    if (!Array.isArray(list) || list.length === 0) {
      return { colors: [], errors: ['El archivo JSON no contiene una lista válida de colores.'] };
    }

    const parsedColors: PantoneColor[] = [];

    list.forEach((item, i) => {
      if (!item.code || !item.name || !item.hex || !Array.isArray(item.formula)) {
        errors.push(`Elemento #${i + 1}: campos requeridos faltantes (code, name, hex, formula)`);
        return;
      }

      const formula: InkComponent[] = item.formula.map((f: any) => ({
        baseName: String(f.baseName || ''),
        percentage: Number(f.percentage) || 0,
      }));

      const { isValid, sum } = validateFormulaSum(formula);
      let normalized = formula;
      if (!isValid) {
        if (sum >= 95 && sum <= 105) {
          normalized = normalizeFormulaPercentages(formula);
        } else {
          errors.push(`Color "${item.code}": suma ${sum}% (debe ser 100.00%)`);
          return;
        }
      }

      const id = item.id || `pantone-${String(item.code).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      parsedColors.push({
        id,
        code: String(item.code),
        name: String(item.name),
        hex: item.hex.startsWith('#') ? item.hex : `#${item.hex}`,
        family: item.family || 'Neutros',
        formula: normalized,
        isCustom: true,
      });
    });

    return { colors: parsedColors, errors };
  } catch (err: any) {
    return { colors: [], errors: [`Error al leer JSON: ${err.message}`] };
  }
}

/**
 * Genera y descarga un archivo JSON de respaldo con todos los colores dados.
 */
export function exportToJSONFile(colors: PantoneColor[], filename?: string): void {
  const blob = new Blob([JSON.stringify(colors, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `pantonera-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga un archivo CSV con el formato estándar de importación.
 */
export function exportToCSVFile(colors: PantoneColor[], filename?: string): void {
  const header = 'Codigo,Nombre,HEX,Familia,TintasFormula';
  const rows = colors.map((c) => {
    const formulaStr = c.formula.map((f) => `${f.baseName}:${f.percentage.toFixed(2)}`).join(',');
    return `"${c.code}","${c.name}","${c.hex}","${c.family}",${formulaStr}`;
  });

  const content = [header, ...rows].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `pantonera-formulas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
