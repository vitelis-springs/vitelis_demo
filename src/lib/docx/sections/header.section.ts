/**
 * Header Section
 * Creates header with logo for document pages
 */

import { AlignmentType, Header, ImageRun, Paragraph } from "docx";
import { stylesConfig } from "../../../config/docx";
import { inchesToPixels } from "../utils";
import { getImageBuffer, getPngDimensions } from "../utils/image.utils";

/**
 * Build header with logo
 */
export function buildHeader(): Header {
  const logoBuffer = getImageBuffer(stylesConfig.coverPage.logo.file);

  if (!logoBuffer) {
    // Return empty header if logo not found
    return new Header({
      children: [new Paragraph({ text: "" })],
    });
  }

  const dims = getPngDimensions(logoBuffer);
  const widthInches = 1.5; // Smaller logo for header
  const widthPx = inchesToPixels(widthInches);
  const heightPx = dims
    ? Math.round((widthPx * dims.height) / dims.width)
    : Math.round(widthPx * 0.25);

  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: logoBuffer,
            transformation: {
              width: widthPx,
              height: heightPx,
            },
          }),
        ],
        alignment: AlignmentType.RIGHT,
      }),
    ],
  });
}

