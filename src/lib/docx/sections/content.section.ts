/**
 * Content Section Renderer
 * Handles rendering of main content sections (summary, head-to-head, etc.)
 */

import { Bookmark, HeadingLevel, PageBreak, Paragraph, Table, TextRun } from "docx";
import { stylesConfig } from "../../../config/docx";
import type { DocModel } from "../../doc-model";
import {
  createParagraphSpacing,
  docModelHasRenderableContent,
  paragraphDefaults,
  renderDocModel,
  TemplateRenderContext,
} from "../renderers";
import { normalizeColor, pointsToHalfPoints } from "../utils";

/**
 * Append a section title with bookmark
 */
export function appendSectionTitle(
  nodes: Array<Paragraph | Table>,
  title: string,
  bookmarkId: string
) {
  nodes.push(
    new Paragraph({
      children: [
        new Bookmark({
          id: bookmarkId,
          children: [
            new TextRun({
              text: title,
              font: stylesConfig.headingStyles.Heading1.fontFamily,
              bold: stylesConfig.headingStyles.Heading1.bold,
              size: pointsToHalfPoints(stylesConfig.headingStyles.Heading1.fontSize),
              color: normalizeColor(stylesConfig.headingStyles.Heading1.color),
            }),
          ],
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: createParagraphSpacing(
        stylesConfig.headingStyles.Heading1.spacingBeforeCm,
        stylesConfig.headingStyles.Heading1.spacingAfterCm,
        paragraphDefaults.lineSpacing
      ),
    })
  );
  nodes.push(new Paragraph({ text: "" }));
}

/**
 * Append a content section to the document with page break
 */
export function appendSection(
  nodes: Array<Paragraph | Table>,
  model: DocModel | null,
  context: TemplateRenderContext,
  addPageBreak = true
) {
  if (model && docModelHasRenderableContent(model)) {
    nodes.push(...renderDocModel(model, context));
  }

  // Add spacing and page break after section
  nodes.push(new Paragraph({ text: "" }));
  if (addPageBreak) {
    nodes.push(
      new Paragraph({
        text: "",
        children: [new PageBreak()],
      })
    );
  }
}
