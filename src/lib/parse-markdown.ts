// md-to-doc.ts
import type {
  Blockquote,
  Code,
  Content,
  Emphasis,
  Heading,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  Root,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
} from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { Block, DocModel, Inline } from "./doc-model";

export async function parseMarkdown(markdown: string): Promise<Root> {
  const file = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  return file as Root;
}

function inlineToPlain(inlines: Inline[]): string {
  return inlines
    .map((n) => {
      switch (n.type) {
        case "text":
          return n.value;
        case "inlineCode":
          return n.value;
        case "strong":
        case "emphasis":
        case "link":
          return inlineToPlain(n.children);
        case "break":
          return "\n";
        default:
          return "";
      }
    })
    .join("");
}

// mdast → Inline
function mdastInline(node: any): Inline[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(mdastInline);

  switch (node.type) {
    case "text":
      return [{ type: "text", value: (node as Text).value ?? "" }];
    case "strong":
      return [
        { type: "strong", children: mdastInline((node as Strong).children) },
      ];
    case "emphasis":
      return [
        {
          type: "emphasis",
          children: mdastInline((node as Emphasis).children),
        },
      ];
    case "inlineCode":
      return [{ type: "inlineCode", value: (node as InlineCode).value ?? "" }];
    case "link":
      return [
        {
          type: "link",
          url: (node as Link).url,
          title: (node as Link).title ?? null,
          children: mdastInline((node as Link).children),
        },
      ];
    case "break":
      return [{ type: "break" }];
    default:
      if (node.children) return mdastInline(node.children);
      return [];
  }
}

// mdast → Block[]
function mdastBlock(node: Content): Block[] {
  switch (node.type) {
    case "paragraph": {
      const p = node as Paragraph;
      const images = (p.children || []).filter((c: any) => c.type === "image");
      const nonImages = (p.children || []).filter(
        (c: any) => c.type !== "image"
      );

      const blocks: Block[] = [];

      images.forEach((img: any) => {
        blocks.push({
          type: "image",
          url: img.url,
          alt: img.alt ?? null,
          title: img.title ?? null,
        });
      });

      if (nonImages.length) {
        blocks.push({ type: "paragraph", children: mdastInline(nonImages) });
      }

      return blocks;
    }

    case "heading": {
      const h = node as Heading;
      return [
        {
          type: "heading",
          depth: h.depth as 1 | 2 | 3 | 4 | 5 | 6,
          children: mdastInline(h.children),
        },
      ];
    }

    case "thematicBreak":
      return [{ type: "thematicBreak" }];

    case "blockquote": {
      const bq = node as Blockquote;
      const inner = (bq.children || []).flatMap(mdastBlock);
      return [{ type: "blockquote", children: inner }];
    }

    case "list": {
      const list = node as List;
      const items = (list.children || []).map((li: ListItem) => {
        const liBlocks = (li.children || []).flatMap(mdastBlock);
        return { children: liBlocks };
      });
      return [
        {
          type: "list",
          ordered: !!list.ordered,
          start: list.start ?? null,
          tight: list.spread === false, // mdast: spread=false ~ "tight"
          items,
        },
      ];
    }

    case "code": {
      const code = node as Code;
      return [
        {
          type: "code",
          lang: code.lang ?? null,
          value: code.value ?? "",
          meta: code.meta ?? null,
        },
      ];
    }

    case "image": {
      const img = node as Image;
      return [
        {
          type: "image",
          url: img.url,
          alt: img.alt ?? null,
          title: img.title ?? null,
        },
      ];
    }

    case "table": {
      const t = node as Table;
      const [headRow, ...bodyRows] = (t.children || []) as TableRow[];
      const headerCells = (headRow?.children || []) as TableCell[];
      const headerInline = headerCells.map((c) =>
        mdastInline(c.children || [])
      );
      const header = headerInline.map(inlineToPlain);

      const rows = bodyRows.map((r) => {
        const cells = (r.children || []) as TableCell[];
        const inlineCells = cells.map((c) => mdastInline(c.children || []));
        return inlineCells.map(inlineToPlain);
      });

      const rawCells = bodyRows.map((r) => {
        const cells = (r.children || []) as TableCell[];
        return cells.map((c) => mdastInline(c.children || []));
      });

      return [
        {
          type: "table",
          align: (t.align || []).map((a) =>
            a === "left" || a === "right" || a === "center" ? a : null
          ),
          header,
          rows,
          rawCells,
        },
      ];
    }

    default:
      return [];
  }
}

export async function markdownToDocModel(markdown: string): Promise<DocModel> {
  const ast = await parseMarkdown(markdown);
  const blocks = (ast.children || []).flatMap(mdastBlock);
  return { type: "doc", blocks };
}
