/**
 * Table of Contents Section
 * Manually builds TOC from extracted headings with internal hyperlinks
 */

import {
  AlignmentType,
  InternalHyperlink,
  Paragraph,
  TextRun,
} from "docx";
import type { Block, DocModel, HeadingBlock } from "../../doc-model";
import { createParagraphSpacing, paragraphDefaults } from "../renderers";
import { cmToTwip, normalizeColor, pointsToHalfPoints } from "../utils";

interface TocEntry {
  text: string;
  level: number;
  bookmarkId: string;
}

/**
 * Generate safe bookmark ID from text
 * Must be deterministic - same text always produces same ID
 */
function generateBookmarkId(text: string): string {
  const sanitized = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 50);
  
  // Create a simple hash to handle duplicate headings
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `heading_${Math.abs(hash)}_${sanitized}`;
}

/**
 * Extract headings from DocModel
 */
function extractHeadings(
  model: DocModel | null,
  sectionPrefix: string
): TocEntry[] {
  if (!model) return [];

  const headings: TocEntry[] = [];

  function processBlock(block: Block) {
    if (block.type === "heading") {
      const headingBlock = block as HeadingBlock;
      const text = headingBlock.children
        .map((inline) => {
          if (inline.type === "text") return inline.value;
          if (inline.type === "strong" || inline.type === "emphasis") {
            return inline.children
              .map((child) => (child.type === "text" ? child.value : ""))
              .join("");
          }
          return "";
        })
        .join("")
        .trim();

      if (text) {
        // Include section prefix in the ID generation for uniqueness
        const fullText = `${sectionPrefix}_${text}`;
        headings.push({
          text,
          level: headingBlock.depth,
          bookmarkId: generateBookmarkId(fullText),
        });
      }
    }

    // Recursively process nested blocks
    if ("children" in block && Array.isArray(block.children)) {
      block.children.forEach((child) => {
        if (typeof child === "object" && child !== null && "type" in child) {
          processBlock(child as Block);
        }
      });
    }

    if (block.type === "list" && "items" in block) {
      block.items.forEach((item) => {
        item.children.forEach((child) => processBlock(child));
      });
    }
  }

  model.blocks.forEach((block) => processBlock(block));

  return headings;
}

/**
 * Build TOC paragraphs from content sections with hyperlinks
 * Only includes headings from actual markdown content
 */
export function buildTableOfContents(
  sectionTitles: Array<{ title: string; hasContent: boolean; bookmarkId: string }>,
  contentModels: Array<{ model: DocModel | null; sectionPrefix: string }>
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  sectionTitles.forEach(({ hasContent }, index) => {
    if (!hasContent) return;

    // Extract and add headings from content (skip artificial section titles)
    const modelData = contentModels[index];
    if (modelData?.model) {
      const headings = extractHeadings(modelData.model, modelData.sectionPrefix);
      headings.forEach((heading) => {
        // Debug logging
        if (process.env.NODE_ENV === "development") {
          console.log(`[TOC Heading] "${heading.text}" -> anchor: "${heading.bookmarkId}"`);
        }
        
        // Adjust indent based on heading level
        const indent = heading.level === 1 ? 0 : heading.level === 2 ? 0.5 : 1.0;
        const fontSize = heading.level === 1 ? 12 : 11;
        const isBold = heading.level === 1;
        
        paragraphs.push(
          new Paragraph({
            children: [
              new InternalHyperlink({
                anchor: heading.bookmarkId,
                children: [
                  new TextRun({
                    text: heading.text,
                    font: paragraphDefaults.fontFamily,
                    size: pointsToHalfPoints(fontSize),
                    bold: isBold,
                    color: normalizeColor("#0563C1"),
                    underline: {},
                  }),
                ],
              }),
            ],
            indent: indent > 0 ? {
              left: cmToTwip(indent),
            } : undefined,
            spacing: createParagraphSpacing(
              0.05,
              0.05,
              paragraphDefaults.lineSpacing
            ),
            alignment: AlignmentType.LEFT,
          })
        );
      });
    }
  });

  return paragraphs;
}

/**
 * Extract all heading entries with bookmark IDs
 * Used to add bookmarks to actual headings in content
 */
export function extractAllHeadingBookmarks(
  model: DocModel | null,
  sectionPrefix: string
): Map<string, string> {
  const bookmarkMap = new Map<string, string>();
  const headings = extractHeadings(model, sectionPrefix);

  headings.forEach((heading) => {
    bookmarkMap.set(heading.text, heading.bookmarkId);
    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log(`[TOC] Bookmark mapping: "${heading.text}" -> "${heading.bookmarkId}"`);
    }
  });

  return bookmarkMap;
}

