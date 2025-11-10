/**
 * Cover Page Section
 * Generates the cover page with logo and title
 */

import type { IImageOptions } from "docx";
import {
  AlignmentType,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  PageOrientation,
  Paragraph,
  TextRun,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
} from "docx";
import {
  layoutConfig,
  resolvePageSize,
  stylesConfig,
} from "../../../config/docx";
import { createParagraphSpacing, paragraphDefaults } from "../renderers";
import {
  cmToTwip,
  inchesToPixels,
  mmToTwip,
  pointsToHalfPoints,
} from "../utils";
import { getImageBuffer, getPngDimensions } from "../utils/image.utils";
import type { AnalysisData } from "./types";

/**
 * Build cover page section with logo and title
 */
export function buildCoverSection(quizData: AnalysisData) {
  const children: Paragraph[] = [];
  const logoBuffer = getImageBuffer(stylesConfig.coverPage.logo.file);

  if (logoBuffer) {
    const dims = getPngDimensions(logoBuffer);
    const {
      widthInches,
      heightInches,
      horizontalOffsetInches,
      verticalOffsetInches,
    } = stylesConfig.coverPage.logo;

    const widthPx = inchesToPixels(widthInches);
    const heightPx =
      typeof heightInches === "number"
        ? inchesToPixels(heightInches)
        : dims
        ? Math.round((widthPx * dims.height) / dims.width)
        : Math.round(widthPx * 0.25);

    const floatingOptions: IImageOptions["floating"] =
      typeof horizontalOffsetInches === "number" ||
      typeof verticalOffsetInches === "number"
        ? {
            horizontalPosition: {
              relative: HorizontalPositionRelativeFrom.MARGIN,
              align: HorizontalPositionAlign.RIGHT,
              offset: 0,
            },
            verticalPosition: {
              relative: VerticalPositionRelativeFrom.MARGIN,
              align: VerticalPositionAlign.TOP,
              offset: 0,
            },
            allowOverlap: true,
            wrap: {
              type: TextWrappingType.NONE,
            },
          }
        : undefined;

    const imageOptions: IImageOptions = {
      type: "png",
      data: logoBuffer,
      transformation: {
        width: widthPx,
        height: heightPx,
      },
      ...(floatingOptions ? { floating: floatingOptions } : {}),
    };

    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new ImageRun(imageOptions)],
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${quizData.companyName} ${quizData.country} ${quizData.useCase} Report (${quizData.timeline})`,
          bold: true,
          font: stylesConfig.coverPage.titleBlock.fontFamily,
          size: pointsToHalfPoints(stylesConfig.coverPage.titleBlock.fontSize),
        }),
      ],
      alignment: stylesConfig.coverPage.titleBlock.alignment,
      spacing: createParagraphSpacing(
        stylesConfig.coverPage.titleBlock.spacingBeforeCm,
        stylesConfig.coverPage.titleBlock.spacingAfterCm,
        paragraphDefaults.lineSpacing
      ),
    })
  );

  const pageSize = resolvePageSize(layoutConfig.pageSize);

  return {
    properties: {
      page: {
        margin: {
          top: cmToTwip(layoutConfig.margins.top),
          bottom: cmToTwip(layoutConfig.margins.bottom),
          left: cmToTwip(layoutConfig.margins.left),
          right: cmToTwip(layoutConfig.margins.right),
        },
        size: {
          width: mmToTwip(pageSize.widthMm),
          height: mmToTwip(pageSize.heightMm),
          orientation:
            layoutConfig.orientation === "landscape"
              ? PageOrientation.LANDSCAPE
              : PageOrientation.PORTRAIT,
        },
      },
    },
    children,
  };
}
