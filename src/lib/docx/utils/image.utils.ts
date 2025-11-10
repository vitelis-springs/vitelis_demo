/**
 * DOCX Image Utilities
 * Load and process images for DOCX documents
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Get image buffer from file path
 * Returns null if file doesn't exist
 */
export function getImageBuffer(logoPath: string): Buffer | null {
  try {
    const absolute = path.resolve(process.cwd(), logoPath);
    if (!fs.existsSync(absolute)) return null;
    return fs.readFileSync(absolute);
  } catch {
    return null;
  }
}

/**
 * Get PNG image dimensions from buffer
 * Returns { width, height } in pixels or null if invalid
 */
export function getPngDimensions(
  buffer: Buffer
): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  if (!isPng) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}
