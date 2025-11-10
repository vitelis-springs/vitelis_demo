/**
 * Content Section Renderer
 * Handles rendering of main content sections (summary, head-to-head, etc.)
 */

import { PageBreak, Paragraph, Table } from "docx";
import type { DocModel } from "../../doc-model";
import {
  docModelHasRenderableContent,
  renderDocModel,
  TemplateRenderContext,
} from "../renderers";

/**
 * Append a content section to the document with page break
 */
export function appendSection(
  nodes: Array<Paragraph | Table>,
  model: DocModel | null,
  context: TemplateRenderContext,
  addPageBreak = true
) {
  if (model && docModelHasRenderableContent(model)) {
    nodes.push(...renderDocModel(model, context));
  }

  // Add spacing and page break after section
  nodes.push(new Paragraph({ text: "" }));
  if (addPageBreak) {
    nodes.push(
      new Paragraph({
        text: "",
        children: [new PageBreak()],
      })
    );
  }
}
