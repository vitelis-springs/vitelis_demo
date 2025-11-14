/**
 * Client-side KPI Data Extractor
 * Extracts KPI scorecard data from markdown text for frontend visualization
 */

export interface KpiRadarChartData {
  companies: string[];
  categories: string[];
  scores: number[][]; // scores[categoryIndex][companyIndex]
}

/**
 * Extract KPI data from markdown table for radar chart
 */
export function extractKPIDataFromMarkdown(
  markdown: string
): KpiRadarChartData | null {
  if (!markdown || !markdown.trim()) {
    return null;
  }

  // Find table that contains "KPI" or starts with a category pattern
  const lines = markdown.split("\n");
  let tableStartIndex = -1;
  let headerLine: string | null = null;

  // Find table header
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (
      line.includes("|") &&
      (line.toLowerCase().includes("kpi") ||
        line.toLowerCase().includes("category"))
    ) {
      headerLine = line;
      tableStartIndex = i;
      break;
    }
  }

  if (tableStartIndex === -1 || !headerLine) {
    return null;
  }

  // Parse header to get company names
  const headerCells = headerLine
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);

  if (headerCells.length < 2) {
    return null;
  }

  const companies = headerCells.slice(1); // Skip first column (KPI Category)

  const categories: string[] = [];
  const scores: number[][] = [];

  // Parse table rows (skip header and separator line)
  for (let i = tableStartIndex + 2; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();

    // Stop if we hit end of table
    if (!line.includes("|") || line.length === 0) {
      break;
    }

    // Skip separator lines
    if (line.includes("---")) {
      continue;
    }

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    if (cells.length < 2) {
      continue;
    }

    const categoryName = cells[0];

    // Skip "Overall" row, empty rows, and separator rows
    if (
      !categoryName ||
      categoryName.toLowerCase() === "overall" ||
      categoryName.includes("---") ||
      categoryName.includes("…") ||
      categoryName.includes("...")
    ) {
      continue;
    }

    // Extract all valid category rows (not just predefined ones)
    categories.push(categoryName);

    // Extract scores for each company
    const rowScores: number[] = [];
    for (let j = 1; j < cells.length && j <= companies.length; j++) {
      const scoreValue = cells[j];
      if (scoreValue) {
        // Remove any non-numeric characters except decimal point
        const cleanedValue = scoreValue.replace(/[^\d.]/g, "");
        const score = parseFloat(cleanedValue);
        rowScores.push(isNaN(score) ? 0 : score);
      } else {
        rowScores.push(0);
      }
    }

    scores.push(rowScores);
  }

  // Return null if we didn't find any valid data
  if (categories.length === 0 || scores.length === 0 || companies.length === 0) {
    return null;
  }

  return {
    companies,
    categories,
    scores,
  };
}

/**
 * Check if markdown contains a KPI table
 */
export function hasKPITable(markdown: string): boolean {
  if (!markdown || !markdown.trim()) {
    return false;
  }

  const lines = markdown.split("\n");
  for (const line of lines) {
    if (
      line.includes("|") &&
      (line.toLowerCase().includes("kpi") ||
        line.toLowerCase().includes("category"))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Split markdown into parts: before table, table, after table
 * Returns an object with the three parts for inserting chart after table
 */
export function splitMarkdownAroundKPITable(markdown: string): {
  beforeTable: string;
  table: string;
  afterTable: string;
} | null {
  if (!markdown || !markdown.trim()) {
    return null;
  }

  const lines = markdown.split("\n");
  let tableStartIndex = -1;
  let tableEndIndex = -1;

  // Find table start
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (
      line.includes("|") &&
      (line.toLowerCase().includes("kpi") ||
        line.toLowerCase().includes("category"))
    ) {
      tableStartIndex = i;
      break;
    }
  }

  if (tableStartIndex === -1) {
    return null;
  }

  // Find table end (first non-table line after table start)
  for (let i = tableStartIndex; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    // Table ends when we hit a non-table line or empty line followed by non-table
    if (i > tableStartIndex + 1) { // Skip header and separator
      if (!line.includes("|") || line.length === 0) {
        tableEndIndex = i - 1;
        break;
      }
    }
  }

  // If we didn't find the end, table goes to end of document
  if (tableEndIndex === -1) {
    tableEndIndex = lines.length - 1;
  }

  const beforeTable = lines.slice(0, tableStartIndex).join("\n");
  const table = lines.slice(tableStartIndex, tableEndIndex + 1).join("\n");
  const afterTable = lines.slice(tableEndIndex + 1).join("\n");

  return {
    beforeTable,
    table,
    afterTable,
  };
}

