/**
 * DOCX Layout Configuration
 * Page size, orientation, margins
 */

export const layoutConfig = {
  orientation: "landscape" as "portrait" | "landscape",
  pageSize: "A4",
  margins: {
    top: 2.5, // cm
    bottom: 2.5,
    left: 2.2,
    right: 2.2,
  },
};

export const pageSizeByName = {
  A4: { widthMm: 210, heightMm: 297 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
} as const;

export type PageSizeKey = keyof typeof pageSizeByName;
export type PageSizeInfo = (typeof pageSizeByName)[PageSizeKey];

export function resolvePageSize(name: string): PageSizeInfo {
  const key = (name in pageSizeByName ? name : "A4") as PageSizeKey;
  return pageSizeByName[key];
}
