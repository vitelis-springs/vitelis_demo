// @ts-ignore
const { convertMarkdownToDocx } = require("@mohtasham/md-to-docx");

export interface AnalysisData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language?: string;
  additionalInformation?: string;
}

export interface AnalysisContent {
  summary?: string;
  improvementLeverages?: string;
  headToHead?: string;
  sources?: string;
}

/**
 * Converts analysis data and content to a comprehensive markdown document
 */
export function generateAnalysisMarkdown(
  quizData: AnalysisData,
  content: AnalysisContent,
  reportType: "Bizminer Analysis" | "SalesMiner Analysis" = "Bizminer Analysis"
): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let markdown = `# ${reportType} Report\n\n`;
  markdown += `**Generated on:** ${currentDate}\n\n`;
  markdown += `---\n\n`;

  // Analysis Parameters Section
  markdown += `## Analysis Parameters\n\n`;
  markdown += `| Parameter | Value |\n`;
  markdown += `|-----------|-------|\n`;
  markdown += `| Company | ${quizData.companyName} |\n`;
  markdown += `| Business Line | ${quizData.businessLine} |\n`;
  markdown += `| Country | ${quizData.country} |\n`;
  markdown += `| Use Case | ${quizData.useCase} |\n`;
  markdown += `| Timeline | ${quizData.timeline} |\n`;
  if (quizData.language) {
    markdown += `| Language | ${quizData.language} |\n`;
  }
  if (quizData.additionalInformation) {
    markdown += `| Additional Information | ${quizData.additionalInformation} |\n`;
  }
  markdown += `\n---\n\n`;

  // Executive Summary
  if (content.summary) {
    markdown += `## Executive Summary\n\n`;
    markdown += `${content.summary}\n\n`;
    markdown += `---\n\n`;
  }

  // Head to Head Analysis / Competitive Analysis
  if (content.headToHead) {
    const sectionTitle =
      reportType === "Bizminer Analysis"
        ? "Competitive Analysis"
        : "Head to Head Analysis";
    markdown += `## ${sectionTitle}\n\n`;
    markdown += `${content.headToHead}\n\n`;
    markdown += `---\n\n`;
  }

  // Improvement Leverages / Revenue Optimization
  if (content.improvementLeverages) {
    const sectionTitle =
      reportType === "SalesMiner Analysis"
        ? "Revenue Optimization"
        : "Improvement Leverages";
    markdown += `## ${sectionTitle}\n\n`;
    markdown += `${content.improvementLeverages}\n\n`;
    markdown += `---\n\n`;
  }

  // Sources & References
  if (content.sources) {
    markdown += `## Sources & References\n\n`;
    markdown += `${content.sources}\n\n`;
  }

  return markdown;
}

/**
 * Converts tab-separated table data to proper markdown table format
 */
function convertTabTableToMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  const processedLines: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check if this line looks like a table row (contains tabs and has multiple columns)
    const tabCount = (line.match(/\t/g) || []).length;
    const hasBoldText = line.includes("**");

    if (tabCount >= 2 && hasBoldText) {
      // This looks like a table row
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }

      // Convert tabs to | separators and clean up the row
      const cells = line.split("\t").map((cell) => cell.trim());
      const markdownRow = "| " + cells.join(" | ") + " |";
      tableRows.push(markdownRow);
    } else {
      // Not a table row
      if (inTable && tableRows.length > 0) {
        // We were in a table, now we're not - convert the table
        processedLines.push(...convertTableRowsToMarkdown(tableRows));
        tableRows = [];
        inTable = false;
      }
      processedLines.push(line);
    }
  }

  // Handle case where table is at the end of content
  if (inTable && tableRows.length > 0) {
    processedLines.push(...convertTableRowsToMarkdown(tableRows));
  }

  return processedLines.join("\n");
}

/**
 * Converts table rows to proper markdown table format
 */
function convertTableRowsToMarkdown(tableRows: string[]): string[] {
  if (tableRows.length === 0) return [];

  const result: string[] = [];

  // Add the header row
  if (tableRows[0]) {
    result.push(tableRows[0]);

    // Add the separator row
    const firstRowCells = tableRows[0].split("|").length - 2; // -2 because of leading/trailing empty strings
    const separator = "|" + " --- |".repeat(firstRowCells);
    result.push(separator);
  }

  // Add the data rows
  for (let i = 1; i < tableRows.length; i++) {
    const row = tableRows[i];
    if (row) {
      result.push(row);
    }
  }

  // Add empty line after table
  result.push("");

  return result;
}

/**
 * Processes markdown content to fix bold text formatting in tables
 */
function fixTableBoldFormatting(markdown: string): string {
  // First convert tab-separated tables to proper markdown tables
  const markdownWithTables = convertTabTableToMarkdown(markdown);

  // Then process the markdown tables for bold formatting
  const lines = markdownWithTables.split("\n");
  const processedLines = lines.map((line) => {
    // Check if this line is a table row (contains |)
    if (line.includes("|")) {
      // Process each cell in the table row
      return line
        .split("|")
        .map((cell) => {
          // Trim whitespace and ensure **text** is properly formatted
          const trimmedCell = cell.trim();
          // If cell contains **text**, convert to HTML strong tags for better DOCX compatibility
          if (trimmedCell.includes("**")) {
            // Convert **text** to <strong>text</strong> for better DOCX compatibility
            return trimmedCell.replace(/\*\*([^*]+)\*\*/g, "$1");
          }
          return trimmedCell;
        })
        .join("|");
    }
    return line;
  });

  return processedLines.join("\n");
}

/**
 * Converts markdown content to DOCX and triggers download
 */
export async function exportToDocx(
  markdown: string,
  filename: string = "analysis-report.docx"
): Promise<void> {
  try {
    // Fix bold formatting in tables before conversion
    const processedMarkdown = fixTableBoldFormatting(markdown);

    // Convert markdown to DOCX using the library
    const docxBlob = await convertMarkdownToDocx(processedMarkdown);

    // Create download link directly from the blob
    const url = URL.createObjectURL(docxBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to DOCX:", error);
    throw new Error("Failed to export document. Please try again.");
  }
}

/**
 * Complete function to generate and export analysis report as DOCX
 */
export async function exportAnalysisReportDocx(
  quizData: AnalysisData,
  content: AnalysisContent,
  reportType: "Bizminer Analysis" | "SalesMiner Analysis" = "Bizminer Analysis"
): Promise<void> {
  const markdown = generateAnalysisMarkdown(quizData, content, reportType);
  const filename = `${quizData.companyName.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}_${reportType.replace(/\s+/g, "_")}_${
    new Date().toISOString().split("T")[0]
  }.docx`;

  await exportToDocx(markdown, filename);
}
