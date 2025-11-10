/**
 * Disclaimer Section
 * Generates the disclaimer text and footer
 */

import { AlignmentType, Paragraph, TextRun } from "docx";
import { sectionsConfig, stylesConfig } from "../../../config/docx";
import { createParagraphSpacing, paragraphDefaults } from "../renderers";
import { cmToTwip, normalizeColor, pointsToHalfPoints } from "../utils";

/**
 * Append disclaimer section to document
 */
export function appendDisclaimer(nodes: Array<Paragraph | any>) {
  const templateDisclaimer = sectionsConfig.disclaimer;

  // Main heading
  nodes.push(
    new Paragraph({
      children: [
        new TextRun({
          text: templateDisclaimer.heading,
          font: stylesConfig.headingStyles.Heading1.fontFamily,
          bold: stylesConfig.headingStyles.Heading1.bold,
          size: pointsToHalfPoints(
            stylesConfig.headingStyles.Heading1.fontSize
          ),
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

  // Intro paragraphs
  templateDisclaimer.introParagraphs.forEach((text) => {
    nodes.push(
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: templateDisclaimer.fontFamily,
            size: pointsToHalfPoints(templateDisclaimer.fontSize),
          }),
        ],
        spacing: createParagraphSpacing(0, 0.2, paragraphDefaults.lineSpacing),
        alignment: AlignmentType.LEFT,
      })
    );
  });

  // Sections with bullets
  templateDisclaimer.sections.forEach((section) => {
    // Section title
    nodes.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.title,
            font: templateDisclaimer.fontFamily,
            size: pointsToHalfPoints(templateDisclaimer.fontSize),
            bold: true,
          }),
        ],
        spacing: createParagraphSpacing(
          0.3,
          0.1,
          paragraphDefaults.lineSpacing
        ),
      })
    );

    // Bullets
    section.bullets.forEach((bullet) => {
      const runs = [
        new TextRun({
          text: "\u2022 ",
          font: templateDisclaimer.fontFamily,
          size: pointsToHalfPoints(templateDisclaimer.fontSize),
        }),
        new TextRun({
          text: bullet,
          font: templateDisclaimer.fontFamily,
          size: pointsToHalfPoints(templateDisclaimer.fontSize),
        }),
      ];

      nodes.push(
        new Paragraph({
          children: runs,
          spacing: createParagraphSpacing(
            0,
            0.1,
            paragraphDefaults.lineSpacing
          ),
          indent: { left: cmToTwip(0.5) },
          alignment: AlignmentType.LEFT,
        })
      );
    });
  });
}
