/**
 * Block Renderer
 * Main renderer that delegates to specific renderers
 */

import { Paragraph, Table } from "docx";
import type { Block, DocModel } from "../../doc-model";
import {
  createCodeParagraph,
  createHeadingParagraph,
  createImagePlaceholderParagraph,
  createParagraphFromInlines,
  createThematicBreakParagraph,
  ParagraphRenderDefaults,
  renderListBlock,
} from "./paragraph.renderer";
import { createTableFromBlock, TableRenderDefaults } from "./table.renderer";

export interface TemplateRenderContext {
  paragraph: ParagraphRenderDefaults;
  table: TableRenderDefaults;
}

/**
 * Check if inline element has renderable content
 */
function inlineHasRenderableText(inline: any): boolean {
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
 * Check if block has content
 */
export function blockHasContent(block: Block): boolean {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return block.children.some(inlineHasRenderableText);
    case "table":
      return (
        block.header.some((cell) => cell.trim().length > 0) ||
        block.rows.some((row) =>
          row.some((cell) => (cell || "").trim().length > 0)
        )
      );
    case "list":
      return block.items.some((item) =>
        item.children.some((child) => blockHasContent(child))
      );
    case "code":
      return !!block.value && block.value.trim().length > 0;
    case "blockquote":
      return block.children.some((child) => blockHasContent(child));
    case "image":
      return !!block.url;
    case "thematicBreak":
      return true;
    default:
      return false;
  }
}

/**
 * Check if DocModel has renderable content
 */
export function docModelHasRenderableContent(model: DocModel | null): boolean {
  if (!model) return false;
  return model.blocks.some((block) => blockHasContent(block));
}

/**
 * Render a single block to DOCX elements
 */
export function renderBlock(
  block: Block,
  context: TemplateRenderContext
): Array<Paragraph | Table> {
  switch (block.type) {
    case "paragraph":
      return [
        createParagraphFromInlines(block.children, {
          fontFamily: context.paragraph.fontFamily,
          fontSize: context.paragraph.fontSize,
          color: context.paragraph.color,
          spacingAfterCm: 0.25,
        }),
      ];
    case "heading":
      return [createHeadingParagraph(block.children, block)];
    case "list":
      return renderListBlock(block);
    case "table":
      return [createTableFromBlock(block, context)];
    case "blockquote":
      return block.children.flatMap((child) => renderBlock(child, context));
    case "code":
      return [createCodeParagraph(block)];
    case "image":
      return [createImagePlaceholderParagraph(block)];
    case "thematicBreak":
      return [createThematicBreakParagraph()];
    default:
      return [];
  }
}

/**
 * Render entire DocModel to DOCX elements
 */
export function renderDocModel(
  model: DocModel,
  context: TemplateRenderContext
): Array<Paragraph | Table> {
  return model.blocks.flatMap((block) => renderBlock(block, context));
}
