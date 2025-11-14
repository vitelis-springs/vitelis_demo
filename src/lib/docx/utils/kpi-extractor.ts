/**
 * KPI Data Extractor
 * Extracts KPI scorecard data from Executive Summary table
 */

import type { DocModel, TableBlock } from "../../doc-model";

export interface KPICompanyData {
  companyName: string;
  overallScore: number;
}

export interface KPIRadarData {
  companies: KPICompanyData[];
  categories: string[];
}

/**
 * Extract KPI data from Executive Summary for radar chart
 */
export function extractKPIDataFromSummary(
  summary: DocModel | null
): KPIRadarData | null {
  if (!summary || !summary.blocks) {
    return null;
  }

  // Find KPI Scorecard table
  const kpiTable = summary.blocks.find((block) => {
    if (block.type !== "table") return false;
    const table = block as TableBlock;
    // Check if first column header contains "KPI" or "Category"
    return (
      table.header &&
      table.header.length > 0 &&
      table.header[0] &&
      (table.header[0].toLowerCase().includes("kpi") ||
        table.header[0].toLowerCase().includes("category"))
    );
  }) as TableBlock | undefined;

  if (!kpiTable || !kpiTable.header || kpiTable.header.length < 2) {
    return null;
  }

  // Extract company names from header (skip first column which is KPI Category)
  const companies: KPICompanyData[] = [];
  const companyColumns = kpiTable.header.slice(1); // Skip first column

  // Find "Overall" row
  const overallRowIndex = kpiTable.rows.findIndex((row) =>
    row[0]?.toLowerCase().includes("overall")
  );

  if (overallRowIndex === -1) {
    return null;
  }

  const overallRow = kpiTable.rows[overallRowIndex];
  if (!overallRow) {
    return null;
  }

  // Extract overall scores for each company
  companyColumns.forEach((companyName, index) => {
    const scoreValue = overallRow[index + 1]; // +1 because first column is category name
    if (scoreValue) {
      const score = parseFloat(scoreValue.replace(/[^\d.]/g, ""));
      if (!isNaN(score)) {
        companies.push({
          companyName: companyName.trim(),
          overallScore: score,
        });
      }
    }
  });

  // For radar chart, we need to extract all KPI categories (not just Overall)
  // We'll use the top-level categories
  const categories: string[] = [];
  const categoryScores: { [key: string]: number[] } = {};

  // Main KPI categories we want to show (excluding Overall and separators)
  const mainCategories = [
    "Strategic Clarity & Mission",
    "Leadership Principles & Values",
    "Leadership Behavior",
    "Development & Mentoring",
    "Communication & Transparency",
    "Performance & Accountability",
    "Change Readiness & Agility",
  ];

  kpiTable.rows.forEach((row) => {
    const categoryName = row[0]?.trim();
    if (!categoryName || categoryName.includes("---") || categoryName.toLowerCase() === "overall") {
      return;
    }

    // Check if this is a main category
    const isMainCategory = mainCategories.some(
      (cat) =>
        categoryName.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(categoryName.toLowerCase())
    );

    if (isMainCategory) {
      categories.push(categoryName);
      const scores: number[] = [];
      
      // Extract scores for each company
      for (let i = 1; i < row.length && i <= companies.length; i++) {
        const scoreValue = row[i];
        if (scoreValue) {
          const score = parseFloat(scoreValue.replace(/[^\d.]/g, ""));
          scores.push(isNaN(score) ? 0 : score);
        } else {
          scores.push(0);
        }
      }
      
      categoryScores[categoryName] = scores;
    }
  });

  return {
    companies,
    categories,
  };
}

/**
 * Extract detailed KPI scores for radar chart
 */
export function extractDetailedKPIScores(
  summary: DocModel | null
): { companies: string[]; categories: string[]; scores: number[][] } | null {
  if (!summary || !summary.blocks) {
    return null;
  }

  // Find KPI Scorecard table
  const kpiTable = summary.blocks.find((block) => {
    if (block.type !== "table") return false;
    const table = block as TableBlock;
    return (
      table.header &&
      table.header.length > 0 &&
      table.header[0] &&
      (table.header[0].toLowerCase().includes("kpi") ||
        table.header[0].toLowerCase().includes("category"))
    );
  }) as TableBlock | undefined;

  if (!kpiTable || !kpiTable.header || kpiTable.header.length < 2) {
    return null;
  }

  // Extract company names
  const companies = kpiTable.header.slice(1).map((name) => name?.trim() || "");

  const categories: string[] = [];
  const scores: number[][] = [];

  kpiTable.rows.forEach((row) => {
    const categoryName = row[0]?.trim();
    
    // Skip "Overall" row, empty rows, and separator rows
    if (
      !categoryName || 
      categoryName.includes("---") || 
      categoryName.toLowerCase() === "overall" ||
      categoryName.includes("…") ||
      categoryName.includes("...")
    ) {
      return;
    }

    // Extract all valid category rows (not just predefined ones)
    categories.push(categoryName);
    const rowScores: number[] = [];

    // Extract scores for each company
    for (let i = 1; i < row.length && i <= companies.length; i++) {
      const scoreValue = row[i];
      if (scoreValue) {
        const score = parseFloat(scoreValue.replace(/[^\d.]/g, ""));
        rowScores.push(isNaN(score) ? 0 : score);
      } else {
        rowScores.push(0);
      }
    }

    scores.push(rowScores);
  });

  if (categories.length === 0 || scores.length === 0) {
    return null;
  }

  return { companies, categories, scores };
}

