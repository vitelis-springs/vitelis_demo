/**
 * DOCX Generator
 * Main entry point for generating DOCX documents
 */

import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TextRun,
} from "docx";
import {
  getDocxLocaleStrings,
  layoutConfig,
  resolvePageSize,
  sectionsConfig,
  stylesConfig,
} from "../../config/docx";
import type { DocModel } from "../doc-model";
import { markdownToDocModel } from "../parse-markdown";
import {
  createParagraphSpacing,
  paragraphDefaults,
  tableDefaults,
  TemplateRenderContext,
} from "./renderers";
import {
  AnalysisData,
  appendDisclaimer,
  appendSection,
  appendSectionWithChartAfterTable,
  buildCoverSection,
  buildFooter,
  buildHeader,
  buildTableOfContents,
  createAnalysisParametersHeading,
  extractAllHeadingBookmarks,
} from "./sections";
import {
  cmToTwip,
  extractDetailedKPIScores,
  generateRadarChartImage,
  inchesToPixels,
  mmToTwip,
  normalizeColor,
  pointsToHalfPoints,
} from "./utils";

export interface AnalysisContent {
  summary?: DocModel | string | null;
  kpiScorecard?: DocModel | string | null;
  narrativeFindings?: DocModel | string | null;
  headToHead?: DocModel | string | null;
  improvementLevers?: DocModel | string | null;
  improvementLeverages?: DocModel | string | null;
  sources?: DocModel | string | null;
}

/**
 * Convert string or DocModel to DocModel
 */
async function ensureDocModel(
  value?: DocModel | string | null
): Promise<DocModel | null> {
  if (!value) return null;

  if (typeof value === "string") {
    if (!value.trim()) return null;
    return markdownToDocModel(value);
  }

  return value;
}

/**
 * Generate DOCX buffer for analysis report
 */
export async function generateAnalysisDocxBuffer(
  quizData: AnalysisData,
  content: AnalysisContent,
  reportType: "Bizminer Analysis" | "SalesMiner Analysis" = "Bizminer Analysis"
): Promise<Buffer> {
  const localeStrings = getDocxLocaleStrings(quizData.language);

  // Parse content
  const summary = await ensureDocModel(content.summary);
  const headToHead = await ensureDocModel(content.headToHead);
  const improvement = await ensureDocModel(
    content.improvementLevers ?? content.improvementLeverages
  );
  const sources = await ensureDocModel(content.sources);

  // Generate radar chart from KPI data in summary
  let radarChartBuffer: Buffer | null = null;
  try {
    const kpiData = extractDetailedKPIScores(summary);
    if (kpiData && kpiData.companies.length > 0 && kpiData.categories.length > 0) {
      // Add localized legend title
      const chartData = {
        ...kpiData,
        legendTitle: localeStrings.radarChartHeading,
      };
      radarChartBuffer = await generateRadarChartImage(chartData);
    }
  } catch (error) {
    console.error("Failed to generate radar chart:", error);
    // Continue without chart if generation fails
  }

  const sections = [];

  // Render context for blocks
  const renderContext: TemplateRenderContext = {
    paragraph: paragraphDefaults,
    table: tableDefaults,
    isSourcesSection: false,
  };

  // Build cover section
  sections.push(buildCoverSection(quizData, localeStrings.coverTitle(quizData)));

  // Prepare page properties
  const bodyPageSize = resolvePageSize(layoutConfig.pageSize);
  const pageProperties = {
    margin: {
      top: cmToTwip(layoutConfig.margins.top),
      bottom: cmToTwip(layoutConfig.margins.bottom),
      left: cmToTwip(layoutConfig.margins.left),
      right: cmToTwip(layoutConfig.margins.right),
    },
    size: {
      width: mmToTwip(bodyPageSize.widthMm),
      height: mmToTwip(bodyPageSize.heightMm),
      orientation:
        layoutConfig.orientation === "landscape"
          ? PageOrientation.LANDSCAPE
          : PageOrientation.PORTRAIT,
    },
  };

  // Collect section titles, models, and bookmark IDs for TOC
  const tocSections: Array<{ title: string; hasContent: boolean; bookmarkId: string }> = [];
  const tocModels: Array<{ model: DocModel | null; sectionPrefix: string }> = [];

  sectionsConfig.order.forEach((sectionName) => {
    if (sectionName === "Disclaimer") {
      tocSections.push({
        title: localeStrings.disclaimer.heading,
        hasContent: true,
        bookmarkId: "section_disclaimer",
      });
      tocModels.push({ model: null, sectionPrefix: "disclaimer" });
    } else if (sectionName === "Executive Summary") {
      tocSections.push({
        title: sectionName,
        hasContent: !!summary,
        bookmarkId: "section_executive_summary",
      });
      tocModels.push({ model: summary, sectionPrefix: "executive_summary" });
    } else if (sectionName === "Head to Head Analysis") {
      tocSections.push({
        title: sectionName,
        hasContent: !!headToHead,
        bookmarkId: "section_head_to_head",
      });
      tocModels.push({ model: headToHead, sectionPrefix: "head_to_head" });
    } else if (sectionName === "Top 20 Improvement Levers") {
      tocSections.push({
        title: sectionName,
        hasContent: !!improvement,
        bookmarkId: "section_improvement_levers",
      });
      tocModels.push({ model: improvement, sectionPrefix: "improvement_levers" });
    } else if (sectionName === "List of Sources") {
      tocSections.push({
        title: sectionName,
        hasContent: !!sources,
        bookmarkId: "section_sources",
      });
      tocModels.push({ model: sources, sectionPrefix: "sources" });
    }
  });

  // Build body section
  const bodyChildren: Array<Paragraph | Table> = [];
  const tocParagraphs = buildTableOfContents(tocSections, tocModels);

  bodyChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: localeStrings.tableOfContentsHeading,
          font: stylesConfig.headingStyles.Heading1.fontFamily,
          bold: stylesConfig.headingStyles.Heading1.bold,
          size: pointsToHalfPoints(stylesConfig.headingStyles.Heading1.fontSize),
          color: normalizeColor(stylesConfig.headingStyles.Heading1.color),
        }),
      ],
      spacing: createParagraphSpacing(
        stylesConfig.headingStyles.Heading1.spacingBeforeCm,
        stylesConfig.headingStyles.Heading1.spacingAfterCm,
        paragraphDefaults.lineSpacing
      ),
    })
  );
  bodyChildren.push(new Paragraph({ text: "" }));
  bodyChildren.push(...tocParagraphs);

  bodyChildren.push(
    createAnalysisParametersHeading(localeStrings.analysisParametersHeading, {
      pageBreakBefore: true,
    })
  );
  bodyChildren.push(new Paragraph({ text: "" }));

  // Render content sections in order with bookmarks
  sectionsConfig.order.forEach((sectionName, index) => {
    const isLastSection = index === sectionsConfig.order.length - 1;
    const sectionInfo = tocSections.find((s) => s.title === sectionName || (sectionName === "Disclaimer" && s.title === localeStrings.disclaimer.heading));

    if (sectionName === "Disclaimer") {
      appendDisclaimer(
        bodyChildren,
        localeStrings.disclaimer,
        sectionInfo?.bookmarkId
      );
      return;
    }

    if (!sectionInfo?.hasContent) return;

    switch (sectionName) {
      case "Executive Summary": {
        const bookmarks = extractAllHeadingBookmarks(summary, "executive_summary");
        
        // Prepare chart elements to insert after KPI table
        const chartElements: Array<Paragraph | Table> = [];
        
        if (radarChartBuffer) {
          // Add page break before chart to ensure it's on a separate page
          chartElements.push(new Paragraph({ text: "", pageBreakBefore: true }));
          
          chartElements.push(new Paragraph({ text: "" })); // Spacing
          
          // Add chart image (title is in the chart legend itself)
          chartElements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  type: "png",
                  data: radarChartBuffer,
                  transformation: {
                    width: inchesToPixels(8.4), // 20% larger width
                    height: inchesToPixels(5.04), // Maintain 20% larger height
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
            })
          );
          
          chartElements.push(new Paragraph({ text: "" })); // Spacing after chart
        }
        
        // Use special function to insert chart after KPI table
        appendSectionWithChartAfterTable(
          bodyChildren,
          summary,
          { ...renderContext, headingBookmarks: bookmarks },
          chartElements,
          !isLastSection // Add page break only if not last section
        );
        
        break;
      }
      case "Head to Head Analysis": {
        const bookmarks = extractAllHeadingBookmarks(headToHead, "head_to_head");
        appendSection(
          bodyChildren,
          headToHead,
          { ...renderContext, headingBookmarks: bookmarks },
          !isLastSection
        );
        break;
      }
      case "Top 20 Improvement Levers": {
        const bookmarks = extractAllHeadingBookmarks(improvement, "improvement_levers");
        appendSection(
          bodyChildren,
          improvement,
          { ...renderContext, headingBookmarks: bookmarks },
          !isLastSection
        );
        break;
      }
      case "List of Sources": {
        const bookmarks = extractAllHeadingBookmarks(sources, "sources");
        appendSection(
          bodyChildren,
          sources,
          { ...renderContext, isSourcesSection: true, headingBookmarks: bookmarks },
          !isLastSection
        );
        break;
      }
      default:
        break;
    }
  });

  // Build body section
  sections.push({
    properties: {
      page: pageProperties,
    },
    headers: {
      default: buildHeader(),
    },
    footers: {
      default: buildFooter(localeStrings.disclaimer.footerLines),
    },
    children: bodyChildren,
  });

  // Create document
  const doc = new Document({
    sections,
    creator: localeStrings.creator,
    title: `${quizData.companyName} ${reportType}`,
    description: `${reportType} for ${quizData.companyName}`,
  });

  return Packer.toBuffer(doc);
}

// Re-export types
export type { AnalysisData } from "./sections";
