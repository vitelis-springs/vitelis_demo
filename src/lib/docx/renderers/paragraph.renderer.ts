/**
 * Paragraph Renderer
 * Renders paragraph blocks to DOCX Paragraphs
 */

import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Paragraph,
  ShadingType,
  TextRun,
} from "docx";
import {
  DEFAULT_MONO_FONT,
  PLACEHOLDER_COLOR,
  stylesConfig,
} from "../../../config/docx";
import type {
  Block,
  HeadingBlock,
  Inline,
  ParagraphBlock,
} from "../../doc-model";
import {
  cmToTwip,
  lineSpacingToTwip,
  normalizeColor,
  pointsToHalfPoints,
} from "../utils";
import { inlineToRuns } from "./inline.renderer";

export type ParagraphAlignment =
  (typeof AlignmentType)[keyof typeof AlignmentType];

export interface ParagraphRenderDefaults {
  fontFamily: string;
  fontSize: number;
  color: string;
  lineSpacing: number;
}

export const paragraphDefaults: ParagraphRenderDefaults = {
  fontFamily: stylesConfig.defaults.paragraph.fontFamily,
  fontSize: stylesConfig.defaults.paragraph.fontSize,
  color: stylesConfig.defaults.paragraph.color,
  lineSpacing: stylesConfig.defaults.paragraph.lineSpacing,
};

/**
 * Create paragraph spacing object
 */
export function createParagraphSpacing(
  spacingBeforeCm = 0,
  spacingAfterCm = 0,
  lineSpacing?: number
) {
  const spacing: {
    before?: number;
    after?: number;
    line?: number;
  } = {};

  if (spacingBeforeCm > 0) {
    spacing.before = cmToTwip(spacingBeforeCm);
  }

  if (spacingAfterCm > 0) {
    spacing.after = cmToTwip(spacingAfterCm);
  }

  if (lineSpacing) {
    spacing.line = lineSpacingToTwip(lineSpacing);
  }

  return spacing;
}

/**
 * Create paragraph from inline elements
 */
export function createParagraphFromInlines(
  inlines: Inline[],
  options: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    alignment?: ParagraphAlignment;
    spacingBeforeCm?: number;
    spacingAfterCm?: number;
    indentLeftCm?: number;
  }
): Paragraph {
  const runs =
    inlines.length > 0
      ? inlineToRuns(inlines, {
          fontFamily: options.fontFamily,
          fontSize: options.fontSize,
          color: options.color,
        })
      : [
          new TextRun({
            text: "",
            font: options.fontFamily,
            size: pointsToHalfPoints(options.fontSize),
          }),
        ];

  return new Paragraph({
    children: runs,
    spacing: createParagraphSpacing(
      options.spacingBeforeCm,
      options.spacingAfterCm,
      paragraphDefaults.lineSpacing
    ),
    alignment: options.alignment ?? AlignmentType.LEFT,
    indent: options.indentLeftCm
      ? {
          left: cmToTwip(options.indentLeftCm),
        }
      : undefined,
  });
}

/**
 * Create heading paragraph
 */
export function createHeadingParagraph(
  textInlines: Inline[],
  headingBlock: HeadingBlock
): Paragraph {
  const headingLevel =
    headingBlock.depth === 1
      ? HeadingLevel.HEADING_1
      : headingBlock.depth === 2
      ? HeadingLevel.HEADING_2
      : HeadingLevel.HEADING_3;

  const templateStyle =
    headingBlock.depth === 1
      ? stylesConfig.headingStyles.Heading1
      : headingBlock.depth === 2
      ? stylesConfig.headingStyles.Heading2
      : stylesConfig.headingStyles.Heading2;

  return new Paragraph({
    children: inlineToRuns(textInlines, {
      fontFamily: templateStyle.fontFamily,
      fontSize: templateStyle.fontSize,
      color: templateStyle.color || paragraphDefaults.color,
      bold: templateStyle.bold,
    }),
    heading: headingLevel,
    spacing: createParagraphSpacing(
      templateStyle.spacingBeforeCm,
      templateStyle.spacingAfterCm,
      paragraphDefaults.lineSpacing
    ),
  });
}

/**
 * Create thematic break (horizontal rule)
 */
export function createThematicBreakParagraph(): Paragraph {
  return new Paragraph({
    border: {
      bottom: {
        color: normalizeColor(stylesConfig.defaults.table.borderColor),
        size: 6,
        space: 1,
        style: BorderStyle.SINGLE,
      },
    },
    spacing: createParagraphSpacing(0.2, 0.2, paragraphDefaults.lineSpacing),
  });
}

/**
 * Create code block paragraph
 */
export function createCodeParagraph(
  block: Block,
  fontSize = paragraphDefaults.fontSize
): Paragraph {
  if (block.type !== "code") {
    return new Paragraph({
      children: [],
    });
  }

  return new Paragraph({
    children: [
      new TextRun({
        text: block.value,
        font: DEFAULT_MONO_FONT,
        size: pointsToHalfPoints(fontSize - 1),
        color: normalizeColor("#222222"),
      }),
    ],
    shading: {
      type: ShadingType.CLEAR,
      color: "F5F5F5",
      fill: "F5F5F5",
    },
    spacing: createParagraphSpacing(0.2, 0.2, paragraphDefaults.lineSpacing),
  });
}

/**
 * Create image placeholder paragraph
 */
export function createImagePlaceholderParagraph(block: Block): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text:
          block.type === "image" ? `[Image: ${block.alt ?? block.url}]` : "",
        italics: true,
        font: paragraphDefaults.fontFamily,
        size: pointsToHalfPoints(paragraphDefaults.fontSize),
        color: normalizeColor(PLACEHOLDER_COLOR),
      }),
    ],
    spacing: createParagraphSpacing(0, 0.2, paragraphDefaults.lineSpacing),
  });
}

/**
 * Render list block to paragraphs
 */
export function renderListBlock(block: Block): Paragraph[] {
  if (block.type !== "list") return [];

  const paragraphs: Paragraph[] = [];
  const startValue = block.start ?? 1;

  block.items.forEach((item, index) => {
    const firstParagraph = item.children.find(
      (child): child is ParagraphBlock | HeadingBlock =>
        child.type === "paragraph" || child.type === "heading"
    );

    if (!firstParagraph) return;

    const prefix = block.ordered ? `${startValue + index}. ` : "\u2022 ";

    const runs = inlineToRuns(firstParagraph.children, {
      fontFamily: paragraphDefaults.fontFamily,
      fontSize: paragraphDefaults.fontSize,
      color: paragraphDefaults.color,
    });

    runs.unshift(
      new TextRun({
        text: prefix,
        bold: block.ordered,
        font: paragraphDefaults.fontFamily,
        size: pointsToHalfPoints(paragraphDefaults.fontSize),
      })
    );

    paragraphs.push(
      new Paragraph({
        children: runs,
        spacing: createParagraphSpacing(0, 0.1, paragraphDefaults.lineSpacing),
        indent: { left: cmToTwip(0.5) },
        alignment: AlignmentType.LEFT,
      })
    );
  });

  return paragraphs;
}
