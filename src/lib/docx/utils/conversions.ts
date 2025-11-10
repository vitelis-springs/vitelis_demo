/**
 * DOCX Unit Conversion Utilities
 * Convert between cm, mm, inches, twips, pixels, points
 */

/**
 * Convert centimeters to twips
 * 1 cm = 567 twips
 */
export function cmToTwip(value: number): number {
  return Math.round(value * 567);
}

/**
 * Convert millimeters to twips
 * 1 mm = 56.7 twips
 */
export function mmToTwip(value: number): number {
  return Math.round(value * 56.7);
}

/**
 * Convert inches to pixels (96 DPI)
 * 1 inch = 96 pixels
 */
export function inchesToPixels(value: number): number {
  return Math.round(value * 96);
}

/**
 * Convert inches to twips
 * 1 inch = 1440 twips
 */
export function inchesToTwip(value: number): number {
  return Math.round(value * 1440);
}

/**
 * Convert points to half-points (for DOCX font sizes)
 * 1 point = 2 half-points
 */
export function pointsToHalfPoints(value?: number): number | undefined {
  if (!value) return undefined;
  return Math.round(value * 2);
}

/**
 * Convert line spacing multiplier to twips
 * For example: 1.5 line spacing
 */
export function lineSpacingToTwip(lineSpacing?: number): number | undefined {
  if (!lineSpacing) return undefined;
  return Math.round(lineSpacing * 240);
}

/**
 * Normalize color by removing # and converting to uppercase
 * #ff0000 -> FF0000
 */
export function normalizeColor(color?: string): string | undefined {
  if (!color) return undefined;
  return color.replace("#", "").toUpperCase();
}
