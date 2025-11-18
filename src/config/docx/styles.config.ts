/**
 * DOCX Styles Configuration
 * Typography, colors, spacing
 */

import { AlignmentType } from "docx";

// Color constants
export const VITELIS_BLUE = "#0070C0"; // RGB(0, 112, 192)
export const FOOTER_TEXT_COLOR = VITELIS_BLUE;
export const HEADING_COLOR = VITELIS_BLUE;

// Font constants
export const DEFAULT_FONT_NAME = "Aptos";
export const HEADING_FONT_NAME = "Play";

export const stylesConfig = {
  headingStyles: {
    Heading1: {
      fontFamily: HEADING_FONT_NAME,
      fontSize: 18,
      bold: true,
      color: HEADING_COLOR,
      spacingBeforeCm: 0.5,
      spacingAfterCm: 0.3,
    },
    Heading2: {
      fontFamily: HEADING_FONT_NAME,
      fontSize: 14,
      bold: true,
      color: HEADING_COLOR,
      spacingBeforeCm: 0.4,
      spacingAfterCm: 0.2,
    },
    Heading3: {
      fontFamily: HEADING_FONT_NAME,
      fontSize: 12,
      bold: true,
      color: HEADING_COLOR,
      spacingBeforeCm: 0.3,
      spacingAfterCm: 0.15,
    },
  },
  defaults: {
    paragraph: {
      fontFamily: DEFAULT_FONT_NAME,
      fontSize: 11,
      lineSpacing: 1.25,
      color: "#000000",
    },
    table: {
      headerBg: "#F3F4F6",
      borderColor: "#CCCCCC",
      style: "LightGridAccent1", // Built-in Word table style
    },
  },
  coverPage: {
    logo: {
      file: "./assets/Vitelis_Primary_Horizontal Lockup-Dark.png",
      widthInches: 2.1,
      heightInches: 0.53,
      horizontalOffsetInches: 7.52,
      verticalOffsetInches: -0.63,
    },
    titleBlock: {
      spacingBeforeCm: 5,
      fontFamily: DEFAULT_FONT_NAME,
      fontSize: 26, // COVER_TITLE_FONT_SIZE
      alignment: AlignmentType.CENTER,
      spacingAfterCm: 1.5,
    },
    subtitle: {
      fontFamily: DEFAULT_FONT_NAME,
      fontSize: 16, // COVER_SUBTITLE_FONT_SIZE
      alignment: AlignmentType.CENTER,
    },
    metadata: {
      fontFamily: DEFAULT_FONT_NAME,
      fontSize: 11,
      alignment: AlignmentType.CENTER,
    },
  },
  footer: {
    fontFamily: DEFAULT_FONT_NAME,
    fontSize: 9,
    color: FOOTER_TEXT_COLOR,
  },
};

export const PLACEHOLDER_COLOR = "#888888";
export const DEFAULT_MONO_FONT = "Consolas";
