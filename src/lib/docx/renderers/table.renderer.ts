/**
 * Table Renderer
 * Renders table blocks to DOCX Tables
 */

import {
  AlignmentType,
  BorderStyle,
  InternalHyperlink,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { stylesConfig } from "../../../config/docx";
import type { Inline, TableBlock } from "../../doc-model";
import { normalizeColor, pointsToHalfPoints } from "../utils";
import { inlineToRuns } from "./inline.renderer";
import { paragraphDefaults } from "./paragraph.renderer";

export interface TableRenderDefaults {
  headerBg: string;
  borderColor: string;
  style?: string;
}

export const tableDefaults: TableRenderDefaults = {
  headerBg: stylesConfig.defaults.table.headerBg,
  borderColor: stylesConfig.defaults.table.borderColor,
  style: stylesConfig.defaults.table.style,
};

/**
 * Render cell content from Inline elements
 */
function renderCellContent(inlines: Inline[]): Array<TextRun | InternalHyperlink> {
  if (!inlines || inlines.length === 0) {
    return [
      new TextRun({
        text: "",
        font: paragraphDefaults.fontFamily,
        size: pointsToHalfPoints(paragraphDefaults.fontSize),
      }),
    ];
  }

  return inlineToRuns(inlines, {
    fontFamily: paragraphDefaults.fontFamily,
    fontSize: paragraphDefaults.fontSize,
    color: paragraphDefaults.color,
  });
}

/**
 * Create DOCX table from table block
 */
export function createTableFromBlock(
  block: TableBlock,
  context: { table: TableRenderDefaults }
): Table {
  const rows: TableRow[] = [];

  // Render header row
  if (block.header.length) {
    rows.push(
      new TableRow({
        tableHeader: true,
        children: block.header.map((text) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    font: paragraphDefaults.fontFamily,
                    bold: true,
                    size: pointsToHalfPoints(paragraphDefaults.fontSize),
                  }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
            shading: {
              color: normalizeColor(context.table.headerBg),
              fill: normalizeColor(context.table.headerBg),
              type: ShadingType.CLEAR,
            },
            verticalAlign: VerticalAlign.CENTER,
          })
        ),
      })
    );
  }

  // Render body rows with Inline support (including citations)
  block.rawCells.forEach((row) => {
    rows.push(
      new TableRow({
        children: row.map((cellInlines) =>
          new TableCell({
            children: [
              new Paragraph({
                children: renderCellContent(cellInlines),
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          })
        ),
      })
    );
  });

  const borderColor = normalizeColor(context.table.borderColor) ?? "CCCCCC";

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows,
    style: context.table.style || "LightGridAccent1",
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 4,
        color: borderColor,
      },
      insideVertical: {
        style: BorderStyle.SINGLE,
        size: 4,
        color: borderColor,
      },
    },
  });
}
