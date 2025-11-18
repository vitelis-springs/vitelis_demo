/**
 * Metadata Section
 * Generates the analysis parameters section
 */

import { Paragraph, TextRun } from "docx";
import { stylesConfig } from "../../../config/docx";
import { createParagraphSpacing, paragraphDefaults } from "../renderers";
import { normalizeColor, pointsToHalfPoints } from "../utils";

/**
 * Create analysis parameters heading
 */
export function createAnalysisParametersHeading(
  headingText: string,
  options?: { pageBreakBefore?: boolean }
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: headingText,
        font: stylesConfig.headingStyles.Heading2.fontFamily,
        bold: stylesConfig.headingStyles.Heading2.bold,
        size: pointsToHalfPoints(stylesConfig.headingStyles.Heading2.fontSize),
        color: normalizeColor(stylesConfig.headingStyles.Heading2.color),
      }),
    ],
    spacing: createParagraphSpacing(
      stylesConfig.headingStyles.Heading2.spacingBeforeCm,
      stylesConfig.headingStyles.Heading2.spacingAfterCm,
      paragraphDefaults.lineSpacing
    ),
    pageBreakBefore: options?.pageBreakBefore,
  });
}
