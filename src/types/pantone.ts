export interface InkComponent {
  baseName: string;   // Ej: "PANTONE Yellow PY12", "PANTONE Pro. Blue", "PANTONE Trans. Wt."
  percentage: number; // Porcentaje exacto en peso (la suma de componentes por color debe dar 100.00)
}

export interface PantoneColor {
  id: string;             // Identificador único (ej: "pantone-285-c")
  code: string;           // Código de color (ej: "285 C", "101 C")
  name: string;           // Nombre completo (ej: "PANTONE 285 C")
  hex: string;            // Código HEX para la muestra visual en la UI
  family: string;         // Familia cromática (ej: "Amarillos", "Azules", "Naranjas", "Violetas")
  formula: InkComponent[];
  isCustom?: boolean;     // Indica si fue formulado en taller o importado manualmente
}

export interface CalculatedDose {
  baseName: string;
  percentage: number;
  weightGrams: number;
}

export type WeightUnit = 'g' | 'kg';

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
