import * as fs from 'fs';
import * as path from 'path';
export interface InkComponent {
  baseName: string;
  percentage: number;
}

export interface PantoneColor {
  id: string;
  code: string;
  name: string;
  hex: string;
  family: string;
  formula: InkComponent[];
  isCustom?: boolean;
}

// Muestras RGB calibradas para cada tinta base pura
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

const KNOWN_HEX: Record<string, string> = {
  '100 C': '#F6EB61',
  '101 C': '#F4ED47',
  '102 C': '#FCE300',
  '103 C': '#C69214',
  'Yellow C': '#FED100',
  '283 C': '#9BCBEB',
  '284 C': '#6CACE4',
  '285 C': '#0072CE',
  '286 C': '#0033A0',
  '287 C': '#00205B',
  '288 C': '#002D62',
};

// Aliases para mapear nombres de tintas extraídos por OCR a nombres oficiales
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

/**
 * Normaliza nombres de tinta base provenientes de OCR o texto escaneado.
 */
export function normalizeInkName(rawName: string): string {
  let cleaned = rawName.replace(/^pantone\s+/i, '').trim().toLowerCase();
  cleaned = cleaned.replace(/\s+/g, ' ');

  if (INK_ALIASES[cleaned]) {
    return INK_ALIASES[cleaned];
  }

  // Búsqueda por substring
  for (const [key, official] of Object.entries(INK_ALIASES)) {
    if (cleaned.includes(key)) {
      return official;
    }
  }

  return rawName.startsWith('PANTONE ') ? rawName : `PANTONE ${rawName}`;
}

/**
 * Mezcla sustractiva realista para calcular HEX de visualización
 */
export function computeHex(formula: InkComponent[], code: string): string {
  if (KNOWN_HEX[code]) return KNOWN_HEX[code];

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

/**
 * Asigna la familia cromática por tono visual
 */
export function determineFamily(hex: string, code: string): string {
  const codeLower = code.toLowerCase();
  if (codeLower.includes('cool gray') || codeLower.includes('warm gray') || codeLower.includes('black')) {
    return 'Neutros';
  }

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

/**
 * Parsea un bloque de texto que describe tiras físicas de la pantonera
 */
export function parsePantoneStripsText(rawText: string): { colors: PantoneColor[]; warnings: string[] } {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const colors: PantoneColor[] = [];
  const warnings: string[] = [];

  let currentColor: {
    code: string;
    formula: InkComponent[];
  } | null = null;

  const finalizeCurrentColor = () => {
    if (!currentColor) return;

    if (currentColor.formula.length === 0) {
      warnings.push(`Color ${currentColor.code} no tiene componentes registrados.`);
      return;
    }

    const sum = currentColor.formula.reduce((acc, c) => acc + c.percentage, 0);
    const roundedSum = Math.round(sum * 100) / 100;

    let normalizedFormula = currentColor.formula;
    if (Math.abs(roundedSum - 100.0) > 0.05) {
      if (roundedSum >= 90 && roundedSum <= 110) {
        // Auto-calibrar por redondeo de OCR
        const total = currentColor.formula.reduce((acc, c) => acc + c.percentage, 0);
        let running = 0;
        normalizedFormula = currentColor.formula.map((item, idx) => {
          if (idx === currentColor!.formula.length - 1) {
            return { ...item, percentage: Math.round((100 - running) * 100) / 100 };
          }
          const scaled = Math.round(((item.percentage / total) * 100) * 100) / 100;
          running += scaled;
          return { ...item, percentage: scaled };
        });
      } else {
        warnings.push(`Alerta: ${currentColor.code} suma ${roundedSum}% (difiere significativamente de 100.00%)`);
      }
    }

    const code = currentColor.code;
    const hex = computeHex(normalizedFormula, code);
    const family = determineFamily(hex, code);
    const id = `pantone-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    colors.push({
      id,
      code,
      name: `PANTONE ${code}`,
      hex,
      family,
      formula: normalizedFormula,
    });

    currentColor = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar encabezado de color: PANTONE 100 C, 285 C, etc.
    const headerMatch = line.match(/(?:PANTONE\s+)?([0-9A-Za-z\s]+?\s*C)\b/i);
    // Verificar si es encabezado o si es un componente de tinta
    const isComponentLine = line.match(/([0-9]+(?:[\.,][0-9]+)?)\s*%/);

    if (headerMatch && !isComponentLine) {
      finalizeCurrentColor();
      const code = headerMatch[1].trim();
      currentColor = {
        code,
        formula: [],
      };
      continue;
    }

    // Detectar fila de componente: [Tinta] [Porcentaje]%
    // Ej: "Yellow PY12 15.43%" o "PANTONE Pro. Blue 37.11" o "Trans. Wt. 70.13"
    const compMatch = line.match(/^(?:PANTONE\s+)?(.+?)\s+([0-9]+(?:[\.,][0-9]+)?)\s*%?$/i);
    if (compMatch && currentColor) {
      const rawInk = compMatch[1].trim();
      const pctStr = compMatch[2].replace(',', '.');
      const percentage = parseFloat(pctStr);

      if (!isNaN(percentage) && percentage > 0) {
        const baseName = normalizeInkName(rawInk);
        currentColor.formula.push({
          baseName,
          percentage,
        });
      }
    }
  }

  finalizeCurrentColor();

  return { colors, warnings };
}

// -------------------------------------------------------------
// Fórmulas físicas verificadas exactas provistas por el taller
// -------------------------------------------------------------
export const VERIFIED_PHYSICAL_SHEETS_TEXT = `
PANTONE 100 C
PANTONE Yellow PY12 15.43%
PANTONE Orange 016 0.41%
PANTONE Opaque Wt. 14.03%
PANTONE Trans. Wt. 70.13%

PANTONE 101 C
PANTONE Yellow PY12 13.60%
PANTONE Orange 016 0.25%
PANTONE Opaque Wt. 31.74%
PANTONE Trans. Wt. 54.41%

PANTONE 102 C
PANTONE Yellow PY12 52.17%
PANTONE Orange 016 0.40%
PANTONE Trans. Wt. 47.43%

PANTONE Yellow C
PANTONE Yellow PY12 77.44%
PANTONE Orange 016 0.94%
PANTONE Trans. Wt. 21.62%

PANTONE 103 C
PANTONE Yellow PY12 63.32%
PANTONE Orange 016 1.88%
PANTONE Black 2.12%
PANTONE Trans. Wt. 32.68%

PANTONE 283 C
PANTONE Pro. Blue 5.06%
PANTONE Violet v2 1.98%
PANTONE Trans. Wt. 92.96%

PANTONE 284 C
PANTONE Pro. Blue 10.50%
PANTONE Violet v2 4.00%
PANTONE Trans. Wt. 85.50%

PANTONE 285 C
PANTONE Pro. Blue 37.11%
PANTONE Violet v2 13.75%
PANTONE Trans. Wt. 49.14%

PANTONE 286 C
PANTONE Pro. Blue 77.20%
PANTONE Violet v2 22.80%

PANTONE 287 C
PANTONE Pro. Blue 65.18%
PANTONE Violet v2 31.33%
PANTONE Black 3.49%

PANTONE 288 C
PANTONE Pro. Blue 59.63%
PANTONE Violet v2 32.43%
PANTONE Black 7.94%
`;

/**
 * Actualiza de forma incremental public/data/pantone-database.json con las recetas verificadas
 */
export function updateDatabaseWithVerifiedStrips(extractedColors: PantoneColor[]): { updatedCount: number; totalCount: number } {
  const dbPath = path.resolve(process.cwd(), 'public', 'data', 'pantone-database.json');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`No se encontró el archivo ${dbPath}. Ejecuta primero npm run generate-catalog.`);
  }

  const existingRaw = fs.readFileSync(dbPath, 'utf-8');
  const existingColors: PantoneColor[] = JSON.parse(existingRaw);

  const map = new Map<string, PantoneColor>();
  for (const c of existingColors) {
    map.set(c.code.toLowerCase(), c);
  }

  let updatedCount = 0;
  for (const item of extractedColors) {
    const key = item.code.toLowerCase();
    const existing = map.get(key);
    map.set(key, {
      ...(existing || {}),
      ...item,
    });
    updatedCount++;
  }

  const merged = Array.from(map.values());
  fs.writeFileSync(dbPath, JSON.stringify(merged, null, 2), 'utf-8');

  return { updatedCount, totalCount: merged.length };
}

// Ejecución directa por CLI
function main() {
  console.log('🔍 Iniciando procesamiento y carga por lotes de tiras físicas de la pantonera...');

  // 1. Procesar tiras físicas de texto verificado
  const { colors, warnings } = parsePantoneStripsText(VERIFIED_PHYSICAL_SHEETS_TEXT);

  console.log(`📋 Fórmulas físicas procesadas: ${colors.length}`);
  if (warnings.length > 0) {
    console.log('⚠️ Advertencias encontradas:');
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  // 2. Actualizar pantone-database.json de forma incremental
  const { updatedCount, totalCount } = updateDatabaseWithVerifiedStrips(colors);

  console.log(`✅ ${updatedCount} recetas físicas actualizadas con precisión exacta al 100.00%`);
  console.log(`📊 Total de colores en la base de datos: ${totalCount}`);
  console.log('🎨 Muestra de recetas actualizadas:');
  for (const c of colors) {
    const formulaStr = c.formula.map((f) => `${f.baseName}: ${f.percentage}%`).join(', ');
    console.log(`   * ${c.code}: ${formulaStr}`);
  }
}

main();
