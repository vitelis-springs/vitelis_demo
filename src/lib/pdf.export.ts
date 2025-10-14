import MarkdownIt from "markdown-it";
import multimd_table from "markdown-it-multimd-table";

// Initialize markdown-it with table support
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

// Add support for extended tables (includes basic table support)
md.use(multimd_table, {
  multiline: true,
  rowspan: true,
  headerless: true,
  multibody: true,
  autolabel: true,
});

// Wait for document fonts (if supported) and all images inside a root element
async function waitForFontsAndImages(
  doc: Document,
  root: HTMLElement
): Promise<void> {
  const waitFonts =
    (doc as any).fonts && typeof (doc as any).fonts.ready?.then === "function"
      ? (doc as any).fonts.ready.catch(() => undefined)
      : Promise.resolve();

  const images = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
  const imgPromises = images.map((img) => {
    return new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      const onDone = () => {
        img.removeEventListener("load", onDone);
        img.removeEventListener("error", onDone);
        resolve();
      };
      img.addEventListener("load", onDone);
      img.addEventListener("error", onDone);
    });
  });

  await Promise.all([waitFonts, ...imgPromises]);
}

function forceReflow(el: HTMLElement) {
  // Accessing offsetHeight forces layout
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
}

// Types for PDF configuration
export interface PDFExportOptions {
  filename?: string;
  margin?: number | [number, number, number, number];
  format?: "a4" | "a3" | "letter" | "legal";
  orientation?: "portrait" | "landscape";
  scale?: number;
  pageBreak?: "auto" | "avoid" | "always";
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  backgroundColor?: string;
  debug?: boolean;
}

const getTableStyles = (options: PDFExportOptions = {}) => `
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: ${options.fontFamily || "Arial, sans-serif"};
      font-size: ${options.fontSize || 12}px;
      line-height: ${options.lineHeight || 1.4};
      color: ${options.color || "#333"};
      background-color: ${options.backgroundColor || "white"};
      margin: 0;
      padding: 20px;
      max-width: 210mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: #2c3e50;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    
    h1 { font-size: 24px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { font-size: 20px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
    h3 { font-size: 16px; }
    h4 { font-size: 14px; }
    
    p {
      margin: 0.5em 0;
      text-align: justify;
    }
    
    /* Table styles */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      page-break-inside: ${options.pageBreak === "avoid" ? "avoid" : "auto"};
      font-size: ${(options.fontSize || 12) - 1}px;
    }
    
    thead, tbody, tr, th, td {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    
    th, td {
      border: 1px solid #bdc3c7;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    
    th {
      background-color: #f8f9fa;
      font-weight: bold;
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
    }
    
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    
    tr:hover {
      background-color: #e8f4f8;
    }
    
    /* Alignment for numeric data */
    td:has(> *:only-child) {
      text-align: center;
    }
    
    /* Code styles */
    code {
      background-color: #f1f2f6;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    pre {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 5px;
      padding: 15px;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    /* Lists */
    ul, ol {
      margin: 0.5em 0;
      padding-left: 2em;
    }
    
    li {
      margin: 0.2em 0;
    }
    
    /* Links */
    a {
      color: #3498db;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Quote blocks */
    blockquote {
      border-left: 4px solid #3498db;
      margin: 1em 0;
      padding-left: 1em;
      color: #7f8c8d;
      font-style: italic;
    }
    
    /* Page breaks */
    .page-break {
      page-break-before: always;
    }
    
    .no-break {
      page-break-inside: avoid;
    }
    
    /* Headers should not be left alone at the bottom of the page */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
    }
    
    /* Tables with many rows */
    .large-table {
      font-size: 10px;
    }
    
    .large-table th,
    .large-table td {
      padding: 4px 6px;
    }
  </style>
`;

export async function markdownToPdf(
  markdown: string,
  options: PDFExportOptions = {}
): Promise<void> {
  // Check if we're in browser environment
  if (typeof window === "undefined") {
    throw new Error("PDF export is only available in browser environment");
  }

  // Dynamically import html2pdf.js only in browser environment
  const html2pdf = (await import("html2pdf.js")).default;

  try {
    // Validate input
    if (!markdown || markdown.trim() === "") {
      throw new Error("Markdown content is empty");
    }

    // Render Markdown to HTML
    const html = md.render(markdown);

    // Check if HTML is empty
    if (!html || html.trim() === "") {
      throw new Error("Rendered HTML is empty");
    }

    // Build an offscreen Shadow DOM host (no global reflow, no body/html changes)
    const host = document.createElement("div");
    host.id = "__md_pdf_shadow_host";
    host.style.position = "absolute";
    host.style.left = "-10000px"; // fully off-screen
    host.style.top = "0";
    host.style.width = "210mm"; // A4 width baseline
    host.style.minHeight = "297mm";
    host.style.opacity = "0"; // do not flash
    host.style.pointerEvents = "none";
    host.style.zIndex = "-1";

    const shadow = host.attachShadow({ mode: "open" });

    // Compose minimal HTML with inline styles only (no external <link> tags)
    const inlineStyles = getTableStyles(options);
    const styleEl = document.createElement("div");
    styleEl.innerHTML = inlineStyles; // <style> inside

    // Root wrapper inside shadow to scope all content
    const rootWrapper = document.createElement("div");
    rootWrapper.id = "md-pdf-root";
    rootWrapper.innerHTML = html;

    // Slot everything into the shadow root
    shadow.appendChild(styleEl);
    shadow.appendChild(rootWrapper);

    document.body.appendChild(host);
    // Robust wait: fonts and images (document.fonts works across shadow)
    await new Promise((resolve) => setTimeout(resolve, 200));
    await waitForFontsAndImages(document, rootWrapper);
    // Ensure enough height for large content to avoid clipping
    host.style.height = Math.max(rootWrapper.scrollHeight, 297) + "px";
    forceReflow(rootWrapper as HTMLElement);

    const container = rootWrapper as HTMLElement;
    if (!container || !container.children.length) {
      throw new Error("Shadow root container has no content after HTML insert");
    }

    if (options.debug) {
      const selection = window.getSelection?.();
      if (selection) {
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(container);
        selection.addRange(range);
        const selectedText = String(selection);
        console.debug("Selected text length (sanity):", selectedText.length);
        selection.removeAllRanges();
      }
    }

    // Configuration for html2pdf
    const pdfOptions = {
      margin: options.margin || 10,
      filename: options.filename || "markdown-export.pdf",
      html2canvas: {
        scale: options.scale || 2,
        imageTimeout: 15000,
        removeContainer: true,
        useCORS: true,
        letterRendering: true,
        allowTaint: false,
        foreignObjectRendering: false,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: "#ffffff",
        ignoreElements: (element: Element) => {
          if (element.tagName === "LINK" || element.tagName === "SCRIPT")
            return true;
          if (element.tagName === "IMG") {
            const img = element as HTMLImageElement;
            // Skip cross-origin or not-ready images to avoid tainting/blank canvases
            const isBad = !img.complete || img.naturalWidth === 0;
            return isBad;
          }
          return false;
        },
      },
      jsPDF: {
        unit: "mm",
        format: options.format || "a4",
        orientation: options.orientation || "portrait",
      },
      pagebreak: {
        mode: ["avoid-all", "css", "legacy"],
        before: ".page-break",
        after: ".page-break",
        avoid: ".no-break",
      },
    } as const;

    // Generate and save PDF
    try {
      await html2pdf().set(pdfOptions).from(container).save();
    } catch (pdfError) {
      console.error("html2pdf error:", pdfError);
    }

    // Remove temporary shadow host
    const shadowHost = document.getElementById("__md_pdf_shadow_host");
    if (shadowHost && shadowHost.parentNode) {
      shadowHost.parentNode.removeChild(shadowHost);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(
      `Failed to generate PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
