import { PantoneColor } from '@/types/pantone';

export const PANTONE_COLORS: PantoneColor[] = [
  // --- AMARILLOS ---
  {
    id: 'pantone-100-c',
    code: '100 C',
    name: 'PANTONE 100 C',
    hex: '#F6EB61',
    family: 'Amarillos',
    formula: [
      { baseName: 'PANTONE Yellow PY12', percentage: 12.50 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 87.50 },
    ],
  },
  {
    id: 'pantone-101-c',
    code: '101 C',
    name: 'PANTONE 101 C',
    hex: '#F4ED47',
    family: 'Amarillos',
    formula: [
      { baseName: 'PANTONE Yellow PY12', percentage: 25.00 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 75.00 },
    ],
  },
  {
    id: 'pantone-102-c',
    code: '102 C',
    name: 'PANTONE 102 C',
    hex: '#FCE300',
    family: 'Amarillos',
    formula: [
      { baseName: 'PANTONE Yellow PY12', percentage: 50.00 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 50.00 },
    ],
  },
  {
    id: 'pantone-yellow-c',
    code: 'Yellow C',
    name: 'PANTONE Yellow C',
    hex: '#FED100',
    family: 'Amarillos',
    formula: [
      { baseName: 'PANTONE Yellow PY12', percentage: 100.00 },
    ],
  },
  {
    id: 'pantone-103-c',
    code: '103 C',
    name: 'PANTONE 103 C',
    hex: '#C69214',
    family: 'Amarillos',
    formula: [
      { baseName: 'PANTONE Yellow PY12', percentage: 87.50 },
      { baseName: 'PANTONE Black', percentage: 6.25 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 6.25 },
    ],
  },

  // --- AZULES ---
  {
    id: 'pantone-283-c',
    code: '283 C',
    name: 'PANTONE 283 C',
    hex: '#9BCBEB',
    family: 'Azules',
    formula: [
      { baseName: 'PANTONE Pro. Blue', percentage: 6.25 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 93.75 },
    ],
  },
  {
    id: 'pantone-284-c',
    code: '284 C',
    name: 'PANTONE 284 C',
    hex: '#6CACE4',
    family: 'Azules',
    formula: [
      { baseName: 'PANTONE Pro. Blue', percentage: 18.75 },
      { baseName: 'PANTONE Reflex Blue', percentage: 3.12 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 78.13 },
    ],
  },
  {
    id: 'pantone-285-c',
    code: '285 C',
    name: 'PANTONE 285 C',
    hex: '#0072CE',
    family: 'Azules',
    formula: [
      { baseName: 'PANTONE Pro. Blue', percentage: 87.50 },
      { baseName: 'PANTONE Reflex Blue', percentage: 12.50 },
    ],
  },
  {
    id: 'pantone-286-c',
    code: '286 C',
    name: 'PANTONE 286 C',
    hex: '#0033A0',
    family: 'Azules',
    formula: [
      { baseName: 'PANTONE Reflex Blue', percentage: 75.00 },
      { baseName: 'PANTONE Pro. Blue', percentage: 25.00 },
    ],
  },
  {
    id: 'pantone-287-c',
    code: '287 C',
    name: 'PANTONE 287 C',
    hex: '#00205B',
    family: 'Azules',
    formula: [
      { baseName: 'PANTONE Reflex Blue', percentage: 87.50 },
      { baseName: 'PANTONE Pro. Blue', percentage: 12.50 },
    ],
  },
  {
    id: 'pantone-288-c',
    code: '288 C',
    name: 'PANTONE 288 C',
    hex: '#002D62',
    family: 'Azules',
    formula: [
      { baseName: 'PANTONE Reflex Blue', percentage: 87.50 },
      { baseName: 'PANTONE Black', percentage: 6.25 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 6.25 },
    ],
  },

  // --- NARANJAS Y CÁLIDOS ---
  {
    id: 'pantone-2022-c',
    code: '2022 C',
    name: 'PANTONE 2022 C',
    hex: '#FFA300',
    family: 'Naranjas',
    formula: [
      { baseName: 'PANTONE Orange 016', percentage: 62.50 },
      { baseName: 'PANTONE Yellow PY12', percentage: 25.00 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 12.50 },
    ],
  },
  {
    id: 'pantone-2023-c',
    code: '2023 C',
    name: 'PANTONE 2023 C',
    hex: '#FF8200',
    family: 'Naranjas',
    formula: [
      { baseName: 'PANTONE Orange 016', percentage: 75.00 },
      { baseName: 'PANTONE Yellow PY12', percentage: 18.75 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 6.25 },
    ],
  },
  {
    id: 'pantone-2024-c',
    code: '2024 C',
    name: 'PANTONE 2024 C',
    hex: '#E8511E',
    family: 'Naranjas',
    formula: [
      { baseName: 'PANTONE Orange 016', percentage: 85.00 },
      { baseName: 'PANTONE Warm Red', percentage: 10.00 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 5.00 },
    ],
  },
  {
    id: 'pantone-021-c',
    code: '021 C',
    name: 'PANTONE Orange 021 C',
    hex: '#FE5000',
    family: 'Naranjas',
    formula: [
      { baseName: 'PANTONE Orange 016', percentage: 100.00 },
    ],
  },

  // --- ROJOS ---
  {
    id: 'pantone-185-c',
    code: '185 C',
    name: 'PANTONE 185 C',
    hex: '#E4002B',
    family: 'Rojos',
    formula: [
      { baseName: 'PANTONE Warm Red', percentage: 75.00 },
      { baseName: 'PANTONE Rubine Red', percentage: 25.00 },
    ],
  },
  {
    id: 'pantone-186-c',
    code: '186 C',
    name: 'PANTONE 186 C',
    hex: '#C8102E',
    family: 'Rojos',
    formula: [
      { baseName: 'PANTONE Warm Red', percentage: 75.00 },
      { baseName: 'PANTONE Rubine Red', percentage: 20.00 },
      { baseName: 'PANTONE Black', percentage: 5.00 },
    ],
  },
  {
    id: 'pantone-rubine-red-c',
    code: 'Rubine Red C',
    name: 'PANTONE Rubine Red C',
    hex: '#CE0058',
    family: 'Rojos',
    formula: [
      { baseName: 'PANTONE Rubine Red', percentage: 100.00 },
    ],
  },

  // --- VERDES ---
  {
    id: 'pantone-354-c',
    code: '354 C',
    name: 'PANTONE 354 C',
    hex: '#00B140',
    family: 'Verdes',
    formula: [
      { baseName: 'PANTONE Green', percentage: 87.50 },
      { baseName: 'PANTONE Yellow PY12', percentage: 12.50 },
    ],
  },
  {
    id: 'pantone-368-c',
    code: '368 C',
    name: 'PANTONE 368 C',
    hex: '#78BE20',
    family: 'Verdes',
    formula: [
      { baseName: 'PANTONE Yellow PY12', percentage: 65.00 },
      { baseName: 'PANTONE Green', percentage: 25.00 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 10.00 },
    ],
  },

  // --- VIOLETAS ---
  {
    id: 'pantone-violet-c',
    code: 'Violet C',
    name: 'PANTONE Violet C',
    hex: '#430098',
    family: 'Violetas',
    formula: [
      { baseName: 'PANTONE Violet v2', percentage: 100.00 },
    ],
  },
  {
    id: 'pantone-266-c',
    code: '266 C',
    name: 'PANTONE 266 C',
    hex: '#753BBD',
    family: 'Violetas',
    formula: [
      { baseName: 'PANTONE Violet v2', percentage: 62.50 },
      { baseName: 'PANTONE Pro. Blue', percentage: 25.00 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 12.50 },
    ],
  },

  // --- NEUTROS ---
  {
    id: 'pantone-black-c',
    code: 'Black C',
    name: 'PANTONE Black C',
    hex: '#2D2926',
    family: 'Neutros',
    formula: [
      { baseName: 'PANTONE Black', percentage: 100.00 },
    ],
  },
  {
    id: 'pantone-cool-gray-7-c',
    code: 'Cool Gray 7 C',
    name: 'PANTONE Cool Gray 7 C',
    hex: '#97999B',
    family: 'Neutros',
    formula: [
      { baseName: 'PANTONE Black', percentage: 15.00 },
      { baseName: 'PANTONE Reflex Blue', percentage: 2.00 },
      { baseName: 'PANTONE Trans. Wt.', percentage: 83.00 },
    ],
  },
];

export const FAMILIES = ['Todos', 'Favoritos', 'Amarillos', 'Azules', 'Naranjas', 'Rojos', 'Verdes', 'Violetas', 'Neutros'] as const;
export type ColorFamily = typeof FAMILIES[number];
