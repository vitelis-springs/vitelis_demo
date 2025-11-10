/**
 * DOCX Generator
 * Main entry point for generating DOCX documents
 */

import { Document, Packer, PageOrientation, Paragraph, Table } from "docx";
import {
  layoutConfig,
  resolvePageSize,
  sectionsConfig,
} from "../../config/docx";
import type { DocModel } from "../doc-model";
import { markdownToDocModel } from "../parse-markdown";
import {
  paragraphDefaults,
  tableDefaults,
  TemplateRenderContext,
} from "./renderers";
import {
  AnalysisData,
  appendDisclaimer,
  appendSection,
  buildCoverSection,
  buildFooter,
  buildHeader,
  createAnalysisParametersHeading,
} from "./sections";
import { cmToTwip, mmToTwip } from "./utils";

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
  // Parse content
  const summary = await ensureDocModel(content.summary);
  const headToHead = await ensureDocModel(content.headToHead);
  const improvement = await ensureDocModel(
    content.improvementLevers ?? content.improvementLeverages
  );
  const sources = await ensureDocModel(content.sources);

  const sections = [];

  // Render context for blocks
  const renderContext: TemplateRenderContext = {
    paragraph: paragraphDefaults,
    table: tableDefaults,
  };

  // Build cover section
  sections.push(buildCoverSection(quizData));

  // Build body section
  const bodyChildren: Array<Paragraph | Table> = [];

  bodyChildren.push(createAnalysisParametersHeading());
  bodyChildren.push(new Paragraph({ text: "" }));

  // Render content sections in order
  sectionsConfig.order.forEach((sectionName, index) => {
    const isLastSection = index === sectionsConfig.order.length - 1;

    if (sectionName === "Disclaimer") {
      appendDisclaimer(bodyChildren);
      return;
    }

    switch (sectionName) {
      case "Executive Summary":
        appendSection(bodyChildren, summary, renderContext, !isLastSection);
        break;
      case "Head to Head Analysis":
        appendSection(bodyChildren, headToHead, renderContext, !isLastSection);
        break;
      case "Top 20 Improvement Levers":
        appendSection(bodyChildren, improvement, renderContext, !isLastSection);
        break;
      case "List of Sources":
        // Enable bookmarks for sources section
        appendSection(
          bodyChildren,
          sources,
          { ...renderContext, isSourcesSection: true },
          !isLastSection
        );
        break;
      default:
        break;
    }
  });

  // Build body section properties
  const bodyPageSize = resolvePageSize(layoutConfig.pageSize);

  sections.push({
    properties: {
      page: {
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
      },
    },
    headers: {
      default: buildHeader(),
    },
    footers: {
      default: buildFooter(),
    },
    children: bodyChildren,
  });

  // Create document
  const doc = new Document({
    sections,
    creator: "Vitelis AI Research",
    title: `${quizData.companyName} ${reportType}`,
    description: `${reportType} for ${quizData.companyName}`,
  });

  return Packer.toBuffer(doc);
}

// Re-export types
export type { AnalysisData } from "./sections";
