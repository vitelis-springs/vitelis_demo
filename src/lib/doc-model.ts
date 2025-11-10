export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "emphasis"; children: Inline[] }
  | { type: "inlineCode"; value: string }
  | { type: "link"; url: string; title: string | null; children: Inline[] }
  | { type: "break" };

export interface ParagraphBlock {
  type: "paragraph";
  children: Inline[];
}

export interface HeadingBlock {
  type: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  children: Inline[];
}

export interface ListItemBlock {
  children: Block[];
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  start: number | null;
  tight: boolean;
  items: ListItemBlock[];
}

export interface ImageBlock {
  type: "image";
  url: string;
  alt: string | null;
  title: string | null;
}

export interface CodeBlock {
  type: "code";
  lang: string | null;
  value: string;
  meta: string | null;
}

export interface BlockquoteBlock {
  type: "blockquote";
  children: Block[];
}

export interface TableBlock {
  type: "table";
  align: Array<"left" | "right" | "center" | null>;
  header: string[];
  rows: string[][];
  rawCells: Inline[][][];
}

export interface ThematicBreakBlock {
  type: "thematicBreak";
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | ImageBlock
  | CodeBlock
  | BlockquoteBlock
  | TableBlock
  | ThematicBreakBlock;

export interface DocModel {
  type: "doc";
  blocks: Block[];
}
