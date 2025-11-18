/**
 * Radar Chart Generator
 * Generates radar chart as SVG and converts to PNG buffer
 */

import sharp from "sharp";

export interface RadarChartData {
  companies: string[];
  categories: string[];
  scores: number[][]; // scores[categoryIndex][companyIndex]
  legendTitle?: string; // Localized legend title
}

// Base colors for categories - first 5 from the example
const BASE_COLORS = [
  "#F4B942", // Yellow/Gold
  "#1E3A5F", // Dark Blue
  "#2E5C8A", // Medium Blue
  "#4A8BC2", // Light Blue
  "#5FAFDB", // Cyan
];

/**
 * Convert hex to RGB for color distance calculation
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Calculate color distance (Euclidean distance in RGB space)
 */
function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

/**
 * Generate random color that differs from existing colors
 */
function generateDistinctColor(existingColors: string[], seed: number): string {
  const MIN_DISTANCE = 100; // Minimum color distance
  const MAX_ATTEMPTS = 50;
  
  // Simple seeded random for consistency in same document
  let randomSeed = seed;
  const seededRandom = () => {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  };
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Generate random RGB values
    const r = Math.floor(seededRandom() * 256);
    const g = Math.floor(seededRandom() * 256);
    const b = Math.floor(seededRandom() * 256);
    
    // Avoid too dark or too light colors
    const brightness = (r + g + b) / 3;
    if (brightness < 60 || brightness > 220) continue;
    
    const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    // Check if color is distinct enough from all existing colors
    const isDistinct = existingColors.every(
      (existingColor) => colorDistance(newColor, existingColor) >= MIN_DISTANCE
    );
    
    if (isDistinct) {
      return newColor;
    }
  }
  
  // Fallback: return a color with seed-based RGB
  const r = Math.floor(seededRandom() * 200) + 50;
  const g = Math.floor(seededRandom() * 200) + 50;
  const b = Math.floor(seededRandom() * 200) + 50;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate color for any category index
 */
function getCategoryColor(index: number, allCategories: number): string {
  if (index < BASE_COLORS.length) {
    const color = BASE_COLORS[index];
    return color !== undefined ? color : "#F4B942"; // Fallback to first color
  }
  
  // For 6+ categories, generate random distinct colors
  // Use index as seed for consistency
  const usedColors: string[] = BASE_COLORS.slice(0, Math.min(BASE_COLORS.length, allCategories));
  
  // Generate colors for all needed indices up to current
  for (let i = BASE_COLORS.length; i <= index; i++) {
    if (usedColors.length <= i) {
      const newColor = generateDistinctColor(usedColors, i * 12345); // Use index-based seed
      usedColors.push(newColor);
    }
  }
  
  return usedColors[index] || "#F4B942";
}

/**
 * Generate SVG radar chart
 * INVERTED: Companies on axes, categories as lines
 */
function generateRadarChartSVG(data: RadarChartData): string {
  const { companies, categories, scores, legendTitle } = data;
  
  const width = 1000; // Overall SVG width
  const height = 600;
  const legendWidth = 260; // Allocate more width for legend
  const chartAreaX = legendWidth + 50; // Start of chart area with comfortable gap
  const centerX = chartAreaX + (width - chartAreaX) / 2; // Center within remaining space
  const centerY = height / 2;
  const maxRadius = 220; // Larger radius to make chart bigger within same image size
  const levels = 5; // Number of concentric circles (0-5 scale)
  const maxValue = 5; // Maximum KPI score

  // Calculate angle for each company (inverted!)
  const angleStep = (Math.PI * 2) / companies.length;

  // Helper function to calculate point position
  const getPoint = (companyIndex: number, value: number) => {
    const angle = angleStep * companyIndex - Math.PI / 2; // Start from top
    const radius = (value / maxValue) * maxRadius;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  // Build SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="#FFFFFF"/>`;

  // Define styles with fallback fonts that are commonly available in Linux
  svg += `<defs>
    <style>
      .grid-line { stroke: #E0E0E0; stroke-width: 1; fill: none; }
      .axis-line { stroke: #999999; stroke-width: 1; }
      .category-label { fill: #333333; font-family: "DejaVu Sans", "Liberation Sans", "Nimbus Sans L", "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; text-anchor: middle; }
      .legend-text { fill: #333333; font-family: "DejaVu Sans", "Liberation Sans", "Nimbus Sans L", "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 18px; }
    </style>
  </defs>`;

  // Draw concentric circles (grid)
  for (let level = 1; level <= levels; level++) {
    const radius = (level / levels) * maxRadius;
    svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" class="grid-line"/>`;
  }

  // Draw axis lines and labels (companies on axes now)
  companies.forEach((company, index) => {
    const point = getPoint(index, maxValue);
    
    // Axis line
    svg += `<line x1="${centerX}" y1="${centerY}" x2="${point.x}" y2="${point.y}" class="axis-line"/>`;
    
    // Company label
    const labelPoint = getPoint(index, maxValue + 0.8);
    
    // Split long company names into multiple lines
    const words = company.split(/[&\s]+/);
    let lines: string[] = [];
    let currentLine = "";
    
    words.forEach((word) => {
      if ((currentLine + " " + word).length > 15 && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + " " + word : word;
      }
    });
    if (currentLine) {
      lines.push(currentLine.trim());
    }

    // Render multi-line text
    const lineHeight = 14;
    const startY = labelPoint.y - ((lines.length - 1) * lineHeight) / 2;
    
    lines.forEach((line, lineIndex) => {
      svg += `<text x="${labelPoint.x}" y="${startY + lineIndex * lineHeight}" class="category-label">${escapeXml(line)}</text>`;
    });
  });

  // Draw data for each category (inverted!)
  categories.forEach((_, categoryIndex) => {
    const color = getCategoryColor(categoryIndex, categories.length);
    
    // Build path for this category
    let pathData = "";
    companies.forEach((_, companyIndex) => {
      const score = scores[categoryIndex]?.[companyIndex] || 0;
      const point = getPoint(companyIndex, score);
      
      if (companyIndex === 0) {
        pathData += `M ${point.x},${point.y}`;
      } else {
        pathData += ` L ${point.x},${point.y}`;
      }
    });
    pathData += " Z"; // Close path
    
    // No fill, only stroke (lines)
    svg += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2"/>`;
  });

  // Draw legend (categories on left side)
  const legendX = 20;
  const legendY = Math.max(80, (height - categories.length * 24) / 2); // Start with space for title
  const legendSpacing = 24;
  const legendTextMaxWidth = 280; // Max width for text
  
  // Add legend title (localized)
  const title = legendTitle || "Performance Comparison";
  svg += `<text x="${legendX}" y="${legendY - 20}" style="fill: #333333; font-family: &quot;DejaVu Sans&quot;, &quot;Liberation Sans&quot;, &quot;Nimbus Sans L&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold;">${escapeXml(title)}</text>`;

  categories.forEach((category, index) => {
    const y = legendY + index * legendSpacing;
    const color = getCategoryColor(index, categories.length);
    
    // Color line
    svg += `<line x1="${legendX}" y1="${y}" x2="${legendX + 20}" y2="${y}" stroke="${color}" stroke-width="2"/>`;
    
    // Category name - wrap text if needed
    const words = category.split(/\s+/);
    let line = "";
    let lineY = y + 4;
    const lineHeight = 16;
    let lineCount = 0;
    const maxLines = 2;
    
    words.forEach((word, wordIndex) => {
      const testLine = line + (line ? " " : "") + word;
      
      // Approximate text width (very rough estimation: 6px per character)
      if (testLine.length * 6 > legendTextMaxWidth && line) {
        // Output current line
        if (lineCount < maxLines) {
          svg += `<text x="${legendX + 28}" y="${lineY}" class="legend-text" style="font-size: 13px;">${escapeXml(line)}</text>`;
          lineY += lineHeight;
          lineCount++;
          line = word;
        }
      } else {
        line = testLine;
      }
      
      // Last word
      if (wordIndex === words.length - 1 && lineCount < maxLines) {
        // Truncate if still too long
        if (line.length > 35) {
          line = line.substring(0, 32) + "...";
        }
        svg += `<text x="${legendX + 28}" y="${lineY}" class="legend-text" style="font-size: 13px;">${escapeXml(line)}</text>`;
      }
    });
  });

  svg += `</svg>`;
  
  return svg;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate radar chart as PNG buffer
 */
export async function generateRadarChartImage(
  data: RadarChartData
): Promise<Buffer> {
  const svg = generateRadarChartSVG(data);
  
  try {
    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    return pngBuffer;
  } catch (error) {
    console.error("Error generating radar chart:", error);
    throw new Error("Failed to generate radar chart image");
  }
}

