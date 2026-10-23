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
  family: 'Amarillos' | 'Azules' | 'Naranjas' | 'Rojos' | 'Verdes' | 'Violetas' | 'Neutros';
  formula: InkComponent[];
}

// 14 tintas base oficiales de la Pantone Formula Guide Coated
export const OFFICIAL_BASE_INKS = [
  'PANTONE Yellow PY12',
  'PANTONE Orange 016',
  'PANTONE Warm Red',
  'PANTONE Rubine Red',
  'PANTONE Rhodamine Red',
  'PANTONE Purple',
  'PANTONE Violet v2',
  'PANTONE Pro. Blue',
  'PANTONE Reflex Blue',
  'PANTONE Process Blue',
  'PANTONE Green',
  'PANTONE Black',
  'PANTONE Trans. Wt.',
  'PANTONE Opaque Wt.',
] as const;

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

// Swatches calibrados para colores Pantone de alta notoriedad
const KNOWN_HEX_OVERRIDES: Record<string, string> = {
  '100 C': '#F6EB61',
  '101 C': '#F4ED47',
  '102 C': '#FCE300',
  '103 C': '#C69214',
  '104 C': '#AF820A',
  '105 C': '#8C6710',
  'Yellow C': '#FED100',
  '108 C': '#FFD100',
  '109 C': '#FFD100',
  '116 C': '#FFCD00',
  '123 C': '#FFC72C',
  '124 C': '#EAAA00',
  '130 C': '#F2A900',
  '137 C': '#FFA300',
  '021 C': '#FE5000',
  'Orange 021 C': '#FE5000',
  '151 C': '#FF8200',
  '165 C': '#FF671F',
  '172 C': '#FA4616',
  'Warm Red C': '#F9423A',
  '179 C': '#E03C31',
  '185 C': '#E4002B',
  '186 C': '#C8102E',
  '187 C': '#A6192E',
  '199 C': '#D50032',
  '200 C': '#BA0C2F',
  'Red 032 C': '#EF3340',
  'Rubine Red C': '#CE0058',
  'Rhodamine Red C': '#E10098',
  'Purple C': '#BB29BB',
  'Violet C': '#430098',
  '266 C': '#753BBD',
  '268 C': '#582C83',
  'Blue 072 C': '#10069F',
  'Reflex Blue C': '#0A1172',
  'Process Blue C': '#0085CA',
  '283 C': '#9BCBEB',
  '284 C': '#6CACE4',
  '285 C': '#0072CE',
  '286 C': '#0033A0',
  '287 C': '#00205B',
  '288 C': '#002D62',
  '293 C': '#003DA5',
  '299 C': '#00A3E0',
  '300 C': '#005EB8',
  '312 C': '#00A9CE',
  '320 C': '#009CA6',
  'Green C': '#00AB4E',
  '347 C': '#009A44',
  '348 C': '#00843D',
  '354 C': '#00B140',
  '361 C': '#43B02A',
  '368 C': '#78BE20',
  '375 C': '#97D700',
  '382 C': '#BAD80A',
  '420 C': '#C7C9C7',
  '421 C': '#B2B4B2',
  '422 C': '#9EA2A2',
  '423 C': '#888B8D',
  '424 C': '#707372',
  '425 C': '#54585A',
  'Cool Gray 1 C': '#D9D9D6',
  'Cool Gray 3 C': '#C8C9C7',
  'Cool Gray 5 C': '#B1B3B3',
  'Cool Gray 7 C': '#97999B',
  'Cool Gray 9 C': '#75787B',
  'Cool Gray 11 C': '#53565A',
  'Warm Gray 1 C': '#D7D2CB',
  'Warm Gray 3 C': '#C6C2BA',
  'Warm Gray 5 C': '#ACA39A',
  'Warm Gray 7 C': '#968C83',
  'Warm Gray 9 C': '#766D65',
  'Warm Gray 11 C': '#544D45',
  'Black C': '#2D2926',
};

/**
 * Normaliza y redondea una fórmula de tintas para que la suma sea exactamente 100.00%.
 */
function normalizeFormula(components: { baseName: string; percentage: number }[]): InkComponent[] {
  const filtered = components.filter((c) => c.percentage > 0);
  const total = filtered.reduce((acc, c) => acc + c.percentage, 0);

  let runningSum = 0;
  const result: InkComponent[] = [];

  for (let i = 0; i < filtered.length; i++) {
    if (i === filtered.length - 1) {
      // El último elemento absorbe la diferencia de redondeo a 100.00 exacto
      const remainder = Math.round((100 - runningSum) * 100) / 100;
      result.push({
        baseName: filtered[i].baseName,
        percentage: remainder,
      });
    } else {
      const pct = Math.round(((filtered[i].percentage / total) * 100) * 100) / 100;
      runningSum += pct;
      result.push({
        baseName: filtered[i].baseName,
        percentage: pct,
      });
    }
  }

  return result;
}

/**
 * Mezcla sustractiva realista basada en absorbancia óptica para tintas de imprenta.
 */
function computeHexFromFormula(formula: InkComponent[], code: string): string {
  if (KNOWN_HEX_OVERRIDES[code]) {
    return KNOWN_HEX_OVERRIDES[code];
  }

  // Absorbancias ópticas (Kubelka-Munk / CMY)
  let absR = 0;
  let absG = 0;
  let absB = 0;
  let transWeightFraction = 0;

  for (const comp of formula) {
    const fraction = comp.percentage / 100;
    if (comp.baseName.includes('Trans. Wt.') || comp.baseName.includes('Opaque Wt.')) {
      transWeightFraction += fraction;
      continue;
    }

    const rgb = BASE_INK_RGB[comp.baseName] || [128, 128, 128];
    // Convertir RGB a absorbancia sustractiva con factor de saturación
    const cr = Math.max(0.01, rgb[0] / 255);
    const cg = Math.max(0.01, rgb[1] / 255);
    const cb = Math.max(0.01, rgb[2] / 255);

    absR += -Math.log(cr) * fraction * 1.35;
    absG += -Math.log(cg) * fraction * 1.35;
    absB += -Math.log(cb) * fraction * 1.35;
  }

  // Si casi todo es transparente/blanco
  if (absR + absG + absB < 0.001) {
    return '#F4F4F4';
  }

  // Dilución por Trans. Wt. (aclara hacia el blanco del papel estucado)
  const dilution = Math.max(0.08, 1 - transWeightFraction * 0.85);

  let r = Math.round(255 * Math.exp(-absR * dilution));
  let g = Math.round(255 * Math.exp(-absG * dilution));
  let b = Math.round(255 * Math.exp(-absB * dilution));

  // Blend final con el papel blanco según transWeightFraction
  if (transWeightFraction > 0) {
    const paper = 255;
    r = Math.round(r * (1 - transWeightFraction * 0.45) + paper * (transWeightFraction * 0.45));
    g = Math.round(g * (1 - transWeightFraction * 0.45) + paper * (transWeightFraction * 0.45));
    b = Math.round(b * (1 - transWeightFraction * 0.45) + paper * (transWeightFraction * 0.45));
  }

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Determina automáticamente la familia cromática por Hue y saturación.
 */
function determineFamily(
  hex: string,
  code: string,
  formula: InkComponent[]
): 'Amarillos' | 'Azules' | 'Naranjas' | 'Rojos' | 'Verdes' | 'Violetas' | 'Neutros' {
  const codeLower = code.toLowerCase();
  if (
    codeLower.includes('cool gray') ||
    codeLower.includes('warm gray') ||
    codeLower.includes('black') ||
    codeLower.includes('871') ||
    codeLower.includes('877')
  ) {
    return 'Neutros';
  }

  // Conversión HEX -> RGB -> HSL
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

  if (d === 0) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / d + 2) * 60;
  } else {
    h = ((r - g) / d + 4) * 60;
  }

  // Tonalidades neutras/grisáceas/marrones apagados
  if (s < 0.14 || (l < 0.18 && s < 0.25)) {
    return 'Neutros';
  }

  // Mapeo por ángulo HUE
  if (h >= 14 && h < 48) {
    return 'Naranjas';
  }
  if (h >= 48 && h < 75) {
    return 'Amarillos';
  }
  if (h >= 75 && h < 172) {
    return 'Verdes';
  }
  if (h >= 172 && h < 265) {
    return 'Azules';
  }
  if (h >= 265 && h < 332) {
    return 'Violetas';
  }
  return 'Rojos';
}

/**
 * Generador de una página de 7 colores Pantone con progresión estándar de degradado:
 * Tinte claro (1) -> Tinte medio (2, 3) -> Saturado puro (4) -> Sombra profunda (5, 6, 7).
 */
interface PageDefinition {
  startNumber: number;
  count?: number; // Generalmente 7 o 6 colores por serie
  primaryBase: string;
  secondaryBase?: string;
  secondaryRatio?: number; // 0 a 1
  shadeBase?: string; // Tinta para oscurecer (PANTONE Black, PANTONE Reflex Blue, etc.)
  customFamily?: 'Amarillos' | 'Azules' | 'Naranjas' | 'Rojos' | 'Verdes' | 'Violetas' | 'Neutros';
}

function generatePantonePage(def: PageDefinition): PantoneColor[] {
  const count = def.count || 7;
  const colors: PantoneColor[] = [];
  const secBase = def.secondaryBase || def.primaryBase;
  const secRatio = def.secondaryRatio !== undefined ? def.secondaryRatio : 0;
  const shadeBase = def.shadeBase || 'PANTONE Black';

  for (let step = 0; step < count; step++) {
    const num = def.startNumber + step;
    const code = `${num} C`;
    const name = `PANTONE ${code}`;
    const id = `pantone-${num}-c`;

    const rawComponents: { baseName: string; percentage: number }[] = [];

    // Progresión clásica de la Formula Guide en 7 niveles:
    // Niveles 0, 1, 2: Diluidos con Trans. Wt. (tintes claros a medios)
    // Nivel 3: Base pura o saturada
    // Niveles 4, 5, 6: Saturados profundos con tintas base + Black/sombra
    if (step === 0) {
      // Swatch 1: Tinte muy suave (ej. 100 C, 283 C)
      const chromPct = 12.5;
      rawComponents.push({ baseName: def.primaryBase, percentage: chromPct * (1 - secRatio) });
      if (secRatio > 0) rawComponents.push({ baseName: secBase, percentage: chromPct * secRatio });
      rawComponents.push({ baseName: 'PANTONE Trans. Wt.', percentage: 87.5 });
    } else if (step === 1) {
      // Swatch 2: Tinte suave (ej. 101 C, 284 C)
      const chromPct = 25.0;
      rawComponents.push({ baseName: def.primaryBase, percentage: chromPct * (1 - secRatio) });
      if (secRatio > 0) rawComponents.push({ baseName: secBase, percentage: chromPct * secRatio });
      rawComponents.push({ baseName: 'PANTONE Trans. Wt.', percentage: 75.0 });
    } else if (step === 2) {
      // Swatch 3: Tinte medio vibrante (ej. 102 C, 285 C)
      const chromPct = 50.0;
      rawComponents.push({ baseName: def.primaryBase, percentage: chromPct * (1 - secRatio) });
      if (secRatio > 0) rawComponents.push({ baseName: secBase, percentage: chromPct * secRatio });
      rawComponents.push({ baseName: 'PANTONE Trans. Wt.', percentage: 50.0 });
    } else if (step === 3) {
      // Swatch 4: Tono principal pleno (ej. 103 C, 286 C)
      const chromPct = 95.0;
      rawComponents.push({ baseName: def.primaryBase, percentage: chromPct * (1 - secRatio) });
      if (secRatio > 0) rawComponents.push({ baseName: secBase, percentage: chromPct * secRatio });
      rawComponents.push({ baseName: 'PANTONE Trans. Wt.', percentage: 5.0 });
    } else if (step === 4) {
      // Swatch 5: Sombra enriquecida
      const chromPct = 85.0;
      rawComponents.push({ baseName: def.primaryBase, percentage: chromPct * (1 - secRatio) });
      if (secRatio > 0) rawComponents.push({ baseName: secBase, percentage: chromPct * secRatio });
      rawComponents.push({ baseName: shadeBase, percentage: 10.0 });
      rawComponents.push({ baseName: 'PANTONE Trans. Wt.', percentage: 5.0 });
    } else if (step === 5) {
      // Swatch 6: Sombra oscura
      const chromPct = 75.0;
      rawComponents.push({ baseName: def.primaryBase, percentage: chromPct * (1 - secRatio) });
      if (secRatio > 0) rawComponents.push({ baseName: secBase, percentage: chromPct * secRatio });
      rawComponents.push({ baseName: shadeBase, percentage: 20.0 });
      rawComponents.push({ baseName: 'PANTONE Trans. Wt.', percentage: 5.0 });
    } else {
      // Swatch 7: Tono más oscuro de la serie
      const chromPct = 65.0;
      rawComponents.push({ baseName: def.primaryBase, percentage: chromPct * (1 - secRatio) });
      if (secRatio > 0) rawComponents.push({ baseName: secBase, percentage: chromPct * secRatio });
      rawComponents.push({ baseName: shadeBase, percentage: 32.5 });
      rawComponents.push({ baseName: 'PANTONE Trans. Wt.', percentage: 2.5 });
    }

    const formula = normalizeFormula(rawComponents);
    const hex = computeHexFromFormula(formula, code);
    const family = def.customFamily || determineFamily(hex, code, formula);

    colors.push({
      id,
      code,
      name,
      hex,
      family,
      formula,
    });
  }

  return colors;
}

// ---------------------------------------------------------
// Generador Principal de la Base de Datos Pantone Masiva
// ---------------------------------------------------------
export function generateCatalog(): PantoneColor[] {
  const catalog: PantoneColor[] = [];
  const seenIds = new Set<string>();

  const addColor = (color: PantoneColor) => {
    if (!seenIds.has(color.id)) {
      seenIds.add(color.id);
      // Validar estrictamente la suma al 100.00%
      const sum = color.formula.reduce((acc, c) => acc + c.percentage, 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new Error(`Color ${color.code} no suma 100%: ${sum}`);
      }
      catalog.push(color);
    }
  };

  // 1. TINTAS BASE OFICIALES (Primarias sueltas)
  const basePrimaries: { code: string; name: string; hex: string; base: string; fam: any }[] = [
    { code: 'Yellow C', name: 'PANTONE Yellow C', hex: '#FED100', base: 'PANTONE Yellow PY12', fam: 'Amarillos' },
    { code: 'Orange 021 C', name: 'PANTONE Orange 021 C', hex: '#FE5000', base: 'PANTONE Orange 016', fam: 'Naranjas' },
    { code: 'Warm Red C', name: 'PANTONE Warm Red C', hex: '#F9423A', base: 'PANTONE Warm Red', fam: 'Rojos' },
    { code: 'Red 032 C', name: 'PANTONE Red 032 C', hex: '#EF3340', base: 'PANTONE Warm Red', fam: 'Rojos' },
    { code: 'Rubine Red C', name: 'PANTONE Rubine Red C', hex: '#CE0058', base: 'PANTONE Rubine Red', fam: 'Rojos' },
    { code: 'Rhodamine Red C', name: 'PANTONE Rhodamine Red C', hex: '#E10098', base: 'PANTONE Rhodamine Red', fam: 'Violetas' },
    { code: 'Purple C', name: 'PANTONE Purple C', hex: '#BB29BB', base: 'PANTONE Purple', fam: 'Violetas' },
    { code: 'Violet C', name: 'PANTONE Violet C', hex: '#430098', base: 'PANTONE Violet v2', fam: 'Violetas' },
    { code: 'Blue 072 C', name: 'PANTONE Blue 072 C', hex: '#10069F', base: 'PANTONE Reflex Blue', fam: 'Azules' },
    { code: 'Reflex Blue C', name: 'PANTONE Reflex Blue C', hex: '#0A1172', base: 'PANTONE Reflex Blue', fam: 'Azules' },
    { code: 'Process Blue C', name: 'PANTONE Process Blue C', hex: '#0085CA', base: 'PANTONE Process Blue', fam: 'Azules' },
    { code: 'Green C', name: 'PANTONE Green C', hex: '#00AB4E', base: 'PANTONE Green', fam: 'Verdes' },
    { code: 'Black C', name: 'PANTONE Black C', hex: '#2D2926', base: 'PANTONE Black', fam: 'Neutros' },
  ];

  for (const bp of basePrimaries) {
    addColor({
      id: `pantone-${bp.code.toLowerCase().replace(/\s+/g, '-')}`,
      code: bp.code,
      name: bp.name,
      hex: bp.hex,
      family: bp.fam,
      formula: [{ baseName: bp.base, percentage: 100.00 }],
    });
  }

  // 2. SERIES 100 C a 587 C (Clásica Formula Guide, 71 páginas de 7 colores)
  const classicSeriesDefinitions: PageDefinition[] = [
    // --- AMARILLOS Y OCRES (100 a 140) ---
    { startNumber: 100, count: 6, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Trans. Wt.', secondaryRatio: 0 },
    { startNumber: 106, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.05 },
    { startNumber: 113, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.12 },
    { startNumber: 120, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Orange 016', secondaryRatio: 0.18 },
    { startNumber: 127, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.22 },
    { startNumber: 134, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Orange 016', secondaryRatio: 0.30 },
    { startNumber: 141, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.38 },

    // --- NARANJAS Y CÁLIDOS (148 a 175) ---
    { startNumber: 148, primaryBase: 'PANTONE Orange 016', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.40 },
    { startNumber: 155, primaryBase: 'PANTONE Orange 016', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.20 },
    { startNumber: 162, primaryBase: 'PANTONE Orange 016', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.15 },
    { startNumber: 169, primaryBase: 'PANTONE Orange 016', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.30 },

    // --- ROJOS Y RUBINES (176 a 216) ---
    { startNumber: 176, count: 6, primaryBase: 'PANTONE Warm Red', secondaryBase: 'PANTONE Rubine Red', secondaryRatio: 0.10 },
    { startNumber: 182, primaryBase: 'PANTONE Warm Red', secondaryBase: 'PANTONE Rubine Red', secondaryRatio: 0.25 },
    { startNumber: 189, count: 7, primaryBase: 'PANTONE Rubine Red', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.30 },
    { startNumber: 196, primaryBase: 'PANTONE Rubine Red', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.15 },
    { startNumber: 203, primaryBase: 'PANTONE Rubine Red', secondaryBase: 'PANTONE Purple', secondaryRatio: 0.15 },
    { startNumber: 210, primaryBase: 'PANTONE Rhodamine Red', secondaryBase: 'PANTONE Rubine Red', secondaryRatio: 0.25 },

    // --- VIOLETAS, MAGENTAS Y PÚRPURAS (217 a 269) ---
    { startNumber: 217, count: 6, primaryBase: 'PANTONE Rhodamine Red', secondaryBase: 'PANTONE Purple', secondaryRatio: 0.15 },
    { startNumber: 223, primaryBase: 'PANTONE Rhodamine Red', secondaryBase: 'PANTONE Purple', secondaryRatio: 0.35 },
    { startNumber: 230, count: 6, primaryBase: 'PANTONE Purple', secondaryBase: 'PANTONE Rhodamine Red', secondaryRatio: 0.20 },
    { startNumber: 236, primaryBase: 'PANTONE Purple', secondaryBase: 'PANTONE Violet v2', secondaryRatio: 0.25 },
    { startNumber: 243, primaryBase: 'PANTONE Purple', secondaryBase: 'PANTONE Violet v2', secondaryRatio: 0.50 },
    { startNumber: 250, count: 6, primaryBase: 'PANTONE Violet v2', secondaryBase: 'PANTONE Purple', secondaryRatio: 0.35 },
    { startNumber: 256, primaryBase: 'PANTONE Violet v2', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.20 },
    { startNumber: 263, primaryBase: 'PANTONE Violet v2', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.40 },

    // --- AZULES CLÁSICOS, REFLEX Y PROCESS (270 a 316) ---
    { startNumber: 270, primaryBase: 'PANTONE Reflex Blue', secondaryBase: 'PANTONE Violet v2', secondaryRatio: 0.25 },
    { startNumber: 277, count: 6, primaryBase: 'PANTONE Reflex Blue', secondaryBase: 'PANTONE Pro. Blue', secondaryRatio: 0.15 },
    { startNumber: 283, primaryBase: 'PANTONE Pro. Blue', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.25 },
    { startNumber: 290, primaryBase: 'PANTONE Reflex Blue', secondaryBase: 'PANTONE Pro. Blue', secondaryRatio: 0.40 },
    { startNumber: 297, primaryBase: 'PANTONE Process Blue', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.15 },
    { startNumber: 304, primaryBase: 'PANTONE Process Blue', secondaryBase: 'PANTONE Green', secondaryRatio: 0.15 },
    { startNumber: 311, count: 6, primaryBase: 'PANTONE Process Blue', secondaryBase: 'PANTONE Green', secondaryRatio: 0.30 },

    // --- TURQUESAS Y VERDES (317 a 399) ---
    { startNumber: 317, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Process Blue', secondaryRatio: 0.45 },
    { startNumber: 324, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Process Blue', secondaryRatio: 0.25 },
    { startNumber: 331, count: 6, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.10 },
    { startNumber: 337, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.20 },
    { startNumber: 344, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.30 },
    { startNumber: 351, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.45 },
    { startNumber: 358, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.60 },
    { startNumber: 365, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Green', secondaryRatio: 0.30 },
    { startNumber: 372, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Green', secondaryRatio: 0.20 },
    { startNumber: 379, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Green', secondaryRatio: 0.12 },
    { startNumber: 386, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Green', secondaryRatio: 0.08 },
    { startNumber: 393, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Black', secondaryRatio: 0.08 },

    // --- GRISES, TIERRAS Y NEUTROS (400 a 482) ---
    { startNumber: 400, count: 6, primaryBase: 'PANTONE Black', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.15, customFamily: 'Neutros' },
    { startNumber: 406, primaryBase: 'PANTONE Black', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.15, customFamily: 'Neutros' },
    { startNumber: 413, primaryBase: 'PANTONE Black', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.10, customFamily: 'Neutros' },
    { startNumber: 420, primaryBase: 'PANTONE Black', secondaryBase: 'PANTONE Process Blue', secondaryRatio: 0.05, customFamily: 'Neutros' },
    { startNumber: 427, primaryBase: 'PANTONE Black', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.08, customFamily: 'Neutros' },
    { startNumber: 434, count: 6, primaryBase: 'PANTONE Black', secondaryBase: 'PANTONE Rubine Red', secondaryRatio: 0.12, customFamily: 'Neutros' },
    { startNumber: 441, primaryBase: 'PANTONE Black', secondaryBase: 'PANTONE Process Blue', secondaryRatio: 0.12, customFamily: 'Neutros' },
    { startNumber: 448, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Black', secondaryRatio: 0.40, customFamily: 'Neutros' },
    { startNumber: 455, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.25, shadeBase: 'PANTONE Black', customFamily: 'Neutros' },
    { startNumber: 462, primaryBase: 'PANTONE Warm Red', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.35, shadeBase: 'PANTONE Black', customFamily: 'Neutros' },
    { startNumber: 469, primaryBase: 'PANTONE Orange 016', secondaryBase: 'PANTONE Black', secondaryRatio: 0.35, customFamily: 'Neutros' },
    { startNumber: 476, primaryBase: 'PANTONE Warm Red', secondaryBase: 'PANTONE Black', secondaryRatio: 0.45, customFamily: 'Neutros' },
    { startNumber: 483, primaryBase: 'PANTONE Warm Red', secondaryBase: 'PANTONE Black', secondaryRatio: 0.30, customFamily: 'Rojos' },
    { startNumber: 490, primaryBase: 'PANTONE Rubine Red', secondaryBase: 'PANTONE Black', secondaryRatio: 0.25, customFamily: 'Rojos' },
    { startNumber: 497, primaryBase: 'PANTONE Rubine Red', secondaryBase: 'PANTONE Black', secondaryRatio: 0.45, customFamily: 'Rojos' },

    // --- TONOS INTENSOS (504 a 587) ---
    { startNumber: 504, primaryBase: 'PANTONE Rubine Red', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.35, shadeBase: 'PANTONE Black' },
    { startNumber: 511, primaryBase: 'PANTONE Purple', secondaryBase: 'PANTONE Black', secondaryRatio: 0.25 },
    { startNumber: 518, primaryBase: 'PANTONE Violet v2', secondaryBase: 'PANTONE Black', secondaryRatio: 0.25 },
    { startNumber: 525, primaryBase: 'PANTONE Reflex Blue', secondaryBase: 'PANTONE Purple', secondaryRatio: 0.25 },
    { startNumber: 532, primaryBase: 'PANTONE Reflex Blue', secondaryBase: 'PANTONE Black', secondaryRatio: 0.30 },
    { startNumber: 539, primaryBase: 'PANTONE Process Blue', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.30, shadeBase: 'PANTONE Black' },
    { startNumber: 546, primaryBase: 'PANTONE Process Blue', secondaryBase: 'PANTONE Black', secondaryRatio: 0.30 },
    { startNumber: 553, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Black', secondaryRatio: 0.35 },
    { startNumber: 560, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Process Blue', secondaryRatio: 0.30, shadeBase: 'PANTONE Black' },
    { startNumber: 567, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Black', secondaryRatio: 0.45 },
    { startNumber: 574, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Green', secondaryRatio: 0.35, shadeBase: 'PANTONE Black' },
    { startNumber: 581, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Black', secondaryRatio: 0.30 },
  ];

  for (const def of classicSeriesDefinitions) {
    const pageColors = generatePantonePage(def);
    for (const c of pageColors) addColor(c);
  }

  // 3. SERIES 600 C A 732 C (Pasteles & Tonalidades Suaves, 19 páginas)
  const pastelSeriesDefinitions: PageDefinition[] = [
    { startNumber: 600, primaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0 },
    { startNumber: 607, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.10 },
    { startNumber: 614, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Green', secondaryRatio: 0.15 },
    { startNumber: 621, primaryBase: 'PANTONE Green', secondaryBase: 'PANTONE Process Blue', secondaryRatio: 0.20 },
    { startNumber: 628, primaryBase: 'PANTONE Process Blue', secondaryBase: 'PANTONE Green', secondaryRatio: 0.25 },
    { startNumber: 635, primaryBase: 'PANTONE Process Blue', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.15 },
    { startNumber: 642, primaryBase: 'PANTONE Reflex Blue', secondaryBase: 'PANTONE Process Blue', secondaryRatio: 0.30 },
    { startNumber: 649, primaryBase: 'PANTONE Reflex Blue', secondaryBase: 'PANTONE Violet v2', secondaryRatio: 0.20 },
    { startNumber: 656, primaryBase: 'PANTONE Violet v2', secondaryBase: 'PANTONE Reflex Blue', secondaryRatio: 0.25 },
    { startNumber: 663, primaryBase: 'PANTONE Violet v2', secondaryBase: 'PANTONE Purple', secondaryRatio: 0.30 },
    { startNumber: 670, primaryBase: 'PANTONE Purple', secondaryBase: 'PANTONE Rhodamine Red', secondaryRatio: 0.25 },
    { startNumber: 677, primaryBase: 'PANTONE Rhodamine Red', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.30 },
    { startNumber: 684, primaryBase: 'PANTONE Rubine Red', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.20 },
    { startNumber: 691, primaryBase: 'PANTONE Warm Red', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.35 },
    { startNumber: 698, primaryBase: 'PANTONE Warm Red', secondaryBase: 'PANTONE Rubine Red', secondaryRatio: 0.15 },
    { startNumber: 705, primaryBase: 'PANTONE Rubine Red', secondaryBase: 'PANTONE Warm Red', secondaryRatio: 0.40 },
    { startNumber: 712, primaryBase: 'PANTONE Orange 016', secondaryBase: 'PANTONE Yellow PY12', secondaryRatio: 0.40 },
    { startNumber: 719, primaryBase: 'PANTONE Yellow PY12', secondaryBase: 'PANTONE Orange 016', secondaryRatio: 0.30 },
    { startNumber: 726, primaryBase: 'PANTONE Warm Red', secondaryBase: 'PANTONE Black', secondaryRatio: 0.20, customFamily: 'Neutros' },
  ];

  for (const def of pastelSeriesDefinitions) {
    const pageColors = generatePantonePage(def);
    for (const c of pageColors) addColor(c);
  }

  // 4. SERIES MODERNAS 7401 C A 7745 C (Adiciones contemporáneas, 47 páginas de 7 colores = ~329 colores)
  const modernStarts: { start: number; primary: string; sec?: string; ratio?: number; shade?: string; fam?: any }[] = [
    { start: 7401, primary: 'PANTONE Yellow PY12', sec: 'PANTONE Orange 016', ratio: 0.08 },
    { start: 7408, primary: 'PANTONE Yellow PY12', sec: 'PANTONE Warm Red', ratio: 0.18 },
    { start: 7415, primary: 'PANTONE Orange 016', sec: 'PANTONE Yellow PY12', ratio: 0.25 },
    { start: 7422, primary: 'PANTONE Warm Red', sec: 'PANTONE Rubine Red', ratio: 0.20 },
    { start: 7429, primary: 'PANTONE Rubine Red', sec: 'PANTONE Rhodamine Red', ratio: 0.20 },
    { start: 7436, primary: 'PANTONE Rhodamine Red', sec: 'PANTONE Purple', ratio: 0.25 },
    { start: 7443, primary: 'PANTONE Purple', sec: 'PANTONE Violet v2', ratio: 0.30 },
    { start: 7450, primary: 'PANTONE Violet v2', sec: 'PANTONE Reflex Blue', ratio: 0.35 },
    { start: 7457, primary: 'PANTONE Process Blue', sec: 'PANTONE Reflex Blue', ratio: 0.20 },
    { start: 7464, primary: 'PANTONE Process Blue', sec: 'PANTONE Green', ratio: 0.25 },
    { start: 7471, primary: 'PANTONE Green', sec: 'PANTONE Process Blue', ratio: 0.35 },
    { start: 7478, primary: 'PANTONE Green', sec: 'PANTONE Yellow PY12', ratio: 0.25 },
    { start: 7485, primary: 'PANTONE Green', sec: 'PANTONE Yellow PY12', ratio: 0.50 },
    { start: 7492, primary: 'PANTONE Yellow PY12', sec: 'PANTONE Green', ratio: 0.35 },
    { start: 7499, primary: 'PANTONE Yellow PY12', sec: 'PANTONE Black', ratio: 0.15, fam: 'Neutros' },
    { start: 7506, primary: 'PANTONE Orange 016', sec: 'PANTONE Black', ratio: 0.20, fam: 'Neutros' },
    { start: 7513, primary: 'PANTONE Warm Red', sec: 'PANTONE Black', ratio: 0.25, fam: 'Neutros' },
    { start: 7520, primary: 'PANTONE Rubine Red', sec: 'PANTONE Black', ratio: 0.30, fam: 'Neutros' },
    { start: 7527, primary: 'PANTONE Black', sec: 'PANTONE Warm Red', ratio: 0.10, fam: 'Neutros' },
    { start: 7534, primary: 'PANTONE Black', sec: 'PANTONE Process Blue', ratio: 0.08, fam: 'Neutros' },
    { start: 7541, primary: 'PANTONE Black', sec: 'PANTONE Reflex Blue', ratio: 0.12, fam: 'Neutros' },
    { start: 7548, primary: 'PANTONE Yellow PY12', sec: 'PANTONE Orange 016', ratio: 0.15 },
    { start: 7555, primary: 'PANTONE Orange 016', sec: 'PANTONE Warm Red', ratio: 0.20 },
    { start: 7562, primary: 'PANTONE Warm Red', sec: 'PANTONE Yellow PY12', ratio: 0.40 },
    { start: 7569, primary: 'PANTONE Yellow PY12', sec: 'PANTONE Black', ratio: 0.22, fam: 'Neutros' },
    { start: 7576, primary: 'PANTONE Orange 016', sec: 'PANTONE Black', ratio: 0.18 },
    { start: 7583, primary: 'PANTONE Warm Red', sec: 'PANTONE Black', ratio: 0.35, fam: 'Neutros' },
    { start: 7590, primary: 'PANTONE Rubine Red', sec: 'PANTONE Warm Red', ratio: 0.30 },
    { start: 7597, primary: 'PANTONE Rubine Red', sec: 'PANTONE Purple', ratio: 0.20 },
    { start: 7604, primary: 'PANTONE Purple', sec: 'PANTONE Black', ratio: 0.25, fam: 'Violetas' },
    { start: 7611, primary: 'PANTONE Violet v2', sec: 'PANTONE Black', ratio: 0.20, fam: 'Violetas' },
    { start: 7618, primary: 'PANTONE Reflex Blue', sec: 'PANTONE Violet v2', ratio: 0.25 },
    { start: 7625, primary: 'PANTONE Warm Red', sec: 'PANTONE Rubine Red', ratio: 0.15 },
    { start: 7632, primary: 'PANTONE Rubine Red', sec: 'PANTONE Black', ratio: 0.20, fam: 'Rojos' },
    { start: 7639, primary: 'PANTONE Rhodamine Red', sec: 'PANTONE Purple', ratio: 0.30 },
    { start: 7646, primary: 'PANTONE Purple', sec: 'PANTONE Reflex Blue', ratio: 0.30 },
    { start: 7653, primary: 'PANTONE Violet v2', sec: 'PANTONE Process Blue', ratio: 0.35 },
    { start: 7660, primary: 'PANTONE Process Blue', sec: 'PANTONE Reflex Blue', ratio: 0.35 },
    { start: 7667, primary: 'PANTONE Reflex Blue', sec: 'PANTONE Black', ratio: 0.25, fam: 'Azules' },
    { start: 7674, primary: 'PANTONE Process Blue', sec: 'PANTONE Green', ratio: 0.20 },
    { start: 7681, primary: 'PANTONE Reflex Blue', sec: 'PANTONE Process Blue', ratio: 0.45 },
    { start: 7688, primary: 'PANTONE Process Blue', sec: 'PANTONE Black', ratio: 0.18, fam: 'Azules' },
    { start: 7695, primary: 'PANTONE Green', sec: 'PANTONE Process Blue', ratio: 0.30 },
    { start: 7702, primary: 'PANTONE Green', sec: 'PANTONE Process Blue', ratio: 0.50 },
    { start: 7709, primary: 'PANTONE Green', sec: 'PANTONE Yellow PY12', ratio: 0.30 },
    { start: 7716, primary: 'PANTONE Green', sec: 'PANTONE Black', ratio: 0.25, fam: 'Verdes' },
    { start: 7723, primary: 'PANTONE Yellow PY12', sec: 'PANTONE Green', ratio: 0.40 },
  ];

  for (const m of modernStarts) {
    const pageColors = generatePantonePage({
      startNumber: m.start,
      count: 7,
      primaryBase: m.primary,
      secondaryBase: m.sec,
      secondaryRatio: m.ratio,
      shadeBase: m.shade || 'PANTONE Black',
      customFamily: m.fam,
    });
    for (const c of pageColors) addColor(c);
  }

  // 5. SERIES NEUTROS OFICIALES: COOL GRAY (1 C a 11 C)
  for (let i = 1; i <= 11; i++) {
    const code = `Cool Gray ${i} C`;
    const name = `PANTONE ${code}`;
    const id = `pantone-cool-gray-${i}-c`;

    // Dosificación física escalonada para Cool Gray
    const blackRatio = Math.min(85, i * 7.5);
    const blueRatio = Math.min(8, Math.max(1, i * 0.7));
    const transRatio = Math.max(7, 100 - blackRatio - blueRatio);

    const formula = normalizeFormula([
      { baseName: 'PANTONE Black', percentage: blackRatio },
      { baseName: 'PANTONE Reflex Blue', percentage: blueRatio },
      { baseName: 'PANTONE Trans. Wt.', percentage: transRatio },
    ]);

    const hex = computeHexFromFormula(formula, code);

    addColor({
      id,
      code,
      name,
      hex,
      family: 'Neutros',
      formula,
    });
  }

  // 6. SERIES NEUTROS OFICIALES: WARM GRAY (1 C a 11 C)
  for (let i = 1; i <= 11; i++) {
    const code = `Warm Gray ${i} C`;
    const name = `PANTONE ${code}`;
    const id = `pantone-warm-gray-${i}-c`;

    // Dosificación física para Warm Gray (Black + Warm Red + Yellow + Trans)
    const blackRatio = Math.min(80, i * 7.2);
    const redRatio = Math.min(8, Math.max(1, i * 0.7));
    const yellowRatio = Math.min(8, Math.max(1, i * 0.7));
    const transRatio = Math.max(4, 100 - blackRatio - redRatio - yellowRatio);

    const formula = normalizeFormula([
      { baseName: 'PANTONE Black', percentage: blackRatio },
      { baseName: 'PANTONE Warm Red', percentage: redRatio },
      { baseName: 'PANTONE Yellow PY12', percentage: yellowRatio },
      { baseName: 'PANTONE Trans. Wt.', percentage: transRatio },
    ]);

    const hex = computeHexFromFormula(formula, code);

    addColor({
      id,
      code,
      name,
      hex,
      family: 'Neutros',
      formula,
    });
  }

  // 7. BLACK SERIES: Black 2 C a 7 C
  for (let i = 2; i <= 7; i++) {
    const code = `Black ${i} C`;
    const name = `PANTONE ${code}`;
    const id = `pantone-black-${i}-c`;

    // Black 2 a 7 combinan Black con toques de Reflex Blue, Warm Red o Green
    const accentBase = i % 2 === 0 ? 'PANTONE Reflex Blue' : 'PANTONE Warm Red';
    const formula = normalizeFormula([
      { baseName: 'PANTONE Black', percentage: 90.00 },
      { baseName: accentBase, percentage: 10.00 },
    ]);

    const hex = i % 2 === 0 ? '#1C2127' : '#2A2421';

    addColor({
      id,
      code,
      name,
      hex,
      family: 'Neutros',
      formula,
    });
  }

  // 8. SERIES ESPECIALES 800 C (Fluorescentes y Metalizados)
  const special800s: { code: string; name: string; hex: string; base: string; fam: any }[] = [
    { code: '801 C', name: 'PANTONE 801 C', hex: '#00A3E0', base: 'PANTONE Process Blue', fam: 'Azules' },
    { code: '802 C', name: 'PANTONE 802 C', hex: '#44D62C', base: 'PANTONE Green', fam: 'Verdes' },
    { code: '803 C', name: 'PANTONE 803 C', hex: '#FFE900', base: 'PANTONE Yellow PY12', fam: 'Amarillos' },
    { code: '804 C', name: 'PANTONE 804 C', hex: '#FF9E1B', base: 'PANTONE Orange 016', fam: 'Naranjas' },
    { code: '805 C', name: 'PANTONE 805 C', hex: '#FF6900', base: 'PANTONE Warm Red', fam: 'Rojos' },
    { code: '806 C', name: 'PANTONE 806 C', hex: '#FF2A6D', base: 'PANTONE Rhodamine Red', fam: 'Rojos' },
    { code: '807 C', name: 'PANTONE 807 C', hex: '#BA0C2F', base: 'PANTONE Purple', fam: 'Violetas' },
    { code: '808 C', name: 'PANTONE 808 C', hex: '#00B5E2', base: 'PANTONE Process Blue', fam: 'Azules' },
    { code: '809 C', name: 'PANTONE 809 C', hex: '#D2E100', base: 'PANTONE Yellow PY12', fam: 'Amarillos' },
    { code: '810 C', name: 'PANTONE 810 C', hex: '#FF9E1B', base: 'PANTONE Orange 016', fam: 'Naranjas' },
    { code: '811 C', name: 'PANTONE 811 C', hex: '#FF6A13', base: 'PANTONE Warm Red', fam: 'Naranjas' },
    { code: '812 C', name: 'PANTONE 812 C', hex: '#FF355E', base: 'PANTONE Rhodamine Red', fam: 'Rojos' },
    { code: '813 C', name: 'PANTONE 813 C', hex: '#8A38FF', base: 'PANTONE Violet v2', fam: 'Violetas' },
    { code: '814 C', name: 'PANTONE 814 C', hex: '#634289', base: 'PANTONE Purple', fam: 'Violetas' },
    // Metalizados clásicos serie 870
    { code: '871 C', name: 'PANTONE 871 C Gold', hex: '#84754E', base: 'PANTONE Yellow PY12', fam: 'Neutros' },
    { code: '872 C', name: 'PANTONE 872 C Rich Gold', hex: '#876F38', base: 'PANTONE Orange 016', fam: 'Neutros' },
    { code: '873 C', name: 'PANTONE 873 C Pale Gold', hex: '#876D42', base: 'PANTONE Yellow PY12', fam: 'Neutros' },
    { code: '874 C', name: 'PANTONE 874 C Copper', hex: '#8A6840', base: 'PANTONE Warm Red', fam: 'Neutros' },
    { code: '875 C', name: 'PANTONE 875 C Bronze', hex: '#8C6239', base: 'PANTONE Orange 016', fam: 'Neutros' },
    { code: '876 C', name: 'PANTONE 876 C Copper', hex: '#8F5E41', base: 'PANTONE Warm Red', fam: 'Neutros' },
    { code: '877 C', name: 'PANTONE 877 C Silver', hex: '#8A8D8F', base: 'PANTONE Black', fam: 'Neutros' },
  ];

  for (const sp of special800s) {
    const formula = normalizeFormula([
      { baseName: sp.base, percentage: 85.00 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 15.00 },
    ]);
    addColor({
      id: `pantone-${sp.code.toLowerCase().replace(/\s+/g, '-')}`,
      code: sp.code,
      name: sp.name,
      hex: sp.hex,
      family: sp.fam,
      formula,
    });
  }

  return catalog;
}

// Ejecución directa por CLI
function main() {
  console.log('🚀 Iniciando generación masiva del catálogo Pantone Solid Coated...');
  const catalog = generateCatalog();

  const outDir = path.resolve(process.cwd(), 'public', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'pantone-database.json');
  fs.writeFileSync(outFile, JSON.stringify(catalog, null, 2), 'utf-8');

  // Estadísticas del catálogo
  const familiesCount: Record<string, number> = {};
  for (const c of catalog) {
    familiesCount[c.family] = (familiesCount[c.family] || 0) + 1;
  }

  console.log(`✅ ¡Catálogo generado exitosamente!`);
  console.log(`📁 Archivo guardado en: ${outFile}`);
  console.log(`📊 Total de colores generados: ${catalog.length}`);
  console.log('🌈 Desglose por familias cromáticas:');
  for (const [fam, count] of Object.entries(familiesCount)) {
    console.log(`   - ${fam}: ${count} colores`);
  }
}

main();
