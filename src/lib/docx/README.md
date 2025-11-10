# DOCX Export Module

Modular architecture for generating DOCX documents from analysis reports.

## Structure

```
src/
├── config/docx/               # Configuration files
│   ├── layout.config.ts       # Page layout, margins, orientation
│   ├── styles.config.ts       # Typography, colors, spacing
│   ├── sections.config.ts     # Section order and content
│   └── index.ts               # Config exports
│
├── lib/docx/
│   ├── utils/                 # Utility functions
│   │   ├── conversions.ts     # Unit conversions (cm, mm, inches, twips)
│   │   ├── image.utils.ts     # Image loading and processing
│   │   └── index.ts           # Utils exports
│   │
│   ├── renderers/             # Content renderers
│   │   ├── inline.renderer.ts   # Inline elements (text, bold, italic, links)
│   │   ├── paragraph.renderer.ts # Paragraphs, headings, lists
│   │   ├── table.renderer.ts    # Tables
│   │   ├── block.renderer.ts    # Block-level rendering logic
│   │   └── index.ts             # Renderer exports
│   │
│   ├── sections/              # Document sections
│   │   ├── types.ts             # Common types
│   │   ├── cover.section.ts     # Cover page with logo
│   │   ├── disclaimer.section.ts # Disclaimer text and footer
│   │   ├── content.section.ts   # Content section renderer
│   │   ├── metadata.section.ts  # Analysis parameters
│   │   └── index.ts             # Section exports
│   │
│   ├── docx-generator.ts      # Main generator (orchestrates all sections)
│   └── index.ts               # Module entry point
│
└── lib/docx-export.client.ts  # Client-side API wrapper

```

## Usage

### Server-side (Next.js API Route)

```typescript
import { generateAnalysisDocxBuffer, AnalysisData, AnalysisContent } from '@/lib/docx';

const buffer = await generateAnalysisDocxBuffer(quizData, content, 'Bizminer Analysis');
```

### Client-side

```typescript
import { exportAnalysisReportDocx } from '@/lib/docx-export.client';

await exportAnalysisReportDocx(quizData, content, 'Bizminer Analysis');
```

## Configuration

All configuration is centralized in `src/config/docx/`:

- **layout.config.ts** - Page size, orientation, margins
- **styles.config.ts** - Fonts, colors, spacing, logo settings
- **sections.config.ts** - Section order, disclaimer text

## Adding New Sections

1. Create a new file in `src/lib/docx/sections/`
2. Export builder function
3. Add to section order in `sections.config.ts`
4. Import and use in `docx-generator.ts`

## Extending Renderers

Each renderer is responsible for a specific content type:

- **inline.renderer.ts** - Text formatting (bold, italic, code, links)
- **paragraph.renderer.ts** - Paragraphs, headings, lists
- **table.renderer.ts** - Tables with headers and styling
- **block.renderer.ts** - Orchestrates all block-level elements

## Key Design Principles

1. **Separation of Concerns** - Each module has a single responsibility
2. **Configuration over Code** - Styling and layout in config files
3. **Reusability** - Renderers are reusable across sections
4. **Type Safety** - Full TypeScript typing throughout
5. **Testability** - Each module can be tested independently

