/**
 * Footer Section
 * Creates footer with contact info and disclaimer reminder
 */

import { AlignmentType, Footer, Paragraph, TextRun } from "docx";
import { FOOTER_TEXT_COLOR, stylesConfig } from "../../../config/docx";
import { normalizeColor, pointsToHalfPoints } from "../utils";

/**
 * Build footer with standard footer lines from config
 */
export function buildFooter(footerLines: string[]): Footer {
  const footerFontSize = stylesConfig.footer.fontSize;
  const footerFontFamily = stylesConfig.footer.fontFamily;

  return new Footer({
    children: footerLines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: footerFontFamily,
              size: pointsToHalfPoints(footerFontSize),
              color: normalizeColor(FOOTER_TEXT_COLOR),
            }),
          ],
          alignment: AlignmentType.CENTER,
        })
    ),
  });
}
