/**
 * DOCX Image Utilities
 * Load and process images for DOCX documents
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Get image buffer from file path
 * Resolves paths relative to src/config/docx/ directory
 * Returns null if file doesn't exist
 */
export function getImageBuffer(logoPath: string): Buffer | null {
  try {
    // Try multiple resolution strategies for serverless compatibility
    const possiblePaths = [
      // Strategy 1: Relative to src/config/docx/ (where styles.config.ts lives)
      path.resolve(process.cwd(), "src/config/docx", logoPath),
      // Strategy 2: Relative to current working directory
      path.resolve(process.cwd(), logoPath),
      // Strategy 3: Relative to .next/server directory (Vercel)
      path.resolve(process.cwd(), ".next/server", logoPath),
    ];

    for (const absolutePath of possiblePaths) {
      if (fs.existsSync(absolutePath)) {
        return fs.readFileSync(absolutePath);
      }
    }

    console.warn(`⚠️ Logo not found. Tried paths:`, possiblePaths);
    return null;
  } catch (error) {
    console.error("❌ Error loading image:", error);
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
