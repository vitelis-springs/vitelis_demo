/**
 * Inline Content Renderer
 * Renders inline markdown elements (text, strong, emphasis, code, links) to DOCX TextRuns
 */

import { TextRun } from "docx";
import { DEFAULT_MONO_FONT } from "../../../config/docx";
import type { Inline } from "../../doc-model";
import { normalizeColor, pointsToHalfPoints } from "../utils";

export interface InlineRenderOptions {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italics?: boolean;
  linkColor?: string;
}

/**
 * Check if inline element has renderable text content
 */
export function inlineHasRenderableText(inline: Inline): boolean {
  switch (inline.type) {
    case "text":
    case "inlineCode":
      return !!inline.value && inline.value.trim().length > 0;
    case "strong":
    case "emphasis":
    case "link":
      return inline.children.some(inlineHasRenderableText);
    default:
      return false;
  }
}

/**
 * Convert inline elements to DOCX TextRuns
 */
export function inlineToRuns(
  inlines: Inline[],
  options: InlineRenderOptions
): TextRun[] {
  const runs: TextRun[] = [];

  for (const inline of inlines) {
    switch (inline.type) {
      case "text":
        // Split text by newlines and create runs with breaks
        const textParts = inline.value.split("\n");
        textParts.forEach((part, index) => {
          if (index > 0) {
            // Add line break before each part except the first
            runs.push(
              new TextRun({
                break: 1,
                font: options.fontFamily,
                size: pointsToHalfPoints(options.fontSize),
              })
            );
          }
          // Add text run if part is not empty
          if (part) {
            runs.push(
              new TextRun({
                text: part,
                font: options.fontFamily,
                size: pointsToHalfPoints(options.fontSize),
                color: normalizeColor(options.color),
                bold: options.bold,
                italics: options.italics,
              })
            );
          }
        });
        break;
      case "inlineCode":
        runs.push(
          new TextRun({
            text: inline.value,
            font: DEFAULT_MONO_FONT,
            size: pointsToHalfPoints((options.fontSize || 11) - 1),
            color: normalizeColor(options.color),
            highlight: "lightGray",
          })
        );
        break;
      case "strong":
        runs.push(
          ...inlineToRuns(inline.children, {
            ...options,
            bold: true,
          })
        );
        break;
      case "emphasis":
        runs.push(
          ...inlineToRuns(inline.children, {
            ...options,
            italics: true,
          })
        );
        break;
      case "link":
        runs.push(
          ...inlineToRuns(inline.children, {
            ...options,
            color: options.linkColor ?? "#0F62FE",
          })
        );
        break;
      case "break":
        runs.push(
          new TextRun({
            break: 1,
            font: options.fontFamily,
            size: pointsToHalfPoints(options.fontSize),
          })
        );
        break;
      default:
        break;
    }
  }

  return runs;
}
