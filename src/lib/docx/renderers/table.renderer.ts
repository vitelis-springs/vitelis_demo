/**
 * Table Renderer
 * Renders table blocks to DOCX Tables
 */

import {
  AlignmentType,
  BorderStyle,
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
import type { TableBlock } from "../../doc-model";
import { normalizeColor, pointsToHalfPoints } from "../utils";
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
 * Create DOCX table from table block
 */
export function createTableFromBlock(
  block: TableBlock,
  context: { table: TableRenderDefaults }
): Table {
  const rows: TableRow[] = [];

  if (block.header.length) {
    rows.push(
      new TableRow({
        tableHeader: true,
        children: block.header.map(
          (text) =>
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

  block.rows.forEach((row) => {
    rows.push(
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell,
                      font: paragraphDefaults.fontFamily,
                      size: pointsToHalfPoints(paragraphDefaults.fontSize),
                    }),
                  ],
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
