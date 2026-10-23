import { CalculatedDose, PantoneColor, WeightUnit } from '@/types/pantone';

/**
 * Redondeo matemático seguro a 2 decimales evitando errores de punto flotante.
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Convierte un peso en la unidad dada a gramos para cálculos internos precisos.
 */
export function convertToGrams(weight: number, unit: WeightUnit): number {
  if (unit === 'kg') {
    return roundToTwoDecimals(weight * 1000);
  }
  return roundToTwoDecimals(weight);
}

/**
 * Convierte gramos a la unidad especificada (g o kg).
 */
export function convertFromGrams(grams: number, targetUnit: WeightUnit): number {
  if (targetUnit === 'kg') {
    return roundToTwoDecimals(grams / 1000);
  }
  return roundToTwoDecimals(grams);
}

/**
 * Calcula la dosificación exacta para cada tinta base según el peso total deseado.
 * Retorna la lista de dosis con peso exacto en gramos a 2 decimales.
 */
export function calculateDoses(
  color: PantoneColor,
  totalWeight: number,
  unit: WeightUnit
): CalculatedDose[] {
  if (!totalWeight || totalWeight <= 0) {
    return color.formula.map((item) => ({
      baseName: item.baseName,
      percentage: item.percentage,
      weightGrams: 0,
    }));
  }

  const totalGrams = convertToGrams(totalWeight, unit);

  return color.formula.map((component) => {
    // Cálculo reactivo exacto: (porcentaje / 100) * totalGrams
    const rawWeight = (component.percentage / 100) * totalGrams;
    const preciseWeight = roundToTwoDecimals(rawWeight);

    return {
      baseName: component.baseName,
      percentage: component.percentage,
      weightGrams: preciseWeight,
    };
  });
}

/**
 * Formatea un número de peso para visualización en balanza industrial con 2 decimales.
 */
export function formatWeight(grams: number, unit: WeightUnit): string {
  const converted = convertFromGrams(grams, unit);
  return converted.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Paleta visual para los componentes base comunes de Pantone
 * para renderizar micro-swatches o barras de proporción en la UI.
 */
export function getBaseInkColor(baseName: string): string {
  const normalized = baseName.toLowerCase();
  if (normalized.includes('yellow') || normalized.includes('py12') || normalized.includes('012')) {
    return '#FED100';
  }
  if (normalized.includes('orange') || normalized.includes('016') || normalized.includes('021')) {
    return '#FF6C00';
  }
  if (normalized.includes('warm red')) {
    return '#F9423A';
  }
  if (normalized.includes('rubine red') || normalized.includes('rhodamine')) {
    return '#CE0058';
  }
  if (normalized.includes('red 032')) {
    return '#EF3340';
  }
  if (normalized.includes('purple')) {
    return '#BB29BB';
  }
  if (normalized.includes('violet')) {
    return '#5A1E86';
  }
  if (normalized.includes('reflex blue')) {
    return '#0A1172';
  }
  if (normalized.includes('pro. blue') || normalized.includes('process blue') || normalized.includes('blue 072')) {
    return '#0085CA';
  }
  if (normalized.includes('green')) {
    return '#00AB4E';
  }
  if (normalized.includes('black')) {
    return '#222222';
  }
  if (normalized.includes('trans') || normalized.includes('wt') || normalized.includes('white')) {
    return '#E2E8F0';
  }
  return '#94A3B8';
}
